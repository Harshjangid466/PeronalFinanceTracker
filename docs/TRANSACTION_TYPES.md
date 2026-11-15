# Transaction types and categories

Open Settings → Transaction types & categories to add a custom type. Choose its financial behaviour explicitly: for example, Education can behave as Revenue Expense, while Gold purchase can behave as Investment. Its label and categories are independent, while totals follow the chosen behaviour. Once entries or templates use a type, its behaviour cannot be changed.

Use Categories beside a type to manage its categories and subcategories. Settings → CAPEX categories opens the asset categories directly. A category called Property under CAPEX is separate from Property under Revenue Expense. Existing investment-type options remain available through their existing manager.

Manual entries, quick entry, recurring templates and statement review offer the configured types. Changing type updates the applicable fields and clears incompatible selections. Deactivating an option removes it from new selections while retaining historical references. Existing inactive selections remain visible when editing their records.

CSV reports retain the canonical Transaction Type and include Configured Type and Transaction Type ID. JSON backups preserve the catalogue and entry references. Keep a private backup before updating; older app versions do not understand all new catalogue metadata. Existing amounts and financial signs are preserved during migration.

This source batch is synchronized to main and friends beta, without a Netlify release. Beta retains its separate storage and neutral setup. Desktop browser tests cover mobile and desktop widths; physical phone testing remains outstanding.
