# Transfers, reimbursements and backups

## Own-account transfers

Open Transactions → Imports & review → Link own-account transfers. Upload the source and destination statements, choose an outgoing movement and an equal incoming movement in another account, then check both references. The nearest dates appear first; nothing is paired automatically. Fees need their own review.

Before confirming, the panel lists linked app entries that will be excluded from spending/income. The original source rows remain visible as ignored transfers. Excluded app entries remain in Deleted entries with their original details and cannot be restored or purged individually while linked. Undo transfer link restores the group together. If source history is missing or an excluded entry changed, undo stops and asks for the original statements/history rather than overwriting records.

Unlinked possible app entries must be matched or corrected first. Repeated evidence with the same account, reference, date, direction and amount inherits the confirmed transfer; equal amounts alone do not. Transfers cannot reuse held movements, card-offset evidence or active reimbursement entries. No balancing entries or changes to statement totals are made.

## Reimbursements

Open Transactions → Reimbursements → Track an expense. Choose a recorded positive Revenue Expense, the person/merchant expected to repay it and the amount expected back. This can be less than the original expense.

Link existing negative Revenue Expense credits or choose Record new credit. The latter opens the normal form restricted to an expense credit; confirm its account, category and date. Saving creates one separate credit and links it. Existing credits are linked without posting again. Income and loan repayments are not reimbursement credits.

Example: expense ₹1,000, expected reimbursement ₹700, received ₹500 gives ₹200 outstanding and net recorded expense ₹500. Receiving another ₹200 settles the expectation and leaves net expense ₹300. Credits retain their own dates and categories in reports. One credit can belong to one active claim. Excess receipts remain visible for review.

Changed/deleted expenses or credits are flagged and uncertain claims are excluded from the outstanding total. Unlink a changed credit and review it, or explicitly confirm a changed original expense with Update expected amount. Stop tracking keeps all expense/credit entries and the stopped claim history.

## Backup health

Settings → Backup & restore shows the last download request on this device and the number of logged changes since it. Home offers a download when no backup is recorded, or after seven days with new logged changes. Changing records, returning to the app or focusing the window refreshes the reminder; there is no closed-app job.

The browser cannot verify whether a file was actually saved. Keep the downloaded file somewhere safe. Download requests themselves are not counted as financial changes. If action history or the device clock changed unexpectedly, the view asks for a fresh backup instead of claiming zero changes.

Statement history must finish loading before a complete download. If it is unavailable, the available records can still be exported for recovery: the filename contains `partial_backup`, `statementHistoryComplete` is false and the reminder never calls that a complete backup.

Download-receipt metadata contains only time, completeness and an audit cursor. It is account-scoped on the device, is not financial data, and is not exported or synced. A successful download can still be offered if reminder storage is full; a warning explains that the receipt could not be saved. No emails, passwords or new external services are involved.

## Compatibility and verification

New transfer/reimbursement collections are optional additions to the existing data format. Old data is preserved; backup merge retains current decisions on matching IDs and rejects unsafe conflicts. Backups containing transfer exclusions need this updated app: older versions do not recognise the deletion method. Keep a private pre-update backup if rollback to an older app is required.

The synthetic checks cover financial signs, duplicate evidence, undo, stale/unsafe links, cleared/interrupted archives, old backup merges, unknown fields, cloud validation, mobile/desktop UI, actual export/restore and partial recovery. Physical Android/iPhone testing has not been performed. Source synchronization uses `[skip netlify]`; production and beta are unchanged until an explicit release.
