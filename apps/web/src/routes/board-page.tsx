import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ChevronLeft,
  LayoutDashboard,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  BoardDetail,
  CardSummary,
  ColumnSummary,
} from "@kanbanana/shared";
import { boardCollisions, boardKeyboardCoordinates } from "../lib/board-dnd";
import { api, boardQuery, errorMessage } from "../lib/api";
import { applyPlacement, placeCard, type CardPlacement } from "../lib/ordering";
import { Button } from "../components/ui/button";
import { CardEditor } from "../components/card-editor";
import { KanbanColumn } from "../components/kanban-column";
import { DeleteDialog, EntityDialog } from "../components/entity-dialog";
import { ErrorState, LoadingState } from "../components/query-state";

type Editor =
  | { kind: "board" }
  | { kind: "column"; column?: ColumnSummary }
  | { kind: "card"; columnId: string; card?: CardSummary };
type Deleting = { kind: "board" | "column" | "card"; id: string; name: string };
type OrderChange =
  | { kind: "columns"; ids: string[] }
  | { kind: "card"; placement: CardPlacement };

export function BoardPage() {
  const { boardId } = useParams({ from: "/boards/$boardId" });
  // Reset dialog and drag state when navigating directly between boards.
  return <BoardWorkspace key={boardId} boardId={boardId} />;
}

