# Data Model

## Entities

### User
```text
id
name
email
currency
created_at
updated_at
```

### Friend
```text
id
owner_user_id
name
email
phone
status
created_at
updated_at
```

### Expense
```text
id
owner_user_id
title
amount_minor
currency
expense_date
category_id
classification
payment_method
expense_type
note
created_at
updated_at
```

`expense_type`:
- PERSONAL
- SHARED

### SharedExpense
```text
id
expense_id
payer_user_id
split_method
status
created_at
updated_at
```

`split_method`:
- EQUAL
- CUSTOM_AMOUNT
- PERCENTAGE

### SharedParticipant
```text
id
shared_expense_id
person_type
person_id
share_amount_minor
share_percentage
paid_amount_minor
settled_amount_minor
```

### RecurringExpense
```text
id
owner_user_id
title
amount_minor
currency
billing_day
payer_user_id
split_method
start_date
end_date
active
created_at
updated_at
```

### RecurringParticipant
```text
id
recurring_expense_id
person_type
person_id
share_amount_minor
share_percentage
```

### Settlement
```text
id
owner_user_id
from_person_type
from_person_id
to_person_type
to_person_id
amount_minor
currency
settlement_date
note
created_at
```

## Important Modeling Rule

Do not model a shared expense only as:

```text
expense_id -> friend_id -> amount
```

A shared expense needs a participant-level split record because:
- There may be more than two participants.
- Splits may be unequal.
- One person can pay the whole bill.
- Settlements happen separately.
- Historical values must remain stable.

## Money Representation

Use integer minor units.

Example:
```text
₹999.50 -> 99950 paise
```

Never use binary floating point for stored monetary values.

## Suggested Enums

```text
Classification:
NEED
WANT
DREAM

ExpenseType:
PERSONAL
SHARED

SplitMethod:
EQUAL
CUSTOM_AMOUNT
PERCENTAGE

SettlementStatus:
UNSETTLED
PARTIALLY_SETTLED
SETTLED
```

## Database Constraints

- Amounts >= 0.
- Expense total > 0.
- Custom split total must equal expense total.
- Percentage split total must equal 100%.
- Participant list cannot be empty.
- Currency must be valid.
- Historical transaction records should be append-oriented.
