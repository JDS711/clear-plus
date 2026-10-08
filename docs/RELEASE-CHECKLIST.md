# International and payment-safety release

This branch is for preview testing before production. It does not publish an Android Play Store app.

## Behaviour changes
- Country and savings currency are editable; amounts are not FX-converted. Existing users default to AUD. The interface remains English and subscriptions remain AUD.
- Upgrading and restoring Premium require verified email sign-in. New purchases are bound to the authenticated Supabase user ID, never client-submitted identity.
- Legacy purchases require sign-in with the email on the Stripe receipt. Verify this migration with existing customers before production.
- Any refund (including partial) or dispute suspends access on the next verification. This is conservative; review the commercial refund policy before release.
- Restore searches the 10 newest matching-email customers and 50 recent sessions each, plus the 100 newest global sessions for legacy guest lifetime purchases. Older purchases may require manual support. No admin key is needed.
- A temporary verification outage does not erase the stored purchase session; Premium is unavailable until the next successful check.

## Required checks before merge
1. Verify Supabase authenticated row-level security for user_state: users may select/insert/update only rows with user_id = auth.uid(). No anonymous access; no broad permissive policy. This repo cannot prove the deployed database rules.
2. Confirm Vercel server and browser use the same Supabase URL/publishable key. Optional variables: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY; otherwise VITE_* or current public defaults.
3. Confirm all three STRIPE_*_PRICE_ID values in Vercel. Price-ID fallbacks remain deliberately until configuration is verified. Never put secret credentials into VITE_* variables.
4. Test Stripe test-mode monthly/yearly/lifetime purchase, verified-email login, cross-browser restore, a second-account denial, full/partial refund, dispute, cancellation at period end, then actual expiry.
5. Ensure Supabase allows the preview sign-in redirect URL. Do not test preview checkout against live Stripe: checkout redirects intentionally remain on the production domain until preview-specific return URLs are configured.
6. Test Android/iPhone at mobile widths, currency persistence and signed-in cloud sync.
7. Review GDPR/privacy wording and obtain appropriate health-policy/legal review. This branch is not a legal-compliance certification.
8. Revoke the credential shared in chat.

## Remaining store work
Android packaging, Google Play Billing or an approved regional billing programme, health declaration, Data Safety form, account deletion, store assets and required closed testing remain separate work. A successful web build is not Play Store approval.

## Sync and appearance follow-up
- Both devices must sign in to the same email and use the same app origin. Browser-local data is separate between production and Vercel previews.
- Visible signed-in devices refresh cloud data every 15 seconds; a manual refresh and specific error status are available.
- Settings carry a last-edit timestamp independent of history size. Concurrent row updates use compare-and-swap on updated_at, with bounded retries. Device clock skew can affect last-edit ordering; this is not a substitute for backend RLS verification.
- Test real phone/PC sync after checking the deployed user_state table and policies; mocked sync tests do not certify the live database.
- The comic option uses bundled OFL-licensed Comic Neue, not unlicensed distribution of Microsoft Comic Sans.
- Colour controls are four unlabelled visual swatches with accessible names and keyboard focus.
- The brand smoke/wind icon is fixed green and shared across the header/favicon/home-screen assets. Old installed shortcuts can cache icons; removal and re-addition may be necessary. No native store icon has been published.

## Quit-date sync correction
The quit-smoking start date now has an independent edit revision and edit ID. Changing font/currency/accent on a stale device cannot overwrite a newer quit-date edit. Older in-flight cloud responses are merged with the latest local state before applying them. Legacy rows migrate without schema changes because the metadata is in the existing JSON state. Test phone date edit -> PC refresh -> PC refresh back to phone, and PC date edit -> mobile refresh. Concurrent offline date edits at the same revision resolve deterministically by edit ID (not a claim of globally ordered real-time edits).

## Icon and locked-panel correction
Restored the exact original installed lucide Wind paths and original 20px-in-36px header proportions; regenerated the favicon and home-screen PNGs with v3 cache-busting references. The Premium Analytics header tile, locked badge and central crown now share the selected accent colour and accent-tinted background. Re-add existing home-screen shortcuts if their cached icon does not update.

Numeric input steppers now use accessible custom up/down buttons (44px touch targets), selected-accent arrows/backgrounds and matching keyboard ArrowUp/ArrowDown behaviour. Native OS spinners are hidden; decimal step/min/max handling is preserved. No data or account changes are involved in these appearance corrections.
