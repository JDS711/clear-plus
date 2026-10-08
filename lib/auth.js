import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';
export async function authenticatedUser(req, env = process.env, suppliedClient = null) {
  const header = req.headers?.authorization;
  if (typeof header !== 'string' || !/^Bearer [^\s]+$/.test(header)) return null;
  const client = suppliedClient || createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: header } } });
  const { data, error } = await client.auth.getUser(header.slice(7));
  if (error || !data.user?.email || !data.user?.email_confirmed_at) return null;
  const { data: admitted, error: admissionError } = await client.rpc('app_session_allowed');
  return !admissionError && admitted === true ? data.user : null;
}
export function ownsPurchase(session, user) {
  if (!user?.id || !user?.email || !user.email_confirmed_at) return false;
  const owner = session?.metadata?.supabase_user_id || session?.client_reference_id;
  if (owner) return owner === user.id;
  // Migration for purchases created before accounts were required: prove receipt-email control.
  const email = session?.customer_details?.email || session?.customer_email;
  return typeof email === 'string' && email.trim().toLowerCase() === user.email.trim().toLowerCase();
}
