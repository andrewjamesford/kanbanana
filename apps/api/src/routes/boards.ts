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
import { idParam, sameIds, toObjectIds } from "../lib/object-id.js";
import { inTransaction } from "../lib/transaction.js";
import {
  serializeBoardSummary,
  serializeColumnSummary,
  toIdString,
} from "../lib/serializers.js";

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
    const boardId = idParam(request, "boardId");
    const boardDetail = await getBoardDetail(boardId.toString());

    response.json({ success: true, data: boardDetail });
  }),
);

boardsRouter.patch(
  "/:boardId",
  validateBody(boardUpdateSchema, async (body, request, response) => {
    const boardId = idParam(request, "boardId");
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
    const boardId = idParam(request, "boardId");
    const deletedAt = new Date();

    const board = await inTransaction(async (session) => {
      const deleted = await BoardModel.findOneAndUpdate(
        { _id: boardId, deletedAt: null },
        { deletedAt },
        { returnDocument: "after", session },
      );

      if (!deleted) {
        throw notFound("Board not found");
      }

      await ColumnModel.updateMany(
        { boardId, deletedAt: null },
        { deletedAt },
        { session },
      );
      await CardModel.updateMany(
        { boardId, deletedAt: null },
        { deletedAt },
        { session },
      );

      return deleted;
    });

    response.json({
      success: true,
      data: { _id: toIdString(board._id), deletedAt },
    });
  }),
);

boardsRouter.post(
  "/:boardId/columns",
  validateBody(columnCreateSchema, async (body, request, response) => {
    const boardId = idParam(request, "boardId");
    const { name } = body;

    const column = await inTransaction(async (session) => {
      const board = await BoardModel.findOne({
        _id: boardId,
        deletedAt: null,
      }).session(session);

      if (!board) {
        throw notFound("Board not found");
      }

      const created = new ColumnModel({ boardId, name });
      await created.save({ session });

      board.columnOrder.push(created._id);
      await board.save({ session });
      return created;
    });

    response
      .status(201)
      .json({ success: true, data: serializeColumnSummary(column) });
  }),
);

boardsRouter.post(
  "/:boardId/columns/reorder",
  validateBody(columnReorderSchema, async (body, request, response) => {
    const boardId = idParam(request, "boardId");
    const { columnOrder } = body;

    const board = await inTransaction(async (session) => {
      const current = await BoardModel.findOne({
        _id: boardId,
        deletedAt: null,
      }).session(session);

      if (!current) {
        throw notFound("Board not found");
      }

      const columns = await ColumnModel.find({
        boardId,
        deletedAt: null,
      }).session(session);

      if (
        !sameIds(
          columns.map((column) => column._id),
          columnOrder,
        )
      ) {
        throw badRequest("columnOrder must match the board's active columns");
      }

      current.columnOrder = toObjectIds(columnOrder);
      await current.save({ session });
      return current;
    });

    response.json({
      success: true,
      data: {
        _id: toIdString(board._id),
        columnOrder: board.columnOrder.map(toIdString),
      },
    });
  }),
);
