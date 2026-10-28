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
