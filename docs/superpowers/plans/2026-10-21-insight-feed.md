# Explainable financial insight feed

**Goal:** Extend the approved spending coach from summaries into a ranked feed answering what changed, measurable reasons for the change, and what requires review.
**Architecture:** New pure `insightFeed.ts` derives evidence-backed stories from the existing scoped coach analysis and income settings. `InsightFeed.tsx` uses current dashboard styles and evidence callbacks; no ledger/schema changes, LLM connection or deployment.

- [x] Implement ranked observed/review findings: complete spending bridge, petty/card frequency and ticket-size breakdowns, category/vendor contributions including decreases, comparable income/remainder bridge, missing coverage, payment misclassification, cashback variance, fees and older held movements.
- [x] Assert paise reconciliation, offsets, cohort overlap, evidence membership, missing vs zero income, comparison basis, date/account scopes, absent baselines and priority/deterministic ordering.
- [x] Add compact feed with Changes/Needs review filters, progressive disclosure, calculation details, ledger/source evidence and suggested next steps. Reuse existing coach drill-downs and edit flow.
- [x] Test mobile/desktop interactions, filters, evidence/edit, reactivity/reload and empty states; run existing regressions, typecheck/build and inspect synthetic screenshots.

**Accounting:** Changes are arithmetic attribution, never inferred intent or causal certainty. Category and vendor views describe the same expenses and are not additive. Monthly income overrides replace recorded income. Income comparisons disclose input basis, and changes in income remainder are not confirmed savings. Source credits/fees/held items are not automatically booked, added to expense or treated as overdue refunds. Review states are current states for movements dated through the selected period. All user data stays local.

**Validation:** 17 feed assertions plus 213 existing coach/dashboard/statement/card/cashback/parser checks pass (230 total). Feed filters, calculation details, source and ledger evidence, continued edit/habit/scenario behavior, account/month filtering, reload and empty states passed in isolated Edge mobile 390px and desktop 1440px; no page errors or overflow. Synthetic light/dark dashboard and feed screenshots inspected. Existing card offset/hold/undo/backup browser flow passed. Final typecheck/build and diff check passed; existing PDF/Excel chunk warnings remain. No deployment, external model calls or live data modifications; physical iPhone not tested.
