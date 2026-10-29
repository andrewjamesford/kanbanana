# Kanbanana

![Kanbanana mascot](./kanbanana-ken.png)

A small Kanban app for organizing work into boards, columns, and cards. Built with React, TypeScript, Express, and MongoDB, following [the MVP PRD](Docs/PRD.md).

Release `1.2` tidies the API internals (shared serializers and ID helpers) without changing behavior. Release `1.1` introduced shared Zod 4 schemas for API requests and frontend forms. The stack runs TypeScript 7.0.2, React 19.3.1, Express 5.3.0, Mongoose 9.11.4, Vite 8.3.5, and Tailwind CSS 4.3.3. All direct npm dependencies were updated to their latest stable releases for this version; `package-lock.json` records the tested versions.

- Create, rename, describe, and delete boards.
- Create, rename, reorder, and delete columns.
- Create and edit cards with optional descriptions.
- Drag columns and cards to reorder them or move cards between columns.
- Use keyboard drag controls, column arrow buttons, or the card's column and position fields.
- Save changes to MongoDB, with loading, empty, and error states and failed drag rollback.
- Switch between light and dark mode. Your preference is saved in your browser.

## Start with Docker

Install Docker with Compose, then run from the repository root:

```bash
docker compose up --build
```

Open [localhost:3100](http://localhost:3100). The API runs at [localhost:4100](http://localhost:4100/api/health). All published ports bind to localhost.

MongoDB starts as a single-node replica set automatically. The API waits for it to become writable, and the web app waits for the API. Replica-set support is required for atomic card moves.

Load the optional sample board from another terminal:

```bash
docker compose exec api npm run seed
```

The seed command creates one board with three columns and four cards. Repeating it preserves your edits and does not duplicate or restore a deleted sample board.

Source files are bind-mounted for hot reload. After the first build:

```bash
docker compose up
```

After dependencies change, refresh both dependency volumes and rebuild:

```bash
docker compose run --rm --no-deps api npm ci
docker compose run --rm --no-deps web npm ci
docker compose up --build
```

Stop the stack with `docker compose down`. Data stays in `mongodb_data`. The `-v` option deletes volumes, including your database, so leave it out when keeping data.

### Docker network pool error

If Docker reports `all predefined address pools have been fully subnetted`, it cannot allocate another network. Review unused networks with `docker network ls`, then run `docker network prune` to remove networks unused by containers. Retry `docker compose up`. Network pruning does not remove database volumes.

## Develop without containerized Node

Use Node.js 22.12 or newer, npm, and a MongoDB replica set. You can run just the database with Compose:

```bash
npm ci
cp .env.example .env
docker compose up -d --wait mongodb
```

Start each app in a separate terminal:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Optionally run `npm run seed`. Vite proxies `/api` requests to the Express server, so the browser uses the same origin in both local and Docker development.

### Environment variables

The API and Vite read the root `.env`. Compose supplies its own internal service addresses.

| Variable | Default for local development | Purpose |
| --- | --- | --- |
| `PORT` | `4100` | API listening port |
| `MONGODB_URI` | `mongodb://localhost:27017/kanbanana?replicaSet=rs0&directConnection=true` | Replica-set connection. Direct connection lets a host process reach the Docker database. |
| `API_PROXY_TARGET` | `http://localhost:4100` | Vite's API proxy target. Compose uses `http://api:4100`. |
| `VITE_API_URL` | Empty | Optional browser-visible API origin for a separately hosted API. Omit for the normal proxy setup. |

When changing the API port, update `API_PROXY_TARGET` too. Restart the dev servers after editing environment variables.

## Checks

```bash
npm run lint
npm run build
npm test
```

`lint` checks TypeScript in every workspace. `npm test` runs shared Zod schema tests followed by the model and API tests. API tests use an isolated temporary MongoDB replica set and never use your development database. The first run may download a MongoDB binary and needs network access.

With the Docker stack running, run the browser checks:

```bash
npx playwright install chromium
npm run test:e2e
```

The browser suite creates its own temporary board and soft-deletes it afterward. It covers CRUD, persistence after reload, keyboard and pointer dragging, non-drag movement, optimistic rollback, responsive layout, theme persistence, error recovery, and client-side Zod validation. It targets `http://localhost:3100` by default. Set `E2E_BASE_URL` for another local instance, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an existing Chromium executable. Failure traces and screenshots go to `test-results`.

## Architecture

```text
apps/web/          React, TanStack Router and Query, Tailwind, shadcn-style Radix components, dnd-kit
apps/api/          Express routes, transaction service, validation, Mongoose models, seed command
packages/shared/  Response types, shared Zod input schemas, inferred input types, and schema tests
Docs/PRD.md       Product requirements
Docs/VERIFICATION.md  MVP implementation and verification record
```

`npm run build` compiles the shared package first, then the API and frontend. The shared package exports compiled JavaScript for production; development commands use its TypeScript source through the `development` export condition for hot reload. Tailwind 4 loads the existing semantic theme through `@config` and its PostCSS integration.

The board list is at `/boards`; `/` redirects there. A board at `/boards/:boardId` loads board metadata, ordered columns, and cards in one hydrated request. Mutations invalidate the relevant TanStack Query caches. Drag operations update the board cache optimistically and restore it on failure.

Board, column, and card collections store ordering explicitly in `columnOrder` and `cardOrder`. Card moves validate ownership and full order lists within a MongoDB transaction, then save both columns and the card together. Reorder endpoints reject incomplete lists, duplicate IDs, and foreign IDs.

Deletes are soft deletes. Board and column deletion also hide their descendants. There is no restore interface in this MVP. Authentication, sharing, search, labels, due dates, and collaboration are outside the PRD scope. This is a local development stack with no user access control.

### API

Success responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "error": "message" }` with the relevant HTTP status. Names and titles allow up to 200 characters; descriptions allow up to 10,000. Strict shared Zod schemas reject unexpected fields, invalid types, blank required values, malformed IDs, duplicate order IDs, and empty updates. The API passes parsed, typed data to its handlers, and forms use the same entity schemas before submitting. Text is trimmed and IDs are normalized to lowercase. Mongoose still validates database records.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Database connection health |
| GET, POST | `/api/boards` | List or create boards |
| GET, PATCH, DELETE | `/api/boards/:boardId` | Hydrate, edit, or soft-delete a board |
| POST | `/api/boards/:boardId/columns` | Create a column |
| POST | `/api/boards/:boardId/columns/reorder` | Replace complete `columnOrder` |
| PATCH, DELETE | `/api/columns/:columnId` | Rename or soft-delete a column |
| POST | `/api/columns/:columnId/cards` | Create a card |
| POST | `/api/columns/:columnId/cards/reorder` | Replace complete `cardOrder` |
| GET, PATCH, DELETE | `/api/cards/:cardId` | Read, edit, or soft-delete a card |
| POST | `/api/cards/:cardId/move` | Move a card and update both columns atomically |

See the PRD for reorder and move payload examples. The root `qs` override keeps Express's transitive query parser on a patched release.
