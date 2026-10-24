# Home refinement

**Goal:** Make the everyday iPhone home a short financial overview while keeping every detailed chart and AI control available.

**Design:** Native system typography (SF on iPhone, Segoe UI on Windows), large tabular spending figures and restrained type weights. Palette: midnight #142f43, teal #087f8c, paper #ffffff, mist #f3f6f8, steel #607587, amber #a46a16. One distinctive spending panel; supporting values are quiet text, not repeated cards. Left aligned, generous space, 44px mobile controls. No gradients, decorative numbering, new dependencies or external fonts.

**Layout:**
```
Finance                    New entry / More
Month                      Account
Overview     Insights      History

Personal spending          compared with prior period
Income       Remainder     Invested
Petty payments             Card spending
Top three categories       All categories
Recent entries             View all
```
Insights retains the full coach, evidence, habits and cloud review. History retains the existing six-month chart, calendar, payments, merchants and allocation views. Switching sections preserves mounted analysis state. Mobile stacks the spending panel and keeps the supporting row concise. Explanations move behind Coverage/Calculation details.

**Critique:** A cosmetic recolour would keep the information overload. Remove the always-expanded analytical workspace from the default screen; do not add another chart or carousel. Use one visual emphasis, fewer visible rows and explicit destinations.

- [x] Implement section navigation, short overview and home styling using current financial helpers.
- [x] Preserve income editing, date/account filters, all chart drill-downs, recent-entry editing and AI consent state.
- [x] Update synthetic UI tests for the new navigation; verify 320/390/1440px, keyboard, dark/light, empty data and state retention. Run frontend/function checks, build and financial regressions.

Historical dates are supported but the current trend/cloud summary is six months at a time. Do not claim four-year storage capacity or all-history AI analysis without scale validation. No storage/schema changes, credential activation or deployment in this UI task.

**Validation:** 69 focused financial/AI/geometry assertions passed. Isolated synthetic Home tests passed at 320, 390 and 1440px, with dark/light screenshots inspected, keyboard navigation, top-category evidence, historical 2022 month selection, explicit zero income, new entry and recurring navigation. Existing dashboard edit/filter/reload and empty-state workflows passed; mocked AI mobile/desktop tests verified results survive Home-section switching without extra requests. Frontend/function typechecks and production build passed. Initial main JavaScript fell from 499.94 kB to 458.63 kB minified. No ledger changes, live API requests, physical iPhone or four-year storage benchmark, or deployment.
