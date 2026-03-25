import { Router } from "express";

import { BoardModel, CardModel, ColumnModel } from "../models/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { parseObjectId, readParam } from "../lib/object-id.js";

export const columnsRouter = Router();

columnsRouter.patch(
  "/:columnId",
  asyncHandler(async (request, response) => {
    const columnId = parseObjectId(readParam(request.params.columnId, "columnId"), "columnId");
    const { name } = request.body as { name?: string };

    if (name === undefined || !name.trim()) {
      throw badRequest("Column name is required");
    }

    const column = await ColumnModel.findOne({
      _id: columnId,
      deletedAt: null,
    });

    if (!column) {
      throw notFound("Column not found");
    }

    column.name = name;
    await column.save();

    response.json({
      success: true,
      data: {
        _id: column._id.toString(),
        boardId: column.boardId.toString(),
        name: column.name,
        cardOrder: column.cardOrder.map((value) => value.toString()),
      },
    });
  }),
);

columnsRouter.delete(
  "/:columnId",
  asyncHandler(async (request, response) => {
    const columnId = parseObjectId(readParam(request.params.columnId, "columnId"), "columnId");
    const deletedAt = new Date();

    const column = await ColumnModel.findOneAndUpdate(
      { _id: columnId, deletedAt: null },
      { deletedAt },
      { new: true },
    );

    if (!column) {
      throw notFound("Column not found");
    }

    await BoardModel.updateOne(
      { _id: column.boardId, deletedAt: null },
      { $pull: { columnOrder: column._id } },
    );

    await CardModel.updateMany(
      { columnId: column._id, deletedAt: null },
      { deletedAt },
    );

    response.json({
      success: true,
      data: {
        _id: column._id.toString(),
        boardId: column.boardId.toString(),
        deletedAt,
      },
    });
  }),
);

columnsRouter.post(
  "/:columnId/cards",
  asyncHandler(async (request, response) => {
    const columnId = parseObjectId(readParam(request.params.columnId, "columnId"), "columnId");
    const { title, description } = request.body as {
      title?: string;
      description?: string | null;
    };

    if (!title?.trim()) {
      throw badRequest("Card title is required");
    }

    const column = await ColumnModel.findOne({ _id: columnId, deletedAt: null });

    if (!column) {
      throw notFound("Column not found");
    }

    const card = await CardModel.create({
      boardId: column.boardId,
      columnId: column._id,
      title,
      description: description ?? null,
    });

    column.cardOrder.push(card._id);
    await column.save();

    response.status(201).json({
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

columnsRouter.post(
  "/:columnId/cards/reorder",
  asyncHandler(async (request, response) => {
    const columnId = parseObjectId(readParam(request.params.columnId, "columnId"), "columnId");
    const { cardOrder } = request.body as { cardOrder?: string[] };

    if (!Array.isArray(cardOrder)) {
      throw badRequest("cardOrder must be an array");
    }

    const column = await ColumnModel.findOne({ _id: columnId, deletedAt: null });

    if (!column) {
      throw notFound("Column not found");
    }

    const cards = await CardModel.find({
      columnId: column._id,
      deletedAt: null,
    });

    const existingCardIds = cards.map((card) => card._id.toString()).sort();
    const providedCardIds = cardOrder
      .map((value) => parseObjectId(value, "cardOrder entry").toString())
      .sort();

    if (
      existingCardIds.length !== providedCardIds.length ||
      existingCardIds.some((value, index) => value !== providedCardIds[index])
    ) {
      throw badRequest("cardOrder must match the column's active cards");
    }

    column.cardOrder = cardOrder.map((value) => parseObjectId(value, "cardOrder entry"));
    await column.save();

    response.json({
      success: true,
      data: {
        _id: column._id.toString(),
        cardOrder: column.cardOrder.map((value) => value.toString()),
      },
    });
  }),
);
