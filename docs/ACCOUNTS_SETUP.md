# Account setup, periodic sync and recovery

Implemented on main, 28 October 2026. A login-only named draft is deployed for own-account testing; production and friends-beta are unchanged. Financial cloud sync remains disabled. Its migration has been applied only to the synthetic test project and rollback-only database checks passed. No financial records were uploaded. Bank capture remains disabled; Gmail is outside this release.

## Behaviour

- Invited email/password accounts; no public signup UI. Invite acceptance and recovery set a password before entering.
- Every device keeps its own ledger, statement archive, PDF-password vault and sync metadata. First login explicitly claims an unassigned local dataset or starts separately. Original unassigned records remain intact until account deletion. Fresh accounts use neutral starter settings with no personal people, bank labels or rules.
- Optional two-way sync, no realtime subscriptions. Default interval **1440 minutes (24 hours)** per device; custom whole minutes **5–10080** or manual-only. Sync now is always available once connected. Timers operate while open/visible, with catch-up on focus/reopening/reconnection.
- First cloud connection previews counts, financial control totals and changes by collection/setting. Choose explicit ownership/merge, or download the cloud dataset while keeping a device recovery copy.
- New statement postings and recurring occurrences use stable source IDs so the same source posted independently on two devices becomes a record conflict rather than two financial entries. Existing identifiers are unchanged.
- Merge against the last acknowledged common revision. Independent ID-based records merge; changes to the same record/settings need an explicit choice. Non-ID configuration arrays are resolved as one field. Money, dates, identifiers, audit history and compatible unknown fields are retained. New edits during upload remain pending.
- Cloud publication uses an atomic expected-revision check. One browser account tab edits at a time using Web Locks; other tabs wait. This prevents stale tabs overwriting local cached records. Multiple devices remain supported.
- All AppData financial records/settings and statement rows/import metadata sync. Original PDFs, saved PDF passwords, credentials and device preferences do not. Manual export/merge remains available.
- Daily backups preserve the first successful cloud commit per UTC day, keeping the latest seven days on which sync succeeded. There are no copies for inactive days. A separate latest pre-restore checkpoint is kept when restoring. Backup errors are reported separately from a successful cloud commit.
- Restore previews changes, preserves device/cloud state and publishes the chosen copy as a new revision. Device recovery can be downloaded even if the cloud is unavailable.
- Account deletion requires the current password and typing DELETE. It removes cloud documents/backups through auth-user cascading deletion and clears device copies, including owned unassigned recovery data. Other synced devices retain offline access until they reconnect and then purge. External downloads cannot be erased remotely.

## Privacy and capacity

This is conventional cloud storage, not end-to-end encryption. Supabase/privileged backend operators can technically read financial records. Normal users are isolated. Browser-profile/devtools access can read device caches; use separate OS/browser profiles on shared computers.

The private account registry retains only the user UUID, a random deletion-status probe and a deletion flag after account deletion. This minimal tombstone lets previously offline devices detect deletion without a valid login. It contains no email or financial records and has no public table grants. Document this retained deletion marker in the privacy policy; deleting it prevents later offline-device cleanup.

Each commit is limited to 8 MB. Backups multiply storage consumption (up to seven daily documents plus a pre-restore checkpoint). Monitor free-tier database/storage limits. Quota/network failures preserve local work; automatic retries use bounded backoff and stop after three transient failures until manual retry/reopening. Free-tier project pausing is still possible. Application snapshots are not a substitute for an independent operator database backup and tested disaster recovery.

## Configure a synthetic Supabase project first

1. Disable **Allow new users to sign up** in Supabase Auth. A hidden signup button alone is not access control. Set minimum password length **12**, configure login abuse/rate protections, and enable MFA on administrator accounts.
2. Configure a custom SMTP sender with the necessary DNS records. Set the Site URL and exact allowed app-root redirect URLs, including trailing slash. Avoid wildcard production redirects.
3. Invite users through the Supabase dashboard/admin workflow. Never expose a service-role key or invitation administration in the browser.
4. Configure invite/recovery email links (SiteURL must be an approved exact app root):
   - Invite: `{{ .SiteURL }}?token_hash={{ .TokenHash }}&type=invite`
   - Recovery: `{{ .SiteURL }}?token_hash={{ .TokenHash }}&type=recovery`
   Tokens are consumed once across React StrictMode mounts. Verify actual email delivery, expired/used links, password recovery and rejected public signup in staging.
5. Apply `supabase/migrations/20261028_account_sync.sql` manually to the synthetic project. It creates only new sync tables/functions and does not restore bank-capture permissions. Browser roles have no table or RPC grants; owner policies provide defense in depth. The backend verifies the access token and derives ownership from the verified identity.
6. Set frontend build variables in a local ignored environment file / correct Netlify build context:

