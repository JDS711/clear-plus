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
import { isPriceUsable, isPriceIdShaped, redactKeyLike, PLAN_BILLING, PLAN_IDS } from './plans.js';

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

describe('isPriceIdShaped - catch a variable that is not a price id', () => {
  // The live incident: the lifetime variable held a live secret key. Stripe answered
  // "resource_missing", which reads like a missing price rather than a misconfigured variable.
  test('a real price id passes', () => {
    assert.equal(isPriceIdShaped('price_1UGac6RsZqvWlIOHbwlEO7Yv'), true);
    assert.equal(isPriceIdShaped('price_1ABC'), true);
  });

  test('a SECRET KEY is refused', () => {
    assert.equal(isPriceIdShaped('sk_live_51ABCdefGHI'), false);
    assert.equal(isPriceIdShaped('sk_test_51ABCdefGHI'), false);
  });

  test('a restricted or publishable key is refused', () => {
    assert.equal(isPriceIdShaped('rk_live_51ABC'), false);
    assert.equal(isPriceIdShaped('pk_live_51ABC'), false);
  });

  test('a plan name, a URL or empty input is refused', () => {
    assert.equal(isPriceIdShaped('monthly'), false);
    assert.equal(isPriceIdShaped('https://buy.stripe.com/x'), false);
    assert.equal(isPriceIdShaped(''), false);
    assert.equal(isPriceIdShaped('  '), false);
  });

  test('a missing or non-string value is refused', () => {
    assert.equal(isPriceIdShaped(null), false);
    assert.equal(isPriceIdShaped(undefined), false);
    assert.equal(isPriceIdShaped(1234), false);
    assert.equal(isPriceIdShaped({ id: 'price_1ABC' }), false);
  });

  test('only the exact shape counts - a real price id is alphanumeric after the prefix', () => {
    // Stripe price ids carry no underscores beyond the prefix, so anything with one is not a
    // price id. This is the stricter reading on purpose: a value that merely LOOKS close to a
    // price id should be refused loudly rather than handed to Stripe.
    assert.equal(isPriceIdShaped('price_sk_live_notarealprice'), false);
    assert.equal(isPriceIdShaped('price_1ABC extra'), false);
    assert.equal(isPriceIdShaped('price_1ABC-1'), false);
    assert.equal(isPriceIdShaped('price'), false);
    assert.equal(isPriceIdShaped('price_'), false);
  });
});

describe('redactKeyLike - a credential must never reach a log', () => {
  test('key-shaped values are replaced', () => {
    assert.equal(redactKeyLike('sk_live_51ABCdefGHI'), '[redacted-credential]');
    assert.equal(redactKeyLike('sk_test_51ABCdefGHI'), '[redacted-credential]');
    assert.equal(redactKeyLike('rk_live_51ABC'), '[redacted-credential]');
    assert.equal(redactKeyLike('pk_live_51ABC'), '[redacted-credential]');
  });

  test('a price id is left alone, because it is useful in a log', () => {
    assert.equal(redactKeyLike('price_1UGac6RsZqvWlIOHbwlEO7Yv'), 'price_1UGac6RsZqvWlIOHbwlEO7Yv');
  });

  test('a key hiding inside a longer string is not treated as a key', () => {
    assert.equal(redactKeyLike('price_sk_live_notarealprice'), 'price_sk_live_notarealprice');
  });

  test('non-string values pass through untouched', () => {
    assert.equal(redactKeyLike(undefined), undefined);
    assert.equal(redactKeyLike(null), null);
    assert.equal(redactKeyLike(42), 42);
  });
});
