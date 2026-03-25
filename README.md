# Kanbanana

Kanbanana is a TypeScript monorepo for a Kanban application with:

- `apps/web`: Vite + React + TanStack Router + TanStack Query + Tailwind CSS + `shadcn/ui`
- `apps/api`: Express + Mongoose
- `packages/shared`: shared types and utilities

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

Or use Docker Compose:

```bash
docker compose up --build
```

