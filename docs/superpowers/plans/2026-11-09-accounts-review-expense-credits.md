# Accounts, statement review and expense credits

Goal: typed accounts with automatic selection, type-specific review fields, and separate reimbursed expense credits included in net spending.

- Extend existing account masters with optional account type; preserve unknown/untyped accounts and all existing mappings. Record account type at creation/editing and use it to generate default compatible payment mappings without a separate account-type filter.
- Share CAPEX category options across manual and statement forms; show only fields applicable to the selected type and reset stale selections when the type changes.
- Keep debit expenses positive and expense credits negative in integer paise, limited to Revenue Expense. Add explicit manual credit selection; statement direction supplies the sign. Update matching, persistence/backup validation and signed analytics without rewriting older entries. Credit-card bill payments remain blocked from expense posting.
- Verify old records, signed totals (1000 minus 700 equals 300), duplicate matching and source controls, account filtering, type switching, reload/export/restore, mobile/desktop flows, typecheck and build. No release or beta changes.
