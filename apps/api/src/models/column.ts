import { InferSchemaType, Schema, Types, model } from "mongoose";

import { objectIdArrayField, softDeleteFields, timestampsOptions } from "./shared.js";

const columnSchema = new Schema(
  {
    boardId: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    cardOrder: { type: objectIdArrayField("Card"), default: [] },
    ...softDeleteFields,
  },
  timestampsOptions,
);

export type Column = InferSchemaType<typeof columnSchema> & {
  _id: Types.ObjectId;
};

export const ColumnModel = model("Column", columnSchema);

