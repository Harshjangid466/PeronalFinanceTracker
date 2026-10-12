# Current status: DISABLED by user request (13 October 2026)

All five capture RPCs have had PUBLIC/anon/authenticated execution permissions revoked. Live permission checks confirmed uploads, new phone connections and downloads disabled. Tables, functions, existing records, extraction rules and instructions are retained; no financial transaction data was deleted or changed.

The app now defaults VITE_BANK_CAPTURE_ENABLED to off and does not initialise capture authentication while off. For a future decision: obtain fresh approval, review retained keys and security tests, manually run supabase/manual/reenable_bank_capture.sql, then explicitly set VITE_BANK_CAPTURE_ENABLED=true for the production build and redeploy. Neither step alone enables the complete feature. Do not rerun the original activation migration as an accidental workaround. Physical-iPhone execution remains unverified.

Historical implementation and validation notes follow.

# Automatic minimal bank-alert capture

Status: minimal-data receiver activated and live synthetic security checks passed with rollback. App release/sign-in and physical-iPhone checks pending. Do not claim phone automatic pickup verified.

The user selected minimal data instead of full SMS storage. No message_text column or p_text parameter exists in this receiver. Amount in integer paise, optional ISO transaction date, debit/credit, receipt timestamp and random capture ID are accepted. Source/user binding comes from the hashed, revocable, 90-day write-only key. Account/device labels and server receipt time are also stored. This is not end-to-end encryption; project administrators can access minimal financial metadata.

Local Shortcuts actions reject security/complex/ambiguous messages before transmission. The server can validate data types/ranges and credentials, but cannot independently determine whether numeric data came from an OTP because it never receives message text. Never claim server-side SMS scanning or OTP detection in this minimal design.

The Message-arrival trigger is distinct from notification banners. Follow IPHONE_MINIMAL_CAPTURE.md; validate real sender and a redacted bank sample before enabling the real automation. Generic extraction deliberately skips multi-amount messages and unsupported formats rather than guessing. Phone locked/banners disabled execution requires a synthetic end-to-end test. No guarantee for offline, paused backend or reboot-before-first-unlock; no durable phone retry queue yet.

Migration: supabase/migrations/20261012_bank_capture.sql. It creates two RLS tables with no direct anon/authenticated access. Owner-authenticated RPCs pair/list/revoke/read. Append-only ingestion requires a 256-bit source-bound token (SHA-256 only stored); version 2 exclusively. Idempotence compares device, amount, direction, bank date and receipt time. Device row locking limits new receipts to 500/day. No service-role key in clients. This fresh migration must abort if the older full-text draft schema exists; never leave an old text-taking RPC deployed.

Current Free dashboard blocks email-template edits without custom SMTP or Pro. No upgrade/mail credentials configured. The app accepts a privately pasted ORIGINAL Supabase Sign in link, validates this project origin and verify path, then verifies its token_hash through the SDK. The default link must be copied without opening; app clears the field before verification. The old template file is an optional future SMTP template, not an applied configuration. Existing Netlify private-site access gate is retained; Shortcuts posts directly to Supabase. No real credentials issued by deployment; owner creates the connection explicitly in the app. Default email service currently restricts recipient support to project-owner email.

Existing browser capture auth/owner guards and pinned JWTs remain. Stable receipt IDs, persisted batch proof and recovery replay preserve existing review decisions. Imported summaries have kind unknown because only amount/date/direction were transmitted; review them before posting. No transaction is posted by capture. Full financial synchronization is separate and unfinished. Auth-client consolidation is required before merging that feature.

Validation: npm run test:alerts, npm run test:capture, npm run typecheck, npm run build. SQL fixtures at supabase/tests/bank_capture_security.sql use synthetic accounts with guarded hooks and roll back; must execute successfully before activation. Protocol tests do not establish database security or locked iPhone delivery. Never commit/log real SMS, private keys or email sign-in codes.

Current verification: 21 existing alert checks and 17 minimal capture/extraction checks passed. TypeScript and production build passed. Migration plus ownership/revocation/replay/invalid-input fixtures passed in isolated PGlite PostgreSQL with a synthetic Supabase auth shim; this does not replace verification in the actual Supabase project. Live receiver preflight and iPhone tests remain separate.

Live activation: approved receiver migration succeeded in project chochzrevigyghvhbsyp. Live tests verified owner-only reads/revocation, no anonymous reads/pairing, source binding, replay, invalid fields, expired/revoked keys and daily quota; all synthetic fixtures rolled back. Real user records were not changed. No real phone key created. Capture depends on user setup and a locked-phone test.

Public HTTP checks: invalid fictional capture key -> HTTP 400/P0001; anonymous read and pair -> HTTP 401/42501. Current capture/sign-in protocol checks: 19 passed; production build passed with the existing Excel chunk size warning. Email template remains unchanged. No real SMS or phone key was used.
