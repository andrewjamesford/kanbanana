import cors from "cors";
import express from "express";

import { boardsRouter } from "./routes/boards.js";
import { cardsRouter } from "./routes/cards.js";
import { columnsRouter } from "./routes/columns.js";
import { healthRouter } from "./routes/health.js";
import { sendError } from "./lib/api-response.js";
import { HttpError } from "./lib/http-error.js";
import { invalidJson, notFound } from "./lib/http-error.js";

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

function normalizeError(error: unknown) {
  if (error instanceof HttpError) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    return invalidJson();
  }

  if (typeof error === "object" && error !== null) {
    const statusCode = getErrorStatus(error);

    if (
      statusCode !== 500 &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return new HttpError(statusCode, "request_error", error.message);
    }
  }

  return new HttpError(500, "internal_server_error", "Internal server error");
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

  app.use((_request, _response, next) => {
    next(notFound("Route not found"));
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const normalizedError = normalizeError(error);

    if (normalizedError.statusCode === 500) {
      console.error(error);
    }

    return sendError(
      response,
      normalizedError.statusCode,
      normalizedError.code,
      normalizedError.message,
      normalizedError.details,
    );
  });

  return app;
}
