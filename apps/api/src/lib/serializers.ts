import type { BoardDetail, BoardSummary, CardSummary } from "@kanbanana/shared";

import type { Board } from "../models/board.js";
import type { Card } from "../models/card.js";
import type { Column } from "../models/column.js";

function toIdString(value: { toString(): string }) {
  return value.toString();
}

export function serializeBoardSummary(board: Board): BoardSummary {
  return {
    _id: toIdString(board._id),
    name: board.name,
    description: board.description ?? null,
    columnOrder: board.columnOrder.map(toIdString),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  };
}

export function serializeCardSummary(card: Card): CardSummary {
  return {
    _id: toIdString(card._id),
    boardId: toIdString(card.boardId),
    columnId: toIdString(card.columnId),
    title: card.title,
    description: card.description ?? null,
  };
}

export function serializeBoardDetail(
  board: Board,
  columns: Column[],
  cards: Card[],
): BoardDetail {
  return {
    board: serializeBoardSummary(board),
    columns: columns.map((column) => ({
      _id: toIdString(column._id),
      boardId: toIdString(column.boardId),
      name: column.name,
      cardOrder: column.cardOrder.map(toIdString),
    })),
    cards: cards.map(serializeCardSummary),
  };
}
