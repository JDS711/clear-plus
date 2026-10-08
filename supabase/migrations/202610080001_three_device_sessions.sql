-- Roll out with enforcement disabled; enable only after the new web build is live.
create table public.app_security_settings (
  id boolean primary key default true check (id),
  enforce_device_limit boolean not null default false,
  device_limit integer not null default 3 check (device_limit = 3)
);
insert into public.app_security_settings(id) values (true);
alter table public.app_security_settings enable row level security;
revoke all on public.app_security_settings from anon, authenticated;

create table public.app_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_label text not null check (length(device_label) between 1 and 80),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  revoked_at timestamptz
);
create index app_sessions_user_idx on public.app_sessions(user_id);
alter table public.app_sessions enable row level security;
revoke all on public.app_sessions from anon, authenticated;

create function public.app_session_allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    not (select enforce_device_limit from public.app_security_settings where id)
    or exists (
      select 1 from public.app_sessions a join auth.sessions s on s.id = a.session_id
      where a.user_id = auth.uid() and s.user_id = auth.uid()
        and a.session_id = nullif(auth.jwt()->>'session_id', '')::uuid
        and a.revoked_at is null and (s.not_after is null or s.not_after > now())
    )
  );
$$;
revoke all on function public.app_session_allowed() from public, anon;
grant execute on function public.app_session_allowed() to authenticated;

create function public.manage_app_session(action text default 'check', device_label text default 'Browser', replace_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sid uuid := nullif(auth.jwt()->>'session_id', '')::uuid;
  enabled boolean;
  allowed boolean := false;
  slots jsonb;
  active_count integer;
  label text := left(coalesce(nullif(btrim(device_label), ''), 'Browser'), 80);
begin
  if uid is null or sid is null or not exists (
    select 1 from auth.sessions s where s.id = sid and s.user_id = uid and (s.not_after is null or s.not_after > now())
  ) then raise exception 'A current signed-in session is required' using errcode = '42501'; end if;
  if action not in ('claim', 'check', 'list', 'replace', 'end') then
    raise exception 'Invalid session action' using errcode = '22023';
  end if;
  -- Serialize claims/replacements for this user: two fourth devices cannot win together.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select enforce_device_limit into enabled from public.app_security_settings where id;
  delete from public.app_sessions a where a.user_id = uid and not exists (
    select 1 from auth.sessions s where s.id = a.session_id and (s.not_after is null or s.not_after > now())
  );
  if action = 'end' then
    update public.app_sessions a set revoked_at = now() where a.session_id = sid and a.user_id = uid;
  elsif action in ('claim', 'replace') then
    -- A displaced token cannot reclaim a slot automatically. It needs a fresh login.
    if exists(select 1 from public.app_sessions a where a.session_id = sid and a.revoked_at is not null) then
      allowed := false;
    else
      if action = 'replace' then
        if replace_session_id = sid or replace_session_id is null or not exists (
          select 1 from public.app_sessions a where a.session_id = replace_session_id and a.user_id = uid and a.revoked_at is null
        ) then raise exception 'Choose one of your active devices' using errcode = '22023'; end if;
        update public.app_sessions a set revoked_at = now() where a.session_id = replace_session_id and a.user_id = uid;
      end if;
      select count(*) into active_count from public.app_sessions a where a.user_id = uid and a.revoked_at is null;
      if not enabled or active_count < 3 or exists(select 1 from public.app_sessions a where a.session_id = sid and a.revoked_at is null) then
        insert into public.app_sessions(session_id, user_id, device_label) values (sid, uid, label)
        on conflict (session_id) do update set last_seen = now(), device_label = excluded.device_label;
        allowed := true;
      end if;
    end if;
  else
    allowed := public.app_session_allowed();
    if allowed then update public.app_sessions a set last_seen = now() where a.session_id = sid; end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', a.session_id, 'label', a.device_label,
    'lastSeen', a.last_seen, 'current', a.session_id = sid) order by a.created_at), '[]'::jsonb)
    into slots from public.app_sessions a where a.user_id = uid and a.revoked_at is null;
  return jsonb_build_object('allowed', allowed, 'limit', 3, 'sessions', slots,
    'revoked', exists(select 1 from public.app_sessions a where a.session_id = sid and a.revoked_at is not null));
end;
$$;
revoke all on function public.manage_app_session(text, text, uuid) from public, anon;
grant execute on function public.manage_app_session(text, text, uuid) to authenticated;

-- Restrictive policy ANDs with the existing auth.uid() ownership policies.
create policy app_admitted_sessions on public.user_state as restrictive for all to authenticated
using (public.app_session_allowed()) with check (public.app_session_allowed());
