# Task Plan

- [completed] Create collaborative planning docs for the Kanban app
- [completed] Draft initial PRD in `Docs/PRD.md`
- [completed] Review draft for clarity, scope, and open questions
- [completed] Incorporate final open-question decisions into the PRD
- [completed] Commit the PRD decision updates
- [completed] Scaffold the monorepo structure for web, api, and shared packages
- [completed] Commit and push the initial implementation scaffold
- [completed] Implement backend data models for boards, columns, and cards with soft-delete support
- [completed] Implement Express API endpoints for board CRUD, hydrated board detail, column CRUD/reorder, and card CRUD/reorder/move
- [completed] Add API validation, error handling, and consistent JSON response shapes
- [completed] Add seed data and a repeatable local seed command
- [completed] Replace static frontend board list and board detail data with TanStack Query-backed API integration
- [completed] Build board, column, and card create/edit/delete flows using `shadcn/ui` components
- [completed] Implement loading, empty, and error states for key frontend routes
- [completed] Add `dnd-kit` drag-and-drop for columns and cards, including persistence through reorder/move endpoints
- [completed] Align routing with the PRD by serving the board list at `/boards` and redirecting `/`
- [completed] Add test coverage for API mutations and reorder/move behavior

- [completed] Add persisted light and dark theme switching with the PRD tokens
- [completed] Configure MongoDB as a replica set and verify the full Docker stack
- [completed] Add browser regression tests for CRUD, drag, non-drag movement, reload persistence, errors, and responsive layout
- [completed] Correct frontend TypeScript emission so generated JavaScript cannot shadow source edits
- [completed] Apply compatible dependency patches and verify the dependency audit
- [completed] Document setup, environment variables, seed behavior, API contracts, and verification

- [completed] Release 1.1: replace custom request validation with shared Zod schemas and typed handlers
- [completed] Release 1.1: validate frontend forms with the shared schemas and add schema/API/browser regressions
- [completed] Release 1.1: migrate to TypeScript 7 and the latest stable direct npm dependencies
- [completed] Release 1.2: route all API responses through serializers and share ID and order-matching helpers
- [completed] Release 1.2: save card edits and moves in one atomic request
- [completed] Release 1.2: run multi-document writes (deletes, creates, reorders) in transactions

# Review

The PRD's MVP is implemented. The frontend uses live API data, shadcn-style Radix components, TanStack Router and Query, and dnd-kit. Ordering persists in MongoDB; card moves run inside a transaction. Repeatable seed data and Docker health checks support local development. See `Docs/VERIFICATION.md` for the checks and results.
