import { useState } from "react";
import type { BoardDetail, CardSummary } from "@kanbanana/shared";
import { EntityDialog } from "./entity-dialog";
import { inputClass } from "./ui/input";

export function CardEditor({
  detail,
  card,
  columnId,
  close,
  remove,
  save,
}: {
  detail: BoardDetail;
  card?: CardSummary;
  columnId: string;
  close: () => void;
  remove?: () => void;
  save: (
    name: string,
    description: string,
    destinationId: string,
    index: number,
  ) => Promise<void>;
}) {
  const [destination, setDestination] = useState(columnId);
  const [index, setIndex] = useState(
    card
      ? detail.columns
          .find((column) => column._id === columnId)!
          .cardOrder.indexOf(card._id)
      : 0,
  );
  const destinationCards = detail.columns
    .find((column) => column._id === destination)!
    .cardOrder.filter((id) => id !== card?._id);
  return (
    <EntityDialog
      title={card ? "Edit card" : "Add a card"}
      description={
        card
          ? "Update the details or move this card to its next step."
          : "A small, clear task is a good place to start."
      }
      label="Title"
      name={card?.title}
      text={card?.description ?? ""}
      onClose={close}
      onDelete={remove}
      submitLabel={card ? "Save changes" : "Add card"}
      onSave={(name, description) =>
        save(name, description, destination, index)
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label htmlFor="card-column" className="text-sm font-medium">
            Column
          </label>
          <select
            id="card-column"
            className={inputClass}
            value={destination}
            onChange={(event) => {
              setDestination(event.target.value);
              setIndex(
                detail.columns
                  .find((column) => column._id === event.target.value)!
                  .cardOrder.filter((id) => id !== card?._id).length,
              );
            }}
          >
            {detail.columns.map((column) => (
              <option key={column._id} value={column._id}>
                {column.name}
              </option>
            ))}
          </select>
        </div>
        {card && (
          <div className="grid gap-2">
            <label htmlFor="card-position" className="text-sm font-medium">
              Position
            </label>
            <select
              id="card-position"
              className={inputClass}
              value={index}
              onChange={(event) => setIndex(Number(event.target.value))}
            >
              {Array.from(
                { length: destinationCards.length + 1 },
                (_, position) => (
                  <option key={position} value={position}>
                    {position + 1}
                    {position === 0
                      ? " (top)"
                      : position === destinationCards.length
                        ? " (bottom)"
                        : ""}
                  </option>
                ),
              )}
            </select>
          </div>
        )}
      </div>
    </EntityDialog>
  );
}
