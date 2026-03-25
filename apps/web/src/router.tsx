import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { BoardPage } from "./routes/board-page";
import { BoardsPage } from "./routes/boards-page";
import { AppShell } from "./ui/app-shell";

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const boardsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: BoardsPage,
});

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/boards/$boardId",
  component: BoardPage,
});

const routeTree = rootRoute.addChildren([boardsRoute, boardRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

