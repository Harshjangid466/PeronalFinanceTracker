# Friends beta — local review

This checkout is the isolated friends beta. Personal-app development remains on `main`.

- Branch: `codex/two-laptop-beta`.
- Starting commit: `e84dd54`, plus all six unpublished Settings source/test files copied from the personal checkout.
- Personal tracked files and copied untracked source files are fingerprinted in `beta-source-hashes.json` to verify that the original app stays unchanged.
- The initial local review created no cloud resources or credentials. See BETA_DEPLOYMENT.md for the subsequent Sunday deployment record and the version notes below for later GitHub source updates.

## Review locally

The production preview is served at http://127.0.0.1:5187/ while its local process is running. The development server uses port 5186.

From this folder:

```
npm run dev -- --host 127.0.0.1 --port 5186 --strictPort
npm run build
npm run preview -- --host 127.0.0.1 --port 5187 --strictPort
```

Existing installed dependencies are reused through a local `node_modules` junction to avoid downloading another copy. Do not run dependency update/install commands through that junction. For a standalone checkout, install from the lockfile into its own normal node_modules directory.

A localhost URL is only for review on this computer. Friends cannot use it remotely. Sharing requires a later, separately authorised release to a **new** site.

## What is included

- Fresh welcome, optional nickname/email/testing goal saved only on-device, skippable setup.
- A skippable first-use spotlight tour explains the main navigation icons after setup; it can be replayed from Icon tour. Initial setup walks through combined accounts/payment links, categories, rules, habits, recurring payments, other preferences and backup. Editors open inside setup and return to the same step; the flow can be rerun from the header or Settings.
- Twelve editable starter categories with subcategories, generic income/investment/household labels, payment methods, Cash account and an editable Cash rule.
- No personal people, bank/card accounts, merchants, rules, narration patterns or morning-fare assumptions.
- No learned defaults enabled initially; no prefilled recurring payments.
- Existing statement review, imports, backup, audit history, rules, fields and account/category editors retained.
- Feedback screen with exact report preview, Copy report, optional contact details and optional seven-day usage summary.
- Local counters track sessions, visited sections, approximate active minutes, import/backup/restore actions and created entries. They do not include values, descriptions, filenames, account/category names or transaction data. There is no device identifier and no automatic upload. Active time stops counting when hidden or idle for a minute; time is approximate.
- Beta version shown in the header. Production updates wait for the tester to choose Update and reload; initial installation activates normally. The update confirmation warns about unsaved work.

## Data separation

The beta uses `finance-beta-*` localStorage keys and separate IndexedDB databases for statement history and saved statement passwords. Normal personal ledger keys are neither read nor overwritten. A separate hosted origin will add another boundary when released.

Each friend must use their own device or browser profile. There is no login, device lock, cross-device sync or cloud recovery. Local records are protected by the device/browser security, not by app account authentication. Export backups privately before clearing browser data.

Initial defaults are seeded only for a fresh ledger. Renames/deletions survive reload. Existing transaction IDs, paise, statement records, unknown data fields and deletion tombstones retain their existing migration/backup contracts. Restore remains a merge, not a replacement.

Gmail/bank capture is hard-disabled in this beta even if environment flags are supplied. Cloud financial analysis has no upload UI, and its server endpoint returns 503 without reading credentials or making provider calls. Do not enable these features as part of beta deployment.

## Setup instructions for testers

1. Add display names for accounts, cards and wallets. Never enter login credentials or full account numbers.
2. Keep/remove payment methods and link them to accounts. `CC` is Credit Card; `Net banking` covers bank payments. These labels preserve compatibility with existing import/card reconciliation logic.
3. Edit categories and their subcategories. Fuel is separate from Commute; broadband and OTT start under Entertainment/Internet.
4. Create entry rules: IF conditions match, THEN fill fields. Lower priority numbers win within the same rule tier, locked rules take precedence, and user rules precede learned defaults. Rules fill entry defaults; they are not Gmail automation.
5. Add import habits only when useful. Narration has precedence, then vendor, then exact amount. New narration/vendor habits start in review. Choosing post allows classification/posting in supported confirmed import flows. Exact-amount habits classify by amount across vendors; review carefully. Bank statements still require reconciliation. Posted records are not retrospectively changed.
6. Create recurring schedules explicitly; examine automatic posting before enabling it.
7. Export a backup. Review audit history if you need to understand recorded changes.

Other settings:

