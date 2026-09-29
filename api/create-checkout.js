import Stripe from 'stripe';
import { prices, isKnownPlan } from '../lib/prices.js';
import { PLAN_BILLING, isPriceIdShaped, redactKeyLike } from '../lib/plans.js';

// Re-exported for backwards compatibility; the map now lives in lib/prices.js so that the
// checkout and the verification cannot disagree about what a plan costs.
export { prices };

/**
 * Stripe error -> a short, non-sensitive reason the client can show and we can debug from.
 *
 * Stripe error codes describe how a price is configured ("resource_missing", and similar). They
 * are not credentials and they do not reveal customer data, and without them a failed checkout
 * is indistinguishable from any other - which is how a broken plan stayed broken.
 */
const reasonFor = (err) => err?.code || err?.type || 'unknown';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const plan = req.body?.billing;
  if (!isKnownPlan(plan)) return res.status(400).json({ error: 'Invalid plan' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Checkout temporarily unavailable' });

  const priceId = prices()[plan];

  // Refuse BEFORE calling Stripe if the variable does not hold a price id.
  //
  // This is the check that was missing when the lifetime plan was pointed at a live secret key.
  // Stripe answered "resource_missing", which reads like a missing price rather than a
  // misconfigured variable, and the real cause took an afternoon to find. Naming it here means
  // the next one is obvious immediately. The value is redacted, because whatever is in there
  // might be a credential.
  if (!isPriceIdShaped(priceId)) {
    console.error('[create-checkout] refusing to start checkout: variable does not hold a price id', {
      plan,
      value: redactKeyLike(priceId),
    });
    return res.status(500).json({
      error: 'Checkout is not configured for this plan',
      reason: 'price_id_malformed',
    });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      // The mode comes from one shared map, so it cannot drift from what availability checks.
      mode: PLAN_BILLING[plan],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://www.clear-plus.app/?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.clear-plus.app/?canceled=true',
      allow_promotion_codes: true,
      metadata: { billing_type: plan },
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    // Never swallow this again. A bare `catch {}` here is the reason a misconfigured lifetime
    // price could fail for weeks without anyone being able to see why: every Stripe error,
    // whatever its cause, collapsed into one generic message.
    //
    // The price is logged through redactKeyLike: a price id is safe to log, but a variable CAN
    // be misconfigured with something that is not, and this log line is how one would leak.
    console.error('[create-checkout] stripe rejected the session', {
      plan,
      stripeType: err?.type,
      stripeCode: err?.code,
      stripeMessage: err?.message,
      priceInUse: redactKeyLike(priceId),
    });

    return res.status(502).json({
      error: 'Checkout temporarily unavailable',
      reason: reasonFor(err),
    });
  }
}
