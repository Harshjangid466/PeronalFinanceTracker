# Manual bank-message review

Added to the existing Transactions screen: **Check bank messages / Alert inbox**.

Choose the account, paste one message or separate messages with blank lines, and save references. The HDFC Savings source is initially selected when available; the user must verify account selection. Extraction is deliberately conservative: unknown dates/amounts remain unknown; OTP/security messages are rejected. No external AI service or bank connection is used.

Alerts have stable IDs and remain separate from financial transactions. Suggested matches require confirmation, exact paise amounts, the same source, compatible debit/credit direction, and dates within three days. Similar alerts are retained and flagged. Ignore requires a reason; review can be reopened. Linked transaction edits/deletions reopen review; original deleted entries can be restored.

Preparing an entry requires valid reviewed details and an explicit transaction type. Existing shared forms perform final validation and require Save. Refunds, failed payments and own-account transfers cannot be posted as ordinary expenses through this preparation flow. No automatic posting or silent duplicate suppression.

The optional `bankAlerts` collection is an additive schema-v4 extension, included in migrations, existing local persistence, backups, ID-based restore, audit history and the pending cloud merge design. It does not alter the seven transaction types or financial effects.

Validation: 22 alert-review checks and 23 existing cloud-merge checks passed; production build and TypeScript passed. All fixtures are synthetic. Browser/physical-iPhone workflow verification is tracked separately; do not infer it from unit results.

Not included yet: SMS inbox access, Shortcuts automation, push reminders, bank-statement import/matching or balance reconciliation. Existing expense-template import is not a bank reconciliation feature. Cloud synchronization remains unfinished/unverified. The inbox says only that captured alerts are accounted for, never that all bank transactions are reconciled.

Preserve the unpublished cloud-hook edits in the existing Codespace. Do not deploy the unfinished cloud branch merely to release this feature; port the alert changes onto the current production branch and verify separately.
