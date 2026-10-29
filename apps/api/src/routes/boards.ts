import {
  boardCreateSchema,
  boardUpdateSchema,
  columnCreateSchema,
  columnReorderSchema,
} from "@kanbanana/shared";
import { validateBody } from "../lib/validation.js";
import { Router } from "express";

import { BoardModel, CardModel, ColumnModel } from "../models/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { getBoardDetail } from "../lib/board-detail.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { parseObjectId, readParam } from "../lib/object-id.js";
import { serializeBoardSummary } from "../lib/serializers.js";

export const boardsRouter = Router();

boardsRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const boards = await BoardModel.find({ deletedAt: null })
      .sort({ createdAt: 1 })
      .lean();

    response.json({
      success: true,
      data: boards.map(serializeBoardSummary),
    });
  }),
);

boardsRouter.post(
  "/",
  validateBody(boardCreateSchema, async (body, request, response) => {
    const { name, description } = body;

    const board = await BoardModel.create({
      name,
      description: description ?? null,
    });

    response.status(201).json({
      success: true,
      data: serializeBoardSummary(board),
    });
  }),
);

boardsRouter.get(
  "/:boardId",
  asyncHandler(async (request, response) => {
    const boardId = parseObjectId(
      readParam(request.params.boardId, "boardId"),
      "boardId",
    );
    const boardDetail = await getBoardDetail(boardId.toString());

    response.json({ success: true, data: boardDetail });
  }),
);

boardsRouter.patch(
  "/:boardId",
  validateBody(boardUpdateSchema, async (body, request, response) => {
    const boardId = parseObjectId(
      readParam(request.params.boardId, "boardId"),
      "boardId",
    );
    const { name, description } = body;

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

    response.json({ success: true, data: serializeBoardSummary(board) });
  }),
);

boardsRouter.delete(
  "/:boardId",
  asyncHandler(async (request, response) => {
    const boardId = parseObjectId(
      readParam(request.params.boardId, "boardId"),
      "boardId",
    );
    const deletedAt = new Date();

    const board = await BoardModel.findOneAndUpdate(
      { _id: boardId, deletedAt: null },
      { deletedAt },
      { returnDocument: "after" },
    );

    if (!board) {
      throw notFound("Board not found");
    }

    await ColumnModel.updateMany({ boardId, deletedAt: null }, { deletedAt });
    await CardModel.updateMany({ boardId, deletedAt: null }, { deletedAt });

    response.json({
      success: true,
      data: { _id: board._id.toString(), deletedAt },
    });
  }),
);

boardsRouter.post(
  "/:boardId/columns",
  validateBody(columnCreateSchema, async (body, request, response) => {
    const boardId = parseObjectId(
      readParam(request.params.boardId, "boardId"),
      "boardId",
    );
    const { name } = body;

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

    response.status(201).json({
      success: true,
      data: {
        _id: column._id.toString(),
        boardId: column.boardId.toString(),
        name: column.name,
        cardOrder: [],
      },
    });
  }),
);

boardsRouter.post(
  "/:boardId/columns/reorder",
  validateBody(columnReorderSchema, async (body, request, response) => {
    const boardId = parseObjectId(
      readParam(request.params.boardId, "boardId"),
      "boardId",
    );
    const { columnOrder } = body;

    const board = await BoardModel.findOne({ _id: boardId, deletedAt: null });

    if (!board) {
      throw notFound("Board not found");
    }

    const columns = await ColumnModel.find({ boardId, deletedAt: null });
    const existingColumnIds = columns
      .map((column) => column._id.toString())
      .sort();
    const providedColumnIds = columnOrder
      .map((value) => parseObjectId(value, "columnOrder entry").toString())
      .sort();

    if (
      existingColumnIds.length !== providedColumnIds.length ||
      existingColumnIds.some(
        (value, index) => value !== providedColumnIds[index],
      )
    ) {
      throw badRequest("columnOrder must match the board's active columns");
    }

    board.columnOrder = columnOrder.map((value) =>
      parseObjectId(value, "columnOrder entry"),
    );
    await board.save();

    response.json({
      success: true,
      data: {
        _id: board._id.toString(),
        columnOrder: board.columnOrder.map((value) => value.toString()),
      },
    });
  }),
);
