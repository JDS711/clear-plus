// api/create-checkout.js - Vercel Serverless Function
// This is what makes real payments work
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  const { priceId, billing, successUrl, cancelUrl } = req.body;

  // FINAL PRICE IDS - prod_VH8JKn97ec1n57
  const PRICE_MAP = {
    monthly: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_1UGa3KRsZqvWlIOHvkRsX1TM',
    yearly: process.env.STRIPE_YEARLY_PRICE_ID || 'price_1UGawQRsZqvWlIOHGpXi1NJl',
    lifetime: process.env.STRIPE_LIFETIME_PRICE_ID || 'price_1UGac6RsZqvWlIOHbwlEO7Yv',
  };

  // Enforce founder limit server-side (optional - reads from simple KV or check Stripe count)
  // For now we trust client but you can add Stripe count check here:
  // const lifetimePayments = await stripe.paymentIntents.list({ limit: 100 });
  // Count how many succeeded for lifetime price

  const resolvedPriceId = priceId || PRICE_MAP[billing] || PRICE_MAP.yearly;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: billing === 'lifetime' ? 'payment' : 'subscription',
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: successUrl || `${req.headers.origin}/?success=true&billing=${billing}`,
      cancel_url: cancelUrl || `${req.headers.origin}/?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // For lifetime founder tracking
      metadata: { billing_type: billing, founder: billing === 'lifetime' ? 'true' : 'false' },
    });

    return res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('Stripe error', err);
    return res.status(500).json({ error: err.message });
  }
}
