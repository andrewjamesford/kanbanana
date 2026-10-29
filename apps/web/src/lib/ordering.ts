import type { BoardDetail, CardMoveInput } from "@kanbanana/shared";

export type CardPlacement = CardMoveInput & { cardId: string };

// Both drag-and-drop and the card form use the same explicit ordering contract.
export function placeCard(
  detail: BoardDetail,
  cardId: string,
  destinationColumnId: string,
  index: number,
): CardPlacement {
  const card = detail.cards.find((item) => item._id === cardId);
  const source = detail.columns.find((item) => item._id === card?.columnId);
  const destination = detail.columns.find(
    (item) => item._id === destinationColumnId,
  );
  if (!card || !source || !destination)
    throw new Error(
      "This card or column is no longer available. Reload the board and try again.",
    );
  const sourceCardOrder = source.cardOrder.filter((id) => id !== cardId);
  const destinationCardOrder = destination.cardOrder.filter(
    (id) => id !== cardId,
  );
  destinationCardOrder.splice(
    Math.max(0, Math.min(index, destinationCardOrder.length)),
    0,
    cardId,
  );
  return {
    cardId,
    sourceColumnId: source._id,
    destinationColumnId,
    sourceCardOrder,
    destinationCardOrder,
  };
}

export function applyPlacement(
  detail: BoardDetail,
  placement: CardPlacement,
): BoardDetail {
  return {
    ...detail,
    cards: detail.cards.map((card) =>
      card._id === placement.cardId
        ? { ...card, columnId: placement.destinationColumnId }
        : card,
    ),
    columns: detail.columns.map((column) =>
      column._id === placement.destinationColumnId
        ? { ...column, cardOrder: placement.destinationCardOrder }
        : column._id === placement.sourceColumnId
          ? { ...column, cardOrder: placement.sourceCardOrder }
          : column,
    ),
  };
}
