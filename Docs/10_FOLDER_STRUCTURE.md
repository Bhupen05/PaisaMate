# App Directory & Folder Structure

This document outlines the recommended monorepo directory and folder structure for **Daily Finance With Friends** (Suraty) covering Mobile, Web, Shared Libraries, and Backend API.

---

## Workspace Architecture (Monorepo Overview)

```
b:\suraty\
├── Docs\                    # Project specifications & guidelines
├── apps\                    # Application frontends
│   ├── mobile\              # Mobile Application (React Native / Expo)
│   └── web\                 # Web Application (Next.js / Vite + React)
├── packages\                # Shared code packages
│   ├── shared\              # Core business logic, monetary calculations, types & schemas
│   └── api-client\          # Shared API client & endpoint SDK
├── server\                  # Backend API Server (Node.js / Express / NestJS)
├── package.json             # Root workspace configuration (npm / pnpm / yarn workspaces)
└── README.md                # Root project README
```

---

## 1. Documentation (`Docs/`)

| Path | Description |
| :--- | :--- |
| `00_PROJECT_OVERVIEW.md` | Product vision, scope, core principles, and design direction. |
| `01_FEATURES.md` | Detailed specifications for personal finance, splitting, recurring, analytics. |
| `02_DATA_MODEL.md` | Entities, schemas, field rules, integer currency conventions. |
| `03_USER_FLOWS.md` | Step-by-step user journeys and financial edge-case flows. |
| `04_UI_SPEC.md` | UI component tree, screen hierarchy, design tokens, accessibility. |
| `05_API_SPEC.md` | REST API routes, request/response models, authorization rules. |
| `06_IMPLEMENTATION_PLAN.md` | Phased development roadmap (Phases 1-10). |
| `07_TESTING_CHECKLIST.md` | Test scenarios for money precision, splits, settlements, recurring tasks. |
| `08_AI_CODING_RULES.md` | Guidelines for AI coding agents and financial data integrity. |
| `09_ROADMAP.md` | Feature roadmap for MVP and post-MVP releases. |
| `10_FOLDER_STRUCTURE.md` | This document detailing project and app directory layout. |

---

## 2. Web Application (`apps/web/`)

Built with React (Next.js App Router or Vite + React).

```
apps/web/
├── public/                  # Static assets (favicons, icons, manifest)
├── src/
│   ├── app/                 # Next.js App Router pages (or routes in Vite)
│   │   ├── (auth)/          # Login, Register, Forgot Password
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/     # Authenticated app shell
│   │   │   ├── dashboard/   # Summary: spending, balances, upcoming recurring
│   │   │   ├── transactions/# Personal transaction list & filtering
│   │   │   ├── friends/     # Friend management & profiles
│   │   │   ├── shared/      # Shared expenses & group balances
│   │   │   ├── recurring/   # Monthly recurring templates
│   │   │   ├── settlements/ # Debt settlements & payment records
│   │   │   ├── analytics/   # Need vs Want vs Dream & category charts
│   │   │   └── settings/    # Profile, preference & currency settings
│   │   ├── layout.tsx       # Root layout & providers
│   │   └── page.tsx         # Landing page / redirect
│   ├── components/          # React UI components
│   │   ├── ui/              # Primitive design system components (Button, Modal, Input, Card)
│   │   ├── forms/           # Transaction, Shared Expense, Friend, and Settlement forms
│   │   ├── charts/          # Category & classification visualization widgets
│   │   ├── finance/         # Amount display, split breakdown, badge widgets
│   │   └── layout/          # Navbar, Sidebar, Header, Mobile Bottom Nav
│   ├── hooks/               # Web-specific React hooks (useMediaQuery, useToast, etc.)
│   ├── services/            # Web API integrations & query hooks
│   ├── store/               # Web client state management (Zustand / Redux / Context)
│   ├── styles/              # Global CSS & Tailwind design tokens
│   └── utils/               # Web-specific formatting and DOM helper functions
├── package.json
└── tsconfig.json
```

---

## 3. Mobile Application (`apps/mobile/`)

Built with React Native & Expo (Expo Router).

