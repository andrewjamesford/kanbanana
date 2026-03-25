import cors from "cors";
import express from "express";

import { boardsRouter } from "./routes/boards.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (_request, response) => {
    response.json({ success: true, data: { name: "kanbanana-api" } });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/boards", boardsRouter);

  return app;
}

