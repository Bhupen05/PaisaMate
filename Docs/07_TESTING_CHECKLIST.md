# Testing Checklist

## Money

- [ ] ₹0 rejected where amount must be positive.
- [ ] Decimal currency handled exactly.
- [ ] Large amounts handled.
- [ ] Currency stored with transaction.
- [ ] No floating-point storage.

## Classification

- [ ] Need saved correctly.
- [ ] Want saved correctly.
- [ ] Dream saved correctly.
- [ ] Invalid classification rejected.

## Equal Split

- [ ] Two participants.
- [ ] Three participants.
- [ ] Uneven division.
- [ ] Rounding handled deterministically.
- [ ] Sum of shares equals total.

## Custom Split

- [ ] Exact total accepted.
- [ ] Under-allocation rejected.
- [ ] Over-allocation rejected.
- [ ] Zero participant share handled according to product rules.
- [ ] Negative share rejected.

## Percentage Split

- [ ] Exact 100% accepted.
- [ ] Less than 100% rejected.
- [ ] More than 100% rejected.
- [ ] Decimal percentages handled.
- [ ] Calculated amounts reconcile.

## Payer

- [ ] Payer is a participant where required by the product rules.
- [ ] Payer can cover the full expense.
- [ ] Partial payment represented correctly.

## Settlements

- [ ] Full settlement.
- [ ] Partial settlement.
- [ ] Multiple settlements.
- [ ] Settlement cannot exceed outstanding balance unless explicitly supported.
- [ ] Original expense remains unchanged.

## Recurring

- [ ] Monthly generation.
- [ ] February handling.
- [ ] 28/29/30/31-day months.
- [ ] Billing day outside month length.
- [ ] Start date.
- [ ] End date.
- [ ] Pause.
- [ ] Resume.
- [ ] Duplicate-generation protection.
- [ ] Template edits do not rewrite history.

## Security

- [ ] User A cannot read User B's expenses.
- [ ] User A cannot modify User B's friend.
- [ ] User A cannot modify User B's shared expense.
- [ ] IDs cannot bypass authorization.
- [ ] Server validates all financial input.

## UI

- [ ] Mobile form.
- [ ] Desktop form.
- [ ] Loading state.
- [ ] Empty state.
- [ ] Error state.
- [ ] Success state.
- [ ] Keyboard navigation.
- [ ] Accessible labels.
