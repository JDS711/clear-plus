import Stripe from 'stripe';
import { authenticatedUser, ownsPurchase } from '../lib/auth.js';
import { resolveSession } from '../lib/verify.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ paid: false });
  try {
    const user = await authenticatedUser(req);
    if (!user) return res.status(401).json({ paid: false, needsSignIn: true });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ paid: false });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    for (const customer of customers.data) {
      const sessions = await stripe.checkout.sessions.list({ customer: customer.id, limit: 50 });
      for (const session of sessions.data) {
        if (!ownsPurchase(session, user) || session.status !== 'complete') continue;
        const result = await resolveSession(session.id, process.env, user);
        if (!result.ok && result.code >= 500) return res.status(503).json({ paid: false });
        if (result.paid) return res.status(200).json({ paid: true, billing: result.billing, sessionId: session.id });
      }
    }
    // Older one-off sessions may have no Stripe customer. Match verified receipt email only.
    const legacy = await stripe.checkout.sessions.list({ limit: 100 });
    for (const session of legacy.data) {
      if (!ownsPurchase(session, user) || session.status !== 'complete') continue;
      const result = await resolveSession(session.id, process.env, user);
      if (!result.ok && result.code >= 500) return res.status(503).json({ paid: false });
      if (result.paid) return res.status(200).json({ paid: true, billing: result.billing, sessionId: session.id });
    }
    return res.status(200).json({ paid: false });
  } catch { return res.status(503).json({ paid: false }); }
}
