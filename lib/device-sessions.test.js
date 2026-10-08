import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { authenticatedUser } from './auth.js';
const verified = { id: 'owner', email: 'test@example.com', email_confirmed_at: '2026-10-08' };
const req = { headers: { authorization: 'Bearer test-token' } };
const client = (allowed = true, rpcError = null, user = verified) => ({
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  rpc: async name => { assert.equal(name, 'app_session_allowed'); return { data: allowed, error: rpcError }; },
});
test('payment authentication accepts only verified and admitted sessions', async () => {
  assert.deepEqual(await authenticatedUser(req, {}, client()), verified);
  assert.equal(await authenticatedUser(req, {}, client(false)), null);
  assert.equal(await authenticatedUser(req, {}, client(null, new Error('database offline'))), null);
  assert.equal(await authenticatedUser(req, {}, client('true')), null);
  assert.equal(await authenticatedUser(req, {}, client(true, null, { ...verified, email_confirmed_at: null })), null);
});
test('anonymous and malformed authentication never call a provider', async () => {
  const never = { auth: { getUser: () => { throw Error('Must not be called'); } } };
  for (const authorization of [undefined, '', 'Basic abc', 'Bearer token extra']) {
    assert.equal(await authenticatedUser({ headers: { authorization } }, {}, never), null);
  }
});
test('device admission runs outside auth callbacks and local sign-out frees only this device', () => {
  const hook = fs.readFileSync(new URL('../src/useDeviceSessions.ts', import.meta.url), 'utf8');
  assert.match(hook, /onAuthStateChange[\s\S]*setTimeout/);
  assert.match(hook, /signOut\(\{ scope: 'local' \}\)/);
  assert.match(hook, /action: 'end'/);
  assert.match(hook, /setInterval\(check, 15000\)/);
  assert.match(hook, /setUser\(data.allowed \? session.user : null\)/);
});
test('database limit is server-side, owner scoped and restrictive; displaced tokens cannot reclaim', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/202610080001_three_device_sessions.sql', import.meta.url), 'utf8');
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /active_count < 3/);
  assert.match(sql, /a.session_id = replace_session_id and a.user_id = uid/);
  assert.match(sql, /a.session_id = sid and a.revoked_at is not null/);
  assert.match(sql, /as restrictive for all to authenticated/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /enforce_device_limit boolean not null default false/);
});
