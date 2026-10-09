import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBillingPortal, ownedBillingCustomer, isSafePortalConfiguration,
  PORTAL_POLICY, BILLING_RETURN_URL } from './billing-portal.js';
import { billingPortalHandler } from '../api/create-billing-portal.js';

process.env.STRIPE_MONTHLY_PRICE_ID = 'price_portal_monthly';
process.env.STRIPE_YEARLY_PRICE_ID = 'price_portal_yearly';
const user = { id: 'owner', email: 'buyer@example.com', email_confirmed_at: '2026-10-01' };
const config = {
  id: 'bpc_safe', active: true, metadata: { app_policy: PORTAL_POLICY },
  features: { subscription_cancel: { enabled: true, mode: 'at_period_end', proration_behavior: 'none' } },
};
const purchase = (over = {}) => ({
  id: 'cs_test_owned', status: 'complete', customer: 'cus_owned',
  metadata: { billing_type: 'monthly', supabase_user_id: user.id },
  line_items: { data: [{ price: { id: 'price_portal_monthly' } }] },
  subscription: { id: 'sub_owned', customer: 'cus_owned', status: 'past_due' },
  ...over,
});
function client(session = purchase(), configs = [config]) {
  const calls = [];
  return {
    calls,
    checkout: { sessions: {
      retrieve: async () => session,
      list: async () => ({ data: [session] }),
    } },
    customers: { list: async params => {
      assert.equal(params.email, user.email);
      return { data: [{ id: 'cus_owned' }] };
    } },
    billingPortal: {
      configurations: {
        list: async () => ({ data: configs }),
        retrieve: async id => configs.find(c => c.id === id),
      },
      sessions: { create: async params => {
        calls.push(params);
        return { url: 'https://billing.stripe.com/p/session/mock' };
      } },
    },
  };
}

test('portal customer derives from a completed, account-owned recurring purchase', () => {
  assert.equal(ownedBillingCustomer(purchase(), user), 'cus_owned');
  assert.equal(ownedBillingCustomer(purchase({ customer: { id: 'cus_owned' } }), user), 'cus_owned');
  for (const over of [
    { status: 'open' },
    { metadata: { billing_type: 'monthly', supabase_user_id: 'attacker' } },
    { metadata: { billing_type: 'lifetime', supabase_user_id: user.id } },
    { line_items: { data: [{ price: { id: 'price_wrong' } }] } },
    { subscription: { id: 'sub_other', customer: 'cus_other' } },
  ]) assert.equal(ownedBillingCustomer(purchase(over), user), null);
});

test('failed-payment subscribers can manage billing without paid entitlement', async () => {
  const stripe = client();
  const result = await createBillingPortal(stripe, user, 'cs_test_owned', {});
  assert.equal(result.code, 200);
  assert.deepEqual(stripe.calls, [{ customer: 'cus_owned', configuration: 'bpc_safe', return_url: BILLING_RETURN_URL }]);
  // Creating this URL does not itself cancel or charge the customer.
});

test('foreign and malformed purchase references never create a portal session', async () => {
  const stripe = client();
  assert.equal((await createBillingPortal(stripe, { ...user, id: 'attacker' }, 'cs_test_owned', {})).code, 403);
  assert.equal((await createBillingPortal(stripe, user, 'cus_victim', {})).code, 400);
  assert.equal(stripe.calls.length, 0);
});

test('discovery works when local Premium session was removed', async () => {
  const stripe = client();
  assert.equal((await createBillingPortal(stripe, user, undefined, {})).code, 200);
  assert.equal(stripe.calls[0].customer, 'cus_owned');
});

test('email discovery still rejects another Supabase account owner', async () => {
  const stripe = client(purchase({ metadata: { billing_type: 'monthly', supabase_user_id: 'different-account' } }));
  assert.equal((await createBillingPortal(stripe, user, undefined, {})).code, 404);
  assert.equal(stripe.calls.length, 0);
});

