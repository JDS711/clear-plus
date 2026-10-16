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


## Follow-up: stale-cloud flicker regression
The first release could alternate between a recovered valid checkout reference and a stale reference restored by progress sync. Each reference change cleared Premium before re-verification. An isolated legacy-cloud reproduction produced 17 verification requests, nine restore requests and 35 non-Premium samples during a five-second observation.

The follow-up retires checkout references from synced progress (version 6, premiumSession normalized to null). Checkout references remain local lookup hints; other devices recover by authenticated account ownership. Billing hints no longer influence progress/settings scoring. Journal/craving history, quit-date versions and timestamped settings reconciliation are retained. Same-account checks do not clear an already verified grant merely because a refresh starts; account change, definitive denial, errors and actual trial expiry still revoke it. In-flight refreshes are coalesced and an independent deadline timer prevents pending requests from extending a trial.

Validation: 158 tests, TypeScript, production build and whitespace checks passed. The original ten isolated mobile/desktop scenarios passed again. Extended legacy-cloud tests on both viewport sizes covered an 18-second observation with periodic focus refreshes and the 15-second cloud reload: one restore per account, nine expected verification requests, zero non-Premium samples after activation. Auth/provider/cloud responses were mocked; the affected production browser still needs a post-deploy check. No live billing records or progress data were manually edited.
