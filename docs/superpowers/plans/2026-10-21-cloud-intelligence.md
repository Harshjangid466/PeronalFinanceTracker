# Cloud Intelligence Implementation Plan

**Goal:** Add reviewed, aggregate-only OpenAI analysis to the visual spending workspace.
**Architecture:** A local snapshot carries anonymous aggregate facts and a separate local evidence map. A protected Netlify function calls Responses with strict structured output; the app renders selected facts as interactive charts. No persistence changes or automatic ledger writes.
**Tech Stack:** Existing React/TypeScript, browser fetch, Netlify Functions, OpenAI Responses API.
**Spec:** User requested cloud AI, delegated provider choice, and required review of sent data. Preserve the existing visual dashboard and focus on petty expenses and cards.

## Constraints and review focus
- Server-only provider key; separate private access code, no publicly billable anonymous endpoint.
- Exact JSON preview and fresh consent for each snapshot; changed data invalidates review/results.
- Integer paise, unknown income remains null, source movements never added to ledger spending.
- No raw identifiers, narrations, PDFs, passwords, or vendor/account names in the payload.
- No fabricated charts: output references only known facts; short model text remains advisory.

## Tasks
- [x] Build bounded shared request/output validators and a local aggregate snapshot with evidence. Test privacy, signs, unknown income, overlap and scope.
- [x] Build the authenticated function, limited request/output sizes, timeouts, sanitized errors and setup guide. Test with mocked provider responses, refusal, invalid output and authentication failures.
- [x] Add review/send/cancel flow and compact AI charts with evidence links. Test consent, stale snapshots, failures, mobile/desktop and no persistence changes with synthetic data.
- [x] Run typecheck, production build and relevant analytics regressions. Do not deploy or send real financial data during verification.

Implementation proceeds in this session under the user's existing build instruction. No credentials or deployment are authorized by this plan.

## Verification result
69 automated checks passed across cloud contracts/backend, dashboard, spending coach, insight feed and chart geometry. Synthetic Edge mobile and desktop tests passed for consent, exact JSON submission, evidence, stale scopes, cancellation, provider/configuration failures, reload and unchanged ledger. Existing dashboard flows and empty 320px layout also passed. Frontend/function typechecks and production build passed. Only existing PDF/Excel chunk warnings remain. Live provider calls, physical iPhone, hosted rate limiting and production deployment remain unverified; server secrets are not configured by this task.
