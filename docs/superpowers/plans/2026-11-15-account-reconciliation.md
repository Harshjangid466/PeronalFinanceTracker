# Account reconciliation and statement tracker implementation plan

**Goal:** Show which account statements have been imported and which movements still need attention.

**Architecture:** Derive a read-only summary from existing statement batches, source rows and current ledger links. Add a compact expandable section in Imports & review using the existing styles and batch review controls. No storage changes, new dependencies, external services or deployment.

**Scope:** Main app only. A month means the statement's ending month, not calendar-day coverage. Paytm is supplementary UPI activity, never evidence of a complete bank statement. Missing imports are described as absent records, not confirmed missing transactions. Preserve all existing data and unknown backup fields.

## Tasks

- [x] Add `src/data/accountReconciliation.ts` and `scripts/verify-account-reconciliation.cjs`: selected-month account summaries, six-month history, unique row counts, live link validation, source population/balance checks, incomplete/legacy imports, cash exclusion and unlinked app entries.
- [x] Add `src/components/AccountReconciliation.tsx` to StatementWorkspace: accessible month input, account status/periods/counts, missing-statement history and buttons selecting existing review controls. Match existing cyan/slate palette, system font and mobile stacked layout.
- [x] Verify model regressions and production browser flows at 390px/1280px, including navigation to review, changed/deleted links, reload, backup export/restore and no accidental ledger writes. Run typecheck/build and existing import UI regressions.
- [x] Update PROJECT_HANDOVER.md and back up intended source on GitHub with `[skip netlify]`. Leave beta and Netlify unchanged.

## Review focus

Overlapping/repeated imports must not double-count movements. Old imports with missing row IDs must use their original batch association. Multi-account Paytm must not certify bank coverage. Deleted/edited linked entries must reopen review. Non-calendar billing cycles and gaps must remain explicit. Unknown opening/closing balances must never produce a verified arithmetic label. Storage loading/errors must not masquerade as missing statements.

## Validation

15 focused model checks pass. Production browser checks at 390px/1280px pass, including actual backup export/restore, unknown field preservation, unchanged ledger/action log during navigation, IndexedDB reload, stale links and an unavailable archive. Existing statement and card-reconciliation model suites and real synthetic PDF-import browser regressions pass. Frontend/function typechecks and production build pass; existing PDF/Excel chunk-size warnings remain. No physical-device test or live financial data used.
