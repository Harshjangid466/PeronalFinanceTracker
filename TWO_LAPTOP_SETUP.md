# Work on either laptop

Private repository: https://github.com/Harshjangid466/PeronalFinanceTracker

## Set up once

Install Git (or GitHub Desktop) and Node.js 22. Sign in to GitHub with access to the private repository. Clone into a normal local folder outside automatic OneDrive/Google Drive synchronization.

Personal app:

```powershell
git clone --branch codex/two-laptop-personal https://github.com/Harshjangid466/PeronalFinanceTracker.git PersonalFinanceTracker
cd PersonalFinanceTracker
npm ci
npm run typecheck
npm run build
```

For beta, use --branch codex/two-laptop-beta and a separate destination folder. Keep personal and beta in separate folders with their own dependencies.

In Codex, add the cloned folder as a project. Ask: "Read AGENTS.md and PROJECT_HANDOVER.md, inspect Git status, and continue from the documented next action."

GitHub Desktop alternative: File > Clone repository, choose this repository, select the required branch, and open its local folder in Codex.

## Before working

```powershell
git status
git pull --ff-only
```

Start clean. If local changes or diverging history are reported, preserve the work and resolve the difference before editing. Never discard files or force-push to bypass it. Run npm ci when the lockfile changes.

## Before switching laptops

Review changes in Codex or GitHub Desktop. Update PROJECT_HANDOVER.md with decisions, next actions and validation. Stage only intended files, commit, then git push.

Suggested request: "Prepare this work for my other laptop: update the handover, review changes for private data, commit the intended files with [skip netlify] in the message, and push this branch. Do not deploy."

Use one laptop at a time for edits to the same branch. Offline changes become available elsewhere only after uploading them.

## Excluded data

Keep .env files, credentials, OAuth tokens, personal statements, ledger exports/backups, local deployment links, browser storage, .codex sessions, node_modules, builds and review artifacts out of the repository. Set up needed secrets privately per laptop.

GitHub carries code and handover documents. It does not synchronize browser financial records or automatically transfer existing Codex chats.

These synchronization branches are separate from production. Do not merge into main, change Netlify settings or deploy without explicit release authorization.
