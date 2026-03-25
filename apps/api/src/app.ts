import cors from "cors";
import express from "express";

import { boardsRouter } from "./routes/boards.js";
import { cardsRouter } from "./routes/cards.js";
import { columnsRouter } from "./routes/columns.js";
import { healthRouter } from "./routes/health.js";
import { HttpError } from "./lib/http-error.js";

function getErrorStatus(error: unknown) {
  if (error instanceof HttpError) {
    return error.statusCode;
  }

  if (typeof error === "object" && error !== null) {
    const statusCode = "statusCode" in error ? error.statusCode : undefined;
    const status = "status" in error ? error.status : undefined;
    const resolvedStatus =
      typeof statusCode === "number" ? statusCode : typeof status === "number" ? status : undefined;

    if (resolvedStatus && resolvedStatus >= 400 && resolvedStatus < 600) {
      return resolvedStatus;
    }
  }

  return 500;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Internal server error";
}

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
    const statusCode = getErrorStatus(error);
    const errorMessage = statusCode === 500 ? "Internal server error" : getErrorMessage(error);

    if (statusCode === 500) {
      console.error(error);
    }

    return response.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  });

  return app;
}
