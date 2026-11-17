# Whole-app redesign and reliable saving

**Goal:** Fix disappearing saved entries and redesign the complete personal app without losing data or functionality.

**Scope:** Every screen and shared interaction. Existing React/TypeScript/Tailwind components, no new dependency, unchanged ledger keys/schema, original dates, signed paise, IDs, unknown fields, rules, history, archives and backups retained. Existing integrations remain disabled. Work stays on personal main; no beta update or release is implied.

**Design:** Build on the October Home refinement: system fonts, navy ink, teal actions, white surfaces, quiet mist background. One primary action per task, labelled native dropdowns, consistent tab states and menus, 44px targets, visible keyboard focus, responsive desktop navigation/mobile bottom navigation, light/dark and reduced motion. No external fonts or remote data.

- [x] Persistence: reproduce redundant-write failure, quota rejection, stale overwrite and immediate-close risks; synchronously persist before publishing state; avoid repeated legacy copies; retain form and show permanent warning on failure. Preserve unreadable storage and offer raw recovery copies.
- [x] Shared shell: consistent navigation, page spacing, status, typography, controls, accessible sheets, safe-area padding and desktop layout across all screens.
- [x] Home: explicit Add transaction, Import statement and recurring destinations; useful empty-state starting actions; retain all analytics, drilldowns and recent editing.
- [x] Entry: single type selector, amount-first hierarchy, visible essentials, optional notes/templates progressively disclosed, labelled controls and truthful saved/error states. Preserve all configured types, custom fields, credit semantics, rules and templates.
- [x] History/review: search and filters, explicit import stage guidance, focused review queue, secondary reconciliation tools and mobile statement cards; retain source totals, duplicates, matching, undo, transfers and cashback.
- [x] Setup/settings: smaller initial directory with Accounts, Categories, Backup and optional full settings; retain search, every existing editor and appearance. Consistent People/Recurring views.
- [x] Verify synthetic old/current storage, signed amounts, unknown fields, add/edit/immediate reopen, failed-save retry, backup export/merge, archives, all navigation, keyboard and 320/390/768/1280 layouts in light/dark. Run focused model/UI suites, typecheck and build. Record physical iPhone and recovery limitations.

**Recovery:** Existing legacy and pre-migration snapshots are downloadable without replacing the current ledger. No automatic choice of an older snapshot, silent conflict merge or claim that previously lost records are recoverable. Never clear phone website data.

**Verification limits:** Isolated browser fixtures cannot establish the exact cause on the user's published iPhone browser. The hosted app must receive a separately authorized release before the fix reaches it.

**Result:** Implemented and verified locally on personal main. Production browser checks passed for save/close/reopen, full-storage recovery and retry, raw recovery, two-tab locking, all main screens, light/dark and keyboard layouts, real synthetic PDF imports, signed expense credits, custom types, transfer/reimbursement/backup flows, account reconciliation, offline PDF sharing, Home and interactive analytics. Frontend/function checks and build passed; existing chunk warnings remain. See docs/PERSISTENCE_AND_RECOVERY.md. User confirmed an iCloud/Files backup from the Home Screen app. Newer missing iPhone entries remain unrecovered. No commit, push or release.
