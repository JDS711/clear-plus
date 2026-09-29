// lib/plans.test.js
//
// Guards the rule that stops the paywall advertising a plan Stripe will refuse.
//
// The live bug this exists for: the $49.95 lifetime option returned a generic 502 while monthly
// and yearly worked. The cause is by definition one of the cases below - a price that is not
// active, or a price whose billing shape does not match the mode checkout uses.
//
// Run: npm test

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isPriceUsable, PLAN_BILLING, PLAN_IDS } from './plans.js';

const oneOff = (active = true) => ({ id: 'price_oneoff', active, recurring: null });
const recurring = (active = true) => ({
  id: 'price_recurring',
  active,
  recurring: { interval: 'month' },
});

describe('isPriceUsable - billing shape must match the mode checkout uses', () => {
  test('an active one-off price can be sold as lifetime', () => {
    assert.equal(isPriceUsable(oneOff(), 'lifetime'), true);
  });

  test('an active recurring price can be sold as monthly', () => {
    assert.equal(isPriceUsable(recurring(), 'monthly'), true);
  });

  test('an active recurring price can be sold as yearly', () => {
    assert.equal(isPriceUsable(recurring(), 'yearly'), true);
  });

  test('a RECURRING price cannot be sold as lifetime', () => {
    // Stripe rejects a recurring price in a payment-mode session. This is the shape of a price
    // id pasted into the wrong environment variable.
    assert.equal(isPriceUsable(recurring(), 'lifetime'), false);
  });

  test('a ONE-OFF price cannot be sold as a subscription', () => {
    assert.equal(isPriceUsable(oneOff(), 'monthly'), false);
    assert.equal(isPriceUsable(oneOff(), 'yearly'), false);
  });
});

describe('isPriceUsable - archived and malformed prices are refused', () => {
  test('an archived one-off price is refused', () => {
    assert.equal(isPriceUsable(oneOff(false), 'lifetime'), false);
  });

  test('an archived recurring price is refused', () => {
    assert.equal(isPriceUsable(recurring(false), 'monthly'), false);
  });

  test('a missing price is refused', () => {
    assert.equal(isPriceUsable(null, 'lifetime'), false);
    assert.equal(isPriceUsable(undefined, 'lifetime'), false);
  });

  test('an unknown billing type is refused', () => {
    assert.equal(isPriceUsable(oneOff(), 'enterprise'), false);
    assert.equal(isPriceUsable(oneOff(), ''), false);
    assert.equal(isPriceUsable(oneOff(), undefined), false);
  });

  test('active must be explicitly true, not merely truthy', () => {
    // Fail closed. An unexpected shape must not be read as "sellable".
    assert.equal(isPriceUsable({ recurring: null }, 'lifetime'), false);
    assert.equal(isPriceUsable({ active: 'true', recurring: null }, 'lifetime'), false);
    assert.equal(isPriceUsable({ active: 1, recurring: null }, 'lifetime'), false);
  });
});

describe('the plan map is the single source of truth', () => {
  test('every plan has a billing mode, and lifetime is the only one-off', () => {
    assert.deepEqual(PLAN_IDS.sort(), ['lifetime', 'monthly', 'yearly']);
    assert.equal(PLAN_BILLING.lifetime, 'payment');
    assert.equal(PLAN_BILLING.monthly, 'subscription');
    assert.equal(PLAN_BILLING.yearly, 'subscription');
  });
});
