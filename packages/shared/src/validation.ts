import { z } from "zod";

export const MAX_NAME_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 10000;

function requiredText(label: string) {
  // Match the browser's maxlength and the existing API's UTF-16 length limits.
  return z
    .string({ error: `${label} must be a string` })
    .refine(
      (value) => value.length <= MAX_NAME_LENGTH,
      `${label} cannot exceed ${MAX_NAME_LENGTH} characters`,
    )
    .trim()
    .min(1, `${label} is required`);
}

export const entityNameSchema = requiredText("Name");
export const cardTitleSchema = requiredText("Title");
export const descriptionSchema = z
  .string({ error: "Description must be a string or null" })
  .refine(
    (value) => value.length <= MAX_DESCRIPTION_LENGTH,
    `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
  )
  .trim()
  .nullable()
  .optional();
export const objectIdSchema = z
  .string({ error: "ID must be a string" })
  .regex(/^[a-f\d]{24}$/i, "Invalid ID")
  .toLowerCase();
const orderSchema = z
  .array(objectIdSchema)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Order cannot contain duplicate IDs",
  );

export const boardCreateSchema = z.strictObject({
  name: entityNameSchema,
  description: descriptionSchema,
});
export const boardUpdateSchema = boardCreateSchema
  .partial()
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    "Provide at least one field to update",
  );
export const columnCreateSchema = z.strictObject({ name: entityNameSchema });
export const columnUpdateSchema = columnCreateSchema;
export const cardCreateSchema = z.strictObject({
  title: cardTitleSchema,
  description: descriptionSchema,
});
export const cardUpdateSchema = cardCreateSchema
  .partial()
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    "Provide at least one field to update",
  );
export const columnReorderSchema = z.strictObject({ columnOrder: orderSchema });
export const cardReorderSchema = z.strictObject({ cardOrder: orderSchema });
export const cardMoveSchema = z
  .strictObject({
    sourceColumnId: objectIdSchema,
    destinationColumnId: objectIdSchema,
    sourceCardOrder: orderSchema,
    destinationCardOrder: orderSchema,
  })
  .refine(
    (body) => body.sourceColumnId !== body.destinationColumnId,
    "Source and destination columns must differ",
  );

export type BoardCreateInput = z.infer<typeof boardCreateSchema>;
export type BoardUpdateInput = z.infer<typeof boardUpdateSchema>;
export type ColumnCreateInput = z.infer<typeof columnCreateSchema>;
export type CardCreateInput = z.infer<typeof cardCreateSchema>;
export type CardUpdateInput = z.infer<typeof cardUpdateSchema>;
export type CardMoveInput = z.infer<typeof cardMoveSchema>;

export function validationMessage(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}) {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  return issue.path.length
    ? `${issue.path.map(String).join(".")}: ${issue.message}`
    : issue.message;
}