| Setting | How to use it |
|---|---|
| People & ledgers | Add people/businesses used for money lent and recovered. |
| Income types | Rename or extend Salary, Freelance, Interest and other labels. |
| Investment types | Add asset/investment labels, rather than broker-specific personal defaults. |
| Purchase merchants | Add merchants only if tracking larger purchases/asset spending. |
| Household purposes | Label family/household transfers; the existing transaction type is called To Ghar. |
| Quick amounts | Replace the starter shortcuts with amounts you use frequently. |
| Fields & dropdowns | Add extra questions and dependent options only when needed. |
| Appearance | Choose Light or Dark. |
| Change history | Review recorded actions; logs are not attached to feedback. |

Used categories/accounts should be deactivated or replaced rather than deleting history. The dependency editor shows references; unused values can be permanently deleted. Rules and vendor/narration/amount habits can be edited, disabled or deleted.

## Feedback delivery — deliberately not live

`FEEDBACK_SEND_ENABLED` in `src/beta/config.ts` is false. Copy report works offline; nothing is submitted automatically. Contact and usage checkboxes start unchecked. User-written feedback can contain private text, so the screen asks testers to avoid financial details.

A hidden Netlify form and a guarded submit path are prepared. Before enabling delivery later:

1. Obtain deployment authorisation and create a separate beta site. Do not link or publish to the personal site.
2. Review the personal site's automatic deployment branch settings before pushing anything. Worktrees share Git remotes, so a branch name alone is not a hosting safeguard.
3. Confirm the current Netlify plan, remaining credits and team-wide quota. A separate site in the same team shares usage allowance.
4. Verify no personal `.env`, `.netlify` link, cloud keys or financial records are present.
5. Configure beta form detection and Gmail submission notifications. Enable sending only after reviewing the payload and testing delivery. Keep failure/copy fallback.
6. Keep the beta address stable for storage continuity. Increment BETA_VERSION per release. Publish only the beta target; never merge back into the personal branch automatically.

No Supabase is required for this version. Direct Netlify/Gmail delivery is not end-to-end tested because deployment and external configuration are intentionally excluded.

## Validation

- `npm run typecheck` and `npm run build` (includes function typecheck).
- `npm run test:beta`: 12 focused privacy, defaults, persistence, recovery and backup checks.
- `npm run test:statements`: 120 checks. The configured-user fixtures now explicitly declare their example account/narration habits instead of relying on personal shipped defaults; beta has no built-in morning-fare fallback.
- `scripts/verify-settings-ui.mjs`: isolated synthetic editing, rules/habits, every settings editor, backup export, reload and mobile layout.
- `scripts/verify-beta-ui.mjs`: isolated production welcome, profile, guide, feedback preview/copy, separate users, mobile, service-worker update and offline reload. Temporarily changes only dist/sw.js during the update test and restores it in finally.

Browser scripts use the bundled Playwright Node package and installed Edge via PLAYWRIGHT_MODULE and PLAYWRIGHT_CHANNEL. They do not use your normal browser profile. Screenshots are synthetic under artifacts/.

Known limitation: existing PDF/Excel bundles still trigger Vite's >500 kB warning. No bundle refactor was added for this beta. Physical-device and hosted email delivery tests remain for the later release stage.

## 0.1.0-beta.2 — merchant categorisation

- Category suggestions use merchant names, narration clues, saved rules and consistent past payee categories. Suggestions are local; no financial records are sent to an AI service.
- Manual entries and statement/card review can apply a suggestion or keep a different category. Remembered categories remain review-only.
- Card review distinguishes purchases, explicit refunds, cashback, bill repayments, fees and unclear credits. A merchant name alone does not prove an unexplained credit is a refund.
- Settings → Import habits → Review categories for older entries offers selectable changes; amounts and source rows stay unchanged. Preview cancellation makes no changes.
- Separate beta storage, generic starter setup, disabled capture/cloud analysis and feedback consent are preserved. This source update does not itself deploy the beta site.

## 0.1.0-beta.3 — iPhone PDF import compatibility

Use a shared getReader/read text extractor instead of PDF.js stream async iteration, which fails in some Safari releases. Applies to bank/card and Paytm PDFs. Reproduced with the missing Safari API and verified using plain and AES-256-protected synthetic HDFC statements, source balance checks and invalid-password cases. Ledger records, beta onboarding/storage boundaries and disabled integrations are unchanged. The exact user statement and physical iPhone have not been tested. Hosted release requires explicit authorisation.
