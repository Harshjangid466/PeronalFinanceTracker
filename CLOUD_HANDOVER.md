# Cloud development handover

## Shared code and deployment

Repository: https://github.com/Harshjangid466/PeronalFinanceTracker

Production: https://harsh-finance-tracker.netlify.app/

Production branch: `main`. Latest completed production implementation before this handover is commit `d54ee467f1616737a0718462f91c02de71961f4c`.

The `codex/cloud-development` branch preserves the unfinished cloud-sync work and these development instructions. Start cloud continuation from this branch, or explicitly check it out after selecting the repository. Do not assume the production branch already contains the pending sync work.

The existing app uses React 18, TypeScript, Vite 5, Tailwind 3, ExcelJS, a service worker and browser localStorage. Supabase JS is already a dependency. Netlify configuration builds with `npm run build` and publishes `dist/`.

## Current cloud-sync implementation

- `src/data/cloudMerge.ts`: three-way merge by stable entity IDs, explicit same-field conflicts, atomic revision retries, preservation of concurrent additions, removals and skipped occurrences.
- `src/data/cloudClient.ts`: Supabase client configured from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `src/context/useCloudSync.ts`: email-link sign-in, initial connection choice, automatic sync, account-scoped cache/baseline, offline retry, dirty-form protection, conflict choice and local recovery copies.
- `src/components/CloudSyncPanel.tsx`: sign-in, connection, status, conflict-resolution and sign-out controls under Settings.
- AppContext/storage integration preserves cached financial data, including signed-out offline edits. Recurring occurrence IDs are deterministic across devices.
- `supabase/migrations/20261008_finance_sync.sql`: owner-only read policy and authenticated atomic save function with revision checks and a 10 MB snapshot limit.
- `scripts/verify-cloud.cjs`: 23 isolated merge/concurrency checks; run `npm run test:sync`.

These are pending features. Review the hook lifecycle and integration carefully before merging into production. Unit checks are not a replacement for authenticated browser/device tests.

## Supabase already prepared

Project URL: `https://chochzrevigyghvhbsyp.supabase.co`.

The migration was executed in the owner's Supabase project. Verification showed row-level security enabled, one owner read policy, no anonymous read/write access, and no direct authenticated table update privilege. Saves go through the revision-checking function.

Authentication Site URL and allowed redirect URL were saved as `https://harsh-finance-tracker.netlify.app/`.

The browser-safe publishable key is available in the owner's Supabase API Keys page. It has not been committed. Never use the secret/service-role key in the frontend.

## Required next work

1. Review and verify the pending sync code; preserve the existing financial flows and configurations.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify and the cloud environment as needed. Use only the public publishable key.
3. Build with the configured values. No authenticated live sync has been completed yet.
4. Ask the owner to sign into the app with the same email on both devices. Supabase's default email service limits recipients to project-team addresses; use the owner email unless custom SMTP is configured.
5. Verify two-browser/device additions, edits, soft delete/restore, offline reconnect, conflicts, recurring duplicates and configuration updates. Use isolated test data. Preserve the owner's original local records.
6. For the original data device, explicitly connect using the merge option; on a fresh device, choose cloud data. Initial merge keeps the existing cloud copy for matching IDs and stores a local safety copy.
7. Merge verified work into `main`, then verify the Netlify deploy. Do not report synchronization active until authenticated testing succeeds.

## Other requests and known limits

The owner wants development to work from any laptop with the same Codex account, without keeping a particular laptop online. Use a published Codex Cloud environment and keep durable work in GitHub.

The owner also wants a proper native iPhone app, but currently has neither a Mac nor an Apple Developer account. No native packaging/signing setup has been completed. The existing iPhone installation is a web app.

Netlify currently protects the site with its account-access check. This can add startup delay. Public access has not been enabled; removing access protection needs the owner's specific approval.

Closed-app recurring posting is still deferred. Theme preference is browser-specific. Physical iPhone swipe/back and a full browser Excel upload remain unverified. Compatible dependency fixes left 11 audit findings; no breaking forced upgrades were applied.

Original local financial records and backups are not in this repository. Never reconstruct, upload, or invent them from these notes.
