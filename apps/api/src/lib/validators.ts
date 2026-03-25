import { badRequest, validationError } from "./http-error.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readJsonBody(body: unknown) {
  if (!isRecord(body)) {
    throw badRequest("Request body must be a JSON object");
  }

  return body;
}

export function readRequiredTrimmedString(
  body: Record<string, unknown>,
  fieldName: string,
  message: string,
) {
  const value = body[fieldName];

  if (typeof value !== "string" || !value.trim()) {
    throw validationError(message, [{ field: fieldName, issue: "required" }]);
  }

  return value.trim();
}

export function readOptionalTrimmedString(
  body: Record<string, unknown>,
  fieldName: string,
  message: string,
) {
  const value = body[fieldName];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw validationError(message, [{ field: fieldName, issue: "invalid" }]);
  }

  return value.trim();
}

export function readOptionalNullableTrimmedString(
  body: Record<string, unknown>,
  fieldName: string,
) {
  const value = body[fieldName];

  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    throw validationError(`${fieldName} must be a string or null`, [
      { field: fieldName, issue: "invalid_type" },
    ]);
  }

  return value.trim();
}

export function readRequiredStringArray(
  body: Record<string, unknown>,
  fieldName: string,
  message: string,
) {
  const value = body[fieldName];

  if (!Array.isArray(value)) {
    throw validationError(message, [{ field: fieldName, issue: "required_array" }]);
  }

  if (!value.every((entry) => typeof entry === "string")) {
    throw validationError(`${fieldName} must contain only strings`, [
      { field: fieldName, issue: "invalid_array_entry" },
    ]);
  }

  return value;
}
