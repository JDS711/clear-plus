// lib/verify.test.js
//
// Tests for the shared entitlement decision.
//
// Plain JavaScript on purpose: this project has no test toolchain and does not need one. Node
// runs this file directly, so the check costs nothing to keep.
//
// Run: npm test

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

process.env.STRIPE_MONTHLY_PRICE_ID = 'price_monthly_test';
process.env.STRIPE_YEARLY_PRICE_ID = 'price_yearly_test';
process.env.STRIPE_LIFETIME_PRICE_ID = 'price_lifetime_test';

const { evaluateSession } = await import('./verify.js');

const PAID = 'price_lifetime_test';
const MONTHLY = 'price_monthly_test';

/** A valid, paid lifetime session — the baseline every other case perturbs. */
const paidLifetime = (over = {}) => ({
  status: 'complete',
  payment_status: 'paid',
  metadata: { billing_type: 'lifetime' },
  line_items: { data: [{ price: { id: PAID } }] },
  subscription: null,
  ...over,
});

const paidSubscription = (status = 'active', over = {}) =>
  paidLifetime({
    metadata: { billing_type: 'monthly' },
    line_items: { data: [{ price: { id: MONTHLY } }] },
    subscription: { status },
    ...over,
  });

// ---------------------------------------------------------------------------------------------
describe('evaluateSession — access is granted only for a real, current purchase', () => {
  test('a paid lifetime session grants access', () => {
    assert.deepEqual(evaluateSession(paidLifetime()), { paid: true, billing: 'lifetime' });
  });

  test('an active subscription grants access', () => {
    assert.deepEqual(evaluateSession(paidSubscription('active')), { paid: true, billing: 'monthly' });
  });

  test('a trialing subscription grants access', () => {
    assert.deepEqual(evaluateSession(paidSubscription('trialing')), { paid: true, billing: 'monthly' });
  });

  test('lifetime needs no subscription at all', () => {
    // The one-off case must not be rejected for having nothing to check.
    assert.equal(evaluateSession(paidLifetime({ subscription: undefined })).paid, true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('evaluateSession — refused cases', () => {
  test('an incomplete session is refused', () => {
    assert.equal(evaluateSession(paidLifetime({ status: 'open' })).paid, false);
    assert.equal(evaluateSession(paidLifetime({ status: 'expired' })).paid, false);
  });

  test('a complete but UNPAID session is refused', () => {
    // The important distinction: reaching the end of checkout is not the same as paying.
    assert.equal(evaluateSession(paidLifetime({ payment_status: 'unpaid' })).paid, false);
    assert.equal(evaluateSession(paidLifetime({ payment_status: 'no_payment_required' })).paid, false);
  });

  test('a session whose price does not match its plan is refused', () => {
    // The attack this blocks: pass off a cheap price as an expensive plan.
    const s = paidLifetime({ line_items: { data: [{ price: { id: 'price_someone_elses' } }] } });
    assert.equal(evaluateSession(s).paid, false);
  });

  test('a session with more than one line item is refused', () => {
    const s = paidLifetime({
      line_items: { data: [{ price: { id: PAID } }, { price: { id: PAID } }] },
    });
    assert.equal(evaluateSession(s).paid, false);
  });

  test('an unknown or missing plan is refused', () => {
    assert.equal(evaluateSession(paidLifetime({ metadata: { billing_type: 'free' } })).paid, false);
    assert.equal(evaluateSession(paidLifetime({ metadata: {} })).paid, false);
    assert.equal(evaluateSession(paidLifetime({ metadata: undefined })).paid, false);
  });

  test('a CANCELLED subscription is refused', () => {
    // Otherwise a subscriber cancels and keeps Premium forever.
    assert.equal(evaluateSession(paidSubscription('canceled')).paid, false);
    assert.equal(evaluateSession(paidSubscription('unpaid')).paid, false);
    assert.equal(evaluateSession(paidSubscription('incomplete')).paid, false);
  });

  test('a subscription session with no subscription object is refused', () => {
    assert.equal(evaluateSession(paidSubscription('active', { subscription: null })).paid, false);
  });

  test('nonsense input never grants access', () => {
    for (const bad of [null, undefined, {}, { status: 'complete' }, { payment_status: 'paid' }]) {
      assert.equal(evaluateSession(bad).paid, false, `${JSON.stringify(bad)} must not grant`);
    }
  });

  test('billing is only echoed back when access is granted', () => {
    // So a refused session cannot leak which plan was attempted.
    assert.equal(evaluateSession(paidSubscription('canceled')).billing, null);
    assert.equal(evaluateSession(paidLifetime({ status: 'open' })).billing, null);
  });
});
