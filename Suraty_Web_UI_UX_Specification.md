# Suraty (PaisaMate) — Web UI/UX Specification
Version: 1.0
Status: UI redesign specification
Scope: Next.js 15 web application
Source of truth: `CONTEXT.md`

---

## 1. Purpose

This document defines the complete web UI logic and interaction model for Suraty (PaisaMate).

Suraty is a personal finance and shared-expense application for groups of friends. The web application must make three things immediately understandable:

1. Where the user's money is going.
2. What the user needs to pay or collect from friends.
3. Which spending is a NEED, WANT, or DREAM.

The redesign must improve information hierarchy, reduce unnecessary navigation, make money states visually obvious, and keep every screen consistent with the existing design system.

Do not change backend contracts as part of a UI-only implementation.

---

# 2. Existing Technical Constraints

- Framework: Next.js 15 App Router
- Language: TypeScript
- Styling: Vanilla CSS only
- State: Zustand
- HTTP: Axios with automatic token refresh
- Charts: Recharts
- Fonts:
  - Inter for normal UI text
  - JetBrains Mono for monetary values
- Backend: FastAPI + MongoDB
- Money is stored as integer minor units.
- Never perform floating-point money calculations.
- Existing CSS variables in `globals.css` are the design-system source of truth.
- Desktop sidebar width: 240px.
- Sidebar hides below 768px.
- Existing mobile bottom navigation appears below 768px.

Reference API areas:
- `/expenses`
- `/friends`
- `/shared-expenses`
- `/balances`
- `/settlements`
- `/recurring`
- `/analytics/dashboard`
- `/analytics/summary`

---

# 3. Core Web UX Principles

## 3.1 Information hierarchy

Every page should answer, in order:

1. What is this page?
2. What is the most important number or state?
3. What action is most likely needed?
4. What supporting details are available?
5. What secondary actions exist?

Do not make every card visually equal.

## 3.2 Action hierarchy

Each page should have one primary action.

Examples:

- Dashboard: `Add expense`
- Transactions: `Add expense`
- Friends: `Add friend`
- Shared: `Add shared expense`
- Settlements: `Record settlement`
- Recurring: `Add recurring`
- Analytics: filters/export if implemented
- Settings: save changes

Secondary actions should not compete with the primary CTA.

## 3.3 Money-first presentation

Money must be visually easy to scan.

Use:
- JetBrains Mono for amounts.
- Consistent currency formatting through `formatMinor`.
- Positive values for money coming to the user.
- Negative values for money owed by the user.
- Neutral styling for zero balances.

Never communicate financial meaning through color alone. Pair color with text such as:
- `You owe`
- `Owed to you`
- `Settled`
- `No balance`

---

# 4. Global Application Shell

## Desktop: >= 768px

Structure:

```text
┌───────────────┬─────────────────────────────────────────────┐
│               │ Header / page actions                       │
│   Sidebar     ├─────────────────────────────────────────────┤
│   240px       │                                             │
│               │ Main content                                │
│               │                                             │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

Sidebar contains:

1. Logo / product name
2. Dashboard
3. Transactions
4. Friends
5. Shared expenses
6. Settlements
7. Recurring
8. Analytics
9. Settings
10. User profile/logout area

Rules:
- Active route must be obvious.
- Use an active background and text/icon treatment.
- Do not rely on icons alone.
- Keep navigation labels stable.
- Sidebar should remain visually quiet compared with page content.

## Mobile: < 768px

Use a fixed bottom navigation.

Recommended primary navigation:

```text
Home | Transactions | Friends | Shared | More
```

`More` opens:
- Settlements
- Recurring
- Analytics
- Settings

Do not place eight navigation items into the bottom bar.

The bottom bar must not cover scrollable content. Add appropriate bottom padding to page content.

---

# 5. Global Page Structure

Every authenticated page should follow:

```text
Page
├── Page header
│   ├── Title
│   ├── Short contextual subtitle
│   └── Primary action
├── Optional summary/KPI region
├── Main content
└── Secondary/empty/error states
```

Use the existing:
- `.page-header`
- `.page-title`
- `.card`
- `.btn`
- `.badge`
- `.amount`
- `.divider`

Avoid creating one-off visual patterns when an existing utility can represent the same concept.

---

# 6. Dashboard UI Logic

## Goal

The dashboard is not a data dump. It is the user's financial command center.

## Recommended structure

```text
Header
  Title: Good morning, {name}
  Subtitle: Your financial snapshot

