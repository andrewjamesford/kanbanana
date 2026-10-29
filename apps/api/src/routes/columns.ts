import {
  columnUpdateSchema,
  cardCreateSchema,
  cardReorderSchema,
} from "@kanbanana/shared";
import { validateBody } from "../lib/validation.js";
import { Router } from "express";

import { BoardModel, CardModel, ColumnModel } from "../models/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { idParam, sameIds, toObjectIds } from "../lib/object-id.js";
import { inTransaction } from "../lib/transaction.js";
import {
  serializeCardSummary,
  serializeColumnSummary,
  toIdString,
} from "../lib/serializers.js";

export const columnsRouter = Router();

columnsRouter.patch(
  "/:columnId",
  validateBody(columnUpdateSchema, async (body, request, response) => {
    const columnId = idParam(request, "columnId");
    const { name } = body;

    const column = await ColumnModel.findOne({
      _id: columnId,
      deletedAt: null,
    });

    if (!column) {
      throw notFound("Column not found");
    }

    column.name = name;
    await column.save();

    response.json({ success: true, data: serializeColumnSummary(column) });
  }),
);

columnsRouter.delete(
  "/:columnId",
  asyncHandler(async (request, response) => {
    const columnId = idParam(request, "columnId");
    const deletedAt = new Date();

    const column = await inTransaction(async (session) => {
      const deleted = await ColumnModel.findOneAndUpdate(
        { _id: columnId, deletedAt: null },
        { deletedAt },
        { returnDocument: "after", session },
      );

      if (!deleted) {
        throw notFound("Column not found");
      }

      await BoardModel.updateOne(
        { _id: deleted.boardId, deletedAt: null },
        { $pull: { columnOrder: deleted._id } },
        { session },
      );

      await CardModel.updateMany(
        { columnId: deleted._id, deletedAt: null },
        { deletedAt },
        { session },
      );

      return deleted;
    });

    response.json({
      success: true,
      data: {
        _id: toIdString(column._id),
        boardId: toIdString(column.boardId),
        deletedAt,
      },
    });
  }),
);

columnsRouter.post(
  "/:columnId/cards",
  validateBody(cardCreateSchema, async (body, request, response) => {
    const columnId = idParam(request, "columnId");
    const { title, description } = body;

    const card = await inTransaction(async (session) => {
      const column = await ColumnModel.findOne({
        _id: columnId,
        deletedAt: null,
      }).session(session);

      if (!column) {
        throw notFound("Column not found");
      }

      const created = new CardModel({
        boardId: column.boardId,
        columnId: column._id,
        title,
        description: description ?? null,
      });
      await created.save({ session });

      column.cardOrder.push(created._id);
      await column.save({ session });
      return created;
    });

    response
      .status(201)
      .json({ success: true, data: serializeCardSummary(card) });
  }),
);

columnsRouter.post(
  "/:columnId/cards/reorder",
  validateBody(cardReorderSchema, async (body, request, response) => {
    const columnId = idParam(request, "columnId");
    const { cardOrder } = body;

    const column = await inTransaction(async (session) => {
      const current = await ColumnModel.findOne({
        _id: columnId,
        deletedAt: null,
      }).session(session);

      if (!current) {
        throw notFound("Column not found");
      }

      const cards = await CardModel.find({
        columnId: current._id,
        deletedAt: null,
      }).session(session);

      if (
        !sameIds(
          cards.map((card) => card._id),
          cardOrder,
        )
      ) {
        throw badRequest("cardOrder must match the column's active cards");
      }

      current.cardOrder = toObjectIds(cardOrder);
      await current.save({ session });
      return current;
    });

    response.json({
      success: true,
      data: {
        _id: toIdString(column._id),
        cardOrder: column.cardOrder.map(toIdString),
      },
    });
  }),
);
