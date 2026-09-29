# Clear+ — Deploy + Stripe

## Pricing

| Plan | Price |
| --- | --- |
| Monthly | AUD $9.99 / month |
| Yearly | AUD $29.95 / year |
| Lifetime | AUD $49.95 once |

Stripe price and product IDs are **not listed in this README**. They belong in environment variables:

- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_YEARLY_PRICE_ID`
- `STRIPE_LIFETIME_PRICE_ID`

`lib/prices.js` resolves them server-side, so a plan name sent from the browser can never select a different price.

**Still to do:** the three price IDs are currently hardcoded as fallback values inside `lib/prices.js`, which is why they remain visible in this public repository. Removing those fallbacks makes the env vars the single source of truth — see "Known gaps" below.

## Deploy to Vercel

1. Install the CLI: `npm i -g vercel`
2. In this folder: `vercel`
3. Add these env vars in Vercel Dashboard > Settings > Environment Variables:
   - `STRIPE_SECRET_KEY` (required — checkout and verification both fail without it)
   - `STRIPE_MONTHLY_PRICE_ID`
   - `STRIPE_YEARLY_PRICE_ID`
   - `STRIPE_LIFETIME_PRICE_ID`
4. Deploy: `vercel --prod`
5. Connect the domain **clear-plus.app** in Vercel Domains

`STRIPE_PUBLISHABLE_KEY` is not read by any code in this repo, so it is not required.

`.env.example` does not exist yet. For local dev, create `.env.local` with the variables above — `.gitignore` already covers `.env*`.

## How Stripe works

- The frontend calls `POST /api/create-checkout` with `{ billing: 'monthly' | 'yearly' | 'lifetime' }`.
- `api/create-checkout.js` creates the Checkout Session server-side and returns the Stripe URL.
- Stripe redirects back to `/` with `?session_id=...`.
- `GET /api/verify-checkout?session_id=...` asks Stripe directly whether that session is a real, still-current purchase, and returns `{ paid, billing }`.
- Premium is granted **only** from that server answer. It is never read from or written to `localStorage`.
- A cancelled or refunded subscription stops returning `paid: true`, so access is revoked on the next load.
- Offline, or the server unreachable, leaves Premium off. The client fails closed rather than trusting local state.

## Restore access

There is currently **no self-serve restore path**. Premium is tied to the browser that completed the purchase, so clearing browser data, switching device or switching browser loses access. That is a refund and chargeback risk.

Manual restore until this is built:

1. Find the customer in the Stripe Dashboard.
2. Send them the `session_id` from their payment as a link — for example `https://www.clear-plus.app/?session_id=cs_live_...`.

Their browser re-verifies that session with Stripe on load and re-grants Premium. A magic-link email flow is the next proper step.

## Lifetime pricing — no cap is enforced

The lifetime plan is available to **everyone**. There is no "first 100" limit and no sold-out state:

- Nothing in the app counts lifetime sales. There is no `founderSold` counter and no "Sold Out" UI.
- `api/create-checkout.js` will sell the lifetime price to anyone who asks.

**Do not advertise a first-100 limit until one is enforceable.** To make such an offer real, either:

- create a Stripe promotion code for the lifetime price with `max_redemptions: 100` (and optionally `expires_at`), or
- archive the lifetime price in the Stripe Dashboard once the cap is reached,

and then have the app hide the plan, or show it as sold out. Stripe will not enforce a cap that does not exist.

Note: the Stripe price nickname `lifetime_founder_100` reads like a cap and can appear on receipts and invoices. Rename it if you are not running a capped offer.

## Known gaps

- Price IDs remain hardcoded as fallbacks in `lib/prices.js`. Removing them requires confirming all three `STRIPE_*_PRICE_ID` variables are set in Vercel first, because a missing variable would otherwise break that plan's checkout and verification.
- No restore path (above).
- No `sitemap.xml` (below).

## SEO

Title and meta description are set in `index.html`.

There is **no `sitemap.xml`** in this repo. Create one before submitting a sitemap URL to Google Search Console. The canonical domain is `www.clear-plus.app`.

## Local dev

```bash
npm install
npm run dev
```

`npm run build` runs the test suite first (`node --test lib/*.test.js`), then `vite build`. A failing test blocks the build.
