# Sharing statement PDFs into Finance Tracker

This is a personal-main feature. It has not been published to Netlify or copied to beta.

## Use

1. After a release, open the app online once and install it on your home screen using a browser that supports Web Share Target. An already installed app may need a manifest update or reinstall before the operating system lists it in Share. Export a backup first; do not clear site data.
2. Open the actual PDF attachment in email, Files or another app. Share the PDF file, rather than the email or a download link, and choose Finance Tracker.
3. Imports & review opens with the filename visible. Select Monthly reconciliation for a bank/card statement, or Paytm PDF for UPI. Choose the account and supply its PDF password, or use the saved device-local password.
4. Tap Read PDF. Source totals and balances are checked by the existing readers. Review the preview, then choose Import statement. Existing entries are matched without duplicate posting; ambiguous/missing entries use the existing review flow.

Current iPhone/Safari releases do not support registering a web app as a file share target. Use Save to Files → Choose statement in the meantime. The standard manifest registration stays in place, so a browser that adds compatible support can expose the same workflow without a platform-specific switch in our app. This is readiness for future support, not a promise about Apple's delivery or exact behavior.

## Data handling

- The service worker handles the exact multipart POST /share-statement route locally. Shared PDF bytes and handoff tokens are not sent to Netlify, exported in backups, synced, or added to the offline cache.
- Accept one PDF smaller than 25 MB, with a PDF filename, compatible MIME type and PDF header. Reject multiple files, links, empty files, non-PDF content and oversized bodies. This screening does not replace the PDF reader's validation.
- Before opening, the PDF is staged in a dedicated temporary IndexedDB store behind a random one-use token. Unopened shares expire after ten minutes; expired data is removed on the next share, retrieval, app opening or worker activation. At most three unopened shares are retained. If there are more, the oldest is removed.
- Once retrieved, delete the staged copy and keep the File in the import page's memory. Wrong passwords can be retried without re-sharing. Import, cancellation or closing the page releases the file. Reloading an already opened share requires sharing or choosing the file again.
- If login is enabled, the existing account gate still runs before import. A shared file does not select or authorize a ledger account, alter permissions, or post transactions.
- A share can launch a separate window; existing unsaved work in another window is not intentionally overwritten. The existing account/tab protections still apply.

## Verification

Run npm run typecheck and npm run build. Start a local production preview on port 5205, then run npm run test:pdf-sharing-ui with PLAYWRIGHT_MODULE pointing to the available Playwright installation. SHARE_TEST_URL overrides the preview URL.

The synthetic browser test exercises the real service worker and multipart POST (including a top-level form navigation) at mobile and desktop sizes, wrong/correct encrypted-PDF passwords, explicit confirmation, source totals, duplicate and manual upload, one-use/expired/cancelled shares, multiple/invalid/oversized files, bounded concurrent shares, unavailable staging storage, offline launch, reload and backup preservation, and cache/network exclusions. Physical Android/iPhone share menus require device verification after publication. Desktop emulation does not establish OS integration.

References: [Web Share Target](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target), [manifest share_target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target), [WebKit support request](https://bugs.webkit.org/show_bug.cgi?id=194593).