```
VITE_ACCOUNTS_ENABLED=true
VITE_CLOUD_SYNC_ENABLED=true
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

7. Set **server-only** Netlify function variables:

```
ACCOUNT_SYNC_ENABLED=true
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_SERVICE_ROLE_KEY
```

Never prefix the service-role key with VITE_. Use the same Supabase project for the browser and server. Keep bank capture disabled. Frontend and server sync flags default off independently. Use Netlify's local function emulator or a test deployment for real endpoint acceptance; plain Vite does not execute Netlify functions.

## Acceptance checks before live activation

- Use two synthetic accounts and two isolated devices. Confirm direct browser access to all three tables and the commit RPC is denied. Exercise backend identity checks: supplying a different userId must not change ownership. Confirm the account-status probe does not disclose deletion with an incorrect probe.
- Exercise concurrent commits to the real database: exactly one expected-revision write succeeds, the other conflicts; re-fetch and merge. Verify RLS/grants against actual authenticated and anonymous roles.
- Verify UTC first-copy-per-day retention over eight simulated days, no inactive-day copies, daily backup failure reporting, pre-restore preservation, restore failure safety, and storage-limit handling.
- Verify email invitations/recovery/password change, rejected public signup, session revocation, reauthentication on deletion and cascading deletion of documents/backups. Confirm a previously offline device purges after reconnecting.
- Reconcile representative existing synthetic financial data (counts, expense/income controls, imports, rules, unknown fields) through migration, reload and export. Export private backups from real devices before any live activation. Never overwrite live data for testing.
- Only after these checks: explicitly approve the target site's release, commit/push intended source, and deploy that source. Friends-beta is unchanged. Use [skip netlify] on synchronization-only commits.

## Repeatable local checks

```
npm run test:sync
npm run test:accounts-ui
npm run test:sync-ui
npm run typecheck
npm run build
```

Browser scripts require Playwright via PLAYWRIGHT_MODULE (or installed `playwright`) and Edge (PLAYWRIGHT_CHANNEL defaults to msedge). Authentication and cloud HTTP requests are fully mocked. Run accounts UI against a Vite server on 127.0.0.1:5184 with accounts enabled and sync disabled. Run sync UI against 127.0.0.1:5185 with both flags enabled. Both use the fake URL `https://accounts-test.invalid` and key `synthetic-publishable-key`; scripts never contact a real service. Override URLs with ACCOUNTS_TEST_URL / SYNC_TEST_URL.

Local model/server-boundary tests, mocked two-device merge/conflict/restore/deletion flows and builds have passed. Test-project SQL checks now verify RLS, denied browser table/RPC grants, backend RPC access, stale revisions, first daily snapshot, seven-day retention and pre-restore preservation. Hosted-function identity/isolation, concurrent database calls, SMTP recovery, token revocation and deletion still need real staging acceptance.

## Later encryption

Versioned cloud documents and separate serialization/transport keep financial logic independent. End-to-end encryption still requires a new key/recovery protocol and migration of current records, daily backups and pre-restore checkpoints; existing plaintext snapshots must be addressed explicitly. Do not promise that this future change is only a switch.

## Hosted login-only test — 28 October 2026

- Draft: https://account-login-test--harsh-finance-tracker.netlify.app/
- Draft deployment ID: `6ae18924e1327109fcaf7343`; built from source commit `3642813`.
- Test Supabase project: `finance-tracker-test`, reference `wztttircljpwhbolxbhd`, Mumbai.
- Build flags: accounts true; cloud sync false; bank capture false. Only the test project URL and public publishable key were supplied to the build. No service-role key was configured or exposed.
- Exact Site URL and one exact redirect allowlist entry point to the draft root above; no wildcard is allowed. Public signup is off and the minimum password length is 12.
- Invitation request accepted for the existing organisation owner's address using Supabase's restricted default sender. Supabase recorded a successful sign-in; the user confirmed starting a separate ledger and completing the synthetic local-save/reload test. Do not add friends as administrators to bypass sender restrictions.
- The draft is protected by Netlify team access. The owner may need to sign in to Netlify before reaching the app on another device. Do not make it public merely to bypass this prompt.
- Netlify showed 14 credits available for the cycle ending November 6. Draft deployment avoids the 15-credit production-deployment charge, but viewing traffic still consumes credits. No plan upgrade was made.
- Verified personal production remains deployment `6addbe76de3f555c86d8651c` created 25 October 2026; the draft was not promoted.
- Supabase memory-commitment warning remains under investigation. No database tuning, restart, paid compute upgrade or data removal was performed.

## Test sync activation progress — 28 October 2026

- With explicit approval, applied `20261028_account_sync.sql` to `finance-tracker-test` only. SQL Editor returned success.
- Ran `scripts/verify-sync-database.sql`; every assertion passed and fixture writes were rolled back. This does not prove simultaneous-request behaviour or the deployed HTTP boundary.
- Re-ran `npm run test:sync` and built locally with accounts/sync enabled and bank capture disabled; typechecks/build passed with the existing bundle-size warning. The hosted draft still uses its prior login-only build.
- Netlify billing showed **13.7/300 free credits remaining**, 19 production deployments consuming 285 credits, a $0 plan and no saved payment method. No plan change or deployment was made in this step.
- The cached CLI's `env:set --site` returned without persisting any settings. API verification found none of the three intended server variables. A subsequent Functions-only API request returned Forbidden; the dashboard confirms restricting scopes requires an upgrade.
- Netlify Free permits branch-specific values but uses broader build/function/runtime scopes (secret values exclude post-processing). Automatic approval review blocked that expanded scope pending explicit approval. No new server variables or privileged key have been saved. The unsubmitted secret form names only `account-login-test`; production, other deploy contexts and local development are blank.
- Continue only after scope approval and private user entry of the test-project service-role key. Never put that key in chat, source, frontend variables or logs. Keep all values exclusive to the named test branch, then perform at most one draft deployment and verify its context and unchanged production deployment.
