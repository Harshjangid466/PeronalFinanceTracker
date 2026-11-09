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
