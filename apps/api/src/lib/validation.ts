import { z, type ZodTypeAny } from "zod";

import type { ApiErrorDetail } from "./api-response.js";
import { validationError } from "./http-error.js";

function formatPath(path: (string | number)[]) {
  return path.length === 0 ? "body" : path.join(".");
}

export function parseBody<TSchema extends ZodTypeAny>(
  schema: TSchema,
  body: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(body);

  if (!result.success) {
    const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
      path: formatPath(issue.path),
      message: issue.message,
    }));

    throw validationError(details);
  }

  return result.data;
}

