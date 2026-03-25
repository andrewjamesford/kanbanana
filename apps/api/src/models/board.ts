import { Schema, model } from "mongoose";

const boardSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    columnOrder: { type: [String], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const BoardModel = model("Board", boardSchema);

