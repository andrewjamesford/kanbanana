import { Schema } from "mongoose";

export const timestampsOptions = {
  timestamps: true,
} as const;

export const softDeleteFields = {
  deletedAt: { type: Date, default: null },
} as const;

export function objectIdArrayField(ref: string) {
  return [
    {
      type: Schema.Types.ObjectId,
      ref,
    },
  ];
}

