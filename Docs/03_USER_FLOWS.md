# User Flows

## Flow 1 — Add Personal Purchase

1. Open Add Expense.
2. Select Personal.
3. Enter product title.
4. Enter price.
5. Select date.
6. Select category.
7. Select Need / Want / Dream.
8. Optionally enter payment method and note.
9. Save.
10. Dashboard updates immediately.

## Flow 2 — Add Shared Purchase

1. Open Add Expense.
2. Select Shared.
3. Enter expense title.
4. Enter total price.
5. Select payer.
6. Select friends.
7. Choose split method.
8. Review each person's share.
9. Confirm.
10. Create immutable expense + participant split records.
11. Update outstanding balances.

## Flow 3 — Equal Split

Example:
- Total = ₹900.
- Participants = 3.
- Share = ₹300 each.

If one person paid ₹900:
- Payer's own share = ₹300.
- Other two participants each owe ₹300.

## Flow 4 — Custom Split

Example:
- Total = ₹1,000.
- User = ₹600.
- Friend A = ₹250.
- Friend B = ₹150.

Validation:
`600 + 250 + 150 = 1,000`

Do not allow save if the sum does not equal the total.

## Flow 5 — Percentage Split

Example:
- Total = ₹2,000.
- User = 50%.
- Friend A = 30%.
- Friend B = 20%.

Validation:
`50 + 30 + 20 = 100%`

## Flow 6 — Settle Balance

1. Open Friends or Settlements.
2. Select friend.
3. View outstanding amount.
4. Select Settle.
5. Enter settlement amount.
6. Confirm.
7. Create settlement record.
8. Recalculate balance.

Never delete the original shared expense.

## Flow 7 — Monthly Recurring Expense

1. Open Recurring.
2. Create recurring expense.
3. Enter title and amount.
4. Select billing day.
5. Select payer.
6. Select participants.
7. Configure split.
8. Set start date.
9. Save template.
10. On each billing period, create a new actual expense instance.
11. Keep the recurring template unchanged unless explicitly edited.

## Flow 8 — Monthly Review

Dashboard should allow:
- Total monthly spending.
- Need/Want/Dream totals.
- Category totals.
- Shared expense total.
- Amount owed.
- Amount receivable.
- Recurring commitment total.

## Empty States

Do not show blank screens.

Examples:
- No expenses: explain how to add the first expense.
- No friends: explain that friends can be added for shared expenses.
- No recurring expenses: explain the recurring feature.
- No outstanding balance: explicitly show that all shared balances are settled.
