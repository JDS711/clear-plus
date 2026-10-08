import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../src/supabase.ts', import.meta.url), 'utf8');
const checkout = fs.readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');

test('account sync uses authenticated per-user rows', () => {
  assert.match(app, /from\('user_state'\)/);
  assert.match(app, /eq\('user_id', user\.id\)/);
  const store = fs.readFileSync(new URL('../lib/cloud-store.js', import.meta.url), 'utf8');
  assert.match(store, /eq\('user_id', userId\)/);
  assert.match(store, /eq\('updated_at', row.updated_at\)/);
  assert.match(client, /createClient/);
});

test('premium access remains server verified after syncing', () => {
  assert.match(app, /verify-checkout\?session_id=/);
  assert.doesNotMatch(app, /state[^\n]*isPremium/);
});

test('new purchases are associated with signed-in accounts', () => {
  assert.match(checkout, /client_reference_id: userId/);
  assert.match(checkout, /customer_email: customerEmail/);
});
