# Transfers, reimbursements and backup health implementation plan

**Goal:** Implement priorities 3–5 in order on main, with explicit review, reversible financial changes and device-local backup reminders.

**Architecture:** Reuse existing statement rows and ledger signs. Transfer groups retain source and linked-entry snapshots, exclude linked spending/income through existing soft deletion, and undo together. Reimbursement claims link a positive Revenue Expense to separate negative Revenue Expense credits without changing either amount or posting twice. Backup health uses device/account-scoped download metadata and the existing action log; no cloud service or background job.

**Constraints:** No Netlify deployment or beta change. Preserve existing financial data, unknown fields, account mappings, logs and backups. No new dependencies. Positive integer paise source movements; negative Revenue Expense credits. No forced matches or adjustments. Existing integrations stay disabled.

## 3. Transfer linking

- [x] Add transfer model, shape validation and focused tests for equal/opposite movements between different accounts, duplicate source evidence, active links, unsafe existing ledger candidates, affected-row snapshots, undo and stale snapshots.
- [x] Integrate persistence/backup/sync validation and guard review, removal, restore, card offsets and permanent deletion. Keep original amounts and dates; display excluded app entries before confirmation.
- [x] Add an expandable transfer panel in Imports & review with candidate selection, explicit confirmation, linked history and undo.

## 4. Reimbursement tracking

- [x] Add claims with expected amount, person, original expense and individual credit links; validate metadata and unique allocations. Derive received, remaining, excess and changed/deleted-link warnings without mutating ledger values.
- [x] Add tracking in Transactions with open/settled history, add/remove credit links, close/reopen tracking and direct access to existing manual credit entry.
- [x] Cover partial/multiple credits, expense-credit signs, edited/deleted transactions, duplicate allocation, reload and backup compatibility.

## 5. Backup health

- [x] Centralize download handling, store a device/account-local receipt only after download is requested, expose last request and logged changes, weekly reminders while app open and one-click download on Home/Settings.
- [x] Keep incomplete/unavailable statement history explicit; never label a partial download as a complete backup. Do not claim the browser verified the saved file.

## Verification and delivery

- [x] Run meaningful model, persistence/backup/sync and existing statement/card regressions; frontend/function typechecks and production build.
- [x] Verify real production UI at 390px/1280px using synthetic fixtures, actual export/restore, reload, transfer undo and net expense totals. Inspect screenshots and console errors.
- [x] Update glossary/handover; commit and push only intended source with `[skip netlify]`.

Review focus: old backups must not resurrect excluded transfer entries; source repeats and card offsets cannot reuse a linked movement; changing claim entries must warn rather than lose data; credits remain on their own dates and categories; backup metadata is separate per account and never a promise that a download was saved.

## Results

21 focused model/backup cases pass. Existing statement, card and account-reconciliation regressions, sync model/server checks, frontend/function typechecks and production build pass. Production browser workflows pass at 390px/1280px, including real complete/partial downloads, restore, reload, transfer undo/locks, separate reimbursement credits and net spending. Existing PDF-import and expense-credit UI suites pass. Screenshots inspected; no browser errors or external requests in isolated tests. Physical phones remain untested. PDF/Excel and main-bundle size warnings remain. Source-only synchronization; no Netlify or beta release.
