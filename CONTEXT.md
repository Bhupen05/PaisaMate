# Suraty (PaisaMate) — Full Context for Frontend / UI Work

> Hand this file to any AI model to get full context on the codebase. It covers the complete tech stack, API contracts, design system, file structure, conventions, and what is already built.

---

## 1. Project Overview

**Suraty** is a personal finance + shared expense tracking app for groups of friends.

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Vanilla CSS |
| Backend | Python FastAPI + MongoDB (Motor async driver) |
| Auth | JWT (access 30 min + refresh 30 days) stored in Zustand persisted to localStorage |
| State | Zustand (store/authStore.ts) |
| HTTP Client | Axios with auto-refresh interceptor (lib/api.ts) |
| Money | All amounts stored as integers in minor units (paise/cents). Never use floats. |
| Fonts | Inter (body), JetBrains Mono (amounts) |
| Charts | recharts |

**GitHub repo:** https://github.com/Bhupen05/PaisaMate

---

## 2. Repository Structure

```
suraty/
├── apps/
│   └── web/                         # Next.js 15 frontend
│       ├── app/
│       │   ├── layout.tsx            # Root layout with theme injector
│       │   ├── page.tsx              # Redirect: / -> /dashboard or /login
│       │   ├── providers.tsx         # React Query + Zustand context wrapper
│       │   ├── globals.css           # Full design system (CSS custom properties)
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── register/page.tsx
│       │   └── (dashboard)/
│       │       ├── layout.tsx        # Auth guard + Sidebar/BottomNav shell
│       │       ├── dashboard/page.tsx
│       │       ├── transactions/page.tsx
│       │       ├── friends/page.tsx
│       │       ├── shared/page.tsx
│       │       ├── settlements/page.tsx
│       │       ├── recurring/page.tsx
│       │       ├── analytics/page.tsx
│       │       └── settings/page.tsx
│       ├── components/
│       │   └── layout/
│       │       ├── Sidebar.tsx       # Desktop nav (240px, auto-hides <768px)
│       │       └── BottomNav.tsx     # Mobile nav (fixed bottom, shows <768px)
│       ├── lib/
│       │   ├── api.ts                # Axios instance with Bearer + auto-refresh
│       │   └── money.ts              # formatMinor(amount, currency) helper
│       └── store/
│           └── authStore.ts          # Zustand auth store (persisted)
└── server/                           # FastAPI backend
    ├── main.py                       # App entry + CORS + router registration
    ├── .env                          # Secrets (NOT committed)
    └── app/
        ├── api/                      # Route handlers
        │   ├── auth.py
        │   ├── expenses.py
        │   ├── friends.py
        │   ├── shared_expenses.py
        │   ├── settlements.py
        │   ├── recurring.py
        │   └── analytics.py
        ├── models/                   # Pydantic models
        ├── services/                 # Business logic
        ├── core/
        │   ├── config.py             # Settings from .env
        │   └── security.py           # bcrypt hashing, JWT encode/decode
        └── db/
            └── database.py           # Motor MongoDB connection
```

---

## 3. Backend API Reference

**Base URL:** http://localhost:8000/api
**Auth header:** Authorization: Bearer <access_token> on all protected routes.
**All amounts are integers (minor units).** e.g. Rs.150.75 -> 15075

### 3.1 Auth (/auth)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | /auth/register | No | {name, email, password, currency} | TokenResponse |
| POST | /auth/login | No | {email, password} | TokenResponse |
| POST | /auth/refresh | No | {refresh_token} | TokenResponse |
| GET | /auth/me | Yes | -- | UserResponse |
| PATCH | /auth/me | Yes | {name?, currency?} | UserResponse |

