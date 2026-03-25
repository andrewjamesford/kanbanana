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
- [pending] Add seed data and a repeatable local seed command
- [pending] Replace static frontend board list and board detail data with TanStack Query-backed API integration
- [pending] Build board, column, and card create/edit/delete flows using `shadcn/ui` components
- [pending] Implement loading, empty, and error states for key frontend routes
- [pending] Add `dnd-kit` drag-and-drop for columns and cards, including persistence through reorder/move endpoints
- [pending] Align routing with the PRD by serving the board list at `/boards` and redirecting `/`
- [pending] Add test coverage for API mutations and reorder/move behavior

# Review

- Created `Docs/PRD.md` as the initial product planning document for the Kanban MVP.
- Captured scope, architecture, data model, API direction, milestones, risks, and open questions for collaboration.
- Finalized the remaining product decisions and replaced open questions with resolved requirements.
- Added the initial monorepo scaffold for web, api, shared packages, and Docker-based local development.
- Reviewed the scaffold against the PRD and converted the missing MVP work into an ordered implementation backlog.
- Completed backend model scaffolding for boards, columns, and cards with shared soft-delete fields and schema-level tests.
- Verified the first task with `npm run test -w @kanbanana/api` and `npm run lint -w @kanbanana/api`.
- Implemented the MVP API surface for board, column, and card CRUD plus reorder and move flows.
- Verified the API endpoint task with `npm run test -w @kanbanana/api` and `npm run lint -w @kanbanana/api`.
- Added schema-based API validation, consistent success/error envelopes, invalid-JSON handling, and unknown-route handling.
- Verified the API validation and error-handling task with `npm run test -w @kanbanana/api` and `npm run lint -w @kanbanana/api`.