test('lifetime purchases do not open recurring subscription management', async () => {
  const stripe = client(purchase({ metadata: { billing_type: 'lifetime', supabase_user_id: user.id } }));
  assert.equal((await createBillingPortal(stripe, user, 'cs_test_owned', {})).code, 404);
  assert.equal(stripe.calls.length, 0);
});

test('missing, unrelated or immediate-cancel configurations fail closed', async () => {
  for (const candidate of [
    undefined, { ...config, active: false }, { ...config, metadata: {} },
    { ...config, features: { subscription_cancel: { enabled: false } } },
    { ...config, features: { subscription_cancel: { enabled: true, mode: 'immediately', proration_behavior: 'none' } } },
    { ...config, features: { subscription_cancel: { enabled: true, mode: 'at_period_end', proration_behavior: 'create_prorations' } } },
  ]) {
    assert.equal(isSafePortalConfiguration(candidate), false);
    const stripe = client(purchase(), candidate ? [candidate] : []);
    assert.equal((await createBillingPortal(stripe, user, 'cs_test_owned', {})).code, 503);
    assert.equal(stripe.calls.length, 0);
  }
});

test('explicit configuration is validated instead of blindly trusting the environment ID', async () => {
  assert.equal((await createBillingPortal(client(), user, 'cs_test_owned', { STRIPE_PORTAL_CONFIGURATION_ID: 'bpc_safe' })).code, 200);
  assert.equal((await createBillingPortal(client(), user, 'cs_test_owned', { STRIPE_PORTAL_CONFIGURATION_ID: 'bpc_unknown' })).code, 503);
});

test('a provider-returned redirect outside Stripe is rejected', async () => {
  const stripe = client();
  stripe.billingPortal.sessions.create = async () => ({ url: 'https://evil.example/' });
  assert.equal((await createBillingPortal(stripe, user, 'cs_test_owned', {})).code, 502);
});

const response = () => ({
  statusCode: null, body: null, headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});
test('endpoint requires POST and verified sign-in before calling Stripe', async () => {
  let providerCalls = 0;
  const handler = billingPortalHandler({
    authenticate: async () => null, env: { STRIPE_SECRET_KEY: 'unused' },
    stripeFactory: () => { providerCalls++; return client(); },
  });
  for (const [method, expected] of [['GET', 405], ['POST', 401]]) {
    const res = response();
    await handler({ method, body: { customer: 'cus_victim' } }, res);
    assert.equal(res.statusCode, expected);
    assert.equal(res.headers['Cache-Control'], 'no-store');
  }
  assert.equal(providerCalls, 0);
});

test('endpoint ignores client-provided customer, configuration and return URL', async () => {
  const stripe = client();
  const handler = billingPortalHandler({ authenticate: async () => user,
    stripeFactory: () => stripe, env: { STRIPE_SECRET_KEY: 'unused' } });
  const res = response();
  await handler({ method: 'POST', body: {
    sessionId: 'cs_test_owned', customer: 'cus_victim', configuration: 'bpc_unsafe', return_url: 'https://evil.example',
  } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(stripe.calls[0], { customer: 'cus_owned', configuration: 'bpc_safe', return_url: BILLING_RETURN_URL });
});

test('missing credentials and provider errors return a safe retryable failure', async () => {
  for (const dependencies of [
    { authenticate: async () => user, env: {} },
    { authenticate: async () => { throw new Error('secret provider detail'); }, env: {} },
    { authenticate: async () => user, env: { STRIPE_SECRET_KEY: 'unused' },
      stripeFactory: () => { throw new Error('secret provider detail'); } },
  ]) {
    const res = response();
    await billingPortalHandler(dependencies)({ method: 'POST', body: {} }, res);
    assert.equal(res.statusCode, 503);
    assert.doesNotMatch(JSON.stringify(res.body), /secret provider detail/);
  }
});

test('settings exposes cancellation separately from Premium access and discloses timing', () => {
  const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /Manage subscription \/ Cancel/);
  assert.match(app, /fetch\('\/api\/create-billing-portal'/);
  assert.match(app, /end of your trial or current billing period/);
  assert.match(app, /does not automatically refund earlier payments/);
  assert.match(app, /user && !\(isPremium && billing === 'lifetime'\)/);
});