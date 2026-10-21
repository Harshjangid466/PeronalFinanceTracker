# Credit-card movement review and offsets

**Goal:** Clearly distinguish card purchases, repayments, cashback, refunds and fees; let Harsh hold source movements and confirm same- or cross-statement offsets, with only a confirmed net shortfall booked as expense.

**Architecture:** Keep original debit/credit rows and statement arithmetic unchanged. Optional movement-kind/hold/settlement metadata augments the existing archive. Audited settlement groups retain source snapshots and any replaced ledger entries; confirmation moves replaced entries to Deleted Transactions, posts a positive net expense if requested and permits an explicit undo. Payment and cashback credits cannot be consumed as purchase refunds.

**Tech stack:** Existing React, TypeScript, PDF.js, IndexedDB and local ledger; no dependencies or capture enablement.

## Constraints
- Amounts are positive integer paise; source direction supplies debit/credit semantics.
- Suggestions are candidates only. Never auto-match repeated equal purchases or force a net-zero balance.
- Hold and candidate search work across statements for the same card, without a monthly time cutoff.
- Keep raw rows, totals and audit history; cancellation changes recorded personal expense, never the bank statement.
- Existing posted entries change only after a preview and explicit in-app confirmation. Undo refuses to overwrite later edits.
- Missing source history, shared links, stale rows, removed imports and older backups must not double-post or resurrect settled ledger entries.

## Tasks
- [x] Add domain types, classification, candidates, hold, offset preview/apply/undo and validation with focused synthetic tests.
- [x] Wire persistence, backup, audit and source-removal guards; verify older schema and source totals.
- [x] Build a focused card review panel with clear debit/credit labels, kind filters, holds and a confirmation sheet for offsets/net expense.
- [x] Test existing statement/cashback flows, isolated mobile workflows, reload/export and typecheck/build.
- [x] Report verified Amazon/Flipkart export options separately; do not enable account connections or invent an import format.

## Local bug verification
- Added regression guards for restoring a net expense after undo, and restoring an already-deleted purchase while its source belongs to an active offset. These paths previously allowed double-counting. Restore controls and backup validation enforce the same restrictions; undone net expenses remain permanently deletable.
- Verified with isolated synthetic records, including cross-statement PDF import, partial/full offsets, holds, undo, Deleted Transactions, reload and backup export/restore. No production or live ledger changes made.
