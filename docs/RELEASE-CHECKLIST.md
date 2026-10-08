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
- The original smoke/wind artwork is shared across header/favicon/home-screen assets. The in-app header tile and static browser/home-screen assets use fixed bright blue (#2563eb), independent of the selected accent. Old installed shortcuts can cache icons; removal and re-addition may be necessary. No native store icon has been published.

## Quit-date sync correction
The quit-smoking start date now has an independent edit revision and edit ID. Changing font/currency/accent on a stale device cannot overwrite a newer quit-date edit. Older in-flight cloud responses are merged with the latest local state before applying them. Legacy rows migrate without schema changes because the metadata is in the existing JSON state. Test phone date edit -> PC refresh -> PC refresh back to phone, and PC date edit -> mobile refresh. Concurrent offline date edits at the same revision resolve deterministically by edit ID (not a claim of globally ordered real-time edits).

## Icon and locked-panel correction
Restored the exact original installed lucide Wind paths and original 20px-in-36px header proportions; regenerated the favicon and home-screen PNGs with v3 cache-busting references. The Premium Analytics header tile, locked badge and central crown now share the selected accent colour and accent-tinted background. Re-add existing home-screen shortcuts if their cached icon does not update.

Numeric input steppers now use accessible custom up/down buttons (44px touch targets), selected-accent arrows/backgrounds and matching keyboard ArrowUp/ArrowDown behaviour. Native OS spinners are hidden; decimal step/min/max handling is preserved. No data or account changes are involved in these appearance corrections.

The Restore Premium purchase control is only shown after sign-in. Signed-out users see the email sign-in form without a redundant restore button that would merely request sign-in.

Latest branding choice supersedes earlier accent-linked branding: fixed bright blue (#2563eb) with the original white smoke artwork across header/browser/home-screen assets. v4 asset references refresh browser caches; installed shortcuts may still need re-adding.

## Three simultaneous signed-in sessions — release rollout
- Migration `supabase/migrations/202610080001_three_device_sessions.sql` adds a private server-side registry and restrictive cloud-state policy. The enforcement flag starts **false** so the old live app keeps working until the new build deploys.
- Payment APIs check the same session admission gate. Only verified, admitted sessions can verify/restore/buy. No service key is exposed to the browser.
- The fourth browser/device prompts for an explicit replacement. Replacing a device blocks its old token from cloud state and payment endpoints; refresh cannot silently reclaim its slot. A fresh login is required.
- Slots refer to Supabase login sessions: separate browsers/origins can count separately, whereas tabs sharing browser storage generally share one slot. Signing out uses local scope and frees only that slot.
- Before activation: rollback-only database checks verified first-three admission, fourth denial, replacement, displaced JWT rejection, restrictive cloud-read denial, anonymous denial and direct-write denial. Test changes were rolled back; no real auth sessions or user progress were deleted.
- Local mocked browser checks cover quit-date edits in both directions, stale and in-flight response protection, and the fourth-device replacement interface. These do not replace user testing of real email sign-in and Stripe billing.
- After production serves the new `public/release.json` marker, enable with `update public.app_security_settings set enforce_device_limit = true where id;`.
- Rollback order: first set `enforce_device_limit = false`, then revert the web release. Keep the new tables/policy in place with enforcement off; do not drop user data.
- Original production commit for rollback: `33eee17c5deece6c4b8271fdb6de0f405da00e4f`.

## Follow-up: consistent accents and sign-in feedback
- Customer confirmed real bidirectional quit-date syncing works automatically. The cloud merge/store/admission code is unchanged in this follow-up; no database migration is needed.
- All named copy/controls use accent-family ink instead of black text utilities. Primary breathing/reset/sync actions use white labels with tested contrast; reset is labelled and rectangular, SOS smoke has an accent tile, journal mood labels are uniform, and selected colour uses a thin border (keyboard focus remains visible).
- Recovery timeline captions and note/story lines track the selected accent in both modes. Jar amounts have a readable surface label independent of jar fill height.
- Supabase already enforces single-use magic links. An expired/reused link is now explicitly reported even when a browser already has a valid session; the app does not claim the failed link created a new sign-in. Same-tab hash navigation also shows the warning. No provider-supplied descriptions or tokens are echoed.
- The apex live domain redirects to www to avoid separate origin storage. Root HTML/manifest revalidate to reduce stale-build confusion. Authentication and existing three-session admission are unchanged.
- A matching Windows ICO is generated from the original fixed-blue/white-smoke PNG; Android/iOS/manifest assets remain identical. Existing OS shortcuts may cache old icons and require reinstalling the shortcut after checking sync. Do not clear browser data.

## Follow-up: journal stays open and controls match their behaviour
- Saving a journal entry (Add or Enter) no longer navigates to Dashboard. The entry is saved, input clears, and the journal page stays open.
- Journal metadata displays local weekday, numeric date, full month and time without a visible year; existing stored ISO timestamps are preserved. Semantic time elements retain the full instant for accessibility/machine reading. Header wraps on narrow/large-text screens.
- Craving-help disclosure retains the five-minute pause below the dashboard button. Down/up chevrons and aria-expanded/aria-controls reflect collapsed/expanded state; no rightward navigation arrow.
- LIVE progress dot is a steady accent highlight, not an animation. Tooltip describes automatic progress-timer updates rather than server connectivity.
- Cloud sync, authentication, three-device admission and payment behaviour are unchanged. No database migration.

## Header proportions follow-up
- Reproduced prior laptop issue: at 1024/1100px the brand tile was squeezed to 20px wide by 36px high, while the branding group wrapped to 86px inside a 68px header. At 1280px it also compressed and wrapped.
- Brand tile now cannot flex-shrink and stays 36x36; original smoke stays 20x20. Full navigation waits until xl width; long subtitle/Home waits until 2xl. Menu covers narrower widths. Header height and selected fonts/accents remain unchanged.
- Browser geometry checks passed 54 combinations: 9 widths (390–1920), 3 representative fonts (Segoe/Comic/Courier), standard/large text. No non-square tile/artwork, over-height groups, overlapping groups, tested horizontal overflow or page exceptions.
- Windows taskbar/title-bar icons may still use an older installed shortcut cache. This layout patch cannot replace files on the customer's Windows PC. Matching public icon assets already exist; confirm app/browser identity before reinstalling its shortcut. Preserve synced progress and do not clear browser data.
- No changes to cloud sync, account admission, billing, journal behaviour or icon artwork. No database migration.

## Sync-loop and complete install-icons repair
- Reproduced a no-op cloud save from JSONB object-key reordering: the old comparison wrote identical state once instead of zero times. Live state shape confirms PostgreSQL returns keys in a different order from the app's payload. No journal text or purchase data was read for diagnosis.
- Canonical, recursive JSON-content comparison now ignores object insertion order while preserving arrays, actual values, omitted fields and date serialization. It is used in both cloud store and React synced-state fingerprints.
- Quiet background reads no longer reset a ready account to loading or disable its refresh button. Per-owner completion tracking prevents one account's ready state enabling another account's writes before initial load.
- Browser regression now simulates JSONB ordering in every stored/read/PATCH response, with nonempty journal/craving history. Both directions, stale/in-flight date protection, reload and dashboard edits pass. Seventeen seconds of idle/background polling causes zero extra writes or loading flashes; manual no-op refresh settles with its button enabled. Existing records preserved. Actual customer app still needs refreshing on both devices to load the fix.
- Chrome screenshots exposed a separate asset defect: old v4 192/512/180 PNGs each contained zero opaque white pixels, so the install dialog showed plain blue. This was not solely an OS cache problem. New v6 PNGs were rendered from the original white Wind paths on the unchanged #2563eb background and inspected individually at 512/192/180 and Windows favicon 64/48/32/16 sizes.
- Pixel decoding tests require visible white artwork (2–20% coverage), validate dimensions and repaired manifest/browser icon references. Root favicon.ico is also generated. Versioned URLs avoid the old blank-image cache; installed Chrome apps may still require approval of their icon update.
- No auth/device-limit/payment or database schema changes. No customer data was deleted or reset. Prior production rollback is 53e0a59c84c23eac93812fe6c4efeb22160a0af2.


## Installed icon compatibility repair
- Live v6 PNGs contain the original white smoke on bright blue. Historic icon URLs returned 404, so old cached install manifests could not retrieve their named assets.
- Build now produces exact copies of the verified artwork at unversioned and v1–v5 icon addresses; those routes revalidate. HTML requests manifest.webmanifest?v=7 without changing manifest id, scope, start URL or account storage.
- Regression checks verify byte-identical aliases and the versioned manifest request. No auth, sync, billing or customer-data changes.
- Browser/OS installed-icon cache refresh remains user-device QA, not claimed fixed merely from image pixel tests.
