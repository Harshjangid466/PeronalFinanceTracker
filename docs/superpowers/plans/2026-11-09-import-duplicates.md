# Statement duplicate checking

Goal: reconcile manual CC expenses and bank/UPI imports without posting duplicates or hiding ambiguous payments.

- Fix annual Paytm date resolution using valid dates within the printed period; reject ambiguous years.
- Extend shared classification to unique exact merchant/account/date/amount/direction matches, preserving source rows as matched evidence and existing ledger data. References remain authoritative; competing rows and conflicts remain reviewable.
- Test repeats, multiple equal payments, different accounts/dates/directions, deleted records, shared references, reload and backup; run parser checks, browser checks, typecheck and build. No beta or deployment.