Primary KPI row
  Total spent
  Money owed to you
  Money you owe
  Recurring this month

Quick actions
  Add expense
  Shared expense
  Record settlement

Recent transactions
  Last 5–8 personal/shared financial events

Friend balances
  Most important unsettled balances

Spending insight
  Category/classification summary

Upcoming recurring
  Next few recurring payments
```

## KPI logic

Do not display four cards if the API does not provide the required values.

Use only data that exists from `/analytics/dashboard` or existing API data.

Each KPI needs:
- label
- primary amount
- optional trend/context
- semantic status where applicable

## Dashboard priority

Priority order:

1. Current money position
2. Outstanding friend balances
3. Recent spending
4. Recurring obligations
5. Analytics

Avoid placing large charts above actionable balances.

---

# 7. Transactions Page

Endpoint:
- `GET /expenses`
- `POST /expenses`
- `GET /expenses/{id}`
- `PUT /expenses/{id}`
- `DELETE /expenses/{id}`

## Desktop layout

```text
Title + Add expense

Search | Category | Classification | Date | Clear filters

Summary strip

Transaction table/list
------------------------------------------------
Date | Title | Category | Classification | Amount | Actions
------------------------------------------------
```

## Mobile layout

Replace the desktop table with transaction cards.

Each card:

```text
Groceries                 - Rs.250.00
Food · Need               Aug 28
                         ...
```

Actions are inside an overflow menu.

## Filters

Existing supported filters:
- search
- category
- classification
- page
- limit

Do not create unsupported server-side filters.

If date filtering is desired but the API does not support it, treat it as a future backend feature rather than pretending it is server-filtered.

## Expense classification

Display:
- NEED
- WANT
- DREAM

Recommended human-readable labels:
- Need
- Want
- Dream

Keep backend values unchanged.

## Add/Edit Expense modal

Fields:

1. Title
2. Amount
3. Currency
4. Expense date
5. Category
6. Classification
7. Notes
8. Tags

Validation:
- title required
- amount > 0
- valid date
- valid category
- valid classification

Do not convert money to floating point.

---

# 8. Friends Page

Endpoint:
- `GET /friends`
- `POST /friends`
- `GET /friends/{id}`
- `PUT /friends/{id}`
- `DELETE /friends/{id}`
- `POST /friends/{id}/archive`

## Friend list

Each friend row/card should show:

```text
Avatar / initials
Name
Email or phone when available

Balance
"Owes you Rs.X"
or
"You owe Rs.X"
or
"Settled"
```

Balance interpretation from API:
- `net_balance_minor > 0`: friend owes the user.
- `net_balance_minor < 0`: user owes friend.
- `0`: settled.

Never invert this logic in the UI.

## Friend detail

Use a focused financial relationship screen:

```text
Friend name

Current balance
  Owed to you / You owe

Actions
  Add shared expense
  Record settlement

Activity
  Shared expenses
  Settlements

Relationship summary
  Total paid
  Total share
  Outstanding
```

Only show values actually available from the API.

---

# 9. Shared Expenses Page

Endpoints:
- `/shared-expenses`
- `/balances`

This is a high-value workflow and should be redesigned around the user's question:

"Who owes whom, and why?"

## Main page

Top section:

```text
Shared expenses
[+ Add shared expense]

Outstanding balances
--------------------------------
Rohan       Rohan owes you   Rs.600
Amit        You owe Amit     Rs.250
Neha        Settled
```

Then:

```text
Recent shared expenses
```

## Add Shared Expense flow

Do not put the entire split workflow into one visually dense form.

Use a step-based modal/drawer:

### Step 1 — Expense

- Title
- Total amount
- Date
- Category
- Classification

### Step 2 — Participants

- Me
- Friends

### Step 3 — Who paid?

- I paid
- Friend paid

### Step 4 — Split

Methods:
- Equal
- Custom
- Percentage

### Step 5 — Review

Show:

```text
Dinner
Total: Rs.1,200

You paid: Rs.1,200

