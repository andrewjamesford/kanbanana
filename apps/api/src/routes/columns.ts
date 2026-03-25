import { Router } from "express";

import { BoardModel, CardModel, ColumnModel } from "../models/index.js";
import { sendSuccess } from "../lib/api-response.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { parseObjectId, readParam } from "../lib/object-id.js";
import {
  readJsonBody,
  readOptionalNullableTrimmedString,
  readRequiredStringArray,
  readRequiredTrimmedString,
} from "../lib/validators.js";

export const columnsRouter = Router();

columnsRouter.patch(
  "/:columnId",
  asyncHandler(async (request, response) => {
    const columnId = parseObjectId(readParam(request.params.columnId, "columnId"), "columnId");
    const body = readJsonBody(request.body);
    const name = readRequiredTrimmedString(body, "name", "Column name is required");

    const column = await ColumnModel.findOne({
      _id: columnId,
      deletedAt: null,
    });

    if (!column) {
      throw notFound("Column not found");
    }

    column.name = name;
    await column.save();

    return sendSuccess(response, {
      _id: column._id.toString(),
      boardId: column.boardId.toString(),
      name: column.name,
      cardOrder: column.cardOrder.map((value) => value.toString()),
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

    return sendSuccess(response, {
      _id: column._id.toString(),
      boardId: column.boardId.toString(),
      deletedAt,
    });
  }),
);

columnsRouter.post(
  "/:columnId/cards",
  asyncHandler(async (request, response) => {
    const columnId = parseObjectId(readParam(request.params.columnId, "columnId"), "columnId");
    const body = readJsonBody(request.body);
    const title = readRequiredTrimmedString(body, "title", "Card title is required");
    const description = readOptionalNullableTrimmedString(body, "description");

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

    return sendSuccess(
      response,
      {
        _id: card._id.toString(),
        boardId: card.boardId.toString(),
        columnId: card.columnId.toString(),
        title: card.title,
        description: card.description,
      },
      201,
    );
  }),
);

columnsRouter.post(
  "/:columnId/cards/reorder",
  asyncHandler(async (request, response) => {
    const columnId = parseObjectId(readParam(request.params.columnId, "columnId"), "columnId");
    const body = readJsonBody(request.body);
    const cardOrder = readRequiredStringArray(body, "cardOrder", "cardOrder must be an array");

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

    return sendSuccess(response, {
      _id: column._id.toString(),
      cardOrder: column.cardOrder.map((value) => value.toString()),
    });
  }),
);
