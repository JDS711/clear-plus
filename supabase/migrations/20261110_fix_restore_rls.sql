-- Supabase migration: Fix Restore - user can only read OWN purchases
-- Run in Supabase Dashboard > SQL Editor. Free tier. Test before prod.
-- BEFORE: RLS unverified, restore fails cross-device, support tickets + refunds
-- AFTER: user reads own rows by auth.uid() = user_id, no one else can read them

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  billing text check (billing in ('monthly','yearly','lifetime')),
  status text check (status in ('paid','active','cancelled','refunded','past_due')),
  stripe_session_id text,
  verified_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(stripe_session_id)
);

alter table public.purchases enable row level security;

drop policy if exists "users read own purchases" on public.purchases;
create policy "users read own purchases" on public.purchases
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own purchases" on public.purchases;
create policy "users insert own purchases" on public.purchases
  for insert with check (auth.uid() = user_id);

-- Service role (server api) bypasses RLS, so api can upsert after Stripe verify.
-- Do NOT add a public insert policy without auth check.
