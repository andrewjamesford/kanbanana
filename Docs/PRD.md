# Kanbanana PRD

## Document Status

- Status: Draft v0.1
- Last Updated: 2026-03-25
- Purpose: Shared planning document for a simple Kanban application MVP

## Collaboration Notes

- Use this document to confirm scope before scaffolding the codebase.
- When decisions are made, update the relevant section instead of leaving conflicting notes behind.
- Keep MVP decisions strict; move nice-to-have ideas into post-MVP sections or follow-up docs.

## 1. Product Overview

Kanbanana is a simple Kanban-style task management application. Users can create boards, define columns, add task cards, and move work through a visual workflow. The system will use a React frontend and an Express API backed by MongoDB.

This PRD is intentionally scoped to an MVP that is fast to build, easy to run locally with Docker Compose, and cleanly structured for future growth.

## 2. Goals

- Build a minimal but production-shaped Kanban app with clear separation between frontend, API, and database layers.
- Use a modern TypeScript stack end-to-end.
- Support local development and simple deployment through Docker and Docker Compose.
- Keep the initial feature set small enough to implement quickly while leaving room for iteration.

## 3. Non-Goals

- Real-time multi-user collaboration in the first version
- Complex permissions or enterprise access control
- Notifications, comments, file attachments, or activity feeds
- Offline-first behavior
- Advanced reporting or analytics

## 4. Target Users

- Individual users managing personal tasks
- Small teams validating a lightweight Kanban workflow
- Developers using the project as a reference full-stack TypeScript app

## 5. MVP Scope

### In Scope

- View a list of boards
- Create, rename, and delete boards
- View a single board with ordered columns
- Create, rename, reorder, and delete columns
- Create, edit, move, and delete cards
- Drag-and-drop for column reordering and card movement
- Optional board descriptions from day one
- Seed data for local development
- Persist board, column, and card data in MongoDB
- Fetch and mutate data through an Express REST API
- Use TanStack Router for frontend routing
- Use TanStack Query for server state management and caching
- Run frontend, API, and MongoDB with Docker Compose

### Out of Scope for MVP

- Authentication and user accounts
- Board sharing
- Search and filtering
- Labels, due dates, or checklists
- Advanced drag-and-drop polish beyond a solid, reliable implementation

## 6. User Stories

- As a user, I can create a board so I can organize a project.
- As a user, I can add columns such as `Todo`, `Doing`, and `Done`.
- As a user, I can create cards inside a column.
- As a user, I can edit a card title and description.
- As a user, I can move cards between columns as work progresses.
- As a user, I can reorder columns and cards to reflect priority.
- As a user, I can delete boards, columns, and cards I no longer need.

## 7. Functional Requirements

### Frontend

- The frontend will be built with Vite, React, and TypeScript.
- Routing will use TanStack Router.
- Data fetching and mutations will use TanStack Query.
- The component system will use `shadcn/ui` as the base UI layer.
- Styling will use Tailwind CSS to support `shadcn/ui` and fast UI iteration.
- The UI must provide:
  - A board list page
  - A board detail page
  - Forms or dialogs for creating and editing entities
  - Drag-and-drop interactions for columns and cards
  - Loading, empty, and error states

### API

- The API will be built with Express and TypeScript.
- Data access will use Mongoose.
- The API must expose endpoints for:
  - Boards CRUD
  - Columns CRUD and ordering
  - Cards CRUD and ordering/movement
- The API should return predictable JSON responses and meaningful error messages.

### Database

- MongoDB will persist application data.
- Mongoose schemas will model boards, columns, and cards.
- Data relationships must support board-level loading without excessive query complexity.

## 8. Proposed Data Model

This model favors clarity over premature optimization.

### Board

- `_id`
- `name`
- `description` (optional)
- `columnOrder`: array of column ids
- `deletedAt` (optional, for soft deletes)
- `createdAt`
- `updatedAt`

### Column

- `_id`
- `boardId`
- `name`
- `cardOrder`: array of card ids
- `deletedAt` (optional, for soft deletes)
- `createdAt`
- `updatedAt`

