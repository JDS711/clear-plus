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
- Inactive subscriptions, refunded charges and disputes fail verification on the next check. Cancellation at period end preserves access while the subscription remains active.
- Offline, or the server unreachable, leaves Premium off. The client fails closed rather than trusting local state.

## Restore access

Sign in in Settings using the email on the Stripe receipt, then choose **Restore Premium purchase**. New purchases require sign-in and are bound server-side to that authenticated account. Existing purchases without account metadata can migrate by verified receipt-email control. Do not send payment-session links as an unauthenticated restore mechanism.

This restore searches recent purchases only; older purchases may require manual support. Account restoration also depends on correct Supabase row-level security and configured sign-in redirect URLs.

See [release checklist](docs/RELEASE-CHECKLIST.md) before deploying these changes. This branch requires preview payment/migration testing before production.

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
- Restore is implemented, but legacy-email migration and deployed database access rules must be verified before release.
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
