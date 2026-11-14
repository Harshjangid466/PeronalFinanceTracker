# Personal Finance Tracker - continuation guide

Updated: 27 October 2026. Read this file and AGENTS.md before changing the app.

## Shared source

Private repository: https://github.com/Harshjangid466/PeronalFinanceTracker

- Personal app and ongoing development: main. The redundant codex/two-laptop-personal branch is consolidated into main.
- Friends beta snapshot: codex/two-laptop-beta.
- main includes the personal work from Sunday, 25 October. The beta remains a frozen separate version; transfer accumulated changes only when Harsh explicitly requests a beta update.
- Original personal source: C:\Users\Harsh Kumar\Documents\ChatGPT\PersonalFinanceTracker\capture-work.
- Original beta source: C:\Users\Harsh Kumar\Documents\ChatGPT\PersonalFinanceTracker\friends-beta.
- Restored sidebar project folder: PersonalFinanceTracker 2. The originals remain untouched.

## Current state

React, Vite and TypeScript. The personal snapshot includes the local Settings redesign and supporting source/test files. The beta includes onboarding, generic defaults, setup guidance, feedback copying and isolated browser storage. See docs/BETA_DEPLOYMENT.md on the beta branch for Sunday's release record; older plans may describe earlier stages.

Personal app: https://harsh-finance-tracker.netlify.app/
Friends beta: https://friends--harsh-finance-friends-beta.netlify.app/

Gmail linking and cloud-ledger synchronization are not implemented. Do not enable capture, cloud analysis, feedback sending or integrations as part of synchronization. Financial records remain in their existing browser/device. Export backups privately before changing browser storage or app origin.

## Continue on either laptop

Follow TWO_LAPTOP_SETUP.md. Before editing, inspect Git status and get the latest branch changes. Before switching laptops, commit and push intended files and update this handover with decisions, checks, open issues and next actions. Never overwrite unrelated work, force-push or replace a dirty checkout.

Codex chat history is not stored here. This document supplies continuation context. Do not commit session databases or authentication files.

## Checks and next action

After cloning: npm ci, npm run typecheck, npm run build. Beta also provides npm run test:beta. A build is not proof that financial data migrations are safe.

Next: open main on both laptops for personal-app development. Read AGENTS.md and this handover before app changes. Do not make ongoing changes in beta.

## Release discipline

Netlify automatically publishes main. Ordinary code synchronization commits must include [skip netlify] unless a live release is explicitly requested. A publish/release request means the intended source must be committed and pushed to GitHub as well as deployed to the correct Netlify site. Do not leave production code only on a laptop. During branch consolidation, skip deployment and preserve the already published Sunday build.

Validation: personal source passed frontend and function typechecks and a production build on 27 October before consolidation. Consolidation preserves that application source; only guidance files change.

## Local account/sync implementation — 28 October 2026

Uncommitted accounts and periodic cloud-sync code is present on main, disabled by default. See docs/ACCOUNTS_SETUP.md for configuration, privacy boundaries, local tests and mandatory real staging acceptance. Default interval is 24 hours per device; no realtime sync. SMTP/Supabase migrations and deployment have not been activated. Do not interpret local mocked tests as real database/RLS, SMTP or hosted-function validation. Preserve existing financial records and export private backups before activation.

## Hosted own-account login test — 28 October 2026

Source commit 3642813 is pushed to main with [skip netlify]. Login-only draft: https://account-login-test--harsh-finance-tracker.netlify.app/ (deployment 6ae18924e1327109fcaf7343). Accounts enabled against finance-tracker-test; cloud sync and bank capture disabled. Exact hosted callback saved in the test project. Owner invitation request accepted; await the user completing invitation/password setup. Production and friends-beta unchanged. See docs/ACCOUNTS_SETUP.md for deployment flags, Netlify credit limits and remaining real-service checks.

## HDFC / Safari PDF import fix — 28 October 2026

PDF.js 5.6 text extraction uses ReadableStream async iteration, which is missing in some Safari releases. Reproduced the failure by removing that API before running the real PDF reader. Shared pdfText.ts now consumes text chunks with getReader/read and releases the lock, preserving text, font styles, language and XFA handling. Bank/card and Paytm readers use it; parsing, balance validation and ledger data are unchanged.

Verified plain and AES-256-protected synthetic HDFC statements, missing/incorrect password handling, normal and compatibility PDF tests, the production build, existing regression suites, and mobile upload with the missing Safari API. The user's actual statement and physical iPhone have not been tested. Source fix only: no hosted deployment, credentials, accounts/sync flags or beta update is authorised by this change. Confirm the affected app URL before release.

## Statement import fixes — 9 November 2026