```
apps/mobile/
├── assets/                  # App icons, splash screens, fonts, images
├── src/
│   ├── app/                 # Expo Router file-based screens
│   │   ├── (auth)/          # Authentication screens (Login, Signup)
│   │   ├── (tabs)/          # Bottom Navigation Bar tabs
│   │   │   ├── index.tsx    # Dashboard tab
│   │   │   ├── expenses.tsx # Personal transactions tab
│   │   │   ├── add.tsx      # Quick add modal launcher
│   │   │   ├── shared.tsx   # Friends & Shared Expenses tab
│   │   │   └── analytics.tsx# Analytics tab
│   │   ├── expense/         # Expense detail & edit modal screens
│   │   ├── friend/          # Friend detail & settlement screens
│   │   ├── recurring/       # Recurring expense management screen
│   │   ├── _layout.tsx      # Root stack router configuration
│   │   └── +not-found.tsx   # 404 fallback screen
│   ├── components/          # Native components
│   │   ├── ui/              # Native buttons, cards, bottom sheets, inputs
│   │   ├── finance/         # Currency display, split visualizers, Need/Want/Dream tags
│   │   └── forms/           # Expense input forms with numeric keypads
│   ├── hooks/               # Mobile-specific hooks (haptics, keyboard avoidance, biometric auth)
│   ├── services/            # Offline storage, sync engine, API client setup
│   ├── store/               # Mobile state (Zustand, React Query setup)
│   ├── theme/               # Colors, typography, spacing, dark mode tokens
│   └── utils/               # Native helpers (formatting, vibration, notifications)
├── app.json                 # Expo configuration
├── package.json
└── tsconfig.json
```

---

## 4. Shared Packages (`packages/`)

To keep code DRY across Mobile and Web, core domain logic is stored in shared packages.

### `packages/shared/` (Domain Logic & Math)
```
packages/shared/
├── src/
│   ├── types/               # TypeScript interfaces & types (User, Expense, Split, Friend, Settlement)
│   ├── utils/               # Financial calculations
│   │   ├── money.ts         # Integer minor unit conversion (INR 100.50 -> 10050 paise)
│   │   ├── splits.ts        # Split logic: equal, custom amount, percentage
│   │   └── classification.ts# Need / Want / Dream categorizers
│   ├── constants/           # Categories, currencies, default settings
│   └── validation/          # Shared Zod schemas for input validation
├── package.json
└── tsconfig.json
```

### `packages/api-client/` (API SDK)
```
packages/api-client/
├── src/
│   ├── client.ts            # Fetch / Axios wrapper with auth headers & error handling
│   ├── endpoints/           # API methods (auth, expenses, friends, settlements, analytics)
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## 5. Backend Server (`server/`)

Node.js REST API Server.

```
server/
├── src/
│   ├── config/              # Environment variables, database config, secrets
│   ├── controllers/         # HTTP request handlers (Expense, Friend, Settlement, Analytics)
│   ├── middleware/          # Auth JWT middleware, error handling, rate limiting, validation
│   ├── models/              # Database models / ORM entities (User, Expense, Participant, Friend)
│   ├── routes/              # Express / Fastify API route definitions
│   │   ├── auth.routes.ts
│   │   ├── expenses.routes.ts
│   │   ├── friends.routes.ts
│   │   ├── shared.routes.ts
│   │   ├── settlements.routes.ts
│   │   └── analytics.routes.ts
│   ├── services/            # Core business logic & database query operations
│   │   ├── expense.service.ts
│   │   ├── split.service.ts
│   │   ├── settlement.service.ts
│   │   └── recurring.service.ts # Monthly generation CRON job service
│   ├── utils/               # Server-specific utilities (logger, hash, date utils)
│   └── app.ts               # Express app bootstrap
├── tests/                   # Integration and unit tests for API endpoints
├── package.json
└── tsconfig.json
```

---

## Core Rules for Directory Operations

1. **Shared Math**: Never duplicate financial split or monetary minor unit conversion logic between `apps/web` and `apps/mobile`. Put it in `packages/shared`.
2. **Integer Currency**: Stored and transferred values use minor currency units (e.g. Paise for INR, Cents for USD).
3. **Feature Parity**: Navigation structure and capabilities in `apps/mobile` and `apps/web` match the requirements in `00_PROJECT_OVERVIEW.md` and `04_UI_SPEC.md`.
