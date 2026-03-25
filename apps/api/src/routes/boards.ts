import { Router } from "express";

import { BoardModel } from "../models/board.js";

export const boardsRouter = Router();

boardsRouter.get("/", async (_request, response) => {
  const boards = await BoardModel.find({ deletedAt: null })
    .select(["name", "description", "columnOrder", "createdAt", "updatedAt"])
    .lean();

  response.json({ success: true, data: boards });
});

