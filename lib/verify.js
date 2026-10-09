import { ownsPurchase } from './auth.js';
// lib/verify.js
//
// "Did this Stripe Checkout session actually buy one of our plans, and is it still valid?"
//
// Shared by:
//   /api/verify-checkout  — the redirect straight after payment
//   /api/entitlement      — the on-load re-check (see below)
//
// WHY THIS IS SHARED:
// The client used to store `clear_isPremium` in localStorage and read it back on every load, so
// anyone could set that flag by hand and keep Premium forever. Entitlement is now re-verified
// against Stripe. Having ONE implementation is what stops the endpoint that grants access and the
// endpoint that revokes it from disagreeing about the same session.

import Stripe from 'stripe';
import { prices } from './prices.js';
import { hasMonthlyTrialHistory, isCurrentMonthlyTrial } from './trials.js';

/** Stripe session ids look like cs_test_… / cs_live_… . Anything else is not a session. */
export const SESSION_RE = /^cs_(test_|live_)[a-zA-Z0-9]+$/;

/**
 * Pure decision: does this session represent an eligible purchase or monthly trial?
 *
 * Extracted so it can be tested without Stripe, a network, or a browser — see verify.test.js.
 *
 * Every clause matters:
 *   - the session must be COMPLETE, not merely created
 *   - payment must be PAID, except for a server-marked monthly trial Checkout Session
 *   - there must be exactly ONE line item
 *   - that line item's price must match the plan named in metadata (so a cheap price cannot be
 *     passed off as an expensive plan)
 *   - a subscription must STILL be active or trialing, so a cancelled subscriber loses access
 *   - lifetime is a one-off payment, so there is no subscription to check
 */
export function evaluateSession(session, nowSeconds = Date.now() / 1000) {
  const billing = session?.metadata?.billing_type;
  const items = session?.line_items?.data;
  const expected = prices()[billing];

  const status = session?.subscription?.status;
  const trialCheckout = session?.payment_status === 'no_payment_required' &&
    hasMonthlyTrialHistory(session) &&
    (isCurrentMonthlyTrial(session, nowSeconds) ||
      (status === 'active' && session.subscription.trial_end <= nowSeconds));
  const paid =
    Object.hasOwn(prices(), billing) &&
    session?.status === 'complete' &&
    (session?.payment_status === 'paid' || trialCheckout) &&
    items?.length === 1 &&
    items[0]?.price?.id === expected &&
    (billing === 'lifetime' || ['active', 'trialing'].includes(status)) &&
    // A marked monthly trial must not survive its expiry while Stripe still says trialing.
    (status !== 'trialing' || !hasMonthlyTrialHistory(session) ||
      isCurrentMonthlyTrial(session, nowSeconds));

  return { paid: !!paid, billing: paid ? billing : null };
}

/**
 * Fetch and evaluate a session.
 * Returns a discriminated result rather than throwing, so each endpoint can map it to its own
 * status code without re-implementing the checks.
 */
export async function resolveSession(sessionId, env = process.env, user = null, stripeClient = null, nowSeconds = Date.now() / 1000) {
  if (typeof sessionId !== 'string' || !SESSION_RE.test(sessionId)) {
    return { ok: false, code: 400 };
  }
  if (!env.STRIPE_SECRET_KEY) {
    return { ok: false, code: 503 };
  }

  try {
    const stripe = stripeClient || new Stripe(env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'subscription', 'payment_intent.latest_charge'],
    });
    if (!ownsPurchase(session, user)) return { ok: false, code: 403 };
    const evaluated = evaluateSession(session, nowSeconds);
    if (!evaluated.paid) return { ok: true, ...evaluated };
    // No successful charge exists during a free trial. Only this narrow, current,
    // owner-verified monthly trial can bypass the invoice charge check.
    if (isCurrentMonthlyTrial(session, nowSeconds)) return { ok: true, ...evaluated };
    let charge = session.payment_intent?.latest_charge;
    if (evaluated.billing !== 'lifetime') {
      // Check the currently paid invoice, not just the first checkout payment.
      const invoiceId = session.subscription?.latest_invoice;
      if (!invoiceId) return { ok: true, paid: false, billing: null };
      const invoice = await stripe.invoices.retrieve(typeof invoiceId === 'string' ? invoiceId : invoiceId.id, { expand: ['charge'] });
      charge = invoice.charge;
    }
    if (!validCharge(charge)) return { ok: true, paid: false, billing: null };
    return { ok: true, ...evaluated };
  } catch {
    return { ok: false, code: 502 };
  }
}

// Strict until reviewed: any partial refund or dispute suspends access too.
export function validCharge(charge) {
  return !!charge && typeof charge === 'object' && charge.paid === true &&
    charge.status === 'succeeded' && charge.refunded !== true &&
    charge.amount_refunded === 0 && charge.disputed !== true;
}
