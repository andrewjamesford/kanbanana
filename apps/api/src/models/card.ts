import { InferSchemaType, Schema, Types, model } from "mongoose";

import { softDeleteFields, timestampsOptions } from "./shared.js";

const cardSchema = new Schema(
  {
    boardId: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },
    columnId: {
      type: Schema.Types.ObjectId,
      ref: "Column",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    ...softDeleteFields,
  },
  timestampsOptions,
);

export type Card = InferSchemaType<typeof cardSchema> & {
  _id: Types.ObjectId;
};

export const CardModel = model("Card", cardSchema);