Bhupen     Rs.600
Rohan      Rs.600

Split total: Rs.1,200
Status: Valid
```

Submit only when split amounts sum exactly to the total.

## Rounding

Respect backend rules:
- Equal: distribute remainder to first participants.
- Percentage: last participant absorbs rounding residuals.

The UI must visibly show when a split is invalid.

Never allow the user to submit a total where splits do not equal the total.

---

# 10. Settlements Page

Endpoints:
- `GET /settlements`
- `POST /settlements`
- `DELETE /settlements/{id}`

## Page purpose

Settlements are completed money movements, not shared expenses.

Use separate visual treatment.

Recommended structure:

```text
Settlements

Outstanding balances
[Record settlement]

Settlement history
```

## Record settlement

Fields:
- Friend
- Amount
- Direction
- Settlement date
- Notes

Directions:
- `I_PAID`: user paid friend
- `THEY_PAID`: friend paid user

Make the direction explicit in the UI:

```text
I paid them
They paid me
```

Do not expose raw enum names to users.

## Confirmation

Before saving:

```text
Record settlement?

You paid Rohan
Rs.500
28 Aug 2026
```

After success:
- close modal
- refresh balance
- refresh settlement history
- show success feedback

---

# 11. Recurring Page

Endpoints:
- `/recurring`
- pause/resume
- create/update/delete

## Recurring list

Each item should show:

```text
Netflix
Rs.649 / month
Next: Sep 01
Status: Active
```

Actions:
- Pause
- Resume
- Edit
- Delete

Do not make destructive actions primary.

## Visual distinction

Use:
- Active
- Paused

Do not rely only on opacity to distinguish paused records.

## Add recurring

The form should clearly communicate:
- title
- amount
- currency
- frequency/details supported by the backend
- next occurrence/details supported by the backend

Do not invent recurrence fields that are not supported by the current model.

---

# 12. Analytics Page

Endpoints:
- `/analytics/dashboard`
- `/analytics/summary`

Analytics should explain behavior, not merely draw charts.

Recommended order:

1. Spending overview
2. Spending trend
3. Category breakdown
4. Need / Want / Dream breakdown
5. Supporting detail

## Charts

Use Recharts.

Every chart needs:
- clear title
- period/context
- readable axis labels
- tooltip
- empty state
- loading state

Never show a chart with zero-height/empty data as though it were meaningful.

## Classification presentation

Primary concept:

```text
Need
Want
Dream
```

Use the existing semantic CSS variables:
- `--color-need`
- `--color-want`
- `--color-dream`

Do not hardcode colors.

## Insight cards

Where API data permits, translate statistics into concise statements:

```text
Food is your largest spending category.
```

or

```text
Wants represent 34% of your spending.
```

Do not invent insights when the underlying data is unavailable.

---

# 13. Settings Page

Sections:

## Profile
- Name
- Email (read-only if backend does not support editing)
- Currency

## Appearance
- Light/dark theme if already supported by the application
- Theme preference should persist

## Account
- Logout

Do not add account settings that the backend cannot persist.

---

# 14. Empty States

Every data-driven page needs a deliberate empty state.

Bad:

```text
No data.
```

Good structure:

```text
No expenses yet

Start tracking your first expense to see
your spending history here.

[Add expense]
```

For balances:

```text
You're all settled

