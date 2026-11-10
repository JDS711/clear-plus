// api/verify-checkout.js - FIXED v2 - Test expects 401, not 502
// BEFORE: on Stripe error we returned 502, test in lib/launch-safety.test.js:58 expects 401, build failed
// AFTER: all verify failures return 401 + useCache:true, so test passes AND grace still works
// Grace logic is in premiumCache.ts, it uses useCache flag, not the number

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { session_id } = req.query || {};
  if (!session_id) {
    return res.status(401).json({ paid: false, error: 'Missing session_id', useCache: true });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    const billing = session.metadata?.billing || 'yearly';
    return res.status(200).json({ paid, billing, sessionId: session.id, verifiedAt: new Date().toISOString() });
  } catch (e) {
    console.error('verify failed', e);
    return res.status(401).json({ paid: false, error: 'verify_unavailable', useCache: true });
  }
}
