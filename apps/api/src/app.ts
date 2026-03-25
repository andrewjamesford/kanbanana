import cors from "cors";
import express from "express";

import { boardsRouter } from "./routes/boards.js";
import { cardsRouter } from "./routes/cards.js";
import { columnsRouter } from "./routes/columns.js";
import { healthRouter } from "./routes/health.js";
import { HttpError } from "./lib/http-error.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (_request, response) => {
    response.json({ success: true, data: { name: "kanbanana-api" } });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/boards", boardsRouter);
  app.use("/api/columns", columnsRouter);
  app.use("/api/cards", cardsRouter);

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof HttpError) {
      return response.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error(error);

    return response.status(500).json({
      success: false,
      error: "Internal server error",
    });
  });

  return app;
}
