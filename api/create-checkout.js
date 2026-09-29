import Stripe from 'stripe';
import { prices, isKnownPlan } from '../lib/prices.js';

// Re-exported for backwards compatibility; the map now lives in lib/prices.js so that the
// checkout and the verification cannot disagree about what a plan costs.
export { prices };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const plan = req.body?.billing;
  if (!isKnownPlan(plan)) return res.status(400).json({ error: 'Invalid plan' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Checkout temporarily unavailable' });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: plan === 'lifetime' ? 'payment' : 'subscription',
      line_items: [{ price: prices()[plan], quantity: 1 }],
      success_url: 'https://www.clear-plus.app/?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.clear-plus.app/?canceled=true',
      allow_promotion_codes: true,
      metadata: { billing_type: plan },
    });
    return res.status(200).json({ url: session.url });
  } catch { return res.status(502).json({ error: 'Checkout temporarily unavailable' }); }
}
