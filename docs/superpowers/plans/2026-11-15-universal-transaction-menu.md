# Universal transaction menu

**Approved design:** Custom transaction types choose one existing financial behaviour at setup and have independent categories/subcategories. Existing investment-type options remain unchanged. CAPEX gets a direct category manager in Settings. Work on main, then port all accumulated functional changes since beta.4 to friends beta on explicit user request. Push both to GitHub with [skip netlify]; no deployment. Preserve beta defaults/storage and keep capture, cloud login and AI disabled.

**Architecture:** Store configured types and scoped categories in the existing master registry. Keep the seven canonical financial types for calculations and add a stable transactionTypeId to entries/templates for their configured label. Preserve existing revenue categories, seed current CAPEX choices once, and migrate legacy asset-category references into their own scope without changing financial effects. Type behaviour becomes immutable when used. Inactive values remain linked to history.

- [x] Implement catalogue helpers, scoped master IDs/dependencies and idempotent migration. Validate hierarchy and recorded behaviour; retain unknown fields, legacy selections and recovery paths.
- [x] Reuse master-management UI for transaction types, type categories and subcategories; add direct CAPEX Settings entry. Prevent cross-type renames/replacements and preserve investment-type management.
- [x] Connect entry/Home/review menus, inline additions, historical labels/filters and CSV/JSON round trips. Custom revenue types must not inherit incompatible merchant categories or silently save as the generic type.
- [x] Verify model and persistence/backup/sync regressions plus production UI at 390/1280, synthetic old data, custom types/behaviours, independent same-name categories, deactivation, reload/export/restore and unchanged amounts. Run typecheck/build.
- [x] Update handover/glossary, commit/push intended source with publishing skipped.
