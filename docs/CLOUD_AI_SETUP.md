# Cloud analysis setup

Provider: OpenAI Responses, model `gpt-5.6-terra`. This is separate paid API usage, not the ChatGPT subscription. Model availability and billing must be checked in the OpenAI project before activation.

## Configure on Netlify
1. Create a dedicated OpenAI project and a restricted API key with permission to create Responses. Set a project budget alert and monitor usage; budget alerts alone are not a guaranteed spending cap.
2. In Netlify project configuration, add **server/function-scoped secrets**:
   - `OPENAI_API_KEY`: the provider key.
   - `AI_ANALYSIS_ACCESS_TOKEN`: a separately generated private random code, 32–256 characters. For example, generate 32 random bytes locally with a password manager. Do not reuse a password or the provider key.
3. Never prefix these with `VITE_`, commit them, include them in the browser build, or paste the provider key into chat. Configure secrets through the hosting dashboard. Do not put them in netlify.toml.
4. Deploy the function and frontend together after approval. Keep the existing Netlify site protection enabled. Requests also require the separate analysis code. The function includes a Netlify per-IP-and-domain rate limit of 10 requests per minute at `/api/financial-analysis`; verify its deployed configuration before enabling paid use. This is not a global spending cap, and enforcement can lag by up to 10 seconds.
5. In the app, open **Review data for AI**, inspect the financial JSON, enter the private analysis code, check consent, and click **Send reviewed summary**. A new review is required for each submission. Changing data, month, account, petty limit or source-history status invalidates the snapshot/results.

This shared code is a personal-app access control, not a multi-user authentication system. Rotate it if disclosed. Do not publish it in client environment variables. The code remains in component memory until the review closes/reloads; it is not stored in ledger backups.

## Data contract
Only the exact previewed `AISummary` is sent, through Netlify to OpenAI. It includes month/end day, comparison period, selected scope, income basis, aggregate integer-paise totals/counts, up to 16 category comparisons, 12 anonymous vendor groups, 10 anonymous card groups, weekday totals, repeated petty-amount totals, anonymous petty-vendor groups, six monthly expense/income totals, allocations and source review counts. It is a bounded view; vendor/category/card groups can be truncated. Exact transaction dates/times, raw narratives, account numbers, vendor/account names, IDs, PDFs, passwords and personal/contact data are excluded by the builder. **Custom category labels are sent verbatim within the displayed length limit; review them.** Local evidence maps retain the names/IDs on the device for drill-down.

Results are advisory, never change transactions or habits, and are held only in UI memory. Model output can still contain unsupported interpretations despite schema and evidence-ID validation. All bar lengths and displayed figure labels use app-computed facts; model-selected facts can overlap and are not added together. Source movement totals are distinct from ledger spending. Missing imports remain unknown.

The request uses `store:false`, no tools, no files, low reasoning effort and a 3,000 output-token ceiling. This disables saved response state, **not all provider retention**; standard abuse monitoring and applicable prompt caching can still apply. The app does not log prompts, replies, access codes or API keys. Hosting/provider operational processing still occurs. Stopping the browser wait cannot recall submitted data or guarantee cancellation of billing. No retry happens automatically.

## Local verification
`npm run test:cloud-ai` uses fake credentials and mocked Responses; no real API is called. `npm run typecheck` checks the frontend. `npm run typecheck:functions` separately checks the function and contract. UI verification uses isolated synthetic records and intercepted requests. Plain Vite serves only the frontend; live function integration requires Netlify Dev or an approved Netlify preview deploy. A missing/HTML endpoint displays a setup error, never fabricated results.

No live paid API call, deployment, Gmail connection, bank-alert enablement or data migration is included in local verification.

References: [model](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [data controls](https://developers.openai.com/api/docs/guides/your-data), [Netlify function API](https://docs.netlify.com/build/functions/api/).