Local changes on main; not published. Reproduced the supplied Paytm, HDFC Swiggy and Amazon ICICI PDF failures, then checked all three original files locally with stream async iteration removed. Paytm yielded 98 source rows (91 payments, 3 receipts, 2 self transfers, 1 funds-block event and 1 release); ICICI yielded 5 movements and HDFC Swiggy 10. Payment counts/totals and card debit/credit controls agree. No private PDF, password or extracted statement text belongs in source control.

Paytm now retains IPO funds blocked/unblocked as explicit non-payment directions, ignored for expense/income posting and excluded from payment controls. IDs distinguish block/release events sharing a reference. Existing saved directions and identifiers remain unchanged; reload/backup restore preserve both old records and new events. Backups containing the new directions require this updated app; keep a private pre-release backup for any rollback to an older build.

HDFC now reads lower-page movements and the left-shifted credit sign without adding it to narration. Exact debit/credit controls remain mandatory; whole-rupee HDFC closing balances can differ by at most 50 paise, reported explicitly without adjustment entries. Verified card PDFs may list transaction dates before the printed billing cycle: retain those dates with a warning, and allow the checked import to save. Later dates and out-of-period bank rows remain rejected unless a valid bank value date applies.

Validation: 26 bank-parser checks, 121 statement/habit/recurring checks, normal/compatibility PDF upload tests, encrypted HDFC reader tests, 25 card-reconciliation checks, 18 cashback checks, sync model/server checks, frontend/function typechecks and production build. `npm run test:statement-import-ui` covers synthetic Paytm/HDFC/ICICI uploads at 390px and 1280px, with stream async iteration removed, non-payment posting guards, original dates/amounts, existing ledger/unknown fields, IndexedDB reload and actual backup export/restore. No browser errors. Existing PDF/Excel bundle-size warnings remain. Physical iPhone and the first screenshot's separate HDFC bank PDF remain untested. Production, beta, capture and sync activation are unchanged.

## Annual Paytm and manual-entry duplicate checks — 9 November 2026

The supplied annual Paytm PDF reproduced a boundary-month year-selection error. Resolve each day/month to its unique valid year within the printed period; ambiguous multi-year periods fail with a shorter-period instruction. The original annual PDF passes normal and Safari-compatibility readers: 1,686 rows, printed payment counts and totals validated. No private source file or extracted data was saved in the repository.

Shared classification now also matches a unique active ledger candidate by exact account, transaction date, integer amount, direction and normalized merchant/heading, only when the ledger entry has no conflicting payment references and no competing same-identity source row. Exact reference matches remain supported. Confirmed matches retain statement evidence and link the original ledger entry without posting another entry; repeats keep prior decisions. Different dates/accounts/directions, deleted entries, multiple candidates and conflicting references stay reviewable. Merchant abbreviations and posting-date differences remain candidates for explicit confirmation, not automatic skips. This applies to bank/card and Paytm imports after account mapping; unsupported PDF layouts still require CSV/XLSX mapping. Monthly card uploads remain review-first for unmatched movements.

Regression coverage adds annual boundary months, manual matching across bank/Paytm sources, competing equal rows and identity/reference mismatches. Browser fixtures include a pre-existing manual card expense and verify automatic match with unchanged ledger count, reload and backup restore. No production release or beta update.

## Typed accounts, review fields and expense credits — 9 November 2026

New local work on main after production commit bfc5109; not published. Account type is collected once in Settings (CC/SB/Current/Wallet, plus built-in Cash); no extra account-type filter on entry screens. Typed sources automatically map SB/Current to UPI and Net banking, CC to CC, Wallet to Wallet, Cash to Cash. Existing custom mappings are preserved by migration and simple renames; explicitly changing type regenerates that source's links. Known default accounts get metadata, unrecognised names remain untyped and visible. Master IDs, history and unknown fields are preserved.

Statement review now shows fields for the chosen transaction type; CAPEX shares the manual form's asset-category list and purchased-from field, and hides revenue subcategories. Switching type clears stale draft fields. Source amount/direction is preserved.

Revenue Expense now supports separate credits as negative integer paise. Manual forms expose reimbursement/refund selection with a positive input amount; statement credits get a negative ledger amount only after explicit Revenue Expense classification. Income and loan recovery semantics remain unchanged; CC bill payments still cannot be posted as expense. Expense credits net by category and their own dates, including credit-only months. Matching compares absolute source amounts plus actual money direction. CSV/JSON restore and cloud validation retain signs; original source rows stay positive with explicit direction. Card offset/undo also preserves separately posted expense credits without double netting. Expense credits are excluded from merchant-learning purchase samples. Older builds may reject signed expense-credit backups: retain a private pre-release backup for rollback.

Backup merge additionally preserves previously unknown incoming root settings while keeping current values on conflicts. Tests cover signed source matches, net dashboard/category totals, credit-only periods, CSV, account-type migration/mappings, unknown fields, card offset/undo and sync validation. Synthetic browser coverage verifies Settings setup, CAPEX review, posting a reimbursement, a manual credit, dashboard net totals, reload and actual backup export/restore. Frontend/function typechecks and production build pass; existing PDF/Excel bundle warnings remain. No production financial data was accessed or changed, no capture/sync activation, beta update or deployment.

