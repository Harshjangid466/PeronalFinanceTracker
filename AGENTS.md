# Personal Finance Tracker

This is an existing application. Continue it; do not rebuild it or replace working features.

## Development

- GitHub is the shared source of truth. Work in Codex Cloud for laptop-independent development.
- Use Node.js 22 and `npm ci` to install the locked dependencies.
- Verify meaningful changes with `npm run test:sync` and `npm run build`.
- For a browser preview, run `npm run dev -- --host 0.0.0.0`.
- Check `git status` and `git diff` before editing. Preserve unrelated work.
- `main` deploys automatically to Netlify. Keep unfinished work on a feature branch; review and verify before merging.
- Never commit personal finance backups, exports, `.env` files, secret keys or browser auth sessions.

## Product requirements

- Preserve all seven transaction types, integer-paise money calculations, stable IDs, edits, soft deletion and restoration.
- Preserve configurable masters, rules, conditional custom fields, recurring templates, imports, reports, audit history and backup restoration.
- Retain offline use and saved Dark/Light appearance.
- Keep cloud sync private to the signed-in user. Concurrent changes must not silently replace data from another device.
- Do not claim live synchronization is verified without a real authenticated test.

## User communication

The owner is a Chartered Accountant, not a programmer. Explain outcomes plainly and give one user action at a time when account access is needed.

Read `CLOUD_HANDOVER.md` before continuing unfinished work.
