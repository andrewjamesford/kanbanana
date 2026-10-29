# MVP verification

Verified locally on 2026-10-29 against the scope in [PRD.md](PRD.md).

## Implemented scope

| PRD requirement | Implementation |
| --- | --- |
| Board list, creation, rename, optional descriptions, deletion | Live `/boards` page and board dialogs on both list and detail pages |
| Ordered columns and column CRUD | Hydrated board view, column dialogs, drag handles, and left/right buttons |
| Card creation, edit, delete, reorder, and movement | Card dialogs, pointer and keyboard drag controls, column and position fields |
| Persistent data | Mongoose collections, explicit order arrays, soft deletes, and transactional cross-column moves |
| Frontend stack | Vite, React, TypeScript, TanStack Router and Query, Tailwind, shadcn-style Radix components, dnd-kit |
| Routes | `/` redirects to `/boards`; `/boards/:boardId` loads a board; unknown routes show a fallback |
| Loading, empty, error, and pending states | Route states, form errors, disabled pending controls, save status, optimistic rollback |
| Light and dark theme | PRD CSS tokens, theme button, persisted browser preference |
| Seed data | Repeatable sample board command, preserving edits on subsequent runs |
| Docker and hot reload | API and Vite images, bind mounts, MongoDB replica set, startup health dependencies |
| Local setup and environment documentation | Root README and `.env.example` |

## Checks and results

- `npm run lint`: passed all three workspace TypeScript checks.
- `npm run build`: passed API/shared compilation and the Vite production build.
- `npm test`: passed all 6 shared Zod schema tests and all 13 model/API tests, with API tests using an isolated temporary MongoDB replica set.
- `npm run test:e2e`: passed all six Playwright browser scenarios against the Docker stack.
- `docker compose up -d --build --wait`: both images built and all three services started. MongoDB and API health checks passed.
- `docker compose exec api npm run seed`: sample data created initially; a second invocation reported that no data changed.
- Dependency audit during the final clean Docker installation: zero vulnerabilities.
- `git diff --check`: passed.
- Visual review: board list, dark board view, and mobile card dialog inspected. The mobile page had no horizontal document overflow.

The browser suite verified board, column, and card CRUD, reload persistence, keyboard column and card reordering, pointer column and card reordering, dragging into an empty column, non-drag movement to a chosen position, board-list editing and deletion, optimistic rollback after a rejected reorder, load-error recovery, missing-board handling, dialog focus and Escape behavior, dark-mode persistence, a 390-pixel mobile viewport, cancellation of card and column drags released outside valid targets, and 200-character unbroken board names at 390- and 320-pixel widths.

Browser checks use local Chromium through Playwright. The tests accept an existing browser executable through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; standard setup uses `npx playwright install chromium`.

## Release 1.1 migration

- Replaced custom body-validation field maps with strict shared Zod schemas and inferred handler input types. The frontend uses the same schemas for entity forms; route IDs also use the shared ID schema.
- Added regression coverage for required create fields, partial and empty updates, invalid types, unknown fields, UTF-16 length limits, nullable descriptions, mixed-case duplicate IDs, normalized values, and client validation without API writes.
- Updated every direct npm dependency to its latest stable release at validation time. `npm outdated --json` returned `{}` and `npm audit --audit-level=low` reported zero vulnerabilities.
- Migrated to TypeScript 7.0.2, Express 5.3.0, Mongoose 9.11.4, Vite 8.3.5, Tailwind CSS 4.3.3, React 19.3.1, and Zod 4.6.7.
- Removed the unsupported TypeScript `baseUrl` option, declared Node test types explicitly, migrated Tailwind's PostCSS integration and renamed utilities, replaced deprecated Mongoose options, and updated Vite configuration paths.
- The full production build and compiled shared/API imports also passed inside Docker on Node 22.23.4 with `NODE_ENV=production`.
- Shared schemas export compiled JavaScript in production and TypeScript in development. The root build compiles shared code before its consumers. The board detail route loads separately to keep the main bundle below the build warning threshold.
- Workspace package versions are `1.1.0`; the release tag is `1.1`.

## Review follow-up

The initial independent subagent review identified two issues: pointer drops outside all targets could still move a card, and long unbroken board names could overflow mobile layouts. Pointer drags now require an actual target, while keyboard drags retain nearest-target detection. The board heading now shrinks and wraps within its available width. Browser regressions cover both fixes.

## Important implementation corrections

- Compose runs MongoDB as a replica set because cross-column moves require transactions.
- Card-move ownership and ordering reads occur inside the transaction. Transaction writes run sequentially, and retry callbacks read current state.
- The frontend TypeScript configuration uses `noEmit` to prevent generated JavaScript from shadowing the source during Vite development.
- The root `.env` is loaded by both the API and Vite. The browser normally uses Vite's same-origin API proxy.
- Docker installs dependencies from the repository lockfile. Existing dependency volumes can be refreshed with the README commands.

## Boundaries

This verifies the PRD's local MVP. Authentication, sharing, real-time collaboration, restore flows, search, labels, due dates, and production hosting are outside that scope. Deployment to a public host was not performed.
