import Stripe from 'stripe';
import { authenticatedUser } from '../lib/auth.js';
import { createBillingPortal } from '../lib/billing-portal.js';

export function billingPortalHandler({
  authenticate = authenticatedUser,
  stripeFactory = key => new Stripe(key),
  env = process.env,
} = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const user = await authenticate(req);
      if (!user) return res.status(401).json({ error: 'Sign in to manage your subscription' });
      if (!env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Billing management temporarily unavailable' });
      const result = await createBillingPortal(stripeFactory(env.STRIPE_SECRET_KEY), user, req.body?.sessionId, env);
      if (result.code === 200) return res.status(200).json({ url: result.url });
      const messages = {
        400: 'Invalid purchase reference',
        403: 'This purchase belongs to another account',
        404: 'No subscription was found for this account',
        503: 'Billing management temporarily unavailable',
      };
      return res.status(result.code).json({ error: messages[result.code] || 'Unable to open billing management' });
    } catch {
      return res.status(503).json({ error: 'Billing management temporarily unavailable. Please retry.' });
    }
  };
}

export default billingPortalHandler();