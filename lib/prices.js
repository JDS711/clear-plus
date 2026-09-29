// lib/prices.js
//
// The plan -> Stripe price id map, in ONE place.
//
// It previously lived in api/create-checkout.js and was imported from there by
// api/verify-checkout.js, which meant the checkout and the verification depended on each other.
// Both now import this, so the price a purchase is charged against and the price it is verified
// against can never come from different maps.

export const prices = () => ({
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_1UGa3KRsZqvWlIOHvkRsX1TM',
  yearly: process.env.STRIPE_YEARLY_PRICE_ID || 'price_1UGawQRsZqvWlIOHGpXi1NJl',
  lifetime: process.env.STRIPE_LIFETIME_PRICE_ID || 'price_1UGac6RsZqvWlIOHbwlEO7Yv',
});

export const isKnownPlan = (plan) => Object.hasOwn(prices(), plan);