**TokenResponse shape:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "name": "Bhupen", "email": "b@example.com", "currency": "INR", "created_at": "...", "updated_at": "..." }
}
```

### 3.2 Personal Expenses (/expenses)

| Method | Path | Description |
|---|---|---|
| GET | /expenses | List (query: search, category, classification, page, limit) |
| POST | /expenses | Create |
| GET | /expenses/{id} | Get one |
| PUT | /expenses/{id} | Update |
| DELETE | /expenses/{id} | Delete |

**Expense body:**
```json
{
  "title": "Groceries",
  "amount_minor": 25000,
  "currency": "INR",
  "expense_date": "2024-08-01",
  "category_id": "food",
  "classification": "NEED",
  "notes": "",
  "tags": []
}
```

**Classifications:** NEED, WANT, DREAM
**Category IDs:** food, transport, health, entertainment, shopping, utilities, housing, education, personal, other

### 3.3 Friends (/friends)

| Method | Path | Description |
|---|---|---|
| GET | /friends | List all |
| POST | /friends | Add {name, email?, phone?} |
| GET | /friends/{id} | Get + balance summary |
| PUT | /friends/{id} | Update info |
| DELETE | /friends/{id} | Delete |
| POST | /friends/{id}/archive | Archive/unarchive toggle |

net_balance_minor > 0 means friend owes you; < 0 means you owe friend.

### 3.4 Shared Expenses (/shared-expenses)

| Method | Path | Description |
|---|---|---|
| GET | /shared-expenses | List all |
| POST | /shared-expenses | Create with splits |
| GET | /shared-expenses/{id} | Get one |
| PUT | /shared-expenses/{id} | Update |
| DELETE | /shared-expenses/{id} | Delete |
| GET | /balances | Net balances per friend pair |

**Body:**
```json
{
  "title": "Dinner",
  "total_amount_minor": 120000,
  "currency": "INR",
  "expense_date": "2024-08-01",
  "category_id": "food",
  "classification": "WANT",
  "payer_type": "ME",
  "split_method": "EQUAL",
  "participants": [
    {"type": "ME", "id": "me", "name": "Me"},
    {"type": "FRIEND", "id": "friend_id_here", "name": "Rohan"}
  ],
  "splits": [
    {"participant_type": "ME", "participant_id": "me", "amount_minor": 60000},
    {"participant_type": "FRIEND", "participant_id": "friend_id_here", "amount_minor": 60000}
  ]
}
```

Split methods: EQUAL, CUSTOM, PERCENTAGE
Payer types: ME, FRIEND

ROUNDING RULE: splits must sum exactly to total_amount_minor.
- EQUAL: distribute remainder to first participants
- PERCENTAGE: last participant absorbs rounding residuals

### 3.5 Settlements (/settlements)

| Method | Path | Description |
|---|---|---|
| GET | /settlements | List all |
| POST | /settlements | Record {friend_id, amount_minor, currency, direction, settlement_date, notes?} |
| DELETE | /settlements/{id} | Delete |

Directions: I_PAID (you paid friend), THEY_PAID (friend paid you)

### 3.6 Recurring Templates (/recurring)

| Method | Path | Description |
|---|---|---|
| GET | /recurring | List all |
| POST | /recurring | Create |
| PUT | /recurring/{id} | Update |
| DELETE | /recurring/{id} | Delete |
| POST | /recurring/{id}/pause | Pause |
| POST | /recurring/{id}/resume | Resume |

### 3.7 Analytics (/analytics)

| Method | Path | Description |
|---|---|---|
| GET | /analytics/dashboard | KPIs + recent data |
| GET | /analytics/summary | Full: trends + categories + classification breakdown |

---

## 4. Design System

All styles use CSS custom properties in apps/web/app/globals.css. Do NOT use TailwindCSS.

### Key CSS variables:
```
--color-bg, --color-surface, --color-surface-2, --color-border
--color-accent (#6C63FF), --color-primary (#1A1A2E)
--color-text, --color-text-secondary, --color-text-muted
--color-success, --color-danger, --color-warning (+ -bg variants)
--color-need, --color-want, --color-dream (+ -bg variants)
--space-1 (4px) to --space-16 (64px)
--text-xs (11px) to --text-4xl (36px)
--radius-sm (6px), --radius-md (10px), --radius-lg (16px), --radius-full (9999px)
--shadow-sm, --shadow-md, --shadow-lg, --shadow-xl
--transition-fast (120ms), --transition-normal (200ms), --transition-slow (350ms)
--sidebar-width: 240px
```

Dark mode: set data-theme="dark" on <html>. All variables auto-swap.

### Utility classes (already global):
- .card — surface card with border + shadow
- .btn, .btn-primary, .btn-secondary, .btn-danger, .btn-ghost, .btn-sm, .btn-lg
- .input, .input.error, .input-amount
- .form-group, .form-label, .form-error
- .badge, .badge-need, .badge-want, .badge-dream
- .amount, .amount-positive, .amount-negative, .amount-zero
- .page-header, .page-title
- .divider
- .animate-fade-in, .animate-slide-in

---

## 5. Auth State (Zustand)

```typescript
// store/authStore.ts
interface AuthState {
  user: User | null;           // {id, name, email, currency, created_at, updated_at}
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth(user, accessToken, refreshToken): void;
  updateUser(partial: Partial<User>): void;
  logout(): void;
}
// Persisted to localStorage key: "suraty_auth"
```

---

## 6. Money Helper

```typescript
import { formatMinor } from "@/lib/money";
formatMinor(15075, "INR")  // "Rs.150.75"
formatMinor(1000, "USD")   // "$10.00"

// NEVER float math. Always integers.
// Rs.10.50 = 1050, Rs.5.25 = 525, total = 1575
```

---

## 7. Key Conventions

1. Add "use client" at top of every page/component that uses state or effects.
2. API fields are snake_case: amount_minor, expense_date, category_id, split_method.
3. No float money math — only integer minor units.
4. Use CSS variables only — no Tailwind, no hardcoded hex colors inline.
5. Loading state: spinning border animation with var(--color-accent) border-top.
6. Error banners: var(--color-danger-bg) background, var(--color-danger) text, 1px solid border.
7. Modals: position fixed; inset 0; background rgba(0,0,0,0.5); centered card max-width 480px.
8. Page header pattern:
   <div className="page-header">
     <div><h1 className="page-title">Title</h1><p style={{color:"var(--color-text-secondary)"}}>Subtitle</p></div>
     <button className="btn btn-primary">+ Action</button>
   </div>

---

## 8. Running the Project

```powershell
# MongoDB
& "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --dbpath b:\suraty\server\data --port 27017

# FastAPI backend (port 8000)
cd b:\suraty\server
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# Next.js frontend (port 3000)
cd b:\suraty\apps\web
npm run dev
```

Open http://localhost:3000
FastAPI interactive docs: http://localhost:8000/docs

---

## 9. Gotchas

- passlib is broken on Python 3.13. Already fixed in security.py by using "import bcrypt" directly.
- CORS is configured in server/main.py for http://localhost:3000. Update allow_origins if port changes.
- All dashboard pages are "use client" — they hydrate fully on the browser.
- next build passes cleanly (TypeScript verified, 15 static pages generated).
