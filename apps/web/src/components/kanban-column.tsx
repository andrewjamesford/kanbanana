import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Pencil,
  Plus,
} from "lucide-react";
import type { CardSummary, ColumnSummary } from "@kanbanana/shared";
import { Button } from "./ui/button";

export function KanbanColumn({
  column,
  cards,
  index,
  total,
  disabled,
  edit,
  addCard,
  editCard,
  moveColumn,
}: {
  column: ColumnSummary;
  cards: CardSummary[];
  index: number;
  total: number;
  disabled: boolean;
  edit: () => void;
  addCard: () => void;
  editCard: (card: CardSummary) => void;
  moveColumn: (offset: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column._id, data: { kind: "column" }, disabled });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${column._id}`,
    data: { kind: "drop", columnId: column._id, cardCount: cards.length },
    disabled,
  });
  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      className="w-[310px] shrink-0 rounded-xl border border-border bg-muted p-3 sm:w-[330px]"
      aria-label={`${column.name} column`}
    >
      <div className="mb-3 flex items-center gap-2 px-1 pt-1">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`Drag column ${column.name}`}
          className="drag-handle"
        >
          <GripVertical className="size-4" />
        </button>
        <h2 className="min-w-0 flex-1 break-words text-sm font-semibold">
          {column.name}
        </h2>
        <span className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
          {cards.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={`Edit column ${column.name}`}
          onClick={edit}
        >
          <Pencil />
        </Button>
      </div>
      <div
        ref={setDropRef}
        className={`grid min-h-24 content-start gap-3 rounded-lg pb-3 ${isOver ? "bg-secondary outline outline-2 outline-primary" : ""}`}
      >
        <SortableContext
          items={column.cardOrder}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCard
              key={card._id}
              card={card}
              disabled={disabled}
              edit={() => editCard(card)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <p className="px-3 py-7 text-center text-xs text-muted-foreground">
            Drop a card here or add your first one.
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start"
        disabled={disabled}
        onClick={addCard}
      >
        <Plus />
        Add card
      </Button>
      <div className="mt-2 flex justify-end gap-1 border-t border-border pt-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || index === 0}
          aria-label={`Move ${column.name} left`}
          onClick={() => moveColumn(-1)}
        >
          <ArrowLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || index === total - 1}
          aria-label={`Move ${column.name} right`}
          onClick={() => moveColumn(1)}
        >
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}

function KanbanCard({
  card,
  disabled,
  edit,
}: {
  card: CardSummary;
  disabled: boolean;
  edit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card._id,
    data: { kind: "card", columnId: card.columnId },
    disabled,
  });
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
      }}
      className="group flex items-start gap-1 rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Drag card ${card.title}`}
        className="drag-handle mt-0.5"
      >
        <GripVertical className="size-4" />
      </button>
      <button
        disabled={disabled}
        onClick={edit}
        className="min-w-0 flex-1 rounded-sm px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Edit card ${card.title}`}
      >
        <h3 className="break-words text-sm font-medium leading-5">
          {card.title}
        </h3>
        {card.description && (
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
            {card.description}
          </p>
        )}
      </button>
    </article>
  );
}
