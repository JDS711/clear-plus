import Stripe from 'stripe';
import { prices } from './create-checkout.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({paid: false});
  const id = req.query?.session_id;
  if (typeof id !== 'string' || !/^cs_(test_|live_)[a-zA-Z0-9]+$/.test(id)) return res.status(400).json({paid: false});
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({paid: false});
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(id, {expand: ['line_items', 'subscription']});
    const billing = session.metadata?.billing_type;
    const expected = prices()[billing];
    const paid = Object.hasOwn(prices(), billing) && session.status === 'complete' && session.payment_status === 'paid' && session.line_items?.data.length === 1 && session.line_items.data[0].price.id === expected && (billing === 'lifetime' || ['active', 'trialing'].includes(session.subscription?.status));
    return res.status(200).json({paid, ...(paid ? {billing} : {})});
  } catch { return res.status(502).json({paid: false}); }
}
