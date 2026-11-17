# Spending patterns implementation plan

**Goal:** Build the approved observational spending/vendor/day/recurrence workspace with evidence and explicit CAPEX review.
**Architecture:** Pure derived data in spendingPatterns.ts; a focused React workspace reuses Sheet, TransactionForm and existing drill-downs. SpendingCoach provides a Patterns/Detailed switch and preserves the existing PersonalAnalysis implementation.
**Tech stack:** Existing React 18, TypeScript, CSS, lucide-react, Node assertion harness and Playwright. No dependency or financial storage change.
**Spec:** ../specs/2026-11-17-spending-patterns-design.md

## Review focus

Negative credits must reduce totals without becoming purchases. Short prior months must not inflate comparisons. Unknown vendors and missing data must not create confident claims. A CAPEX preview must retain linked financial protections and make outflow unchanged. Existing detailed/Planning entry points and unrelated work must remain available.

## Tasks

- [x] Model: add src/data/spendingPatterns.ts with spendingPatterns(data,month,today,account), vendorKey, visitScenario and canReviewCapex. Tests in scripts/verify-spending-patterns.cjs pin spec thresholds and all review-focus cases before UI work. Reuse personalAnalysis and dashboard helpers without changing their existing contracts.
- [x] UI: add src/components/SpendingPatterns.tsx and .css. Implement Signals/Vendors/Days/Recurring, evidence and scenarios; CAPEX preview/validated edit via existing Sheet/TransactionForm. Add patterns/detailed toggle in SpendingCoach, preserve mounted state and explicit shortcut behavior. Pass recurring navigation from Home through AnalyticsDashboard.
- [x] Browser validation: scripts/verify-spending-patterns-ui.mjs uses isolated synthetic ledger, archive, unknown metadata and signed credits. Assert no writes on exploration/cancel, correct explicit reclassification with ID/amount preserved, reload and backup roundtrip, empty/missing history, accessible controls and 390/1280px layouts.
- [x] Integration: add package scripts and concise feature documentation. Run focused model/UI checks, storage and existing analysis/finance regressions, typecheck and build; inspect screenshots. Record actual limitations. Do not push or deploy.

The user explicitly requested implementation of the reviewed mockup in this chat; implement natively here after the design ambiguity check. No further approval interview is needed for the documented routine choices.

## Result

Implemented locally on personal main. Sixteen new model checks pass. Actual production-browser checks pass at 390/1280px plus a 320px empty state: all views, merchant scenario and evidence, keyboard tabs, account scope, no writes during exploration/cancel, guarded and validated CAPEX save with original ID/date/amount/source/unknown fields retained, reload and complete backup/merge. Existing PersonalAnalysis passes at 320/390/1440px; Home and interactive dashboard browser suites pass; save/reopen still passes three full browser restarts, quota/recovery and two-tab checks. Existing statement, dashboard, coach, insight-feed, card, money-link and sync/server model suites pass. Frontend/function typechecks and production build pass, with existing large bundle warnings. Screenshots are in artifacts/spending-patterns. No live data, physical iPhone verification, push, deployment or integration activation. The mocked cloud-AI browser harness was updated for the new Detailed analysis entry point but was not rerun; no hosted AI call was made.
