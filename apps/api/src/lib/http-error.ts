import type { ApiErrorDetail } from "./api-response.js";

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function badRequest(message: string, details?: ApiErrorDetail[]) {
  return new HttpError(400, "bad_request", message, details);
}

export function notFound(message: string) {
  return new HttpError(404, "not_found", message);
}

export function validationError(details: ApiErrorDetail[]) {
  return new HttpError(400, "validation_error", "Request validation failed", details);
}

export function invalidJson() {
  return new HttpError(400, "invalid_json", "Malformed JSON request body");
}
