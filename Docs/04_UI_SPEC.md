# UI Specification

## Design Goal

The interface should make entering and understanding money fast.

## Global Layout

### Desktop
- Sidebar navigation.
- Main content area.
- Optional right-side contextual panel.

### Mobile
- Bottom navigation.
- Full-screen forms.
- Sticky primary action where appropriate.

## Navigation

- Dashboard
- Transactions
- Add
- Friends
- Shared
- Recurring
- Settlements
- Analytics
- Settings

## Dashboard Hierarchy

1. Current month total.
2. Owed / owe balances.
3. Quick add button.
4. Recent expenses.
5. Recurring commitments.
6. Spending analysis.

## Expense Card

Show:
- Title.
- Amount.
- Date.
- Category.
- Need / Want / Dream.
- Personal/shared indicator.

For shared expenses additionally show:
- Payer.
- Participant count.
- User's share.
- Outstanding status.

## Add Expense Form

### Section 1
Expense type:
- Personal
- Shared

### Section 2
- Title.
- Amount.
- Date.
- Category.

### Section 3
Classification:
- Need.
- Want.
- Dream.

### Section 4
Shared-only:
- Payer.
- Participants.
- Split method.
- Split editor.

### Section 5
- Payment method.
- Note.

### Footer
- Cancel.
- Save expense.

## Split Editor

Must show:
- Total expense.
- Participant rows.
- Each person's share.
- Remaining amount.
- Validation state.

Example:

```text
Total                 ₹1,200
--------------------------------
You                   ₹400
Friend A              ₹400
Friend B              ₹400
--------------------------------
Assigned              ₹1,200
Remaining             ₹0
```

## Balance UI

Positive:
`+₹500 — You receive`

Negative:
`-₹500 — You owe`

Zero:
`Settled`

Never rely on color alone; include text and/or icons.

## Recurring Expense UI

Each recurring card:
- Name.
- Monthly amount.
- Next billing date.
- Participants.
- Split.
- Active/inactive.
- Edit.
- Pause.

## Analytics UI

Prefer:
- Summary cards.
- Simple line/bar charts.
- Clear tables.

Avoid:
- Excessive donut charts.
- Decorative gradients.
- Dense dashboards.
- Charts without totals or labels.

## Responsive Requirements

Forms must remain usable at narrow mobile widths.

Minimum interaction requirements:
- Large touch targets.
- Numeric keyboard for money inputs.
- Date picker.
- Clear error messages.
- Sticky save action for long forms.

## Accessibility

- Keyboard navigable.
- Visible focus state.
- Semantic labels.
- Sufficient contrast.
- Do not communicate meaning only through color.
- Error messages tied to the relevant field.
