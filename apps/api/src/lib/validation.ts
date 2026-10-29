import type { Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { validationMessage } from "@kanbanana/shared";
import { asyncHandler } from "./async-handler.js";
import { badRequest } from "./http-error.js";

// Handlers receive only the schema's parsed, typed output, never raw JSON.
export function validateBody<T>(
  schema: ZodType<T>,
  handler: (body: T, request: Request, response: Response) => Promise<void>,
): RequestHandler {
  return asyncHandler(async (request, response) => {
    const result = schema.safeParse(request.body);
    if (!result.success) throw badRequest(validationMessage(result.error));
    await handler(result.data, request, response);
  });
}
