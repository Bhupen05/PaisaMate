# Daily Finance With Friends

A structured specification for a personal daily-finance and friend expense-sharing application.

## Documentation

- `00_PROJECT_OVERVIEW.md` — product vision, scope, dashboard, design principles.
- `01_FEATURES.md` — detailed feature specifications.
- `02_DATA_MODEL.md` — entities, fields, relationships, monetary representation.
- `03_USER_FLOWS.md` — complete user flows and calculation examples.
- `04_UI_SPEC.md` — screens, components, responsive behavior, accessibility.
- `05_API_SPEC.md` — backend endpoint contract and payload examples.
- `06_IMPLEMENTATION_PLAN.md` — phased implementation order.
- `07_TESTING_CHECKLIST.md` — correctness and security test checklist.
- `08_AI_CODING_RULES.md` — rules for Claude Code / coding agents.
- `09_ROADMAP.md` — MVP and future roadmap.
- `10_FOLDER_STRUCTURE.md` — directory layout for Mobile, Web, Shared packages, Server, and Docs.

## Recommended Build Order

1. Foundation
2. Personal expenses
3. Friends
4. Shared expenses
5. Settlements
6. Recurring monthly expenses
7. Analytics
8. Reliability/testing
9. UX polish
10. Release

## Core Financial Model

Personal purchase:

`title + amount + classification`

Shared purchase:

`expense + payer + participants + split`

Recurring:

`template -> monthly expense instance`

Settlement:

`money transfer record separate from original expense`
