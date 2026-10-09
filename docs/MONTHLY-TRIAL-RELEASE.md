# Monthly 30-day free trial — preview review

This change is a pull request only. Do not merge or deploy until the following checks pass.

## Scope
- New monthly Checkout Sessions use the existing AUD $9.99/month Price ID, with a 30-day trial and payment method collection required upfront. Do not substitute the $0/month price named "free trial".
- If the saved payment method is missing when the trial ends, cancel rather than create an unpaid invoice.
- Monthly checkout copy states $0 due today, 30 days free, recurring AUD $9.99 and the cancellation deadline. Stripe displays the actual first billing date.
- Verified, owner-bound, completed monthly trial sessions can grant Premium only within their server-reported trial window. Their original no_payment_required Checkout Session remains valid after conversion only if the latest invoice has a successful, non-refunded, non-disputed charge.
- Yearly/lifetime offers, existing subscriptions, existing payment links and secret keys are unchanged by this code.
- The existing JSON API field `paid` means "Premium access allowed"; it also includes eligible free trials for backwards compatibility. It is not a revenue metric.
- This patch does not enforce one trial per customer. Review repeat-trial eligibility before promotion.

## Configuration and release gates
1. Keep STRIPE_SECRET_KEY server-side. Set STRIPE_MONTHLY_PRICE_ID to the AUD $9.99 monthly price in production; for preview, use a matching TEST price and TEST secret. Never use live billing credentials for automated tests.
2. Production monthly price: price_1UGa3KRsZqvWlIOHvkRsX1TM. Confirm AUD, amount 999 and recurring interval month in Stripe before release. The repository retains its existing live-price fallback; preview must override it.
3. Configure preview-only return URLs before provider integration testing. The existing checkout redirect URLs intentionally target production; this PR does not change them.
4. Confirm an accessible cancellation path and customer-support/refund terms before launch. This patch does not add a billing portal, refund policy or reminder emails. Configure and test Stripe trial-end reminders separately.
5. In Stripe TEST mode verify card collection, $0 initial invoice, displayed first billing date, 30-day trial, sign-in ownership, refresh and cross-device restore. Advance a test clock through the trial end and check the first AUD $9.99 invoice and access.
6. Test cancellation during trial, exact trial expiry, missing payment method, failed first payment, later successful payment, partial/full refunds and disputes. Existing non-trial monthly/yearly/lifetime regression checks remain required.
7. Test eligible Apple Pay/Google Pay on supported devices. Wallet visibility and recurring authorisation are not certified by mocked unit tests.
8. Review recurring-charge consent, price/tax wording and repeat-trial eligibility. Do not promise wallet availability, refunds, or legal compliance based on this PR.

## Rollback
Revert this code change if needed. Existing Stripe subscriptions and their trial-end dates are not changed by a code rollback and must be managed deliberately in Stripe; do not cancel or charge customers as part of an automatic rollback.