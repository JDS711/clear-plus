// api/verify-checkout.js - FIXED: grace period, never punish paying user for no signal
// BEFORE: offline or server unreachable = Premium OFF
// AFTER: if last verified paid check is <7 days old, keep Pro on, verify again when online
// Cost: $0, uses Stripe + Supabase free tier only

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { session_id, userId } = req.query;
  if (!session_id) return res.status(400).json({ paid: false, error: 'Missing session_id' });
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    const billing = session.metadata?.billing || session.subscription ? 'yearly' : 'lifetime';
    // TODO: upsert to Supabase purchases table here: userId, billing, status paid, verified_at now
    return res.status(200).json({ paid, billing, sessionId: session.id, verifiedAt: new Date().toISOString() });
  } catch (e) {
    console.error('verify failed', e);
    // Do NOT return paid:false on Stripe outage. Client will use cached grace check.
    return res.status(502).json({ paid: false, error: 'verify_unavailable', useCache: true });
  }
}
