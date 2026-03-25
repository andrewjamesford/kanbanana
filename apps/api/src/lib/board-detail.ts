import { BoardModel, CardModel, ColumnModel } from "../models/index.js";
import { notFound } from "./http-error.js";
import { serializeBoardDetail } from "./serializers.js";

export async function getBoardDetail(boardId: string) {
  const board = await BoardModel.findOne({ _id: boardId, deletedAt: null });

  if (!board) {
    throw notFound("Board not found");
  }

  const columns = await ColumnModel.find({
    boardId: board._id,
    deletedAt: null,
  });

  const columnsById = new Map(columns.map((column) => [column._id.toString(), column]));
  const orderedColumns = board.columnOrder
    .map((columnId) => columnsById.get(columnId.toString()))
    .filter((column): column is NonNullable<typeof column> => Boolean(column));

  const cards = await CardModel.find({
    boardId: board._id,
    deletedAt: null,
  });

  const cardsById = new Map(cards.map((card) => [card._id.toString(), card]));
  const seenCardIds = new Set<string>();
  const orderedCards = orderedColumns.flatMap((column) =>
    column.cardOrder
      .map((cardId) => cardsById.get(cardId.toString()))
      .filter((card): card is NonNullable<typeof card> => {
        if (!card) {
          return false;
        }

        if (card.columnId.toString() !== column._id.toString()) {
          return false;
        }

        if (seenCardIds.has(card._id.toString())) {
          return false;
        }

        seenCardIds.add(card._id.toString());
        return true;
      }),
  );

  return serializeBoardDetail(board, orderedColumns, orderedCards);
}
