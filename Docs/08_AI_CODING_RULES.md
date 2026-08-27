# AI Coding Rules

This document is intended to guide Claude Code or another coding agent.

## Rule 1 — Read Before Coding

Before changing code:
1. Read project documentation.
2. Inspect existing architecture.
3. Identify affected files.
4. Check existing conventions.
5. Do not rewrite unrelated code.

## Rule 2 — Work Feature-by-Feature

Implement one feature completely before moving to the next.

For each feature:
1. Data model.
2. Validation.
3. Backend logic.
4. API.
5. UI.
6. Error states.
7. Tests.
8. Documentation update.

Do not create placeholder functions that are required for the feature to work.

## Rule 3 — Financial Correctness

Never:
- Use floating-point values for stored money.
- Trust client-side balance calculations.
- Mutate historical expense amounts through recurring templates.
- Delete financial history merely because a friend is archived.
- Calculate settlement state using UI-only state.

Always:
- Calculate monetary values deterministically.
- Reconcile split totals.
- Store currency.
- Preserve auditability.

## Rule 4 — Shared Expense Integrity

A shared expense must always have:
- One total.
- One payer.
- One or more participants.
- A valid split.
- Participant shares that reconcile to the total.

## Rule 5 — Recurring Expense Integrity

A recurring record is a template.

Generated monthly expenses are independent historical records.

Template changes affect future generated records only.

## Rule 6 — Validation

Validate:
- Client side for usability.
- Server side for security and correctness.

Never rely on frontend validation alone.

## Rule 7 — Authorization

Every resource lookup must verify ownership or explicit participation rights.

Never assume that possessing an ID grants access.

## Rule 8 — UI

Avoid:
- Fake analytics.
- Hardcoded financial totals.
- Placeholder charts in production screens.
- Decorative complexity.
- Hidden financial states.

Every displayed balance must originate from real application data.

## Rule 9 — Error Handling

Every important operation needs:
- Loading state.
- Success state.
- Validation error.
- Server error.
- Retry/recovery path where appropriate.

## Rule 10 — Tests

Financial calculations require automated tests.

At minimum test:
- Equal splits.
- Custom splits.
- Percentage splits.
- Rounding.
- Settlements.
- Recurring generation.
- Authorization.

## Rule 11 — Documentation

After implementation:
- Update the relevant `.md` file.
- Record important architectural decisions.
- Record deviations from this specification.
- Do not leave documentation describing behavior that the code does not implement.

## Rule 12 — No Hallucinated Dependencies

Do not add a library merely because it appears convenient.

Check:
- Existing dependencies.
- Compatibility.
- Maintenance status.
- Security.
- Whether native platform functionality is sufficient.

## Definition of Done

A feature is complete only when:
- It works end-to-end.
- Data is persisted correctly.
- Validation is implemented.
- Authorization is implemented.
- Errors are handled.
- Tests pass.
- UI states are complete.
- Documentation is updated.
