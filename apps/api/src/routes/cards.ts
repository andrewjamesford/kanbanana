import { cardUpdateSchema, cardMoveSchema } from "@kanbanana/shared";
import { moveCard, updateCard } from "../services/update-card.js";
import { serializeCardSummary, toIdString } from "../lib/serializers.js";
import { validateBody } from "../lib/validation.js";
import { Router } from "express";

import { CardModel, ColumnModel } from "../models/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { notFound } from "../lib/http-error.js";
import { idParam } from "../lib/object-id.js";
import { inTransaction } from "../lib/transaction.js";

export const cardsRouter = Router();

cardsRouter.get(
  "/:cardId",
  asyncHandler(async (request, response) => {
    const cardId = idParam(request, "cardId");
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
  validateBody(cardUpdateSchema, async (body, request, response) => {
    const card = await updateCard(idParam(request, "cardId"), body);

    response.json({ success: true, data: serializeCardSummary(card) });
  }),
);

cardsRouter.delete(
  "/:cardId",
  asyncHandler(async (request, response) => {
    const cardId = idParam(request, "cardId");
    const deletedAt = new Date();

    const card = await inTransaction(async (session) => {
      const deleted = await CardModel.findOneAndUpdate(
        { _id: cardId, deletedAt: null },
        { deletedAt },
        { returnDocument: "after", session },
      );

      if (!deleted) {
        throw notFound("Card not found");
      }

      await ColumnModel.updateOne(
        { _id: deleted.columnId, deletedAt: null },
        { $pull: { cardOrder: deleted._id } },
        { session },
      );

      return deleted;
    });

    response.json({
      success: true,
      data: {
        _id: toIdString(card._id),
        columnId: toIdString(card.columnId),
        deletedAt,
      },
    });
  }),
);

cardsRouter.post(
  "/:cardId/move",
  validateBody(cardMoveSchema, async (body, request, response) => {
    const cardId = idParam(request, "cardId");

    const { card, sourceColumn, destinationColumn } = await moveCard(
      cardId,
      body,
    );

    response.json({
      success: true,
      data: {
        boardId: toIdString(card.boardId),
        updatedCard: {
          _id: toIdString(card._id),
          columnId: toIdString(card.columnId),
        },
        updatedColumns: [sourceColumn, destinationColumn].map((column) => ({
          _id: toIdString(column._id),
          cardOrder: column.cardOrder.map(toIdString),
        })),
      },
    });
  }),
);
