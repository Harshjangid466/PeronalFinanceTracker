# Personal Finance Tracker

An offline-first personal finance web app built with React, TypeScript, Vite and Tailwind. GitHub is the shared source of truth for the application code.

## Run locally

Use Node.js 22 LTS and install dependencies with `npm ci`. Start the app with `npm run dev`. On Windows, use `npm.cmd` if PowerShell blocks `npm`.

Run `npm run build` before publishing. This checks TypeScript, builds the app into `dist/`, and generates the production offline cache. Run `npm run preview` to preview that build.

## Publish from GitHub

In Netlify, import this GitHub repository and select the `main` branch. The included `netlify.toml` supplies the build command (`npm run build`) and publish folder (`dist`). Use the site's permanent HTTPS address on all devices. Pushing an update to the linked branch triggers a new deploy.

On iPhone, open the site in Safari, use Share → Add to Home Screen, and then open the installed app.

## Work from multiple computers

Each computer uses its own checkout of this repository. Before starting, check `git status` and pull the latest changes with `git pull --ff-only`. Commit and push finished changes. For work happening at the same time, use separate feature branches and pull requests so changes can be reviewed and merged safely. Do not overwrite or force-push another computer's work.

Changes can also be made in GitHub's web editor; other checkouts must pull those changes before continuing. GitHub stores and versions code; it is not live shared editing of the same local files.

## Data and backups

Transactions and settings currently live in each browser's local storage, not in GitHub. Hosting the app does not synchronize financial data between devices. Export a JSON backup and restore it on another device when needed. Use the final hosted address consistently because browser storage belongs to that address.

Supabase cross-device data synchronization is not connected yet. Recurring transactions catch up when the application opens; they do not post while the app is completely closed.

Never commit financial backups, `.env` files, service-role keys or personal exports. The build uploads application assets only.

## Included features

- Seven transaction types, integer-paise amounts, dashboard and person ledgers.
- Editable masters, payment-source mappings, rules and conditional custom fields.
- Search, edit, soft delete/restore and audit history.
- Recurring templates, import preview/validation, selected reports and JSON backups.
- Offline production cache and saved Dark/Light appearance.

Some dependency audit findings remain; compatible patches were applied without forcing breaking major upgrades. Physical iPhone behavior and full browser Excel upload still need device-level verification.