### Card

- `_id`
- `boardId`
- `columnId`
- `title`
- `description` (optional)
- `deletedAt` (optional, for soft deletes)
- `createdAt`
- `updatedAt`

## 9. API Direction

Initial REST endpoints could follow this shape:

### Boards

- `GET /api/boards`
- `POST /api/boards`
- `GET /api/boards/:boardId`
- `PATCH /api/boards/:boardId`
- `DELETE /api/boards/:boardId`

### Columns

- `POST /api/boards/:boardId/columns`
- `PATCH /api/columns/:columnId`
- `DELETE /api/columns/:columnId`
- `POST /api/boards/:boardId/columns/reorder`

### Cards

- `POST /api/columns/:columnId/cards`
- `PATCH /api/cards/:cardId`
- `DELETE /api/cards/:cardId`
- `POST /api/cards/:cardId/move`
- `POST /api/columns/:columnId/cards/reorder`

### Reorder and Move Contracts

To keep drag-and-drop persistence predictable, the API should use explicit reorder and move payloads instead of inferring intent from partial updates.

#### Reorder Columns

- `POST /api/boards/:boardId/columns/reorder`

Request body:

```json
{
  "columnOrder": ["column_1", "column_2", "column_3"]
}
```

Expected behavior:

- Validates that all column ids belong to the specified board
- Replaces the board's `columnOrder` with the provided ordered list
- Returns the updated board ordering metadata

#### Reorder Cards Within a Column

- `POST /api/columns/:columnId/cards/reorder`

Request body:

```json
{
  "cardOrder": ["card_1", "card_2", "card_3"]
}
```

Expected behavior:

- Validates that all card ids belong to the specified column
- Replaces the column's `cardOrder` with the provided ordered list
- Returns the updated column ordering metadata

#### Move Card Across Columns

- `POST /api/cards/:cardId/move`

Request body:

```json
{
  "sourceColumnId": "column_a",
  "destinationColumnId": "column_b",
  "sourceCardOrder": ["card_1", "card_3"],
  "destinationCardOrder": ["card_4", "card_2", "card_5"]
}
```

Expected behavior:

- Validates the card currently belongs to `sourceColumnId`
- Updates the card's `columnId` to `destinationColumnId`
- Updates `cardOrder` for both source and destination columns in a single logical operation
- Returns the updated card plus ordering metadata for both affected columns

#### Recommended Response Shape

For reorder and move endpoints, prefer returning the minimum data needed for TanStack Query cache updates:

```json
{
  "success": true,
  "data": {
    "boardId": "board_1",
    "updatedColumns": [
      {
        "_id": "column_a",
        "cardOrder": ["card_1", "card_3"]
      },
      {
        "_id": "column_b",
        "cardOrder": ["card_4", "card_2", "card_5"]
      }
    ]
  }
}
```

This keeps optimistic UI updates straightforward while still allowing the client to invalidate or merge server state cleanly.

## 10. Frontend Routes

Initial route structure:

- `/`
- `/boards`
- `/boards/:boardId`

Likely behavior:

- `/` redirects to `/boards`
- `/boards` shows available boards and create-board action
- `/boards/:boardId` shows the Kanban board view

Board detail data-loading direction:

- Initial board load should use one hydrated endpoint response containing:
  - board metadata
  - ordered columns
  - lightweight card data for board rendering
- Use separate endpoints for:
  - card detail
  - future comments/activity
  - mutations
  - pagination strategies for very large boards

## 11. UX Principles

- Keep the interface simple and low-friction.
- Optimize for quick task entry and movement.
- Prefer clear states over dense features.
- Drag-and-drop interactions must remain keyboard-aware and should have a non-drag fallback where practical.
- Use `shadcn/ui` components as the default foundation, customizing only where the Kanban workflow needs more specific interaction patterns.

## 12. Styling and Theming

