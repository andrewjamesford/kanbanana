import cors from "cors";
import express from "express";

import { sendError, sendSuccess } from "./lib/api-response.js";
import { badRequest, notFound, HttpError } from "./lib/http-error.js";
import { boardsRouter } from "./routes/boards.js";
import { cardsRouter } from "./routes/cards.js";
import { columnsRouter } from "./routes/columns.js";
import { healthRouter } from "./routes/health.js";

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

function getErrorPayload(error: unknown, statusCode: number) {
  if (error instanceof HttpError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof SyntaxError && "body" in error) {
    return {
      code: "INVALID_JSON",
      message: "Request body contains invalid JSON",
    };
  }

  if (statusCode === 500) {
    return {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: error instanceof Error ? error.message : "Request failed",
  };
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (_request, response) => {
    return sendSuccess(response, { name: "kanbanana-api" });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/boards", boardsRouter);
  app.use("/api/columns", columnsRouter);
  app.use("/api/cards", cardsRouter);
  app.use("/api", (_request, _response, next) => {
    next(notFound("API route not found"));
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const resolvedError =
      error instanceof SyntaxError && "body" in error
        ? badRequest("Request body contains invalid JSON")
        : error;
    const statusCode = getErrorStatus(resolvedError);
    const errorPayload = getErrorPayload(resolvedError, statusCode);

    if (statusCode === 500) {
      console.error(error);
    }

    return sendError(response, errorPayload, statusCode);
  });

  return app;
}
