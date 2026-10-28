import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BoardSummary } from "@kanbanana/shared";
import {
  ArrowRight,
  LayoutDashboard,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { api, boardsQuery } from "../lib/api";
import { Button } from "../components/ui/button";
import { EntityDialog, DeleteDialog } from "../components/entity-dialog";
import { ErrorState, LoadingState } from "../components/query-state";

export function BoardsPage() {
  const query = useQuery(boardsQuery);
  const client = useQueryClient();
  const navigate = useNavigate();
  const [editor, setEditor] = useState<BoardSummary | "new" | null>(null);
  const [deleting, setDeleting] = useState<BoardSummary | null>(null);
  const refresh = () => client.invalidateQueries({ queryKey: ["boards"] });
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <section className="relative mb-12 flex items-center justify-between gap-5 overflow-hidden rounded-2xl border border-border bg-secondary p-7 sm:p-10">
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="text-xs font-medium uppercase tracking-[.2em] text-muted-foreground">
            Your space to make progress
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Good things start
            <br />
            with a little order.
          </h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Big plans, small tasks, and everything in between. Give your ideas a
            board and take it one card at a time.
          </p>
          <Button onClick={() => setEditor("new")}>
            <Plus />
            Create board
          </Button>
        </div>
        <img
          src="/kanbanana-ken.png"
          alt="Kanbanana Ken holding a task board"
          className="hidden w-60 shrink-0 object-contain md:block"
        />
      </section>
      <section aria-labelledby="boards-heading">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2
              id="boards-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Your boards
            </h2>
            {query.data && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {query.data.length}
              </span>
            )}
          </div>
          <Button variant="secondary" onClick={() => setEditor("new")}>
            <Plus />
            New board
          </Button>
        </div>
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <div className="grid justify-items-center gap-4 rounded-xl border border-dashed border-border p-12 text-center">
            <LayoutDashboard className="size-9 text-muted-foreground" />
            <h3 className="text-lg font-medium">A fresh start</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create your first board, add a few columns, and make room for what
              matters.
            </p>
            <Button onClick={() => setEditor("new")}>
              <Plus />
              Create your first board
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.map((board) => (
              <article
                key={board._id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
              >
                <Link
                  to="/boards/$boardId"
                  params={{ boardId: board._id }}
                  className="flex flex-1 flex-col gap-4 p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-secondary p-2.5 text-secondary-foreground">
                      <LayoutDashboard className="size-5" />
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <div>
                    <h3 className="break-words text-lg font-semibold">
                      {board.name}
                    </h3>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                      {board.description ||
                        "A little space for your next big thing."}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center justify-between border-t border-border px-6 py-3">
                  <span className="text-xs text-muted-foreground">
                    {board.columnOrder.length}{" "}
                    {board.columnOrder.length === 1 ? "column" : "columns"}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${board.name}`}
                      onClick={() => setEditor(board)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${board.name}`}
                      onClick={() => setDeleting(board)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {editor && (
        <EntityDialog
          key={typeof editor === "string" ? editor : editor._id}
          title={editor === "new" ? "Create a board" : "Edit board"}
          description="A home for your tasks, ideas, and next steps."
          name={editor === "new" ? "" : editor.name}
          text={editor === "new" ? "" : editor.description}
          submitLabel={editor === "new" ? "Create board" : "Save changes"}
          onClose={() => setEditor(null)}
          onSave={async (name, description) => {
            const board = await api<BoardSummary>(
              editor === "new" ? "/boards" : `/boards/${editor._id}`,
              editor === "new" ? "POST" : "PATCH",
              { name, description },
            );
            await refresh();
            if (editor === "new")
              await navigate({
                to: "/boards/$boardId",
                params: { boardId: board._id },
              });
            else
              await client.invalidateQueries({
                queryKey: ["board", board._id],
              });
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          name={`"${deleting.name}"`}
          detail="This board and all its columns and cards will be removed from your workspace. There is no undo in this version."
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`/boards/${deleting._id}`, "DELETE");
            client.removeQueries({ queryKey: ["board", deleting._id] });
            await refresh();
          }}
        />
      )}
    </main>
  );
}
