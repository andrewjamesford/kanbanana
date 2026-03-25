import { Router } from "express";

import { BoardModel, CardModel, ColumnModel } from "../models/index.js";
import { sendSuccess } from "../lib/api-response.js";
import { asyncHandler } from "../lib/async-handler.js";
import { getBoardDetail } from "../lib/board-detail.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { parseObjectId, readParam } from "../lib/object-id.js";
import { serializeBoardSummary } from "../lib/serializers.js";
import {
  readJsonBody,
  readOptionalNullableTrimmedString,
  readOptionalTrimmedString,
  readRequiredStringArray,
  readRequiredTrimmedString,
} from "../lib/validators.js";

export const boardsRouter = Router();

boardsRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const boards = await BoardModel.find({ deletedAt: null }).sort({ createdAt: 1 });

    return sendSuccess(response, boards.map(serializeBoardSummary));
  }),
);

boardsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const body = readJsonBody(request.body);
    const name = readRequiredTrimmedString(body, "name", "Board name is required");
    const description = readOptionalNullableTrimmedString(body, "description");

    const board = await BoardModel.create({
      name,
      description: description ?? null,
    });

    return sendSuccess(response, serializeBoardSummary(board), 201);
  }),
);

boardsRouter.get(
  "/:boardId",
  asyncHandler(async (request, response) => {
    const boardId = parseObjectId(readParam(request.params.boardId, "boardId"), "boardId");
    const boardDetail = await getBoardDetail(boardId.toString());

    return sendSuccess(response, boardDetail);
  }),
);

boardsRouter.patch(
  "/:boardId",
  asyncHandler(async (request, response) => {
    const boardId = parseObjectId(readParam(request.params.boardId, "boardId"), "boardId");
    const body = readJsonBody(request.body);
    const name = readOptionalTrimmedString(body, "name", "Board name cannot be empty");
    const description = readOptionalNullableTrimmedString(body, "description");

    const board = await BoardModel.findOne({
      _id: boardId,
      deletedAt: null,
    });

    if (!board) {
      throw notFound("Board not found");
    }

    if (name !== undefined) {
      board.name = name;
    }

    if (description !== undefined) {
      board.description = description;
    }

    await board.save();

    return sendSuccess(response, serializeBoardSummary(board));
  }),
);

boardsRouter.delete(
  "/:boardId",
  asyncHandler(async (request, response) => {
    const boardId = parseObjectId(readParam(request.params.boardId, "boardId"), "boardId");
    const deletedAt = new Date();

    const board = await BoardModel.findOneAndUpdate(
      { _id: boardId, deletedAt: null },
      { deletedAt },
      { new: true },
    );

    if (!board) {
      throw notFound("Board not found");
    }

    await ColumnModel.updateMany({ boardId, deletedAt: null }, { deletedAt });
    await CardModel.updateMany({ boardId, deletedAt: null }, { deletedAt });

    return sendSuccess(response, { _id: board._id.toString(), deletedAt });
  }),
);

boardsRouter.post(
  "/:boardId/columns",
  asyncHandler(async (request, response) => {
    const boardId = parseObjectId(readParam(request.params.boardId, "boardId"), "boardId");
    const body = readJsonBody(request.body);
    const name = readRequiredTrimmedString(body, "name", "Column name is required");

    const board = await BoardModel.findOne({ _id: boardId, deletedAt: null });

    if (!board) {
      throw notFound("Board not found");
    }

    const column = await ColumnModel.create({
      boardId,
      name,
    });

    board.columnOrder.push(column._id);
    await board.save();

    return sendSuccess(
      response,
      {
        _id: column._id.toString(),
        boardId: column.boardId.toString(),
        name: column.name,
        cardOrder: [],
      },
      201,
    );
  }),
);

boardsRouter.post(
  "/:boardId/columns/reorder",
  asyncHandler(async (request, response) => {
    const boardId = parseObjectId(readParam(request.params.boardId, "boardId"), "boardId");
    const body = readJsonBody(request.body);
    const columnOrder = readRequiredStringArray(body, "columnOrder", "columnOrder must be an array");

    const board = await BoardModel.findOne({ _id: boardId, deletedAt: null });

    if (!board) {
      throw notFound("Board not found");
    }

    const columns = await ColumnModel.find({ boardId, deletedAt: null });
    const existingColumnIds = columns.map((column) => column._id.toString()).sort();
    const providedColumnIds = columnOrder
      .map((value) => parseObjectId(value, "columnOrder entry").toString())
      .sort();

    if (
      existingColumnIds.length !== providedColumnIds.length ||
      existingColumnIds.some((value, index) => value !== providedColumnIds[index])
    ) {
      throw badRequest("columnOrder must match the board's active columns");
    }

    board.columnOrder = columnOrder.map((value) => parseObjectId(value, "columnOrder entry"));
    await board.save();

    return sendSuccess(response, {
      _id: board._id.toString(),
      columnOrder: board.columnOrder.map((value) => value.toString()),
    });
  }),
);
