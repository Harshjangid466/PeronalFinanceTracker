# Saving and recovery

## Storage-full repair (18 November 2026)

The first persistence release prevents false save success but cannot by itself free an already full localStorage area. Downloading a JSON backup does not free that area. A real browser-quota regression reproduces rejected saves before and after backup export.

On a quota error, the transaction form now offers **Repair storage safely**. It moves only the legacy v1 and pre-v3/pre-v4 recovery copies into additional records in the existing, account-scoped statement-history database. It waits for the write transaction to commit, reads the exact strings back, and compares them before removing the corresponding localStorage copies. A copy changed concurrently is retained. The current v2 ledger, statement archive, unknown fields, logs, unrelated keys and unsaved form are not rewritten by repair. Archived copies remain individually downloadable from Backup & restore. They are recovery snapshots, separate from the ordinary complete backup of the current ledger.

Repair does not post an entry: explicitly retry Save transaction afterward. It does not claim success when no old copies exist or the archive cannot be verified. If the current ledger alone exceeds localStorage capacity, or browser storage is unavailable, this repair cannot resolve that condition. The actual browser exception category is now shown to distinguish quota from other failures. A reported 2.3 MB backup suggests possible capacity pressure but does not establish the phone's exact failure.

`npm run test:storage-repair-ui` checks real quota exhaustion, backup not fixing quota, byte-for-byte recovery preservation, archive abort, concurrent replacement, mobile repair/retry, exactly one posted entry, reload, and recovery download using synthetic data. Physical iPhone confirmation remains required.

The personal ledger stays under its existing browser-storage key. This change does not rename the origin, manifest identity, transaction schema or IndexedDB statement archive. Existing IDs, dates, signed integer paise, rules, action history and unknown fields are retained.

Ledger mutations now write synchronously before application state or save success is published. A rejected write leaves the previous ledger intact and the transaction form open. Backup export remains available even if recording its audit entry fails. Import/restore summaries and their audit records are committed together. The legacy ledger is still readable and existing recovery snapshots are retained; new saves no longer mirror the entire growing ledger into v1.

Opening the app does not automatically overwrite its saved ledger. A second window waits for the first to close where browser locks are supported. A stale-write check also rejects a save if another window changed the primary copy. Migration-copy failures do not prevent opening the original data for export. Unreadable primary data is left untouched and has a raw-download recovery screen.

On iPhone, Home Screen web apps and Safari have separate storage. An empty Safari tab does not prove the installed app's records were erased. See [Apple's explanation](https://developer.apple.com/videos/play/wwdc2023/10120/). The user confirmed that their missing newer entries were entered from the Home Screen app itself; the separation therefore does not explain those missing entries.

Before updating, download the complete JSON backup from the Home Screen app that contains the records, and verify it is in Files/iCloud Drive. Keep the same installed app and site URL. Do not clear website data or reinstall as an update procedure. After an authorized release, verify a synthetic entry survives close/reopen on the actual iPhone before resuming normal entry.

Settings → Backup & restore also offers raw current/legacy/pre-migration copies. These may be older or omit statement history. Download and compare before merging; no older copy is chosen automatically. Neither the code fix nor a successful test recovers entries absent from every surviving copy.

## Verification

- Six storage checks cover a rejected primary write, redundant legacy writes, reopen, unknown fields, legacy migration, unavailable migration-copy storage and stale writes.
- Production-browser fixtures verify actual Save → immediate tab close → reopen; full-storage failure with retained form and existing records; backup export while storage is full; retry without duplicates; two-tab locking; unreadable data and byte-for-byte recovery downloads.
- Rechecked with a separate on-disk synthetic browser profile: the exact transaction ID and amount survived three complete browser shutdowns/relaunches and remained visible in Transactions each time. This is a desktop browser check, not a physical iPhone test.
- Responsive main-screen checks cover 320/390/768/1280px, light/dark, reduced motion, keyboard dialog containment, empty setup and complete backup download/merge with archived statements and unknown fields.
- Existing statement-import, expense-credit, type-catalogue, transfer/reimbursement/backup, account-reconciliation and PDF-sharing browser workflows pass at 390/1280px, including service-worker/offline paths. Financial, recurring, sync/server, card and merchant model suites pass.
- Frontend/function typechecks and production build pass. Existing large JavaScript/PDF/Excel chunk warnings remain.

All fixtures are isolated and synthetic. Physical iPhone behavior and its exact storage failure remain unverified. The hosted app's public bundle check encountered Netlify's access screen. No user financial records were read, restored or changed; no release, beta change or integration activation was performed.

An actual before/after UX gallery is generated at `artifacts/redesign/comparison/ux-changes.html` by `scripts/capture-ux-comparison.mjs`. Both versions use identical synthetic data. The before version is a Git HEAD source snapshot, not a verified capture of the phone's cached release.
