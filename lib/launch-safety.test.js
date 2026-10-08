import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, validRegion, validCurrency, formatMoney } from './regions.js';
import { ownsPurchase } from './auth.js';
import { validCharge, resolveSession } from './verify.js';
import checkoutHandler from '../api/create-checkout.js';
import verifyHandler from '../api/verify-checkout.js';
import restoreHandler from '../api/restore-access.js';
const user = { id: 'owner', email: 'buyer@example.com', email_confirmed_at: '2026-10-08' };
test('country and currency values are validated', () => {
  assert.equal(validRegion('fake'), 'AU'); assert.equal(validCurrency('fake', 'SE'), 'SEK');
  assert.match(formatMoney(50, 'SEK', 'SE'), /SEK/); assert.match(formatMoney(50, 'USD', 'US'), /USD/);
  assert.equal(REGIONS.US.tel, '18007848669'); assert.equal(REGIONS.SE.tel, '020840000');
});
test('account-bound purchases cannot be shared by session link or email', () => {
  assert.equal(ownsPurchase({ metadata: { supabase_user_id: 'owner' } }, user), true);
  assert.equal(ownsPurchase({ metadata: { supabase_user_id: 'another' }, customer_email: user.email }, user), false);
  assert.equal(ownsPurchase({}, null), false);
});
test('legacy migration requires a verified matching receipt email', () => {
  assert.equal(ownsPurchase({ customer_details: { email: 'BUYER@example.com' } }, user), true);
  assert.equal(ownsPurchase({ customer_email: 'other@example.com' }, user), false);
  assert.equal(ownsPurchase({ customer_email: user.email }, { ...user, email_confirmed_at: null }), false);
});
test('refunds, partial refunds, disputes and missing charge state fail closed', () => {
  const paid = { paid: true, status: 'succeeded', refunded: false, amount_refunded: 0, disputed: false };
  assert.equal(validCharge(paid), true);
  for (const change of [{ refunded: true }, { amount_refunded: 1 }, { disputed: true }, { paid: false }, { status: 'failed' }]) assert.equal(validCharge({ ...paid, ...change }), false);
  assert.equal(validCharge(null), false); assert.equal(validCharge('ch_id'), false);
});

process.env.STRIPE_LIFETIME_PRICE_ID = 'price_lifetime_safe';
process.env.STRIPE_MONTHLY_PRICE_ID = 'price_monthly_safe';
const charge = { paid: true, status: 'succeeded', refunded: false, amount_refunded: 0, disputed: false };
const lifetime = { id: 'cs_test_safe', status: 'complete', payment_status: 'paid', metadata: { billing_type: 'lifetime', supabase_user_id: user.id }, line_items: { data: [{ price: { id: 'price_lifetime_safe' } }] }, payment_intent: { latest_charge: charge } };
const env = { STRIPE_SECRET_KEY: 'test-not-used-with-injected-client' };
const client = session => ({ checkout: { sessions: { retrieve: async () => session } }, invoices: { retrieve: async () => ({ charge }) } });
test('server verification enforces owner and lifetime refund state', async () => {
  assert.equal((await resolveSession('cs_test_safe', env, user, client(lifetime))).paid, true);
  assert.equal((await resolveSession('cs_test_safe', env, { ...user, id: 'attacker' }, client(lifetime))).code, 403);
  const refunded = { ...lifetime, payment_intent: { latest_charge: { ...charge, amount_refunded: 100 } } };
  assert.equal((await resolveSession('cs_test_safe', env, user, client(refunded))).paid, false);
});
test('subscription verification checks latest invoice refund state', async () => {
  const session = { ...lifetime, metadata: { billing_type: 'monthly', supabase_user_id: user.id }, line_items: { data: [{ price: { id: 'price_monthly_safe' } }] }, subscription: { status: 'active', latest_invoice: 'in_safe' } };
  const stripe = client(session);
  assert.equal((await resolveSession('cs_test_safe', env, user, stripe)).paid, true);
  stripe.invoices.retrieve = async () => ({ charge: { ...charge, disputed: true } });
  assert.equal((await resolveSession('cs_test_safe', env, user, stripe)).paid, false);
  stripe.invoices.retrieve = async () => { throw new Error('provider outage'); };
  assert.equal((await resolveSession('cs_test_safe', env, user, stripe)).code, 502);
});
test('checkout, verify and restore reject anonymous requests without provider calls', async () => {
  for (const [handler, method] of [[checkoutHandler, 'POST'], [verifyHandler, 'GET'], [restoreHandler, 'GET']]) {
    let status; let body;
    const res = { setHeader() {}, status(value) { status = value; return this; }, json(value) { body = value; return this; } };
    await handler({ method, headers: {}, body: { billing: 'lifetime', userId: user.id, customerEmail: user.email }, query: { session_id: 'cs_test_safe' } }, res);
    assert.equal(status, 401); assert.ok(body);
  }
});
