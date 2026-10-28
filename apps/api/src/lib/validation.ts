import type { RequestHandler } from "express";
import { badRequest } from "./http-error.js";

// Validate before Mongoose can coerce unexpected JSON values into strings.
export function validateBody(
  fields: Record<string, "text" | "description" | "ids" | "id">,
): RequestHandler {
  return (request, _response, next) => {
    try {
      const body: unknown = request.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw badRequest("Request body must be a JSON object");
      }
      const values = body as Record<string, unknown>;
      if (!Object.keys(values).length)
        throw badRequest("Request body cannot be empty");
      for (const [key, value] of Object.entries(values)) {
        const type = Object.hasOwn(fields, key) ? fields[key] : undefined;
        if (!type) throw badRequest(`Unknown field: ${key}`);
        if (type === "description" && value === null) continue;
        if (type === "ids") {
          if (
            !Array.isArray(value) ||
            value.some(
              (entry) =>
                typeof entry !== "string" || !/^[a-f\d]{24}$/i.test(entry),
            )
          ) {
            throw badRequest(`${key} must be an array of valid IDs`);
          }
          if (new Set(value).size !== value.length)
            throw badRequest(`${key} cannot contain duplicate IDs`);
        } else {
          if (typeof value !== "string")
            throw badRequest(
              `${key} must be a string${type === "description" ? " or null" : ""}`,
            );
          if (type === "id" && !/^[a-f\d]{24}$/i.test(value))
            throw badRequest(`Invalid ${key}`);
          if (type === "text" && !value.trim())
            throw badRequest(`${key} cannot be empty`);
          const limit = type === "description" ? 10000 : 200;
          if (value.length > limit)
            throw badRequest(`${key} cannot exceed ${limit} characters`);
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
