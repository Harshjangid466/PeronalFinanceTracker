# Statements and import habits

Open **Transactions → Imports & review**. Switch between the **Transactions** and **Imports & review** tabs without re-uploading. The selected PDF preview, account mappings, filters and review fields remain while navigating within the app; an unimported preview is not saved across a page reload or app restart. Imported rows are saved in statement history. From an individual review, use **View transaction history** to check the ledger and return to the same review. The normal transaction list is grouped by date, newest first. Reports, expense-template upload, deleted entries and manual bank-message review are under **Tools**.

## Paytm PDF imports — any date range

Import a daily, weekly, monthly or custom-period export. Weekly is only a suggested routine. Overlapping periods retain previously imported rows and review decisions without posting duplicates.

1. In **Settings → Statement import habits**, load your approved habits JSON once. Vendor mappings remain on this device and are included in financial backups. You can add, change or disable vendors and narration rules, adjust morning hours, and set vendor amount limits.
2. Choose the Paytm UPI statement PDF. The importer checks extracted debit/credit counts and amounts against the PDF summary. It rejects incomplete extraction rather than posting a partial statement. Scanned/image PDFs and password-protected PDFs are not supported.
   On an iPhone Home Screen app, save a local copy in **Files → On My iPhone**, then select it. Its filename and reading status appear beside the picker. Reading starts before loading the PDF engine; the reader uses the compatibility build and reports unreadable/undownloaded files explicitly.
3. Confirm the account mappings. An account that cannot be identified remains in review.
4. Import. Recognised, complete revenue-expense rules can post automatically. Narration prevails over vendor habits. NHPV and own-account/cash transfers are excluded from expense posting. New vendors, unfamiliar/complex narration, conflicting rules, amount discrepancies, required custom fields and unusual amounts remain pending.
5. Review pending rows: match an existing entry, inspect/edit an amount discrepancy, post a reviewed entry, or ignore with a reason. You can save a vendor default while posting. Exact account/reference/date/amount matches are linked automatically. Same-date amount candidates require confirmation and show both dates and references. Equal Paytm amounts on different dates are separate payments unless a shared payment reference establishes a discrepancy. Bank imports may still propose settlement-date differences for manual investigation.

Payments previously logged manually are checked before automatic posting. Reimporting an overlapping period retains the original row and decision. Editing or deleting a linked financial entry reopens its reconciliation. Reopening/ignoring an import row does not delete an existing financial entry; deletion is a separate action.

Select a Paytm import to undo its untouched automatic postings. Those entries move to Deleted Transactions and their rows reopen for review. Edited entries, manually posted entries, and matched existing transactions are retained.

The morning amount/time habit asks for review by default. Its automatic-posting switch is editable in Settings. Historical unusual-amount detection starts after three matched/posted payments to the vendor. A fixed vendor limit can be set immediately. Blank or generic narration can use vendor habits; unknown meaningful narration needs review.

## Monthly bank, credit-card and Pluxee reconciliation

Choose a CSV or XLSX whose first row contains distinct column headers. Select the statement type and account, map date/description and payment columns, optionally reference/running balance, and choose day-first or month-first dates. Supported payment layouts: separate debit/credit, one signed amount (explicit polarity), or amount plus DR/CR label. Credit-card balances use outstanding liability arithmetic; bank/Pluxee balances use available-balance arithmetic. XLSX uses the first worksheet. References are recommended; indistinguishable duplicate rows without references are rejected rather than combined.

Bank imports do not automatically post unknown debits or treat credits as income. Review their treatment. A reference-identical existing entry can be linked automatically when account, date, direction and integer-paise amount also agree. Pending debit/credit totals and their net are separate. Optional opening/closing balances check statement arithmetic. Import counts and source page/row references make each exception traceable. Suggestions identify possible amount differences, date differences, ambiguous matches, or unrecorded movements; proposed corrections require review. Zero-value rows and blank lines are excluded. “All rows explained” does not claim the selective expense ledger equals the bank balance.

For PDF statements, choose the app account and enter a password if protected, then select the file. The current readers cover the supplied Axis, HDFC Swiggy, ICICI Amazon, SBI PhonePe, BOB card, SBI savings and HDFC savings formats. Source debit/credit totals must agree; bank row counts and each running balance are checked too. Scanned BOB statements use a local OCR reader. Its tools download on first use; your statement stays on your device. OCR names/references need visual review even when amounts agree. Unsupported or ambiguous layouts fail with a CSV/XLSX fallback rather than partially importing.

PDF opening/closing balances and recognised full statement periods come from the source and cannot be overwritten in the preview. Period coverage includes days without movements, so app-only entries at month-end are still checked. When a period is not recognised (or for CSV/XLSX), enter both coverage dates explicitly. A transaction posted just outside the printed period is retained only when its printed bank value date belongs to that period; both dates remain visible. Source pages and narration are retained. Rewards/cashback-earned columns are excluded; actual cashback credits remain movements. SBI rounded outstanding totals retain their small rounding variance without creating an adjustment. Account selection is explicit; payment mode is suggested only from source evidence and must be confirmed for posting. Passwords and original PDF files are never saved. Paytm exports are not complete bank statements: hidden payments and wallet payments may be excluded.

Reopen a posted import row to change its classification. **Save changes to posted entry** updates the existing transaction, retaining its identity and references. Select the vendor-default checkbox to save a habit alongside that update.

## Habit suggestions

After importing, expand **Suggested habits**. At least three debits across two dates to a vendor produce evidence: common amounts, range, repeated notes and weekday-morning counts when times are supplied. A bank statement with dates only cannot supply time habits. Multiple rows linked to the same payment count once. Existing vendor rules, including disabled ones, are not suggested again. Category suggestions come from consistent reviewed expense entries or recognised narration; conflicting purposes remain visible. Choose or modify the category, optionally keep the observed maximum as a review threshold, then approve. Nothing is enabled before approval and previous entries are unchanged. Dismissals survive backups; approved rules can be edited in Settings.

## Recurring entries

Due automatic templates run on opening/resuming and as the day changes while the app is open. Catch-up records each occurrence once, respecting end dates, pauses, cancellations, explicit skips and already-recorded/deleted occurrences. Monthly/quarterly/half-yearly/yearly schedules preserve their intended day through short months (31 January → 28 February → 31 March). Editing the next due date sets the new intended day. Recurring entries record ledger transactions; they do not make payments or run while the app is closed.

## Monthly income and weekly spending

Home shows category spending in rupees, percent of personal expenses and percent of entered monthly salary/revenue. Enter the total monthly figure once; ledger income entries are not added a second time. The income figure is included in backups. Income left after personal expenses is shown separately from confirmed savings, because loans, investments, capital purchases and other allocations are excluded. Missing and zero income have no percentage denominator. Pending statement rows are flagged.

The weekly summary runs Monday through today and compares the same elapsed weekdays last week, with frequent vendors/descriptions. No weekly income or savings is assumed from a monthly figure. Manual payments continue through the existing transaction form.

## Storage and verification

PDF/Excel libraries load on demand. Original statement files are not saved. Extracted rows and review decisions are stored in IndexedDB; financial entries and habits retain the existing ledger storage. Backups include both. This is device/browser-local, with no cross-device synchronization added. Download a backup before moving devices or clearing site storage.

Run `npm run test:statements`, `npm run test:bank-pdf`, `npm run test:pdf-upload`, `npm run test:alerts`, `npm run test:capture`, and `npm run build`. Statement fixtures committed to the repository are synthetic. Personal statements, backups and vendor mappings must remain outside the repository.