No outstanding balances with friends.
```

Empty states should explain what the absence means.

---

# 15. Loading States

Follow the existing loading convention:
- spinning border
- `var(--color-accent)` border-top

Use skeletons for large page sections where appropriate.

Do not display a blank page while waiting for API data.

Loading state hierarchy:
1. Preserve page shell.
2. Preserve section headings.
3. Replace data regions with skeleton/loading indicators.
4. Disable duplicate submission actions.

---

# 16. Error States

Follow existing convention:

- `var(--color-danger-bg)`
- `var(--color-danger)`
- 1px border

Errors must state:
1. What failed.
2. Whether data may have changed.
3. What action can recover.

Example:

```text
Unable to save this expense.
Your previous data is still available.
Please try again.
```

Avoid raw Axios errors and backend stack traces.

---

# 17. Modal and Drawer Rules

Desktop:
- centered modal
- max width approximately 480px for standard forms
- wider modal for multi-step shared-expense flow

Mobile:
- use a bottom sheet/full-width modal for complex forms where practical
- maintain safe-area spacing
- action buttons remain reachable above the keyboard

Every modal must:
- have a clear title
- have a close/cancel action
- trap focus appropriately
- close only when safe
- prevent duplicate submission

Destructive confirmation must be explicit.

---

# 18. Responsive Breakpoints

Use responsive behavior rather than simply shrinking desktop components.

### >= 1200px
- full sidebar
- multi-column dashboard
- wide tables
- expanded analytics

### 768–1199px
- sidebar
- reduced dashboard columns
- tables may become denser or horizontally scrollable

### < 768px
- bottom navigation
- cards instead of wide tables
- stacked forms
- full-width primary actions where appropriate
- compact page headers

Do not create a separate visual language for tablet. Reflow the desktop system.

---

# 19. Accessibility

Required:

- semantic buttons/links
- visible focus states
- keyboard navigation
- labels for all inputs
- error messages associated with fields
- sufficient contrast
- `aria-label` for icon-only buttons
- never communicate state by color alone
- touch targets should be comfortably tappable on mobile

Charts must have textual context so users are not forced to interpret graphics.

---

# 20. Interaction Improvements

Implement these improvements consistently:

### A. Persistent primary action

The page's primary action should remain easy to find.

### B. Optimistic UI only where safe

Safe candidates:
- archive toggle
- pause/resume

Financial mutations should prefer confirmed server responses before presenting the final balance as authoritative.

### C. Prevent duplicate financial submissions

After submit:
- disable button
- show progress
- wait for server response

### D. Preserve form data on validation errors

Do not reset the form when a validation error occurs.

### E. Confirm destructive operations

Delete expense/friend/recurring/settlement actions require confirmation.

### F. Refresh dependent financial data

After:
- shared expense creation
- settlement creation
- expense deletion/update

refresh the affected summaries/balances.

---

# 21. Visual Design Direction

Use the existing design system rather than replacing it.

Core palette variables:
- `--color-bg`
- `--color-surface`
- `--color-surface-2`
- `--color-border`
- `--color-accent`
- `--color-primary`
- `--color-text`
- `--color-text-secondary`
- `--color-text-muted`
- semantic success/danger/warning
- need/want/dream variables

Typography:
- Inter: UI
- JetBrains Mono: money

Spacing:
- existing `--space-1` through `--space-16`

Radius:
- existing `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--radius-full`

Do not introduce arbitrary hex colors in components.

---

# 22. Component Architecture

Recommended reusable components:

```text
components/
├── layout/
│   ├── Sidebar
│   ├── BottomNav
│   └── PageContainer
├── ui/
│   ├── Button
│   ├── Card
│   ├── Badge
│   ├── Input
│   ├── Select
│   ├── Modal
│   ├── Drawer
│   ├── EmptyState
│   ├── ErrorBanner
│   ├── LoadingSpinner
│   └── Skeleton
├── finance/
│   ├── MoneyAmount
│   ├── ClassificationBadge
│   ├── BalanceIndicator
│   ├── TransactionRow
│   ├── FriendBalanceCard
│   └── SharedExpenseSummary
└── charts/
    ├── SpendingTrend
    ├── CategoryChart
    └── ClassificationChart
```

Use components when the pattern appears on two or more pages.

---

# 23. Data and State Rules

Do not duplicate financial truth in local UI state.

Server data:
- expenses
- friends
- shared expenses
- balances
- settlements
- recurring
- analytics

Local UI state:
- modal open/closed
- selected filter
- current step
- temporary form values
- dropdown state

After financial mutations, invalidate/refetch affected server data.

Never calculate authoritative balances from stale client-only values.

---

# 24. Definition of Done

A web page is complete only when:

- Desktop layout is implemented.
- Mobile responsive layout is implemented.
- Loading state exists.
- Error state exists.
- Empty state exists.
- Primary action is obvious.
- Financial amounts use `formatMinor`.
- No floating-point money calculations exist.
- Backend enum values are mapped to human-readable labels.
- Destructive actions are confirmed.
- Keyboard/focus behavior is acceptable.
- No hardcoded design colors are introduced.
- Existing API contracts remain unchanged.
