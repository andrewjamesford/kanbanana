import { moveCard } from "../services/move-card.js";
import { serializeCardSummary } from "../lib/serializers.js";
import { validateBody } from "../lib/validation.js";
import { Router } from "express";

import { CardModel, ColumnModel } from "../models/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { parseObjectId, readParam } from "../lib/object-id.js";

export const cardsRouter = Router();

cardsRouter.get(
  "/:cardId",
  asyncHandler(async (request, response) => {
    const cardId = parseObjectId(
      readParam(request.params.cardId, "cardId"),
      "cardId",
    );
    const card = await CardModel.findOne({
      _id: cardId,
      deletedAt: null,
    }).lean();
    if (!card) throw notFound("Card not found");
    response.json({ success: true, data: serializeCardSummary(card) });
  }),
);

cardsRouter.patch(
  "/:cardId",
  validateBody({ title: "text", description: "description" }),
  asyncHandler(async (request, response) => {
    const cardId = parseObjectId(
      readParam(request.params.cardId, "cardId"),
      "cardId",
    );
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
    const cardId = parseObjectId(
      readParam(request.params.cardId, "cardId"),
      "cardId",
    );
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
  validateBody({
    sourceColumnId: "id",
    destinationColumnId: "id",
    sourceCardOrder: "ids",
    destinationCardOrder: "ids",
  }),
  asyncHandler(async (request, response) => {
    const cardId = parseObjectId(
      readParam(request.params.cardId, "cardId"),
      "cardId",
    );
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

    if (
      !Array.isArray(sourceCardOrder) ||
      !Array.isArray(destinationCardOrder)
    ) {
      throw badRequest(
        "sourceCardOrder and destinationCardOrder must be arrays",
      );
    }

    const { card, sourceColumn, destinationColumn } = await moveCard(cardId, {
      sourceColumnId,
      destinationColumnId,
      sourceCardOrder,
      destinationCardOrder,
    });

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
            cardOrder: destinationColumn.cardOrder.map((value) =>
              value.toString(),
            ),
          },
        ],
      },
    });
  }),
);
