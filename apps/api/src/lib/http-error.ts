import type { ApiErrorDetails } from "./api-response.js";

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: ApiErrorDetails[],
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function badRequest(message: string) {
  return new HttpError(400, "BAD_REQUEST", message);
}

export function validationError(message: string, details?: ApiErrorDetails[]) {
  return new HttpError(400, "VALIDATION_ERROR", message, details);
}

export function notFound(message: string) {
  return new HttpError(404, "NOT_FOUND", message);
}
