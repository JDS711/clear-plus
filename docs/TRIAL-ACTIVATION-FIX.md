# Premium trial activation and account restoration

## Changes
- A single account-bound client check controls Premium. It waits for admitted sign-in and ignores superseded responses rather than racing independent mount/sign-in checks.
- The return-URL checkout reference takes precedence over an older browser reference. Missing or denied references trigger the existing ownership-checked account restore endpoint.
- Valid 30-day trials receive their actual Stripe expiry from verification and restoration. Trial users see Premium trial instead of Upgrade, with the end date in Settings/footer. The existing Premium feature gates use the same verified state.
- Checks run on sign-in, reference changes, focus, reconnect, visible-tab return and every minute while visible. A server-reported trial expiry also revokes the in-memory grant and rechecks for paid conversion.
- Transient errors fail closed without deleting the checkout reference. No local Premium boolean grants access.
- Card collection, Google Pay behaviour, checkout pricing, subscriptions, trial dates, cancellation policy and the free-account sync policy are unchanged.

## Validation
- 156 automated tests, TypeScript and production build passed.
- Isolated Playwright checks with mocked auth/device/cloud/entitlement transport passed on desktop (1440px) and mobile (390px): active trial, account-based restoration without a local checkout reference, expired account, free account, and expiry while the page stays open.
- Mobile Premium analytics and header screenshot inspected: Premium trial shown, Upgrade absent, charts and rewards unlocked.
- Server regression includes both no_payment_required and paid statuses for a zero-total current trial, plus ownership, expiry and converted-trial payment checks.

## Limits
UI transport was mocked. This does not claim an authenticated production-account end-to-end verification. After deployment, verify the originally affected account without starting another subscription. An unavailable provider deliberately leaves Premium locked until a later successful check. Restoration retains its existing provider-pagination limits.
