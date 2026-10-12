# iPhone minimal bank capture — setup and test

Status: receiver activated and live security checks passed; iPhone connection and physical locked-phone test pending. This file is an action-by-action recipe, not an importable signed Shortcut. The final bank-specific amount pattern must be checked against a redacted sample before enabling it for real messages.

## What starts it

In Apple Shortcuts > Automation > New Automation > Message, select the actual bank sender and Run Immediately. Use the Message trigger, NOT the Notification trigger. Pass the arriving Message as Shortcut Input to the capture shortcut. iOS receives the message regardless of whether it displays a banner. Bank sender selection and locked execution must be verified on this phone; no promise of unconditional delivery.

## Native actions for the capture shortcut

Use variables below; do not paste a script into a webpage.

1. Get Text from Shortcut Input. Set variable LocalMessage. Stop This Shortcut if empty.
2. Match Text in LocalMessage using:
   (?i)\bOTP\b|\bPIN\b|one[ -]time|passcode|password|verification|authentication|ओटीपी
   If matches exist, Stop This Shortcut. Nothing is uploaded.
3. Match Text using:
   (?i)failed|declined|unsuccessful|refund|reversal|reversed|self transfer|own account
   If matches exist, Stop This Shortcut. These complex messages need manual review; do not mislabel them as ordinary payments.
4. Match Text using (?i)\b(debited|spent|paid|purchase)\b; set DebitMatches.
   Match Text using (?i)\b(credited|received)\b; set CreditMatches.
   If only DebitMatches is nonempty: set Direction to text debit.
   If only CreditMatches is nonempty: set Direction to text credit.
   If both/neither: Stop This Shortcut.
5. Match Text using:
   (?i)(?:INR|Rs\.?|₹)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)(?![0-9.])
   Count Matches. If count is not exactly 1, Stop This Shortcut.
   This conservative starter skips messages containing both an amount and a balance. A bank-specific pattern is needed for those; do not blindly choose the first amount.
6. Get Group from Matched Text: group 1 of that single match.
   Replace Text: comma with empty text. Get Numbers from Input.
   Calculate number times 100. Round Number to Ones Place. Set AmountMinor.
   If AmountMinor is <= 0 or > 1000000000000, Stop This Shortcut.
7. Set BankDate to empty Text initially.
   Match Text in LocalMessage using \b[0-9]{4}-[0-9]{2}-[0-9]{2}\b.
   If exactly one ISO date is present, set BankDate to that match. Other formats remain unknown until a bank-specific date extraction is configured. Never use arrival date as transaction date.
8. Current Date > Format Date > ISO 8601. Set CapturedAt.
9. Generate UUID. Set CaptureID. Generate it once per received message; reuse the same ID and time for any deliberate retry. This ID is random and contains no SMS text/reference.
10. Get Contents of URL: URL from the app's connection setup, method POST.
    Headers: apikey = the public publishable key shown in the app; Content-Type = application/json.
    Request Body: JSON. Add exactly these seven fields:
      p_token: Text = private phone key from setup
      p_capture_id: Text = CaptureID
      p_amount_minor: Number = AmountMinor
      p_direction: Text = Direction
      p_transaction_date: Text = BankDate (empty when unknown)
      p_captured_at: Text = CapturedAt
      p_version: Number = 2
    NEVER include LocalMessage, Shortcut Input, merchant, account number or reference in the request. Use native JSON encoding, not a Text body. Do not include private keys in URLs. Do not use Show Result, Open App or Open URL in this path.
11. Get Dictionary Value accepted from HTTP result. Successful receipt requires true. Network errors stop the shortcut; no automatic offline retry is implemented. A separate local retry queue is future work.

## Test before enabling bank capture

First run unlocked with a synthetic qualifying message; grant required Shortcuts permissions. Use a trusted test sender and fake text such as INR 250 debited on 2026-10-12. Never make a real bank payment for testing.
Then disable message banners, close the tracker, lock the phone, and have that sender send another synthetic message. Unlock and check the tracker: one captured SUMMARY, no original text/reference, zero financial postings. Repeat with a fake security-message example and verify no new alert. Stop the test connection afterwards. Then configure the real bank sender and validate its redacted format.

The tracker must be opened to download cloud summaries. Review each one before linking/posting. Missing date or transaction classification remains Needs review. Same amount/date can represent two different transactions: manual confirmation is necessary without references.

Capture keys expire after 90 days and can be revoked. Offline phone, a paused Supabase project, reboot before first unlock or iOS restrictions may prevent capture. Stopped/skipped messages are not recovered by reading the SMS inbox. Reconcile against bank statements; this inbox is not proof every transaction was captured.

## Privacy

The cloud receives amount in paise, debit/credit, bank date if extracted, account binding, arrival/server receipt times and a random delivery ID. The full SMS stays in Messages; the shortcut doesn't save a second copy. The cloud stores the key hash and account/device labels. Minimal financial metadata is still sensitive and is not end-to-end encrypted. Source selection must refer to the correct bank/card account.

## HDFC Savings: validated format for the first connection

Use this bank-specific section instead of generic actions 4–7. Test fixtures are fictional; never use a real SMS in GitHub.

- Before extraction, Match Text: (?m)^From HDFC Bank A/C \*?[Xx0-9]+\s*$ . If no match, Stop This Shortcut. Select the HDFC Savings source in the app. If you have multiple HDFC accounts, add a LOCAL-only check for the correct masked suffix; never upload that suffix.
- Match Text: (?im)^Sent[ \t]+Rs\.?[ \t]*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)[ \t]*$ . Require exactly one match. Get group 1, remove commas, convert to number, multiply by 100 and round to ones. This anchors to the Sent line so a balance amount cannot be used accidentally.
- Set Direction to text debit. This pilot handles the supplied Sent format ONLY. Credit/card/other-bank formats need separate local rules; don't label them debit.
- Set BankDate to empty Text. Match Text: (?im)^On[ \t]+([0-9]{2})/([0-9]{2})/([0-9]{2}|[0-9]{4})[ \t]*$ . Require exactly one match to extract a date.
  Get groups 1 = Day, 2 = Month, 3 = Year. If Year has two characters, prefix 20. Build Text: Year-Month-Day using these variables (example 2026-10-11). Set BankDate. The server rejects impossible dates; no arrival-date substitution.
- Keep security/complex-message rejection from actions 1–3 and network actions 8–11. Do not extract/send To, Ref, account suffix, phone number or the original text.
- For the real automation, select the actual sender or use Message Contains: From HDFC Bank A/C. The latter also triggers other HDFC messages; local format checks restrict which are uploaded. Multiple HDFC accounts require the local suffix filter above. The trigger listens to arrival, not notification banners.

Sign-in on the installed tracker: request the sign-in email, long-press its Sign in link to copy it without opening, paste privately into the tracker’s masked field, and tap Sign in on this device. Never share the link or phone key in chat. No custom SMTP or paid plan was configured.
