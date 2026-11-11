# Personal Finance Tracker - continuation guide

Updated: 28 October 2026. Read this file and AGENTS.md before changing the app.

## Shared source

Private repository: https://github.com/Harshjangid466/PeronalFinanceTracker

- Personal app development: main.
- Friends beta: codex/two-laptop-beta; explicit batch updates only.
- Sunday, 25 October work is retained. The merchant-categorisation batch is included in beta version 0.1.0-beta.2. GitHub source updates do not themselves authorise deployment.
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

Next: open the intended branch on laptop two, add that folder to Codex, read AGENTS.md and this handover, and confirm personal versus beta before app changes.

Beta batch, 28 October: merchant/narration/history category suggestions, manual/import controls and optional reviewed historical changes. Card movement labels distinguish refunds, cashback, repayments and uncertain credits. Preserve beta-specific storage and disabled integrations.

## 0.1.0-beta.3 — iPhone PDF import compatibility

Use a shared getReader/read text extractor instead of PDF.js stream async iteration, which fails in some Safari releases. Applies to bank/card and Paytm PDFs. Reproduced with the missing Safari API and verified using plain and AES-256-protected synthetic HDFC statements, source balance checks and invalid-password cases. Ledger records, beta onboarding/storage boundaries and disabled integrations are unchanged. The exact user statement and physical iPhone have not been tested. Hosted release requires explicit authorisation.

## 0.1.0-beta.4 — source sync, 11 November 2026

Batches the personal-app statement/import fixes through main commit 4479143 into beta: stronger duplicate matching, Paytm year boundaries and non-payment events, Axis credit markers, HDFC continuation-page parsing, and clearer rejection of ICICI history exports without statement controls. Adds typed accounts with automatic payment links, CAPEX-specific review fields, and separate negative revenue-expense credits that reduce dashboard spending.

Beta keeps generic defaults, its onboarding, isolated storage, optional feedback and disabled financial capture/cloud analysis. Savings/current accounts link to UPI, Debit Card, Net banking and Bank Transfer; card/wallet/cash use their matching methods. No personal accounts, financial files or passwords are included. Invited accounts/cloud sync from personal main are outside this beta batch.

GitHub synchronization only: commit includes [skip netlify]. No hosted release is authorized by this batch. Validation includes typecheck/build, statement/parser/card regressions, beta data/privacy invariants and local mobile/desktop browser flows using synthetic records. Physical iPhone validation remains outstanding.
