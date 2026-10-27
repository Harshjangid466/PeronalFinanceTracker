# Merchant categorisation implementation plan

Goal: shared local merchant/narration suggestions for entries and imports, plus selectable review of older expenses. User approved the description in chat.

1. Add src/data/merchantCategories.ts and scripts/verify-merchant-categories.cjs: deterministic alias/narration matching, saved-rule priority, unsafe narration guards, remembered vendors and historical preview/apply. Test collisions, exclusions, inactive categories, stale previews, unchanged totals and backup/reload.
2. Integrate with statements.ts, cardReconciliation.ts, StatementWorkspace.tsx and CardReviewPanel.tsx. Keep purchases, refunds, cashback, repayments and unclear credits distinct. Built-in suggestions never auto-post.
3. Extend TransactionForm.tsx to suggest from heading/payee and narration, explicitly apply/add category and remember chosen merchant on save. Never overwrite a selected category automatically.
4. Add MerchantCategoryReview.tsx under Import habits and an atomic audited context operation. Show old/new labels, date, merchant, reason and selection. Reject stale previews; protect active card offsets.
5. Verify focused/regression tests, typecheck/build and isolated desktop/mobile entry/import/history flows plus reload.

Constraints: preserve amounts, dates, directions, source links and unknown fields; no schema migration or new dependencies; do not update beta or deploy. Implement directly in this session under the approved scope.

Completed: shared matching, merchant examples expanded to general category clues and repeat-vendor history, manual/import suggestions, selectable historical preview and audited atomic application. New remembered rules remain review-only. Existing financial amounts and unknown data are preserved. Unit/regression tests and mobile/desktop browser checks passed; final build repeated after edge-case fixes.
