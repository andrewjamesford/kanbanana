import { Link } from "@tanstack/react-router";

export function BoardsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="grid gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <span className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
          Kanbanana
        </span>
        <div className="grid gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-card-foreground">
            Calm task flow for boards, columns, and cards.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            The first scaffold wires the React shell, routing, theming, and API
            boundaries for the Kanban MVP.
          </p>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-foreground">Boards</h2>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            New board
          </button>
        </div>

        <Link
          to="/boards/$boardId"
          params={{ boardId: "demo-board" }}
          className="block rounded-lg border border-border bg-background p-5 transition hover:border-primary"
        >
          <div className="flex items-center justify-between">
            <div className="grid gap-1">
              <h3 className="text-lg font-medium text-foreground">Demo Board</h3>
              <p className="text-sm text-muted-foreground">
                Seed-friendly placeholder board for initial scaffolding.
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              3 columns
            </span>
          </div>
        </Link>
      </section>
    </main>
  );
}

