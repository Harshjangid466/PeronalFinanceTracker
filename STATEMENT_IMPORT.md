# Statements and import habits

Open **Transactions → Import statements & review**. The normal transaction list is grouped by date, newest first. Reports, expense-template upload, deleted entries and manual bank-message review are under **Tools**.

## Paytm PDF imports — any date range

Import a daily, weekly, monthly or custom-period export. Weekly is only a suggested routine. Overlapping periods retain previously imported rows and review decisions without posting duplicates.

1. In **Settings → Statement import habits**, load your approved habits JSON once. Vendor mappings remain on this device and are included in financial backups. You can add, change or disable vendors and narration rules, adjust morning hours, and set vendor amount limits.
2. Choose the Paytm UPI statement PDF. The importer checks extracted debit/credit counts and amounts against the PDF summary. It rejects incomplete extraction rather than posting a partial statement. Scanned/image PDFs and password-protected PDFs are not supported.
   On an iPhone Home Screen app, save a local copy in **Files → On My iPhone**, then select it. Its filename and reading status appear beside the picker. Reading starts before loading the PDF engine; the reader uses the compatibility build and reports unreadable/undownloaded files explicitly.
3. Confirm the account mappings. An account that cannot be identified remains in review.
4. Import. Recognised, complete revenue-expense rules can post automatically. Narration prevails over vendor habits. NHPV and own-account/cash transfers are excluded from expense posting. New vendors, unfamiliar/complex narration, conflicting rules, amount discrepancies, required custom fields and unusual amounts remain pending.
5. Review pending rows: match an existing entry, inspect/edit an amount discrepancy, post a reviewed entry, or ignore with a reason. You can save a vendor default while posting. Exact account/reference/date/amount matches are linked automatically. Amount/date-only candidates require confirmation.

Payments previously logged manually are checked before automatic posting. Reimporting an overlapping period retains the original row and decision. Editing or deleting a linked financial entry reopens its reconciliation. Reopening/ignoring an import row does not delete an existing financial entry; deletion is a separate action.

Select a Paytm import to undo its untouched automatic postings. Those entries move to Deleted Transactions and their rows reopen for review. Edited entries, manually posted entries, and matched existing transactions are retained.

The morning amount/time habit asks for review by default. Its automatic-posting switch is editable in Settings. Historical unusual-amount detection starts after three matched/posted payments to the vendor. A fixed vendor limit can be set immediately. Blank or generic narration can use vendor habits; unknown meaningful narration needs review.

## Monthly bank, credit-card and Pluxee reconciliation

Choose a CSV or XLSX whose first row contains distinct column headers. Select the statement type and account, map date/description and payment columns, optionally reference/running balance, and choose day-first or month-first dates. Supported payment layouts: separate debit/credit, one signed amount (explicit polarity), or amount plus DR/CR label. Credit-card balances use outstanding liability arithmetic; bank/Pluxee balances use available-balance arithmetic. XLSX uses the first worksheet. References are recommended; indistinguishable duplicate rows without references are rejected rather than combined.

Bank imports do not automatically post unknown debits or treat credits as income. Review their treatment. A reference-identical existing entry can be linked automatically when account, date, direction and integer-paise amount also agree. Pending debit/credit totals and their net are separate. Optional opening/closing balances check statement arithmetic. Import counts and source page/row references make each exception traceable. Suggestions identify possible amount differences, date differences, ambiguous matches, or unrecorded movements; proposed corrections require review. Zero-value rows and blank lines are excluded. “All rows explained” does not claim the selective expense ledger equals the bank balance.

Bank PDF parsing needs a bank-specific statement format and is not included. Paytm exports are not complete bank statements: hidden payments and wallet payments may be excluded.

## Monthly income and weekly spending

Home shows category spending in rupees, percent of personal expenses and percent of entered monthly salary/revenue. Enter the total monthly figure once; ledger income entries are not added a second time. The income figure is included in backups. Income left after personal expenses is shown separately from confirmed savings, because loans, investments, capital purchases and other allocations are excluded. Missing and zero income have no percentage denominator. Pending statement rows are flagged.

The weekly summary runs Monday through today and compares the same elapsed weekdays last week, with frequent vendors/descriptions. No weekly income or savings is assumed from a monthly figure. Manual payments continue through the existing transaction form.

## Storage and verification

PDF/Excel libraries load on demand. Original statement files are not saved. Extracted rows and review decisions are stored in IndexedDB; financial entries and habits retain the existing ledger storage. Backups include both. This is device/browser-local, with no cross-device synchronization added. Download a backup before moving devices or clearing site storage.

Run `npm run test:statements`, `npm run test:pdf-upload`, `npm run test:alerts`, `npm run test:capture`, and `npm run build`. Statement fixtures committed to the repository are synthetic. Personal statements, backups and vendor mappings must remain outside the repository.
