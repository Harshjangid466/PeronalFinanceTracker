# Spending patterns and vendor insights

Approved direction: Harsh asked to build the clickable spending-insights mockup into the personal app. He wants observations about large Misc entries, frequent/high food, dining and commute spending, expensive days, sharp increases and recurring payments. He decides necessity. Never label spending wasteful or change records automatically.

## Product and integration

Home → Insights opens a new spending-patterns workspace with Signals, Vendors, Days and Recurring views. Keep the existing SpendingCoach, Planning, AI consent, charts and review tools available under a Detailed analysis action. Keep mounted view state while switching. Explicit Home petty/card shortcuts continue to open their existing detailed views. Follow the existing navy/teal, system-font, light/dark responsive design; 44px targets, labelled inputs, keyboard tabs, safe-area clearance and semantic tables/cards.

All analysis runs locally over actual ledger records. No new service, dependency, bank/capture activation, deployment or primary storage schema change. Preserve the existing uncommitted persistence/redesign and PersonalAnalysis work.

## Money, dates and evidence

- Eligible records: active INR Revenue Expense (including configured custom types with that canonical financial behaviour), dated no later than the selected period end. Preserve distinct IDs even when amounts/dates/vendor names coincide. Source statement rows are evidence, not extra expenses.
- Positive payments make up paid spending and payment/visit counts. Negative expense credits reduce net spending and are displayed separately. Category/vendor/day shares use positive paid spending, explicitly labelled. Undefined denominator means unknown, never NaN or invented zero.
- Show full selected-month totals through today or historical month end. Comparisons use the first min(elapsed selected-month days, previous-month calendar days) days of BOTH months. Display both actual comparison ranges; keep the comparison's totals separate when the selected month has extra days. Missing prior expenses means no recorded comparison baseline, not proven new spending.
- Week means Monday–Sunday using UTC calendar arithmetic over ISO posting dates, clipped at selected period end, and may include the preceding month. Day shares state both monthly and actual week ranges. No inference that the ledger is complete.
- Findings retain exact transaction IDs, source dates and amounts. Existing drill-down/edit tools show evidence; visiting analysis, searching, changing views or exploring scenarios never changes the ledger or action log.

## Signals and defaults (builder choices)

Review thresholds are observations, shown in calculation details, not personal budget inputs: frequent = at least 5 positive payments on 3 dates; sharp increase = at least 25% AND ₹500 above a positive comparable baseline; repeated/high share = at least 3 payments on 3 dates and 10% of period paid spending; large Misc = at least ₹1,000 and 20% of that category's paid total; concentrated day = at least ₹500, with at least 3 paid dates in the month, and 25% of month or 50% of its week. Rank and cap the default feed at 8 findings; all rows remain available in the other views.

Builder-check resolution: sharp-increase signals compare **positive paid spending**, not net spending. Changed refunds alone must not produce a buying-more signal. Net changes and the signed credit difference remain visible separately. This resolves the reviewer's only material question without changing the user's observational scope.

Category groups are scoped by transaction type and category ID/name; identical category names under distinct custom types stay separate. Prioritize the largest observed changes and high-frequency/high-share groups, so food/commute/dining naturally surface without guessing a user's category meanings. A group observed once is labelled “One observed payment”, not conclusively one-time.

## Vendors and scenarios

Group by existing merchant ID when present, otherwise NFKC/case/whitespace-normalized purchasedFrom or heading. No fuzzy aliases, UPI-reference stripping or external enrichment. Unknown/generic descriptions remain visible but cannot create vendor-pattern or recurrence claims. Show paid amount, credits/net, count, active dates, average positive payment, prior values and changes. Decompose positive-payment changes exactly: frequency = round((new count − old count) × old average); average-size contribution = gross delta − frequency. Explain refunds separately.

The scenario slider reduces positive-payment count only, using the current average in integer paise. Amounts are hypothetical for another comparable period, assume no replacement spending, and are not actual savings, income remainder, annual savings or a bank balance.

## Recurring patterns

Reuse personalAnalysis's monthly candidates (three observations across three months, same account/category/type, amount tolerance ±15%, gaps 20–40 days, recent within 45 days). Add weekly candidates conservatively: 3–5 positive payments in the most recent 28-day window, all consecutive gaps 6–8 days, amounts within ±15% of the median, latest within 14 days. Do not cherry-pick a subset of frequent payments. Vendor/account/category/type scope stays separate. Known scheduled templates remain managed by the existing Recurring screen. Inferred patterns are labelled likely, never confirmed commitments or automatically created templates. Evidence and an Open recurring payments action replace the mockup's sample-only confirmation.

## Large purchases and CAPEX

An eligible positive expense ≥₹3,000 in Misc/uncategorised or with an asset-like description may prompt classification review. This is a question, not an accounting conclusion. Do not offer conversion for active transfer-linked, card-offset replacement, or reimbursement-linked entries, or when built-in CAPEX is inactive; explain the linked record and allow ordinary evidence review.

Show the exact effect of moving the selected expense: personal-spending total decreases by its amount, CAPEX increases by the same amount, recorded outflow is unchanged. This is never represented as savings. User selects Review as CAPEX, then uses the existing TransactionForm prefilled with a COPY of the original transaction using canonical CAPEX type, its built-in type ID and empty asset category/subcategory. Require an asset category and explicit Save Changes. Preserve original ID/date/amount/account/unknown fields, existing audit/migration/storage validation and normal failure handling. Cancel means no writes. Full backup/reload retains the approved result.

## Verification

Focused pure-model tests cover integer sums, signed credits and counts, matched periods including leap/short months, vendor identity/unknowns, category scope, frequency decomposition, daily weekly shares across month boundaries, conservative recurring patterns, missing baselines, hypothetical scenarios, linked CAPEX exclusions and read-only behavior. Real production-browser tests cover 390/1280px light/dark, all views, evidence, search, sliders, cancel/no writes, validated CAPEX save/reload/backup, keyboard and overflow, and access to existing detailed/Planning screens. Run typecheck/build and relevant existing finance, persistence, PersonalAnalysis and dashboard regressions with synthetic fixtures only. Physical iPhone remains a separate validation limit.
