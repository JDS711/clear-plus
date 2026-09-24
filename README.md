# Clear+ — Deploy + Stripe LIVE

## FINAL PRICING - prod_VH8JKn97ec1n57
- Monthly: price_1UGa3KRsZqvWlIOHvkRsX1TM = $9.99/mo (standard_monthly)
- Yearly: price_1UGawQRsZqvWlIOHGpXi1NJl = $29.95/yr (yearly_29_95) BEST VALUE Save 75%
- Lifetime: price_1UGac6RsZqvWlIOHbwlEO7Yv = $49.95 once (lifetime_founder_100) First 100 Only

Final copy:
> No dark patterns, no guilt trips, no ads selling you vapes. Free tier is actually useful.
> Plus from $9.99 a month. $29.95 a year. Or for a limited time only, the first 100 receive a lifetime membership for $49.95.

## Deploy to Vercel (5 mins)

1. Install Vercel CLI: npm i -g vercel
2. In this folder: vercel
3. Add env vars in Vercel Dashboard > Settings > Environment Variables:
   - STRIPE_SECRET_KEY
   - STRIPE_PUBLISHABLE_KEY
   - STRIPE_MONTHLY_PRICE_ID
   - STRIPE_YEARLY_PRICE_ID
   - STRIPE_LIFETIME_PRICE_ID
4. Deploy: vercel --prod
5. Connect domain clearplus.app in Vercel Domains

## How Stripe works now

- Frontend (App.tsx) calls /api/create-checkout with { billing: 'monthly'|'yearly'|'lifetime' }
- api/create-checkout.js creates real Stripe Checkout Session
- User pays on Stripe
- Stripe redirects to /?success=true&billing=lifetime -> App.tsx auto-unlocks Premium
- For lifetime, Founder Admin in Settings > tap +1

## When you hit 100 lifetime sales

Stripe Dashboard > Products > Clear Plus Premium > Price $49.95 > ... > Archive price
This stops selling instantly. App will show Sold Out automatically when founderSold = 100.

## SEO

Title and meta description already set in index.html with your ethical copy.
Submit https://clearplus.app/sitemap.xml to Google Search Console.

## Local dev

npm install
npm run dev

Set .env.local from .env.example