- Use Tailwind CSS as the primary styling system.
- Use `shadcn/ui` primitives and patterns for common UI elements such as buttons, inputs, dialogs, dropdowns, cards, and forms.
- Use a custom semantic token theme built on CSS variables for both light and dark mode.
- Keep theming simple in the MVP, with consistent spacing, typography, and state styling across both modes.
- Prefer extending existing `shadcn/ui` components over introducing a second component library.

### Theme Tokens

The frontend should use the following CSS variables as the canonical theme values:

```css
:root {
  --radius: 0.5rem;
  --background: oklch(0.996 0.004 104.043);
  --foreground: oklch(0.171 0.027 106.561);
  --muted: oklch(0.957 0.003 104.027);
  --muted-foreground: oklch(0.4 0.011 104.422);
  --popover: oklch(0.996 0.004 104.043);
  --popover-foreground: oklch(0.171 0.027 106.561);
  --card: oklch(0.992 0.008 104.114);
  --card-foreground: oklch(0.152 0.024 106.799);
  --border: oklch(0.948 0.002 104.004);
  --input: oklch(0.948 0.002 104.004);
  --primary: oklch(0.939 0.195 106.161);
  --primary-foreground: oklch(0.41 0.087 106.207);
  --secondary: oklch(0.966 0.092 105.447);
  --secondary-foreground: oklch(0.373 0.024 104.995);
  --accent: oklch(0.849 0.03 104.562);
  --accent-foreground: oklch(0.317 0.028 105.334);
  --destructive: oklch(0.479 0.137 42.88);
  --destructive-foreground: oklch(1 0 180);
  --ring: oklch(0.939 0.195 106.161);
  --chart-1: oklch(0.939 0.195 106.161);
  --chart-2: oklch(0.882 0.014 104.25);
  --chart-3: oklch(0.849 0.03 104.562);
  --chart-4: oklch(0.903 0.012 104.195);
  --chart-5: oklch(0.948 0.198 106.125);
}

.dark {
  --radius: 0.5rem;
  --background: oklch(0.148 0.018 106.345);
  --foreground: oklch(0.989 0.004 104.049);
  --muted: oklch(0.174 0.005 104.424);
  --muted-foreground: oklch(0.798 0.009 104.165);
  --popover: oklch(0.148 0.018 106.345);
  --popover-foreground: oklch(0.989 0.004 104.049);
  --card: oklch(0.165 0.021 106.114);
  --card-foreground: oklch(0.994 0.002 104.01);
  --border: oklch(0.274 0.005 104.295);
  --input: oklch(0.274 0.005 104.295);
  --primary: oklch(0.939 0.195 106.161);
  --primary-foreground: oklch(0.41 0.087 106.207);
  --secondary: oklch(0.211 0.008 104.563);
  --secondary-foreground: oklch(0.774 0.019 104.38);
  --accent: oklch(0.303 0.024 105.215);
  --accent-foreground: oklch(0.84 0.028 104.535);
  --destructive: oklch(0.687 0.18 44.719);
  --destructive-foreground: oklch(0 0 0);
  --ring: oklch(0.939 0.195 106.161);
  --chart-1: oklch(0.939 0.195 106.161);
  --chart-2: oklch(0.211 0.008 104.563);
  --chart-3: oklch(0.303 0.024 105.215);
  --chart-4: oklch(0.246 0.01 104.619);
  --chart-5: oklch(0.948 0.198 106.125);
}
```

### Visual Direction

- The palette should feel warm, calm, and slightly earthy rather than stark grayscale.
- Primary actions should use the yellow-green `primary` token consistently.
- Cards, surfaces, and muted areas should preserve soft contrast so the board remains readable during long sessions.
- Dark mode should preserve the same visual identity rather than switching to a different accent system.

## 13. Technical Architecture

### Frontend

- React + Vite + TypeScript
- TanStack Router
- TanStack Query
- Tailwind CSS
- `shadcn/ui` for the frontend component foundation
- `dnd-kit` for drag-and-drop interactions
- Theme tokens defined through CSS custom properties aligned with `shadcn/ui`
- Minimal custom components for board-specific interactions layered on top of `shadcn/ui`

