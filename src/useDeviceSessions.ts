import { useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type Device = { id: string; label: string; lastSeen: string; current: boolean };
type Admission = { allowed: boolean; limit: number; sessions: Device[]; revoked: boolean };
export function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone / iPad' : /Windows/i.test(ua) ? 'Windows PC' : /Mac/i.test(ua) ? 'Mac' : 'Computer';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${os} · ${browser}${matchMedia('(display-mode: standalone)').matches ? ' · Installed app' : ''}`;
}

export default function useDeviceSessions() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const currentSession = useRef<Session | null>(null);
  const generation = useRef(0);
  const alive = useRef(true);
  const serial = useRef<Promise<void>>(Promise.resolve());
  const run = async (session: Session | null, action: string, replaceId?: string) => {
    const job = ++generation.current;
    currentSession.current = session;
    if (!session) { setUser(null); setPendingUser(null); setAdmission(null); setError(''); setBusy(false); return; }
    setBusy(true);
    // Keep all RPCs outside the auth event callback and serialize competing refreshes.
    serial.current = serial.current.catch(() => {}).then(async () => {
      if (!alive.current || job !== generation.current) return;
      try {
        const { data, error: rpcError } = await supabase.rpc('manage_app_session', {
          action, device_label: deviceLabel(), replace_session_id: replaceId || null,
        });
        if (!alive.current || job !== generation.current) return;
        if (rpcError || !data || typeof data.allowed !== 'boolean') throw new Error('Unable to check signed-in devices. Try again.');
        setAdmission(data as Admission); setError('');
        setUser(data.allowed ? session.user : null);
        setPendingUser(data.allowed ? null : session.user);
      } catch (err) {
        if (!alive.current || job !== generation.current) return;
        setUser(null); setPendingUser(session.user);
        setError(err instanceof Error ? err.message : 'Device check failed. Try again.');
      } finally { if (alive.current && job === generation.current) setBusy(false); }
    });
    await serial.current;
  };
  useEffect(() => {
    alive.current = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (alive.current) void run(session, event === 'TOKEN_REFRESHED' ? 'check' : 'claim');
      }, 0);
      timers.add(timer);
    });
    // INITIAL_SESSION is emitted by Supabase after it loads local storage.
    const check = () => { if (document.visibilityState === 'visible' && currentSession.current) void run(currentSession.current, 'check'); };
    const timer = setInterval(check, 15000);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    return () => {
      alive.current = false; generation.current++;
      timers.forEach(clearTimeout); clearInterval(timer);
      listener.subscription.unsubscribe();
      window.removeEventListener('focus', check); window.removeEventListener('online', check);
    };
  }, []);
  const signOutDevice = async () => {
    generation.current++; setBusy(true); setUser(null);
    try {
      await supabase.rpc('manage_app_session', { action: 'end' });
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
      currentSession.current = null; setPendingUser(null); setAdmission(null); setError('');
    } catch { setError('Sign-out did not finish. Try again.'); }
    finally { setBusy(false); }
  };
  return { user, pendingUser, admission, error, busy, signOutDevice,
    retryAdmission: () => run(currentSession.current, 'claim'),
    replaceDevice: (id: string) => run(currentSession.current, 'replace', id) };
}
