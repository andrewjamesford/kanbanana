import type { CardMoveInput } from "@kanbanana/shared";
import { CardModel, ColumnModel } from "../models/index.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { objectIdEquals, sameIds, toObjectIds } from "../lib/object-id.js";
import { Types } from "mongoose";

export async function moveCard(cardId: Types.ObjectId, input: CardMoveInput) {
  const {
    sourceColumnId,
    destinationColumnId,
    sourceCardOrder,
    destinationCardOrder,
  } = input;
  const sourceId = new Types.ObjectId(sourceColumnId);
  const destinationId = new Types.ObjectId(destinationColumnId);

  if (objectIdEquals(sourceId, destinationId)) {
    throw badRequest(
      "Card moves across columns require different source and destination columns",
    );
  }

  const session = await CardModel.startSession();
  try {
    return await session.withTransaction(async () => {
      const card = await CardModel.findOne({
        _id: cardId,
        deletedAt: null,
      }).session(session);

      if (!card) {
        throw notFound("Card not found");
      }

      if (!objectIdEquals(card.columnId, sourceId)) {
        throw badRequest("Card does not belong to the source column");
      }

      const sourceColumn = await ColumnModel.findOne({
        _id: sourceId,
        deletedAt: null,
      }).session(session);
      const destinationColumn = await ColumnModel.findOne({
        _id: destinationId,
        deletedAt: null,
      }).session(session);

      if (!sourceColumn || !destinationColumn) {
        throw notFound("One or more columns were not found");
      }

      if (!objectIdEquals(sourceColumn.boardId, destinationColumn.boardId)) {
        throw badRequest(
          "Source and destination columns must belong to the same board",
        );
      }

      const sourceCards = await CardModel.find({
        _id: { $in: sourceColumn.cardOrder },
        columnId: sourceColumn._id,
        boardId: sourceColumn.boardId,
        deletedAt: null,
      }).session(session);
      const destinationCards = await CardModel.find({
        _id: { $in: destinationColumn.cardOrder },
        columnId: destinationColumn._id,
        boardId: destinationColumn.boardId,
        deletedAt: null,
      }).session(session);

      const remainingSourceCards = sourceCards.filter(
        (sourceCard) => !objectIdEquals(sourceCard._id, card._id),
      );

      if (
        !sameIds(
          remainingSourceCards.map((sourceCard) => sourceCard._id),
          sourceCardOrder,
        )
      ) {
        throw badRequest(
          "sourceCardOrder must match the remaining source cards",
        );
      }

      if (
        !sameIds(
          [...destinationCards.map((item) => item._id), card._id],
          destinationCardOrder,
        )
      ) {
        throw badRequest(
          "destinationCardOrder must match the destination cards after the move",
        );
      }

      sourceColumn.cardOrder = toObjectIds(sourceCardOrder);
      destinationColumn.cardOrder = toObjectIds(destinationCardOrder);
      card.columnId = destinationColumn._id;
      await sourceColumn.save({ session });
      await destinationColumn.save({ session });
      await card.save({ session });
      return { card, sourceColumn, destinationColumn };
    });
  } finally {
    await session.endSession();
  }
}
