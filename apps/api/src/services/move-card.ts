import { CardModel, ColumnModel } from "../models/index.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { objectIdEquals, parseObjectId } from "../lib/object-id.js";
import type { Types } from "mongoose";

export async function moveCard(
  cardId: Types.ObjectId,
  input: {
    sourceColumnId: string;
    destinationColumnId: string;
    sourceCardOrder: string[];
    destinationCardOrder: string[];
  },
) {
  const {
    sourceColumnId,
    destinationColumnId,
    sourceCardOrder,
    destinationCardOrder,
  } = input;
  const sourceId = parseObjectId(sourceColumnId, "sourceColumnId");
  const destinationId = parseObjectId(
    destinationColumnId,
    "destinationColumnId",
  );

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

      const expectedSourceIds = sourceCards
        .filter((sourceCard) => !objectIdEquals(sourceCard._id, card._id))
        .map((sourceCard) => sourceCard._id.toString())
        .sort();
      const expectedDestinationIds = [
        ...destinationCards.map((destinationCard) =>
          destinationCard._id.toString(),
        ),
        card._id.toString(),
      ].sort();
      const providedSourceIds = sourceCardOrder
        .map((value) =>
          parseObjectId(value, "sourceCardOrder entry").toString(),
        )
        .sort();
      const providedDestinationIds = destinationCardOrder
        .map((value) =>
          parseObjectId(value, "destinationCardOrder entry").toString(),
        )
        .sort();

      if (
        expectedSourceIds.length !== providedSourceIds.length ||
        expectedSourceIds.some(
          (value, index) => value !== providedSourceIds[index],
        )
      ) {
        throw badRequest(
          "sourceCardOrder must match the remaining source cards",
        );
      }

      if (
        expectedDestinationIds.length !== providedDestinationIds.length ||
        expectedDestinationIds.some(
          (value, index) => value !== providedDestinationIds[index],
        )
      ) {
        throw badRequest(
          "destinationCardOrder must match the destination cards after the move",
        );
      }

      sourceColumn.cardOrder = sourceCardOrder.map((value) =>
        parseObjectId(value, "sourceCardOrder entry"),
      );
      destinationColumn.cardOrder = destinationCardOrder.map((value) =>
        parseObjectId(value, "destinationCardOrder entry"),
      );
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
