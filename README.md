# Kanbanana

![Kanbanana mascot](./kanbanana-ken.png)

Kanbanana is a TypeScript monorepo for a Kanban application with:

- `apps/web`: Vite + React + TanStack Router + TanStack Query + Tailwind CSS + `shadcn/ui`
- `apps/api`: Express + Mongoose
- `packages/shared`: shared types and utilities

## Current Status

The project currently includes:

- planning documentation in `Docs/PRD.md`
- a monorepo scaffold for the web app, API, and shared package
- backend Mongoose models for boards, columns, and cards with soft-delete fields
- model-level backend tests for schema validation and defaults
- Express API endpoints for board, column, and card CRUD plus reorder and move flows
- integration tests covering hydrated board detail and drag-oriented API contracts

## Workspace Layout

```text
apps/
  api/
  web/
packages/
  shared/
Docs/
tasks/
docker-compose.yml
```

## Getting Started

Install dependencies from the repo root:

```bash
npm install
```

Run the apps locally:

```bash
npm run dev:web
npm run dev:api
```

Run the backend model tests:

```bash
npm run test -w @kanbanana/api
```

The API test suite covers:

- board create, update, list, detail, and soft delete
- column create, delete, and reorder
- card create, update, delete, reorder, and cross-column move
- hydrated board detail responses

Or use Docker Compose:

```bash
docker compose up --build
```

For day-to-day development after the first build, Docker Compose is configured for live reload through bind mounts:

```bash
docker compose up
```

Default local ports:

- Web: `3100`
- API: `4100`
