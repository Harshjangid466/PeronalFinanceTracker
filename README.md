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

Supabase email sign-in and cross-device synchronization are available when the environment variables and database migration below are configured. Recurring transactions catch up when the application opens; they do not post while the app is completely closed.

Never commit financial backups, `.env` files, service-role keys or personal exports. The build uploads application assets only.

## Included features

- Seven transaction types, integer-paise amounts, dashboard and person ledgers.
- Editable masters, payment-source mappings, rules and conditional custom fields.
- Search, edit, soft delete/restore and audit history.
- Recurring templates, import preview/validation, selected reports and JSON backups.
- Offline production cache and saved Dark/Light appearance.

Some dependency audit findings remain; compatible patches were applied without forcing breaking major upgrades. Physical iPhone behavior and full browser Excel upload still need device-level verification.

## Cloud sync setup

1. Run `supabase/migrations/20261008_finance_sync.sql` in your Supabase SQL Editor. It creates a private row per authenticated user and an atomic revision-checking save function. Anonymous users cannot read or write financial data. Never use a service-role/secret key in this app.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify, then rebuild. `.env.example` shows the names; use only the browser-safe publishable key. For development, put these in an ignored `.env.local` file.
3. Set Supabase Authentication's Site URL and permitted redirect URL to the permanent hosted app address.
4. Open Settings → Multi-Device Sync and request an email sign-in link on each device. Use the same email. On your existing-data device, select **Merge this device with my cloud data**. On a new device, select **Use my cloud data on this device**. Initial merging preserves an existing cloud record when the same ID appears on both devices; a pre-connection local safety copy is retained.
5. Run `npm run test:sync` for the isolated merge/concurrency checks.

Edits upload after a short delay, and active tabs check cloud updates every 15 seconds and on focus/reconnection. The app defers cloud replacement while a form has unsaved changes. Different transaction IDs merge; conflicting edits to the same value require a choice. Soft deletions, configuration and audit history synchronize. Offline changes survive reload and upload after reconnection. Sign-out retains the local copy; use trusted personal devices. Browser-specific theme preference remains local.

Supabase's default email service is intended for development and restricts recipients to project-team addresses. Use your project-owner email for this personal app; configure custom SMTP before inviting other people. Closed-app posting of recurring transactions remains deferred. The snapshot has a 10 MB limit; larger datasets need a later normalized-table migration.
