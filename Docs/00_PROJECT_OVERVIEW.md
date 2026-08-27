# Daily Finance With Friends — Project Overview

## 1. Product Vision

Build a simple personal-finance application for tracking daily purchases, understanding whether spending is justified, and managing expenses shared with friends.

The application has two connected areas:

1. **Personal spending**
   - Record a purchase.
   - Store product title, price, date, category, payment method, and notes.
   - Classify the purchase as **Need**, **Want**, or **Dream**.
   - Review spending patterns and the value of purchases.

2. **Shared expenses**
   - Create a shared expense with friends.
   - Select who participated.
   - Split the expense equally or by custom amounts/percentages.
   - Track who paid and who owes whom.
   - Support recurring monthly expenses.
   - Show monthly balances and settlement status.

## 2. Core Principle

The app should answer four questions quickly:

- What did I spend?
- Was it a Need, Want, or Dream?
- Who shares this expense with me?
- What do I owe or what do others owe me?

## 3. MVP Scope

### Personal Finance
- Add, edit, delete purchase.
- Product title.
- Price.
- Purchase date.
- Category.
- Need / Want / Dream classification.
- Optional note.
- Payment method.
- Daily, weekly, and monthly totals.
- Spending breakdown by classification.

### Friends & Splitting
- Create friend profiles.
- Create a shared expense.
- Select participants.
- Record payer.
- Equal split.
- Custom split.
- Percentage split.
- Per-person balance.
- Settlement records.
- Monthly recurring expenses.

### Monthly Maintenance
Recurring expenses can be configured with:
- Title.
- Amount.
- Billing day.
- Participants.
- Split method.
- Start date.
- Optional end date.
- Active/inactive status.

Examples:
- Rent.
- Internet.
- Electricity.
- Streaming subscription.
- Shared software.
- Household supplies.

## 4. Non-Goals for MVP

Do not turn the first version into:
- A banking application.
- A stock/investment platform.
- A tax application.
- A full accounting ERP.
- A payment gateway.
- A lending application.

## 5. Important Product Decision

The classification field should not be treated as an objective financial truth. It is a personal reflection tool.

- **Need** = necessary or practically required.
- **Want** = useful or enjoyable but not necessary.
- **Dream** = aspirational, luxury, major goal, or emotionally significant purchase.

Store the user's classification rather than trying to automatically judge it.

## 6. Recommended Main Navigation

1. Dashboard
2. Transactions
3. Add Expense
4. Friends
5. Shared Expenses
6. Recurring
7. Settlements
8. Analytics
9. Settings

## 7. Dashboard

Display:
- Today's spending.
- This month's spending.
- Need / Want / Dream distribution.
- Shared amount owed.
- Amount others owe the user.
- Upcoming recurring expenses.
- Recent transactions.

The dashboard must prioritize actionable financial information over decorative charts.

## 8. Design Direction

Use a clean finance-oriented interface:
- Strong visual hierarchy.
- Clear numeric typography.
- Minimal decoration.
- Obvious primary actions.
- Consistent currency formatting.
- Clear positive/negative balance states.
- Mobile-first layout.
- Accessible contrast.
- Confirmation for destructive actions.

## 9. Data Integrity

Money must never be stored as floating-point currency values.

Use integer minor units where possible:
- INR 100.50 -> 10050 paise.

Every shared expense must preserve:
- Original total.
- Payer.
- Participants.
- Split method.
- Per-person share.
- Settlement status.

Never silently change historical transactions when a recurring expense template changes.
