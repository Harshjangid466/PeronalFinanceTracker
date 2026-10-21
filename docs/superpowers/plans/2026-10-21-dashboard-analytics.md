# Dashboard analytics implementation plan

**Goal:** Replace overlapping home summaries with a visual, explainable monthly dashboard and editable transaction drill-downs.
**Architecture:** Derive integer-paise analytics from active ledger entries and existing statement metadata. Use React and accessible SVG/CSS charts, existing sheets/forms and monthly income settings. No new dependencies, connections or storage schema changes.
**Design:** Existing system type, slate ink/background (#0f172a/#f8fafc), teal spending (#0891b2), amber income (#b45309), violet investments (#7c3aed), rose variances (#be123c). A wide analytics canvas on desktop and stacked mobile sections. Emphasise a cumulative spending plot; keep supporting charts quiet and labelled. All charts have textual values and keyboard-operable drill-down controls.

- [x] Add a pure monthly analytics helper and focused assertions for signs, paise, income overrides, comparable periods, missing data, filters, refunds and deleted entries.
- [x] Build the dashboard: monthly/account filters, income editor, category composition, cumulative comparison, six-month trend, daily calendar, merchants/modes, weekly summary and allocations; reuse transaction edit sheets.
- [x] Simplify Home while retaining quick entry, ledgers, recurring navigation and recent transactions. Preserve unrelated CC work.
- [x] Verify synthetic desktop/mobile empty/populated states, chart drill-down/edit/reload, account/month changes, keyboard controls, console errors and overflow. Run typecheck/build and relevant regressions.

**Accounting boundaries:** Personal spending is active Revenue Expense only. Income overrides are a monthly total and never added to ledger income. Without an override, recorded income is explicitly labelled partial. Account-filtered income uses that account's ledger only. Income less personal expense is not confirmed savings. Investments, capital expenditure, lending, recovery and household allocations stay distinct. Pending/unavailable imports remain visible. Do not infer bank balances, fabricate missing months, or treat zero as missing.

**Validation:** 197 focused and existing statement/card/cashback/parser assertions passed. Isolated Edge mobile (390px) and desktop (1440px) exercised category/day/mode drill-downs, editing, monthly income, filters, reload, empty data, keyboard actions and source status. Light/dark screenshots inspected. Existing card reconciliation browser workflow and production typecheck/build passed. Existing large PDF/Excel bundle warnings remain. No live ledger mutations, schema changes, capture activation or deployment. Physical iPhone remains untested.
