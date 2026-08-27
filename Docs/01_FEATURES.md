# Feature-by-Feature Specification

## Feature 01 — Personal Expense

### Purpose
Record an individual purchase.

### Fields
- `title` — required.
- `amount` — required, positive.
- `currency` — default user currency.
- `purchase_date` — required.
- `category` — optional.
- `classification` — required: `NEED | WANT | DREAM`.
- `payment_method` — optional.
- `note` — optional.

### Validation
- Title cannot be empty.
- Amount must be greater than zero.
- Date must be valid.
- Classification must be one of the supported enum values.

---

## Feature 02 — Need / Want / Dream

### Purpose
Make spending decisions visible.

### Values

| Value | Meaning |
|---|---|
| Need | Necessary or practically required |
| Want | Useful or enjoyable but non-essential |
| Dream | Aspirational, luxury, major goal, or significant desire |

### Rules
- User selects the value.
- Historical values do not change automatically.
- Analytics can compare spending by value.
- The app must not shame or score the user based only on this field.

---

## Feature 03 — Friends

### Purpose
Maintain people with whom expenses are shared.

### Friend Fields
- `id`
- `name`
- `email` — optional
- `phone` — optional
- `avatar` — optional
- `status`
- `created_at`
- `updated_at`

### Rules
- A friend can participate in multiple shared expenses.
- Deleting a friend must not destroy historical financial records.
- Prefer archive/deactivate over hard deletion when the friend has transaction history.

---

## Feature 04 — Shared Expense

### Purpose
Track one expense paid by one person and shared by multiple people.

### Fields
- `title`
- `total_amount`
- `currency`
- `expense_date`
- `category`
- `payer`
- `participants`
- `split_method`
- `note`
- `status`

### Split Methods
- Equal.
- Custom amount.
- Percentage.

### Example
Total = ₹1,200.

Participants:
- User.
- Friend A.
- Friend B.

Equal split:
- Each person = ₹400.

If user paid the entire ₹1,200:
- Friend A owes ₹400.
- Friend B owes ₹400.
- User's own share = ₹400.

---

## Feature 05 — Balance Calculation

For every shared expense:

`net_balance(person) = amount_paid_by_person - amount_owed_by_person`

Interpretation:
- Positive = person should receive money.
- Negative = person owes money.
- Zero = settled for that expense.

The application must calculate balances from immutable expense and split records rather than manually overwriting totals.

---

## Feature 06 — Settlement

### Purpose
Record repayment between friends.

### Fields
- `from_person`
- `to_person`
- `amount`
- `currency`
- `settlement_date`
- `note`
- `reference`

### Rules
- A settlement is a financial record.
- It must not modify the original expense.
- Settlement history must remain auditable.
- A user can view outstanding and settled balances separately.

---

## Feature 07 — Monthly Recurring Expense

### Purpose
Automatically create or prepare repeated shared expenses.

### Fields
- `title`
- `amount`
- `currency`
- `billing_day`
- `participants`
- `payer`
- `split_method`
- `start_date`
- `end_date` — optional
- `active`

### Example
Internet:
- ₹1,000/month.
- User pays.
- User + Friend A participate.
- Equal split.
- Each owes ₹500.

### Critical Rule
A recurring template is not the same as an actual transaction.

When a monthly expense is generated, create a separate expense record for that month.

Changing the recurring template must not rewrite old months.

---

## Feature 08 — Categories

Suggested initial categories:
- Food
- Transport
- Shopping
- Bills
- Housing
- Health
- Education
- Entertainment
- Work
- Travel
- Other

Categories should be configurable later.

---

## Feature 09 — Dashboard

### KPI Cards
- Today.
- This month.
- Need spending.
- Want spending.
- Dream spending.
- You owe.
- Owed to you.

### Lists
- Recent expenses.
- Upcoming recurring expenses.
- Unsettled friend balances.

### Charts
- Monthly spending.
- Need/Want/Dream distribution.
- Category distribution.
- Personal vs shared spending.

---

## Feature 10 — Analytics

### Personal Analytics
- Total spending.
- Average daily spending.
- Monthly trend.
- Category breakdown.
- Need/Want/Dream breakdown.
- Largest purchases.
- Recurring expense burden.

### Shared Analytics
- Total shared spending.
- Amount paid by user.
- Amount paid by friends.
- Outstanding balances.
- Monthly recurring commitments.

Avoid generating financial advice from insufficient data.

---

## Feature 11 — Search and Filters

Filters:
- Date range.
- Category.
- Need/Want/Dream.
- Personal/shared.
- Friend.
- Payment method.
- Settlement status.

Search:
- Product/expense title.
- Friend name.
- Note.

---

## Feature 12 — Notifications

Useful notification types:
- Upcoming recurring expense.
- Unsettled balance.
- Monthly recurring expense created.
- Failed recurring generation.
- Optional monthly spending summary.

Notifications must be configurable.

---

## Feature 13 — Export

Export:
- CSV.
- JSON.

Optional later:
- PDF monthly report.

Export must preserve:
- Dates.
- Amounts.
- Currency.
- Classification.
- Payer.
- Participants.
- Split values.
- Settlement information.

---

## Feature 14 — Security

Minimum:
- Authentication.
- Authorization.
- Per-user data isolation.
- Server-side validation.
- Secure session/token handling.
- Audit-friendly financial records.

A user must never be able to access another user's private expenses by changing an ID in a request.

---

## Feature 15 — Currency

For MVP:
- Use one default currency per account.
- Store currency explicitly on financial records.

Future:
- Multi-currency shared expenses.
- Exchange-rate snapshots.

Do not add automatic currency conversion to MVP unless required.