## Credit-card statement corpus check — 9 November 2026

User-authorized local corpus: 52 credit-card PDFs, tested read-only without posting records. Final parser and isolated 390px browser upload checks: 51 pass, one ICICI transaction-history/annual export held because it contains no printed opening/closing balances or debit/credit total controls. Source files and passwords are not committed. Four analysis/savings XLSX workbooks in the directory are outside this credit-card PDF check.

Fixed Axis summaries whose closing credit-balance marker is a separate text item (three affected older Neo statements). Summary extraction now retains standalone DR/CR markers with their adjacent amount. Fixed an HDFC continuation page with date/description columns shifted left by deriving boundaries from each page's own headers (one affected monthly statement). Both debit and credit controls remain mandatory; no adjustment entries or broader arithmetic tolerances were introduced. ICICI history exports receive an explanatory error asking for monthly statements or mapped source data with controls.

All 31 Axis, 8 HDFC, 6 monthly ICICI, 3 SBI and 3 scanned BOB PDFs passed. Scans ran through the actual local OCR worker/assets, and upload tests removed stream async iteration to exercise Safari compatibility. Original source rows/IDs were also reread for stability. Regression fixtures contain synthetic data only. No live ledger, password vault, account/sync/capture flag, beta or deployment changes. Physical iPhone and the four XLSX workbooks remain untested; OCR merchant/reference accuracy still needs user review before posting.

## GitHub-only synchronization — 9 November 2026

Accounts/review/expense-credit changes and the statement-corpus fixes are synchronized on main using [skip netlify]. This is source backup only, not a production release. The last authorized production release remains bfc5109 (Netlify deployment 6af1da08b9c6c9b67a890cf6). Keep subsequent synchronization commits skipped until Harsh explicitly requests another release. The unrelated local ChatGPT context documents and private test artifacts are excluded.

## Direct PDF sharing — 14 November 2026

Harsh chose sharing PDFs from email/Files into the installed app rather than building Gmail access in this batch. Personal main registers a standard PDF Web Share Target and handles its POST locally in the service worker. A one-use temporary file opens Transactions → Imports & review, waits for account/password and Read PDF, then reuses existing source controls, preview and duplicate detection. Normal file selection still works. See docs/PDF_SHARING.md for installation, bounded staging/expiry, privacy and verification details.

The same manifest declaration is ready for browsers that later add compatible support. Current Safari/iPhone does not offer this incoming share integration; Save to Files remains the fallback. Do not claim physical Android/iPhone validation from desktop tests. No Gmail/capture/sync activation, ledger schema change, beta modification or Netlify deployment is included. Synchronize with [skip netlify] until an explicit release request.

Validation passed: typecheck/build, statement and bank-parser regressions, plain/AES-256 PDF readers including missing stream async iteration, and production mobile/desktop sharing, ordinary statement-import and expense-credit UI suites. The real service worker passed top-level multipart navigation, explicit read/import, password retry, duplicate/manual upload, cancellation/expiry, bounded staging and storage failure, offline handoff, reload/backup retention and cache/referrer exclusions. Final review finding about token referrers was fixed and the browser test extended. Physical device share sheets remain unverified.

## Account reconciliation and missing statements — 15 November 2026

Main app: Transactions → Imports & review → Account reconciliation & missing statements. The expandable view defaults to the previous calendar month and groups bank/card/wallet imports by their statement end month, showing exact periods, six-month history, latest imported/reviewed end dates, separate matched/posted/ignored/pending counts and debit/credit source totals. Repeated source row IDs count once. Buttons open the existing statement review without changing entries.

States are No statement, Needs review, Balances unverified and Reviewed. Changed/deleted/missing ledger links reopen review. Unlinked active app entries, incomplete source populations, multi-account balance controls, held card movements and every nonzero arithmetic difference remain visible; existing parser rounding acceptance is unchanged. Reviewed is limited to imported evidence, not proof of full calendar coverage or complete spending. Paytm UPI activity never substitutes for bank coverage. Cash is excluded; inactive accounts with bank history remain visible. Unassignable imports and unavailable statement storage receive explicit notices.

This is a read-only projection of existing data; no storage schema, migration, new dependency or service was introduced. Verified 15 model cases, production UI at 390px/1280px, actual JSON backup export/merge with unknown fields retained, IndexedDB reload, stale links, unavailable archive and unchanged financial rows/action logs during use. Existing statement/card model suites and synthetic Paytm/HDFC/ICICI PDF import UI regressions pass. Frontend/function typechecks and build pass with existing large PDF/Excel chunk warnings. Physical phones remain untested. Source synchronization uses [skip netlify]; beta, hosted release and integrations remain unchanged.
