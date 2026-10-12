# Automatic minimal bank-alert capture

Status: minimal-data implementation prepared; database activation, authenticated browser checks and physical-iPhone tests pending. PR #2 remains a draft. Do not claim automatic pickup active.

The user selected minimal data instead of full SMS storage. No message_text column or p_text parameter exists in this receiver. Amount in integer paise, optional ISO transaction date, debit/credit, receipt timestamp and random capture ID are accepted. Source/user binding comes from the hashed, revocable, 90-day write-only key. Account/device labels and server receipt time are also stored. This is not end-to-end encryption; project administrators can access minimal financial metadata.

Local Shortcuts actions reject security/complex/ambiguous messages before transmission. The server can validate data types/ranges and credentials, but cannot independently determine whether numeric data came from an OTP because it never receives message text. Never claim server-side SMS scanning or OTP detection in this minimal design.

The Message-arrival trigger is distinct from notification banners. Follow IPHONE_MINIMAL_CAPTURE.md; validate real sender and a redacted bank sample before enabling the real automation. Generic extraction deliberately skips multi-amount messages and unsupported formats rather than guessing. Phone locked/banners disabled execution requires a synthetic end-to-end test. No guarantee for offline, paused backend or reboot-before-first-unlock; no durable phone retry queue yet.

Migration: supabase/migrations/20261012_bank_capture.sql. It creates two RLS tables with no direct anon/authenticated access. Owner-authenticated RPCs pair/list/revoke/read. Append-only ingestion requires a 256-bit source-bound token (SHA-256 only stored); version 2 exclusively. Idempotence compares device, amount, direction, bank date and receipt time. Device row locking limits new receipts to 500/day. No service-role key in clients. This fresh migration must abort if the older full-text draft schema exists; never leave an old text-taking RPC deployed.

Use the Supabase email template at supabase/templates/bank-capture-login.html for code-based installed-PWA sign-in. Existing Netlify private-site access gate is retained; Shortcuts posts directly to Supabase. No real credentials issued by deployment; owner creates the connection explicitly in the app. Default email service currently restricts recipient support to project-owner email.

Existing browser capture auth/owner guards and pinned JWTs remain. Stable receipt IDs, persisted batch proof and recovery replay preserve existing review decisions. Imported summaries have kind unknown because only amount/date/direction were transmitted; review them before posting. No transaction is posted by capture. Full financial synchronization is separate and unfinished. Auth-client consolidation is required before merging that feature.

Validation: npm run test:alerts, npm run test:capture, npm run typecheck, npm run build. SQL fixtures at supabase/tests/bank_capture_security.sql use synthetic accounts with guarded hooks and roll back; must execute successfully before activation. Protocol tests do not establish database security or locked iPhone delivery. Never commit/log real SMS, private keys or email sign-in codes.

Current verification: 21 existing alert checks and 17 minimal capture/extraction checks passed. TypeScript and production build passed. Migration plus ownership/revocation/replay/invalid-input fixtures passed in isolated PGlite PostgreSQL with a synthetic Supabase auth shim; this does not replace verification in the actual Supabase project. Live receiver preflight and iPhone tests remain separate.