function BoardWorkspace({ boardId }: { boardId: string }) {
  const query = useQuery(boardQuery(boardId));
  const client = useQueryClient();
  const navigate = useNavigate();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [active, setActive] = useState<{ id: string; kind: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates,
    }),
  );
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["board", boardId] }),
      client.invalidateQueries({ queryKey: ["boards"] }),
    ]);
  const order = useMutation({
    mutationFn: async (change: OrderChange) => {
      if (change.kind === "columns")
        return api(`/boards/${boardId}/columns/reorder`, "POST", {
          columnOrder: change.ids,
        });
      const { cardId, ...placement } = change.placement;
      if (placement.sourceColumnId === placement.destinationColumnId)
        return api(
          `/columns/${placement.sourceColumnId}/cards/reorder`,
          "POST",
          { cardOrder: placement.destinationCardOrder },
        );
      return api(`/cards/${cardId}/move`, "POST", placement);
    },
    onMutate: async (change) => {
      setError("");
      await client.cancelQueries({ queryKey: ["board", boardId] });
      const previous = client.getQueryData<BoardDetail>(["board", boardId]);
      if (previous)
        client.setQueryData(
          ["board", boardId],
          change.kind === "card"
            ? applyPlacement(previous, change.placement)
            : {
                ...previous,
                board: { ...previous.board, columnOrder: change.ids },
                columns: change.ids.map((id) =>
                  previous.columns.find((column) => column._id === id)!,
                ),
              },
        );
      return { previous };
    },
    onError: (failure, _change, context) => {
      if (context?.previous)
        client.setQueryData(["board", boardId], context.previous);
      setError(errorMessage(failure));
    },
    onSettled: async () => {
      await refresh();
      locked.current = false;
    },
  });
  const busy = order.isPending || saving;
  function reorder(change: OrderChange) {
    if (locked.current || saving) return;
    locked.current = true;
    order.mutate(change);
  }
  async function mutate(path: string, method: string, body?: unknown) {
    if (locked.current)
      throw new Error("Please wait for the current change to finish.");
    locked.current = true;
    setSaving(true);
    try {
      await api(path, method, body);
      await refresh();
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  function onDragEnd({ active: dragged, over }: DragEndEvent) {
    setActive(null);
    const data = query.data;
    if (!data || !over || dragged.id === over.id || busy) return;
    if (dragged.data.current?.kind === "column") {
      const ids = data.board.columnOrder;
      const source = ids.indexOf(String(dragged.id));
      const target = ids.indexOf(String(over.id));
      if (source >= 0 && target >= 0)
        reorder({ kind: "columns", ids: arrayMove(ids, source, target) });
    } else {
      const destinationId = over.data.current?.columnId as string | undefined;
      const destination = data.columns.find(
        (column) => column._id === destinationId,
      );
      if (!destination) return;
      const overIndex = destination.cardOrder.indexOf(String(over.id));
      const index = overIndex < 0 ? destination.cardOrder.length : overIndex;
      reorder({
        kind: "card",
        placement: placeCard(data, String(dragged.id), destination._id, index),
      });
    }
  }
  if (query.isPending)
    return (
      <main className="p-8">
        <LoadingState />
      </main>
    );
  if (query.isError)
    return (
      <main className="p-8">
        <Button asChild variant="ghost">
          <Link to="/boards">
            <ChevronLeft />
            All boards
          </Link>
        </Button>
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      </main>
    );
  const detail = query.data;
  const { board, columns, cards } = detail;
  const draggedCard = cards.find((card) => card._id === active?.id);
  const draggedColumn = columns.find((column) => column._id === active?.id);
  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3">
        <Link to="/boards">
          <ChevronLeft />
          All boards
        </Link>
      </Button>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 space-y-2">
          <div className="flex items-start gap-3">
            <span className="mt-1 rounded-lg bg-secondary p-2 text-secondary-foreground">
              <LayoutDashboard className="size-5" />
            </span>
            <h1 className="max-w-3xl break-words text-3xl font-semibold tracking-tight">
              {board.name}
            </h1>
          </div>
          {board.description && (
            <p className="max-w-2xl whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
              {board.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {columns.length} columns <span aria-hidden="true">·</span>{" "}
            {cards.length} {cards.length === 1 ? "card" : "cards"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit board"
            disabled={busy}
            onClick={() => setEditor({ kind: "board" })}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete board"
            disabled={busy}
            onClick={() =>
              setDeleting({ kind: "board", id: boardId, name: board.name })
            }
          >
            <Trash2 />
          </Button>
          <Button disabled={busy} onClick={() => setEditor({ kind: "column" })}>
            <Plus />
            Add column
          </Button>
        </div>
      </header>
      <div className="mb-4 flex min-h-5 items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>Drag the handles to reorder. Open a card to edit or move it.</p>
        <span role="status" aria-live="polite">
          {busy ? "Saving..." : "All changes saved"}
        </span>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between gap-4 rounded-md border border-destructive p-3 text-sm text-destructive"
        >
          <p>{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            Dismiss
          </Button>
        </div>
      )}
      {columns.length === 0 ? (
        <section className="grid min-h-80 content-center justify-items-center gap-4 rounded-xl border border-dashed border-border bg-muted p-8 text-center">
          <LayoutDashboard className="size-9 text-muted-foreground" />
          <h2 className="text-xl font-medium">Make room for your workflow</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Start with a column like Todo, Doing, or Done. You can always
            rearrange things later.
          </p>
          <Button onClick={() => setEditor({ kind: "column" })}>
            <Plus />
            Add your first column
          </Button>
        </section>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={boardCollisions}
          onDragStart={({ active: dragged }: DragStartEvent) =>
            setActive({
              id: String(dragged.id),
              kind: dragged.data.current?.kind,
            })
          }
          onDragEnd={onDragEnd}
          onDragCancel={() => setActive(null)}
        >
          <div
            className="board-scroll flex items-start gap-5 overflow-x-auto pb-8"
            aria-label="Board columns"
          >
            <SortableContext
              items={board.columnOrder}
              strategy={horizontalListSortingStrategy}
            >
              {columns.map((column, index) => (
                <KanbanColumn
                  key={column._id}
                  column={column}
                  cards={column.cardOrder
                    .map((id) => cards.find((card) => card._id === id))
                    .filter((card): card is CardSummary => Boolean(card))}
                  index={index}
                  total={columns.length}
                  disabled={busy}
                  edit={() => setEditor({ kind: "column", column })}
                  addCard={() =>
                    setEditor({ kind: "card", columnId: column._id })
                  }
                  editCard={(card) =>
                    setEditor({ kind: "card", columnId: column._id, card })
                  }
                  moveColumn={(offset) =>
                    reorder({
                      kind: "columns",
                      ids: arrayMove(board.columnOrder, index, index + offset),
                    })
                  }
                />
              ))}
            </SortableContext>
            <Button
              variant="ghost"
              className="h-14 w-56 shrink-0 justify-start border border-dashed border-border"
              disabled={busy}
              onClick={() => setEditor({ kind: "column" })}
            >
              <Plus />
              Add another column
            </Button>
          </div>
          <DragOverlay>
            {active?.kind === "card" && draggedCard ? (
              <div className="w-72 rotate-2 rounded-lg border border-primary bg-card p-4 text-sm font-medium shadow-xl">
                {draggedCard.title}
              </div>
            ) : draggedColumn ? (
              <div className="w-80 rounded-xl border border-primary bg-muted p-5 font-medium shadow-xl">
                {draggedColumn.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
      {editor?.kind === "board" && (
        <EntityDialog
          title="Edit board"
          description="Keep your board name and description up to date."
          name={board.name}
          text={board.description}
          onClose={() => setEditor(null)}
          onSave={(name, description) =>
            mutate(`/boards/${boardId}`, "PATCH", { name, description })
          }
        />
      )}
      {editor?.kind === "column" && (
        <EntityDialog
          title={editor.column ? "Edit column" : "Add a column"}
          description="Give this step in your workflow a name."
          name={editor.column?.name}
          submitLabel={editor.column ? "Save changes" : "Add column"}
          onClose={() => setEditor(null)}
          onSave={(name) =>
            mutate(
              editor.column
                ? `/columns/${editor.column._id}`
                : `/boards/${boardId}/columns`,
              editor.column ? "PATCH" : "POST",
              { name },
            )
          }
          onDelete={
            editor.column
              ? () => {
                  setDeleting({
                    kind: "column",
                    id: editor.column!._id,
                    name: editor.column!.name,
                  });
                  setEditor(null);
                }
              : undefined
          }
        />
      )}
      {editor?.kind === "card" && (
        <CardEditor
          key={editor.card?._id ?? editor.columnId}
          detail={detail}
          card={editor.card}
          columnId={editor.columnId}
          close={() => setEditor(null)}
          remove={
            editor.card
              ? () => {
                  setDeleting({
                    kind: "card",
                    id: editor.card!._id,
                    name: editor.card!.title,
                  });
                  setEditor(null);
                }
              : undefined
          }
          save={async (name, description, destinationId, index) => {
            if (locked.current)
              throw new Error("Please wait for the current change to finish.");
            locked.current = true;
            setSaving(true);
            try {
              if (editor.card) {
                await api(`/cards/${editor.card._id}`, "PATCH", {
                  title: name,
                  description,
                });
                const placement = placeCard(
                  detail,
                  editor.card._id,
                  destinationId,
                  index,
                );
                const current = detail.columns.find(
                  (column) => column._id === editor.card!.columnId,
                )!;
                if (destinationId !== current._id)
                  await api(`/cards/${editor.card._id}/move`, "POST", {
                    sourceColumnId: placement.sourceColumnId,
                    destinationColumnId: destinationId,
                    sourceCardOrder: placement.sourceCardOrder,
                    destinationCardOrder: placement.destinationCardOrder,
                  });
                else if (
                  JSON.stringify(current.cardOrder) !==
                  JSON.stringify(placement.destinationCardOrder)
                )
                  await api(`/columns/${destinationId}/cards/reorder`, "POST", {
                    cardOrder: placement.destinationCardOrder,
                  });
              } else {
                await api(`/columns/${destinationId}/cards`, "POST", {
                  title: name,
                  description,
                });
              }
            } finally {
              await refresh();
              locked.current = false;
              setSaving(false);
            }
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          name={`"${deleting.name}"`}
          detail={
            deleting.kind === "board"
              ? "This will remove the board and all its columns and cards. There is no undo in this version."
              : deleting.kind === "column"
                ? "This will also remove every card in this column. There is no undo in this version."
                : "This card will be removed from the board. There is no undo in this version."
          }
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await mutate(
              `/${deleting.kind === "board" ? "boards" : deleting.kind === "column" ? "columns" : "cards"}/${deleting.id}`,
              "DELETE",
            );
            if (deleting.kind === "board") {
              client.removeQueries({ queryKey: ["board", boardId] });
              await navigate({ to: "/boards" });
            }
          }}
        />
      )}
    </main>
  );
}
