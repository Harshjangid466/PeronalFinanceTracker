# PersonalFinanceTracker project instructions

## Establish the active application
- This checkout contains the personal application at its root, including package.json. Use main for all personal-app development. The friends beta is preserved separately on codex/two-laptop-beta and changes only on an explicit batch-update request.
- Netlify automatically publishes main. Include [skip netlify] in synchronization-only commits unless a live release is explicitly requested. Publishing means commit/push the intended source to GitHub as well as deploy to the correct site; never leave released source only on a laptop.
- Check the actual package.json and available scripts in that checkout. Do not run an auxiliary capture-tool package as if it were the finance application.

## Financial data and storage
- Preserve transactions, categorization rules, audit/action logs, import history, payment modes, and backups that exist in the current app.
- Verify transaction schema, currencies, date semantics, identifiers, and income/expense signs before calculation or import. The historical personal-ledger convention is negative Net Amount for income and positive for expense; confirm it against current records.
- Reconcile imports and reports to source row counts and totals. Keep duplicates, reversals, unmatched items, and candidate matches visible; never force matches to remove differences.
- Before changing storage schema, inspect storage.ts or the current persistence implementation and migration contracts. Preserve older data, unknown fields where appropriate, and a recovery path. A passing build is not migration validation.

## Financial-message capture
- Keep bank-alert capture disabled unless Harsh provides renewed explicit opt-in. Do not enable, pair, request sign-in material, or activate capture-related credentials as part of routine fixes.
- Preserve the reversible setup. Verify current flags, server permissions, and documented procedures before any authorized re-enablement; do not replay an old activation migration blindly.

## Verification
- In the verified app checkout, run npm run typecheck and npm run build when those scripts exist. If scripts have changed, use their documented equivalents and state the difference.
- For imports or persistence changes, verify representative existing data plus reload/export behavior using isolated fixtures or backups, without overwriting live financial data.
- For UI changes, verify the affected flows in the actual app. Report pre-existing failures separately from failures introduced by the change.

## Working style and skill selection
- Inspect the relevant source, project guides, Git status, and existing changes before editing. Preserve unrelated work and data; make the smallest complete change.
- Use only skills that materially help the current task. Read their SKILL.md before applying them. If a skill is unavailable, state that briefly and continue with equivalent project tools.
- Use ponytail for coding changes. Use brainstorming for ambiguous ideas and alternative solutions; use grilling when the user wants assumptions challenged. Do not add an interview to a clear, authorized task.
- Use domain-modeling when business terminology or rules need clarification. Record resolved terms in GLOSSARY.md and durable decisions only when useful.
- Use create-plan for a requested concise coding plan; writing-plans for a substantial implementation plan. Follow the user's requested scope and existing authorization.
- Use diagnosing-bugs for difficult failures or performance regressions. Establish a focused reproduction before speculative fixes.
- Use frontend-design for new or substantially redesigned screens, or impeccable for UI audits and polish; avoid loading both by default.
- Use webapp-testing for local application test workflows and playwright for focused browser automation. Check functionality, console errors, and relevant responsive states with synthetic data.
- Use security-best-practices for an explicitly requested security review or secure-by-default implementation. Do not turn every small edit into a full audit.
- Use finance-reconciliation for comparisons with financial source records; spreadsheets or pdf for the relevant file workflow.
- Use excalidraw when editable diagrams are requested, frontend-slides for HTML slide decks, and the presentations skill for PowerPoint deliverables.
- Use record-and-replay only when explicitly asked to record a demonstrated workflow. Installing or selecting it does not authorize recording.
- Use handoff when asked to prepare a continuation summary; redact secrets and reference existing artifacts rather than duplicating them.

## Context and efficiency
- Search narrowly and read only relevant files or ranges. Prefer scripts for repeated arithmetic and transformations.
- Reuse verified project mappings and decisions; verify schema or policy changes before reusing them. Do not import an entire chat history into these instructions.
- Keep updates and final reports concise: outcome, validation, unresolved limitations. Short output must not replace necessary checks.
- Ask only for missing information that materially changes the result. Never invent financial inputs, silently alter approved assumptions, or treat elapsed time as approval.
- Redact credentials and personal financial data from logs and screenshots. Repository access does not authorize sending data to external services, production deployment, or recording.
