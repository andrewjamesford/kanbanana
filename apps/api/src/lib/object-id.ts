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

export function parseObjectId(value: string, fieldName: string) {
  if (!Types.ObjectId.isValid(value)) {
    throw badRequest(`Invalid ${fieldName}`);
  }

  return new Types.ObjectId(value);
}

export function objectIdEquals(left: Types.ObjectId, right: Types.ObjectId) {
  return left.toString() === right.toString();
}
