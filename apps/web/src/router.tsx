import {
  Outlet,
  redirect,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { lazy, Suspense } from "react";
import { LoadingState } from "./components/query-state";
const BoardPage = lazy(() =>
  import("./routes/board-page").then((module) => ({
    default: module.BoardPage,
  })),
);
import { BoardsPage } from "./routes/boards-page";
import { AppShell } from "./ui/app-shell";

const rootRoute = createRootRoute({
  notFoundComponent: () => (
    <main className="p-10 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <a className="mt-4 inline-block underline" href="/boards">
        Back to boards
      </a>
    </main>
  ),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const boardsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/boards",
  component: BoardsPage,
});

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/boards/$boardId",
  component: () => (
    <Suspense fallback={<LoadingState />}>
      <BoardPage />
    </Suspense>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/boards" });
  },
});
const routeTree = rootRoute.addChildren([indexRoute, boardsRoute, boardRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
