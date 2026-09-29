// lib/plans.js
//
// "Can this plan actually be sold right now?"
//
// A price id is not enough on its own. Stripe will refuse to create a Checkout Session if the
// price is archived, if it does not exist in this account or mode, or if its billing shape does
// not match the mode the session uses. Every one of those is invisible until someone clicks Buy.
//
// That is exactly how the $49.95 lifetime option came to sit on the paywall returning a generic
// 502: nothing ever asked Stripe whether the price could be used, and the failure was swallowed.
//
// Asking here means the paywall can stop advertising a plan that cannot be sold, and start
// advertising it again the moment the price is fixed - with no redeploy.

import Stripe from 'stripe';
import { prices } from './prices.js';

/**
 * How each plan is charged.
 * lifetime is a one-off payment; the other two are subscriptions.
 *
 * This map is the single definition of that, so checkout and availability cannot disagree.
 */
export const PLAN_BILLING = {
  monthly: 'subscription',
  yearly: 'subscription',
  lifetime: 'payment',
};

export const PLAN_IDS = Object.keys(PLAN_BILLING);

/**
 * Pure decision - testable without Stripe, a network, or a browser.
 *
 * A price is usable only if it exists, is active, AND its recurring shape matches the mode
 * checkout will use. All three clauses matter:
 *
 *   - an archived price cannot be used in a new session, even though it still retrieves fine
 *   - a recurring price in a `payment` session is rejected by Stripe, and a one-off price in a
 *     `subscription` session is rejected too - so a price id pasted into the wrong variable
 *     fails here rather than at the customer's click
 *   - `active` must be explicitly true. Anything else (missing, undefined) is treated as NOT
 *     usable, because the cost of wrongly hiding a plan is smaller than the cost of advertising
 *     a broken one
 */
export function isPriceUsable(price, billing) {
  const mode = PLAN_BILLING[billing];
  if (!price || !mode) return false;
  if (price.active !== true) return false;

  const recurring = Boolean(price.recurring);
  return mode === 'payment' ? !recurring : recurring;
}

/**
 * Availability for every plan.
 *
 * Fails closed PER PLAN rather than throwing: a missing price, a wrong-account price id or a
 * Stripe hiccup marks only that plan unavailable. The caller decides what to do about an
 * all-unavailable report - see the note in src/App.tsx, which distrusts that case.
 */
export async function planAvailability(env = process.env) {
  const result = Object.fromEntries(PLAN_IDS.map((id) => [id, false]));
  if (!env.STRIPE_SECRET_KEY) return result;

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const map = prices();

  await Promise.all(
    PLAN_IDS.map(async (billing) => {
      try {
        const price = await stripe.prices.retrieve(map[billing]);
        result[billing] = isPriceUsable(price, billing);
      } catch {
        // No such price, wrong account or wrong mode - not sellable, whatever the reason.
        result[billing] = false;
      }
    })
  );

  return result;
}
