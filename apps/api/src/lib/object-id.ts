import { objectIdSchema } from "@kanbanana/shared";
import type { Request } from "express";
import { Types } from "mongoose";

import { badRequest } from "./http-error.js";

export function readParam(
  value: string | string[] | undefined,
  fieldName: string,
) {
  const resolved = Array.isArray(value) ? value[0] : value;

  if (!resolved) {
    throw badRequest(`${fieldName} is required`);
  }

  return resolved;
}

export function parseObjectId(value: unknown, fieldName: string) {
  const parsed = objectIdSchema.safeParse(value);
  if (!parsed.success) {
    throw badRequest(`Invalid ${fieldName}`);
  }

  return new Types.ObjectId(parsed.data);
}

export function objectIdEquals(left: Types.ObjectId, right: Types.ObjectId) {
  return left.toString() === right.toString();
}

// Reads a route parameter and parses it as an ObjectId in one step.
export function idParam(request: Request, fieldName: string) {
  return parseObjectId(
    readParam(request.params[fieldName], fieldName),
    fieldName,
  );
}

// Order arrays are validated by the shared Zod schemas before a handler runs,
// so every entry is already a well-formed ID.
export function toObjectIds(ids: string[]) {
  return ids.map((id) => new Types.ObjectId(id));
}

// A submitted order must contain exactly the expected IDs, in any sequence.
export function sameIds(
  expected: Iterable<{ toString(): string }>,
  provided: string[],
) {
  const expectedIds = [...expected].map(String).sort();
  const providedIds = [...provided].sort();
  return (
    expectedIds.length === providedIds.length &&
    expectedIds.every((id, index) => id === providedIds[index])
  );
}
