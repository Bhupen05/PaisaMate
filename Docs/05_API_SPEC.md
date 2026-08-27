# API Specification

The exact framework may be chosen during implementation. The API contract should remain conceptually stable.

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Personal Expenses

```http
GET    /api/expenses
POST   /api/expenses
GET    /api/expenses/:id
PATCH  /api/expenses/:id
DELETE /api/expenses/:id
```

### Create Expense

```json
{
  "title": "Fuel",
  "amountMinor": 250000,
  "currency": "INR",
  "purchaseDate": "2026-08-28",
  "categoryId": "transport",
  "classification": "NEED",
  "expenseType": "PERSONAL",
  "paymentMethod": "UPI",
  "note": "Weekly fuel"
}
```

## Friends

```http
GET    /api/friends
POST   /api/friends
GET    /api/friends/:id
PATCH  /api/friends/:id
DELETE /api/friends/:id
```

## Shared Expenses

```http
GET  /api/shared-expenses
POST /api/shared-expenses
GET  /api/shared-expenses/:id
```

### Create Shared Expense

```json
{
  "title": "Dinner",
  "amountMinor": 180000,
  "currency": "INR",
  "expenseDate": "2026-08-28",
  "payer": {
    "type": "USER",
    "id": "current-user"
  },
  "participants": [
    {
      "type": "USER",
      "id": "current-user",
      "shareAmountMinor": 60000
    },
    {
      "type": "FRIEND",
      "id": "friend-1",
      "shareAmountMinor": 60000
    },
    {
      "type": "FRIEND",
      "id": "friend-2",
      "shareAmountMinor": 60000
    }
  ],
  "splitMethod": "CUSTOM_AMOUNT"
}
```

## Recurring

```http
GET    /api/recurring
POST   /api/recurring
GET    /api/recurring/:id
PATCH  /api/recurring/:id
DELETE /api/recurring/:id
POST   /api/recurring/:id/pause
POST   /api/recurring/:id/resume
```

## Settlements

```http
GET  /api/settlements
POST /api/settlements
```

## Balances

```http
GET /api/balances
GET /api/balances/:friendId
```

## Analytics

```http
GET /api/analytics/summary
GET /api/analytics/monthly
GET /api/analytics/categories
GET /api/analytics/classification
```

## API Rules

- Validate all input server-side.
- Authenticate every private endpoint.
- Authorize resource ownership.
- Never trust client-calculated balances.
- Recalculate financial totals server-side.
- Use idempotency for operations that may be retried.
- Return structured validation errors.
- Keep financial records auditable.
