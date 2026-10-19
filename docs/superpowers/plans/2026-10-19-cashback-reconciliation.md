# Cashback Reconciliation Implementation Plan

**Goal:** Retain per-transaction earned cashback and reconcile it with actual credit in the next statement; recognise income only from actual statement credits reviewed and posted by Harsh.

**Architecture:** Optional row cashback metadata and printed batch cashback controls travel through existing statement persistence and backups. A pure comparison checks same-account adjacent statements, deduplicates identical imports and refuses unclear source controls. A compact import panel shows earned, received and differences; actual cashback credits suggest Income Misc during the existing review workflow.

**Tech Stack:** Existing React, TypeScript, PDF.js and IndexedDB. No dependencies or capture/Gmail activation.

**Spec:** User confirmation in this chat, 19 October 2026: record income on actual credit and compare previous statement expected cashback with current actual credit.

## Constraints and review focus
- Preserve ledger, import decisions, unknown fields, identifiers and financial amounts.
- Earned rewards and their reversals are signed metadata, never synthetic bank movements or income.
- Cycle cashback and immediate rebates stay separate. Missing data is unknown, never zero.
- Compare only adjacent, unambiguous statements for the same account; don't reuse duplicate files or force matches.
- Existing bank rows remain subject to review; repeat posting and import cannot duplicate income.

### Task 1: Source metadata and persistence
- [x] Add optional per-row signed earned amount and actual cashback credit kind; add printed earned/credited controls per batch.
- [x] Add failing source tests for debit reversals, zero rewards, cashback summary and unchanged financial totals; implement generic column/label extraction.
- [x] Validate new fields and preserve older imports, decisions and metadata on repeated uploads and backup merge.

### Task 2: Comparison and review
- [x] Add pure cashback comparison with tests for adjacent cycles, account separation, duplicate/conflicting imports, gaps, incomplete metadata, exact shortfalls/excess and unposted income.
- [x] Add compact cashback panel, per-row reward display and actual-credit income suggestions to the existing review flow.

### Task 3: Verification
- [x] Run bank PDF and statement suites, typecheck and build.
- [x] Verify supplied Axis PDF locally, plus isolated mobile upload, review/post, duplicate prevention, reload and backup roundtrip; use synthetic prior-cycle records.
- [x] Leave production deployment separate and report limits, including physical iPhone testing.

