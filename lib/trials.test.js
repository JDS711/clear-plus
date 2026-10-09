import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkoutParameters } from '../api/create-checkout.js';
import { MONTHLY_TRIAL_DAYS, hasMonthlyTrialHistory, isCurrentMonthlyTrial } from './trials.js';
import { evaluateSession, resolveSession } from './verify.js';

process.env.STRIPE_MONTHLY_PRICE_ID = 'price_monthly_trial_test';
process.env.STRIPE_YEARLY_PRICE_ID = 'price_yearly_trial_test';
process.env.STRIPE_LIFETIME_PRICE_ID = 'price_lifetime_trial_test';
const NOW = 1_800_000_000;
const DAY = 86_400;
const user = { id: 'trial-owner', email: 'owner@example.com', email_confirmed_at: '2026-10-01' };
const env = { STRIPE_SECRET_KEY: 'unused-in-mocked-test' };
const trial = (over = {}) => ({
  status: 'complete',
  payment_status: 'no_payment_required',
  metadata: { billing_type: 'monthly', supabase_user_id: user.id, trial_period_days: '30' },
  line_items: { data: [{ price: { id: 'price_monthly_trial_test' } }] },
  subscription: { status: 'trialing', trial_start: NOW - DAY, trial_end: NOW + 29 * DAY },
  ...over,
});
const charge = { paid: true, status: 'succeeded', refunded: false, amount_refunded: 0, disputed: false };
function client(session, invoice = { charge }) {
  let invoicesRead = 0;
  return {
    checkout: { sessions: { retrieve: async () => session } },
    invoices: { retrieve: async () => { invoicesRead++; return invoice; } },
    reads: () => invoicesRead,
  };
}
const resolve = (session, stripe = client(session), owner = user) =>
  resolveSession('cs_test_trial', env, owner, stripe, NOW);

describe('checkout configuration', () => {
  test('paywall discloses trial, automatic charge and cancellation deadline', () => {
    const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    assert.match(app, /Monthly · 30 days free, then AUD \$9\.99\/month/);
    assert.match(app, /Payment details required upfront/);
    assert.match(app, /cancelled before the displayed first billing date/);
  });
  test('monthly uses the paid price, 30 days, required payment details and server identity', () => {
    const params = checkoutParameters('monthly', 'price_monthly_trial_test', user);
    assert.equal(MONTHLY_TRIAL_DAYS, 30);
    assert.equal(params.mode, 'subscription');
    assert.deepEqual(params.line_items, [{ price: 'price_monthly_trial_test', quantity: 1 }]);
    assert.equal(params.payment_method_collection, 'always');
    assert.equal(params.subscription_data.trial_period_days, 30);
    assert.equal(params.subscription_data.trial_settings.end_behavior.missing_payment_method, 'cancel');
    assert.equal(params.customer_email, user.email);
    assert.equal(params.client_reference_id, user.id);
    assert.equal(params.metadata.supabase_user_id, user.id);
    assert.equal(params.subscription_data.metadata.trial_period_days, '30');
    assert.match(params.custom_text.submit.message, /AUD \$0 due today/);
    assert.match(params.custom_text.submit.message, /AUD \$9\.99\/month/);
    assert.match(params.custom_text.submit.message, /Cancel before/);
    // Stripe chooses eligible card wallets; do not promise or force a wallet.
    assert.equal(Object.hasOwn(params, 'payment_method_types'), false);
  });
  test('yearly and lifetime retain existing billing and receive no trial', () => {
    for (const plan of ['yearly', 'lifetime']) {
      const params = checkoutParameters(plan, `price_${plan}_trial_test`, user);
      assert.equal(params.mode, plan === 'yearly' ? 'subscription' : 'payment');
      assert.equal(Object.hasOwn(params, 'subscription_data'), false);
      assert.equal(Object.hasOwn(params.metadata, 'trial_period_days'), false);
      assert.equal(Object.hasOwn(params, 'payment_method_collection'), false);
      assert.equal(params.customer_creation, plan === 'lifetime' ? 'always' : undefined);
    }
  });
});

