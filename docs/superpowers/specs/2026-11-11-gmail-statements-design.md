# Gmail statements and missing transactions

Status: deferred. On 14 November Harsh chose direct PDF sharing into the installed web app for this task. Gmail connection and polling below remain a proposal, not implemented or activated. See docs/PDF_SHARING.md for the implemented flow.

## Agreed purpose

Harsh wants periodic credit-card and bank statements found in Gmail, compared with manually recorded transactions, and transactions missing from the app surfaced for review. Checks run while the app is open. This does not mean overdue credit-card-bill detection.

## Proposed first release

Work on personal main only. Add Gmail setup and a statement inbox to Imports & review using existing form components. Connect Gmail through Google's browser OAuth flow with read-only Gmail permission; Google login and consent happen on Google's screen. Never ask for a Gmail password. A Google OAuth web client ID and approved app origins are prerequisites for real connection; the code and synthetic tests can be completed before those are configured.

The user connects one Gmail mailbox per browser session, chooses an initial lookback (default 90 days), and explicitly enables checking while open. Check on demand and every 30 minutes while visible and authorized; avoid overlapping checks and catch up once when the tab becomes visible. Tokens remain in memory, never in backups or logs. When authorization expires, show Reconnect Gmail; do not silently renew through a background service. Disconnect revokes authorization where possible, stops polling and clears the session inbox. The app must remain usable if Google cannot be reached.

Search for likely statement emails with PDF attachments, using statement-related subjects and bounded dates. Follow pagination within explicit per-check limits, showing if older results remain. Traverse nested MIME attachments. List candidates with sender, date and filename; email content is untrusted and must render as text. Do not treat the sender, filename or an email instruction as proof of an account or a valid financial statement. Do not follow statement download links or execute HTML. Read-only Gmail permission is mailbox-wide; filtering is an app behavior, not a Google-enforced statement-only access boundary. Explain this at connection time.

The user selects an existing account and either Bank / credit card or Paytm UPI for each candidate. Account selection is required; suggestions must not silently choose. Download a selected PDF directly from Gmail into the browser and reuse the existing local readers, source count/total checks, encrypted device-local password vault, account mapping and preview. If a password is absent/wrong, keep the attachment retryable. Never retain raw PDFs, email bodies or credentials in the ledger. Passwords and Gmail access are excluded from backup and cloud sync. A candidate download failure must not fail other inbox items.

Preview distinguishes already recorded entries, possible matches and unmatched movements. Reuse existing exact-reference and unique-account/date/amount/direction/merchant matching. Do not call a possible match a confirmed missing transaction. Invalid source totals, unsupported formats or ambiguous account mapping block import with an explanation. All Gmail imports require explicit confirmation and keep unmatched movements pending even when an existing habit would normally auto-post them. Exact matches may be linked without creating an entry. Existing manual uploads retain their behavior.

After confirming an import, open its existing reconciliation summary and review queue. Show statement-only movements, app entries not linked to this statement, and source control differences using the existing reconciliation logic. An app entry absent from a statement is a review item, not proof it is wrong. Preserve expense-credit signs, CAPEX fields, manual entries, logs and unknown backup fields.

Prevent repeat processing in the current inbox using mailbox/message/attachment identity. Existing statement-row deduplication remains authoritative across sessions and for the same PDF uploaded manually or forwarded under another message ID. Only a successful confirmed import marks an inbox item processed; an abandoned preview or failed parse stays retryable. Do not store a success marker before the statement archive is durable. Session inbox metadata is discarded on disconnect/reload; processed statement history remains in the existing archive.

## Boundaries and validation

No server scheduler, refresh-token storage, AI service, bank-alert capture, beta modification or Netlify deployment. Finding a statement does not authorize posting transactions or enabling any existing disabled capture integration. Gmail access starts only after user connection and Google consent.

Use no new dependency if Google's hosted identity library and fetch suffice. Keep source changes small by passing a downloaded File into the existing upload preview rather than duplicating parsers. Adapt the import entry point with a review-only option for Gmail; do not change ledger schema or existing storage namespaces.

Tests use fake Gmail responses and synthetic PDFs, without contacting a real mailbox: pagination and scan limits, nested attachments, suspicious MIME/filenames, denied/expired access, rate limits, disconnect during download, mailbox changes, password retry, source-control failures, duplicate/repeated/manual-upload imports, review-only posting, signed expense credits, reload/backup recovery and mobile/desktop flows. Run typecheck, build, statement/parser/card checks and affected browser tests. Live OAuth cannot be claimed verified without configuring a client and completing an actual Google consent flow.

Builder choices: 90-day initial lookback, 30-minute visible-tab checks, one mailbox per session, PDF attachments only, explicit per-attachment account mapping, no persistent email cache. These are proposed defaults, not choices already agreed by Harsh.
