import { Router } from "express";

import { sendSuccess } from "../lib/api-response.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  return sendSuccess(response, { status: "ok" });
});
