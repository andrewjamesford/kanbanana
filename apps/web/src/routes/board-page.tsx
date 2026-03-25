import { useParams } from "@tanstack/react-router";

const demoColumns = [
  { id: "todo", name: "Todo", cards: ["Define schemas", "Set up seed data"] },
  { id: "doing", name: "Doing", cards: ["Scaffold workspace"] },
  { id: "done", name: "Done", cards: ["Finalize PRD"] },
];

export function BoardPage() {
  const { boardId } = useParams({ from: "/boards/$boardId" });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="grid gap-2">
        <span className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
          Board
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {boardId}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          This board shell will be replaced with hydrated API data and
          `dnd-kit` interactions in the next implementation phase.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        {demoColumns.map((column) => (
          <article
            key={column.id}
            className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-card-foreground">{column.name}</h2>
              <span className="text-sm text-muted-foreground">
                {column.cards.length} cards
              </span>
            </div>

            <div className="grid gap-3">
              {column.cards.map((card) => (
                <div
                  key={card}
                  className="rounded-md border border-border bg-background p-3 text-sm text-foreground"
                >
                  {card}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

