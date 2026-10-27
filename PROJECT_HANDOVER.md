# Personal Finance Tracker - continuation guide

Updated: 27 October 2026. Read this file and AGENTS.md before changing the app.

## Shared source

Private repository: https://github.com/Harshjangid466/PeronalFinanceTracker

- Personal app snapshot: codex/two-laptop-personal.
- Friends beta snapshot: codex/two-laptop-beta.
- These preserve local work from Sunday, 25 October. They are synchronization snapshots, not new releases. Do not merge or deploy automatically.
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
