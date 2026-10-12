# Automatic bank-alert capture

Status: implementation prepared, database activation and authenticated/physical-iPhone validation pending. Do not report automatic pickup active before end-to-end verification.

This feature is independent of unfinished full financial-data synchronization. It adds a private online receipt inbox and source-bound, revocable, 90-day write-only phone keys. The Shortcut submits directly to the existing Supabase project, so Netlify's private-site login gate does not block closed-app submissions. It never submits a financial transaction.

## Database and security

Run `supabase/migrations/20261012_bank_capture.sql` in the existing project's SQL Editor only after reviewing/authorizing the new capture connection. It creates two RLS-enabled tables with no direct anonymous/authenticated table access. Pair/list/revoke/read RPCs require authenticated ownership. Anonymous ingest requires a 256-bit capture token; only its SHA-256 hash is stored. Source and user ownership come from that token's server-side record, never from message payload fields.

Set the Supabase Magic Link email template to `supabase/templates/bank-capture-login.html`, which includes the existing `{{ .Token }}` OTP as well as the browser link. This lets the user sign into the installed iPhone PWA with a code instead of unintentionally signing into a separate Safari storage container. Do not claim PWA sign-in verified before the owner completes it.

Ingest rejects OTP/security text, unsupported versions, invalid/oversized payloads and expired/revoked credentials. Same capture ID is idempotent only for identical device/message/receipt-time; reuse for a different message is rejected. Device row locking enforces a 500 accepted-message/day limit. No service-role key is required in the app or the Shortcut.

Each account may have up to 32 active source-bound keys, covering the existing bank/card masters. Public HTTP access to ingest is credential-protected and append-only; activation requires review/confirmation of this new access and storage of selected bank-message text online. No real phone key is issued by installation; the owner explicitly creates it in the app. Supabase Free inactivity pausing and Shortcuts network/runtime restrictions mean unconditional always-on delivery is not promised.

## App and phone

`Connect iPhone automatic bank alerts` is inside Transactions → Alert inbox. Sign in using the project-owner email while the default Supabase email restrictions apply. Explicitly connect the browser, select the bank source, acknowledge the transmission consent, and create a phone key. Its plaintext is shown only during setup; metadata can later be listed/revoked. Sign-out retains local records and does not revoke an already configured phone key. Another capture account cannot attach to the same browser automatically.

The app imports batches of 100 when open, on focus/reconnection and every 30 seconds while visible. Stable owner-scoped receipt IDs prevent repeated imports from replacing review decisions. The checkpoint advances only after confirming the existing local-storage copy contains the imported references; its saved batch-ID proof also detects a stale-tab overwrite and restarts recovery. A Recover received alerts button replays server receipts without replacing local review decisions. Raw server receipts remain retained; no destructive acknowledgement or deletion is performed. Account-epoch guards and pinned user JWTs prevent late responses/account switches from mixing deliveries. Checkpoint ownership also respects the unfinished full-sync branch's finance-cloud-owner marker. Before integrating full sync, consolidate its auth client with capture authentication to avoid two clients competing for a sign-in callback.

Receiver: `${VITE_SUPABASE_URL}/rest/v1/rpc/ingest_bank_capture`.
Shortcuts headers: `apikey` = public publishable key; `Content-Type` = `application/json`.
JSON fields: `p_token` = private phone key, `p_capture_id` = receipt date/time plus Random Number, `p_text` = incoming Message text, `p_captured_at` = ISO-8601 receipt timestamp, `p_version` = number 1. The phone key belongs in the HTTPS body, not a URL or an Authorization bearer JWT header. Expected response: `{accepted:true,captureId:...}`.

Use a Message-arrival automation for the actual bank sender(s), Run Immediately, and Run Shortcut with the incoming message passed as Shortcut Input. Reject OTPs before transmission; server-side rejection is a second safeguard. No Open App/Open URL/display actions in the capture path. First run unlocked for Apple permission prompts, then verify with banners disabled, device locked and tracker closed. Do not assume every action runs while locked. Native Shortcuts network errors can stop execution; offline/reboot-before-first-unlock recovery is not guaranteed. Statement reconciliation remains necessary.

## Validation gates

- `npm run test:alerts`, `npm run test:capture`, `npm run build`.
- Execute isolated transactional SQL ownership/revocation/replay tests before deployment; no actual financial records or user messages in fixtures.
- Verify anonymous ingest without a valid key cannot submit/read data; owner A cannot list owner B's records; keys cannot read/update financial snapshots.
- With the owner's explicit setup, test a synthetic message through the actual Shortcut and verify one retained alert, zero financial postings. Repeat locked/banners off, invalid/revoked keys, duplicate delivery, offline failure and app restart.
- Never commit or log private keys, email sign-in links or real message contents. Existing bank records and unresolved cloud-hook edits must be preserved.
