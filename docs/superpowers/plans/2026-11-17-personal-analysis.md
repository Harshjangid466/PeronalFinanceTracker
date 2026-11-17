# Personal transaction analysis implementation plan

**Goal:** Extend Home → Insights with local planning and recurring-payment review.

**Architecture:** A pure analysis function reads the existing INR ledger without changing storage. A Planning tab reuses the current insight styles and transaction evidence sheet. No external services or new dependencies.

**Scope:** Personal transaction analysis, as selected by Harsh. Three-month outlook, adjustable income and spending assumptions, monthly repeated-payment candidates, and supporting entries. Forecasts describe income less personal spending, not bank balances or confirmed savings.

## Tasks

- [x] Add `src/data/personalAnalysis.ts` and `scripts/verify-personal-analysis.cjs`. Use integer paise, active INR entries, expense credits, account scope, entered income overrides including zero, and three completed calendar months. Missing history/income remains unknown. Test boundary dates, sparse data, recurring false positives, and no mutation.
- [x] Add `src/components/PersonalAnalysis.tsx` and its scoped styles; integrate a Planning tab in `SpendingCoach.tsx`. Show historical evidence, editable session-only assumptions, monthly outlook, and candidate annualized cost. Keep recurrence evidence separate from the forecast to avoid counting it twice.
- [x] Verify desktop/mobile, empty data, input validation, evidence, filters, reload and unchanged stored records using synthetic browser data. Run typecheck, build, new checks, and existing analytics checks.

## Constraints and checks

- No migrations, ledger writes, automatic categorization, bank connections, cloud requests or deployment.
- Incomplete history is not zero spending. Recorded income is possibly incomplete. Current partial months never enter the historical average.
- Repeated merchants are candidates, not confirmed subscriptions; require three consecutive monthly payments, similar amounts, and monthly spacing.
- Preserve all pre-existing working tree changes. Use the existing React/TypeScript/Vite stack and visual language.


Validation: 9 new calculation checks, 53 existing analytics checks, new Planning and existing Home browser checks at 320/390/1440px. Verified light/dark layouts, evidence drill-down, filters, input validation, reload and unchanged synthetic records. Typecheck and production build passed; Vite retains its existing large-chunk warning. No release performed.