### Drag-and-Drop Approach

- Use `dnd-kit` as the primary drag-and-drop library for the Kanban board.
- `dnd-kit` is preferred because it integrates well with React, supports sortable interactions, and provides the control needed for nested board interactions such as columns containing cards.
- Accessibility matters for the MVP, and `dnd-kit` provides a stronger base for keyboard-aware drag interactions than many alternatives.
- The first iteration should support:
  - column reordering
  - card reordering within a column
  - card movement across columns
- The first iteration should avoid over-engineering animations or highly customized drag previews until the core interaction and persistence model are stable.

### Backend

- Express + TypeScript
- Mongoose for MongoDB access
- Layered structure:
  - routes
  - controllers
  - services
  - models
- Prefer `lean()` on read-heavy Mongoose queries where document methods are not needed

### Infrastructure

- Dockerfiles for frontend and API
- `docker-compose.yml` to run:
  - frontend
  - api
  - mongodb

## 14. Developer Experience Requirements

- One command should start the full stack locally with Docker Compose.
- Local development should support hot reload for frontend and API where practical.
- Environment variables should be documented clearly.
- The repository should be organized so frontend and backend remain decoupled.
- The local environment should support loading seed data for fast manual testing.

## 15. Suggested Repository Shape

```text
/
  Docs/
    PRD.md
  apps/
    web/
    api/
  packages/
    shared/
  docker-compose.yml
```

Use a monorepo structure from the start, with `apps/web` and `apps/api` as the primary application directories. `packages/shared` can be introduced immediately or added later once shared types and utilities become necessary.

## 16. Success Criteria for MVP

- A user can create a board and persist it in MongoDB.
- A user can create columns and cards from the UI.
- A user can move cards between columns and see persisted changes after reload.
- A user can optionally add a board description.
- The application stack starts with Docker Compose and works on a fresh machine with documented setup steps.
- The local environment can be populated with seed data for development.
- The codebase remains readable and easy to extend.

## 17. Milestones

### Milestone 1: Project Foundation

- Initialize frontend and API projects in TypeScript
- Add Docker and Docker Compose
- Connect Express API to MongoDB
- Establish routing and app shell

### Milestone 2: Board Management

- Implement board CRUD
- Build board list page
- Add board detail route

### Milestone 3: Columns and Cards

- Implement column CRUD and ordering
- Implement card CRUD and movement
- Implement drag-and-drop for column and card reordering
- Render board workflow UI

### Milestone 4: Polish and Documentation

- Improve loading and error states
- Add validation and basic API error handling
- Document local development and architecture

## 18. Risks and Tradeoffs

- Drag-and-drop adds state and interaction complexity, so ordering logic between frontend and API needs to be kept explicit and testable.
- Nested drag-and-drop for columns containing cards requires careful handling of collision detection and reorder updates.
- Separate collections for boards, columns, and cards improve flexibility but require careful ordering logic.
- Skipping authentication accelerates MVP delivery but limits realistic multi-user scenarios.
- Dockerized local development is convenient, but hot reload configuration can take extra setup effort.

## 19. Open Questions

- Should authentication remain explicitly out of scope for the MVP?
- Should soft-deleted records be restorable in MVP, or only hidden from normal reads?

## 20. Decisions Log

- Confirmed: use a monorepo structure under `apps/web` and `apps/api`
- Confirmed: drag-and-drop is included in MVP
- Recommended: use `dnd-kit` for drag-and-drop implementation
- Confirmed: board descriptions are optional and included from day one
- Confirmed: deletes are soft deletes
- Confirmed: initial board load should use one hydrated endpoint for board, columns, and lightweight cards
- Confirmed: use `lean()` on read-heavy Mongoose queries where appropriate
- Confirmed: include seed data for local development
- Pending: confirm whether authentication remains explicitly out of scope

## 21. Recommended Next Steps

1. Confirm whether authentication is intentionally deferred.
2. Decide whether soft-deleted records need restore support in MVP.
3. Turn this PRD into an implementation plan.
4. Scaffold the monorepo.
