import { Link } from "@tanstack/react-router";

export function BoardsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-8 shadow-sm sm:px-8 lg:px-10">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-primary/35 via-secondary/30 to-transparent blur-3xl" />

        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,420px)]">
          <div className="grid gap-5">
            <span className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Kanbanana
            </span>

            <div className="grid gap-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
                Calm task flow with a little more personality.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Kanbanana gives boards, columns, and cards a warmer starting
                point, with a clean React shell ready for API data, drag and
                drop, and the mascot front and center.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm">
                Create board
              </button>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                MVP scaffold
              </span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <div className="relative rounded-[1.75rem] border border-border/80 bg-background/80 p-4 shadow-[0_24px_60px_-28px_rgba(78,64,11,0.45)] backdrop-blur">
              <div className="absolute inset-x-8 bottom-3 h-10 rounded-full bg-primary/20 blur-2xl" />
              <img
                src="/kanbanana-ken.png"
                alt="Kanbanana mascot holding a kanban board"
                className="relative mx-auto h-auto w-full max-w-[320px] object-contain"
              />
            </div>
          </div>
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
