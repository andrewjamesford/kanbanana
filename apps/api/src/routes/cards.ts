import { Router } from "express";

import { CardModel, ColumnModel } from "../models/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { objectIdEquals, parseObjectId, readParam } from "../lib/object-id.js";

export const cardsRouter = Router();

cardsRouter.patch(
  "/:cardId",
  asyncHandler(async (request, response) => {
    const cardId = parseObjectId(readParam(request.params.cardId, "cardId"), "cardId");
    const { title, description } = request.body as {
      title?: string;
      description?: string | null;
    };

    const card = await CardModel.findOne({ _id: cardId, deletedAt: null });

    if (!card) {
      throw notFound("Card not found");
    }

    if (title !== undefined) {
      if (!title.trim()) {
        throw badRequest("Card title cannot be empty");
      }

      card.title = title;
    }

    if (description !== undefined) {
      card.description = description;
    }

    await card.save();

    response.json({
      success: true,
      data: {
        _id: card._id.toString(),
        boardId: card.boardId.toString(),
        columnId: card.columnId.toString(),
        title: card.title,
        description: card.description,
      },
    });
  }),
);

cardsRouter.delete(
  "/:cardId",
  asyncHandler(async (request, response) => {
    const cardId = parseObjectId(readParam(request.params.cardId, "cardId"), "cardId");
    const deletedAt = new Date();

    const card = await CardModel.findOneAndUpdate(
      { _id: cardId, deletedAt: null },
      { deletedAt },
      { new: true },
    );

    if (!card) {
      throw notFound("Card not found");
    }

    await ColumnModel.updateOne(
      { _id: card.columnId, deletedAt: null },
      { $pull: { cardOrder: card._id } },
    );

    response.json({
      success: true,
      data: {
        _id: card._id.toString(),
        columnId: card.columnId.toString(),
        deletedAt,
      },
    });
  }),
);

cardsRouter.post(
  "/:cardId/move",
  asyncHandler(async (request, response) => {
    const cardId = parseObjectId(readParam(request.params.cardId, "cardId"), "cardId");
    const {
      sourceColumnId,
      destinationColumnId,
      sourceCardOrder,
      destinationCardOrder,
    } = request.body as {
      sourceColumnId?: string;
      destinationColumnId?: string;
      sourceCardOrder?: string[];
      destinationCardOrder?: string[];
    };

    if (!sourceColumnId || !destinationColumnId) {
      throw badRequest("sourceColumnId and destinationColumnId are required");
    }

    if (!Array.isArray(sourceCardOrder) || !Array.isArray(destinationCardOrder)) {
      throw badRequest("sourceCardOrder and destinationCardOrder must be arrays");
    }

    const sourceId = parseObjectId(sourceColumnId, "sourceColumnId");
    const destinationId = parseObjectId(destinationColumnId, "destinationColumnId");

    if (objectIdEquals(sourceId, destinationId)) {
      throw badRequest("Card moves across columns require different source and destination columns");
    }

    const card = await CardModel.findOne({ _id: cardId, deletedAt: null });

    if (!card) {
      throw notFound("Card not found");
    }

    if (!objectIdEquals(card.columnId, sourceId)) {
      throw badRequest("Card does not belong to the source column");
    }

    const [sourceColumn, destinationColumn] = await Promise.all([
      ColumnModel.findOne({ _id: sourceId, deletedAt: null }),
      ColumnModel.findOne({ _id: destinationId, deletedAt: null }),
    ]);

    if (!sourceColumn || !destinationColumn) {
      throw notFound("One or more columns were not found");
    }

    if (!objectIdEquals(sourceColumn.boardId, destinationColumn.boardId)) {
      throw badRequest("Source and destination columns must belong to the same board");
    }

    const sourceCards = await CardModel.find({
      _id: { $in: sourceColumn.cardOrder },
      deletedAt: null,
    });
    const destinationCards = await CardModel.find({
      _id: { $in: destinationColumn.cardOrder },
      deletedAt: null,
    });

    const expectedSourceIds = sourceCards
      .filter((sourceCard) => !objectIdEquals(sourceCard._id, card._id))
      .map((sourceCard) => sourceCard._id.toString())
      .sort();
    const expectedDestinationIds = [...destinationCards.map((destinationCard) => destinationCard._id.toString()), card._id.toString()].sort();
    const providedSourceIds = sourceCardOrder
      .map((value) => parseObjectId(value, "sourceCardOrder entry").toString())
      .sort();
    const providedDestinationIds = destinationCardOrder
      .map((value) => parseObjectId(value, "destinationCardOrder entry").toString())
      .sort();

    if (
      expectedSourceIds.length !== providedSourceIds.length ||
      expectedSourceIds.some((value, index) => value !== providedSourceIds[index])
    ) {
      throw badRequest("sourceCardOrder must match the remaining source cards");
    }

    if (
      expectedDestinationIds.length !== providedDestinationIds.length ||
      expectedDestinationIds.some((value, index) => value !== providedDestinationIds[index])
    ) {
      throw badRequest("destinationCardOrder must match the destination cards after the move");
    }

    sourceColumn.cardOrder = sourceCardOrder.map((value) =>
      parseObjectId(value, "sourceCardOrder entry"),
    );
    destinationColumn.cardOrder = destinationCardOrder.map((value) =>
      parseObjectId(value, "destinationCardOrder entry"),
    );
    card.columnId = destinationColumn._id;

    await Promise.all([sourceColumn.save(), destinationColumn.save(), card.save()]);

    response.json({
      success: true,
      data: {
        boardId: card.boardId.toString(),
        updatedCard: {
          _id: card._id.toString(),
          columnId: card.columnId.toString(),
        },
        updatedColumns: [
          {
            _id: sourceColumn._id.toString(),
            cardOrder: sourceColumn.cardOrder.map((value) => value.toString()),
          },
          {
            _id: destinationColumn._id.toString(),
            cardOrder: destinationColumn.cardOrder.map((value) => value.toString()),
          },
        ],
      },
    });
  }),
);