describe('verified monthly trial access', () => {
  test('a completed owner-bound trial grants access without reading a paid invoice', async () => {
    const s = trial();
    const stripe = client(s);
    assert.equal(hasMonthlyTrialHistory(s), true);
    assert.equal(isCurrentMonthlyTrial(s, NOW), true);
    assert.deepEqual(evaluateSession(s, NOW), { paid: true, billing: 'monthly' });
    assert.deepEqual(await resolve(s, stripe), { ok: true, paid: true, billing: 'monthly' });
    assert.equal(stripe.reads(), 0);
  });
  test('another account cannot restore the trial', async () => {
    assert.deepEqual(await resolve(trial(), client(trial()), { ...user, id: 'attacker' }),
      { ok: false, code: 403 });
  });
  test('open, expired and unpaid checkout sessions cannot grant a trial', () => {
    for (const status of ['open', 'expired']) assert.equal(evaluateSession(trial({ status }), NOW).paid, false);
    assert.equal(evaluateSession(trial({ payment_status: 'unpaid' }), NOW).paid, false);
  });
  test('wrong price, extra items and missing trial marker are rejected', () => {
    for (const over of [
      { line_items: { data: [{ price: { id: 'price_zero_or_wrong' } }] } },
      { line_items: { data: [{ price: { id: 'price_monthly_trial_test' } }, { price: { id: 'price_monthly_trial_test' } }] } },
      { metadata: { billing_type: 'monthly', supabase_user_id: user.id } },
      { metadata: { billing_type: 'monthly', trial_period_days: '365' } },
    ]) assert.equal(evaluateSession(trial(over), NOW).paid, false);
  });
  test('no-payment yearly and lifetime sessions are not treated as monthly trials', () => {
    for (const plan of ['yearly', 'lifetime']) {
      const s = trial({
        metadata: { billing_type: plan, trial_period_days: '30' },
        line_items: { data: [{ price: { id: `price_${plan}_trial_test` } }] },
      });
      assert.equal(evaluateSession(s, NOW).paid, false);
    }
  });
  test('cancelled, paused, past-due and incomplete subscriptions are rejected', () => {
    for (const status of ['canceled', 'paused', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired']) {
      const s = trial({ subscription: { ...trial().subscription, status } });
      assert.equal(evaluateSession(s, NOW).paid, false, status);
    }
  });
  test('trial expiry is enforced at the exact end instant and access may last until scheduled cancellation', () => {
    const end = trial().subscription.trial_end;
    assert.equal(evaluateSession(trial(), end - 1).paid, true);
    assert.equal(evaluateSession(trial(), end).paid, false);
    assert.equal(evaluateSession(trial(), end + 1).paid, false);
    const s = trial({ subscription: { ...trial().subscription, cancel_at_period_end: true } });
    assert.equal(evaluateSession(s, NOW).paid, true);
  });
  test('future, malformed and overlong trial windows fail closed', () => {
    for (const times of [
      { trial_start: NOW + DAY, trial_end: NOW + 2 * DAY },
      { trial_start: NOW - DAY, trial_end: NOW - DAY },
      { trial_start: NOW - DAY, trial_end: NOW + 30 * DAY },
      { trial_start: '1799913600', trial_end: NOW + DAY },
      { trial_start: NOW - DAY, trial_end: null },
    ]) assert.equal(evaluateSession(trial({ subscription: { status: 'trialing', ...times } }), NOW).paid, false);
  });
});

describe('conversion after the trial', () => {
  const converted = () => trial({ subscription: {
    status: 'active', trial_start: NOW - 31 * DAY, trial_end: NOW - DAY, latest_invoice: 'in_after_trial',
  } });
  test('original no_payment_required session remains usable after a successful paid renewal', async () => {
    const s = converted();
    const stripe = client(s);
    assert.deepEqual(await resolve(s, stripe), { ok: true, paid: true, billing: 'monthly' });
    assert.equal(stripe.reads(), 1);
  });
  test('converted trial cannot bypass missing, failed, refunded or disputed charges', async () => {
    for (const change of [{ paid: false }, { status: 'failed' }, { refunded: true },
      { amount_refunded: 1 }, { disputed: true }]) {
      const s = converted();
      assert.equal((await resolve(s, client(s, { charge: { ...charge, ...change } }))).paid, false);
    }
    const s = converted();
    assert.equal((await resolve(s, client(s, { charge: null }))).paid, false);
    const withoutInvoice = converted();
    delete withoutInvoice.subscription.latest_invoice;
    assert.equal((await resolve(withoutInvoice)).paid, false);
  });
  test('active status before trial end is not accepted for a no-payment session', () => {
    const s = trial({ subscription: { ...trial().subscription, status: 'active' } });
    assert.equal(evaluateSession(s, NOW).paid, false);
  });
  test('provider errors fail closed instead of granting access', async () => {
    const stripe = client(converted());
    stripe.invoices.retrieve = async () => { throw new Error('mock outage'); };
    assert.deepEqual(await resolve(converted(), stripe), { ok: false, code: 502 });
  });
});