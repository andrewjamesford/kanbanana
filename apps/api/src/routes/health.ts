import mongoose from "mongoose";
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  const ready = mongoose.connection.readyState === 1;
  response
    .status(ready ? 200 : 503)
    .json({ success: ready, data: { status: ready ? "ok" : "unavailable" } });
});
