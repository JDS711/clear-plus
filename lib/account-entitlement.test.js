import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAccountEntitlement } from './account-entitlement.js';
const reply = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const trialEnd = () => Math.floor(Date.now() / 1000) + 3600;
test('completed zero-payment trial unlocks through server verification', async () => {
  const end = trialEnd();
  const result = await loadAccountEntitlement(async (url, options) => {
    assert.match(url, /verify-checkout/);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(options.cache, 'no-store');
    return reply({ paid: true, billing: 'monthly', trialEnd: end });
  }, 'test-token', 'cs_test_trial');
  assert.equal(result.paid, true); assert.equal(result.trialEnd, end);
});
test('missing checkout reference restores a signed-in trial', async () => {
  const result = await loadAccountEntitlement(async url => {
    assert.equal(url, '/api/restore-access');
    return reply({ paid: true, billing: 'monthly', sessionId: 'cs_test_recovered', trialEnd: trialEnd() });
  }, 'test-token');
  assert.equal(result.paid, true); assert.equal(result.sessionId, 'cs_test_recovered');
});
test('declined or stale checkout does not hide a later successful trial', async () => {
  const calls = [];
  const result = await loadAccountEntitlement(async url => {
    calls.push(url);
    return reply(calls.length === 1 ? { paid: false } : { paid: true, billing: 'monthly', sessionId: 'cs_test_new', trialEnd: trialEnd() });
  }, 'test-token', 'cs_test_declined');
  assert.equal(calls.length, 2); assert.equal(result.sessionId, 'cs_test_new');
});
test('wrong-owner reference cannot grant access; account restore remains authoritative', async () => {
  let n = 0;
  const result = await loadAccountEntitlement(async () => ++n === 1 ? reply({}, 403) : reply({ paid: false }), 'test-token', 'cs_test_other');
  assert.equal(result.paid, false);
});
test('expired trial, cancelled subscription and failed checkout remain locked', async () => {
  for (const value of [{ paid: false }, { paid: true, billing: 'monthly', trialEnd: Math.floor(Date.now() / 1000) - 1 }]) {
    assert.equal((await loadAccountEntitlement(async () => reply(value), 'test-token', 'cs_test_old')).paid, false);
  }
});
test('temporary server failure cannot grant access or masquerade as a final denial', async () => {
  await assert.rejects(loadAccountEntitlement(async () => reply({}, 503), 'test-token', 'cs_test_retry'));
});
test('signed-out verification does not run account discovery', async () => {
  let n = 0;
  const result = await loadAccountEntitlement(async () => { n++; return reply({}, 401); }, 'old-token', 'cs_test_trial');
  assert.equal(n, 1); assert.equal(result.paid, false); assert.equal(result.needsSignIn, true);
});


test('cloud hints cannot drive the local access state or reset verified same-account access', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /setPremiumSession\(state\.premiumSession\)/);
  assert.match(app, /entitlementOwnerRef.current !== \(user\?\.id \|\| null\)/);
  assert.match(app, /\[trialEndsAt, user\?\.id\]/);
  assert.match(app, /if \(inFlight \|\| cancelled\) return/);
});
