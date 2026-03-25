import { InferSchemaType, Schema, Types, model } from "mongoose";

import { objectIdArrayField, softDeleteFields, timestampsOptions } from "./shared.js";

const boardSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    columnOrder: { type: objectIdArrayField("Column"), default: [] },
    ...softDeleteFields,
  },
  timestampsOptions,
);

export type Board = InferSchemaType<typeof boardSchema> & {
  _id: Types.ObjectId;
};

export const BoardModel = model("Board", boardSchema);

