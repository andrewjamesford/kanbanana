import assert from "node:assert/strict";
import { test } from "node:test";
import {
  boardCreateSchema,
  boardUpdateSchema,
  columnCreateSchema,
  columnUpdateSchema,
  cardCreateSchema,
  cardUpdateSchema,
  columnReorderSchema,
  cardReorderSchema,
  cardMoveSchema,
  validationMessage,
} from "./validation.js";

const a = "abcdefabcdefabcdefabcdef";
const b = "123456123456123456123456";

test("entity schemas normalize text and preserve optional and nullable descriptions", () => {
  assert.deepEqual(boardCreateSchema.parse({ name: "  Board  " }), {
    name: "Board",
  });
  assert.deepEqual(
    cardCreateSchema.parse({ title: " Task ", description: " Notes " }),
    { title: "Task", description: "Notes" },
  );
  assert.deepEqual(boardUpdateSchema.parse({ description: null }), {
    description: null,
  });
  assert.deepEqual(cardUpdateSchema.parse({ description: "" }), {
    description: "",
  });
  assert.equal(
    boardCreateSchema.safeParse({ name: "A".repeat(200) }).success,
    true,
  );
  assert.equal(
    cardCreateSchema.safeParse({ title: "A", description: "B".repeat(10000) })
      .success,
    true,
  );
});

test("create and update schemas reject missing fields, invalid types, and unknown properties", () => {
  for (const schema of [
    boardCreateSchema,
    columnCreateSchema,
    columnUpdateSchema,
    cardCreateSchema,
    boardUpdateSchema,
    cardUpdateSchema,
  ]) {
    for (const body of [
      null,
      [],
      {},
      { name: 1 },
      { title: [] },
      { deletedAt: null },
      JSON.parse('{"__proto__":"unexpected"}'),
    ]) {
      assert.equal(schema.safeParse(body).success, false, JSON.stringify(body));
    }
  }
  assert.equal(
    boardCreateSchema.safeParse({ name: "Valid", extra: true }).success,
    false,
  );
  assert.equal(cardUpdateSchema.safeParse({ title: undefined }).success, false);
});

test("text limits use the same raw UTF-16 length as the browser before trimming", () => {
  for (const name of [
    "   ",
    "x".repeat(201),
    " ".repeat(200) + "x",
    "😀".repeat(101),
  ]) {
    assert.equal(boardCreateSchema.safeParse({ name }).success, false);
  }
  assert.equal(
    boardCreateSchema.safeParse({ name: "A", description: "x".repeat(10001) })
      .success,
    false,
  );
  assert.equal(
    boardCreateSchema.safeParse({ name: "A", description: 42 }).success,
    false,
  );
});

test("order schemas normalize IDs and reject duplicate IDs, including mixed case", () => {
  assert.deepEqual(
    columnReorderSchema.parse({ columnOrder: [a.toUpperCase(), b] }),
    { columnOrder: [a, b] },
  );
  assert.deepEqual(cardReorderSchema.parse({ cardOrder: [] }), {
    cardOrder: [],
  });
  for (const order of [
    [a, a],
    [a, a.toUpperCase()],
    ["not-an-id"],
    [42],
    null,
  ]) {
    assert.equal(
      columnReorderSchema.safeParse({ columnOrder: order }).success,
      false,
    );
    assert.equal(
      cardReorderSchema.safeParse({ cardOrder: order }).success,
      false,
    );
  }
});

test("card moves require complete orders and distinct columns", () => {
  const valid = {
    sourceColumnId: a,
    destinationColumnId: b,
    sourceCardOrder: [],
    destinationCardOrder: [a],
  };
  assert.equal(cardMoveSchema.safeParse(valid).success, true);
  assert.equal(
    cardMoveSchema.safeParse({ ...valid, destinationColumnId: a.toUpperCase() })
      .success,
    false,
  );
  assert.equal(
    cardMoveSchema.safeParse({ ...valid, sourceCardOrder: undefined }).success,
    false,
  );
  assert.equal(
    cardMoveSchema.safeParse({ ...valid, destinationCardOrder: [a, a] })
      .success,
    false,
  );
});

test("validation messages identify the failing field without dumping input", () => {
  const result = boardCreateSchema.safeParse({ name: " " });
  assert.equal(result.success, false);
  if (!result.success)
    assert.equal(validationMessage(result.error), "name: Name is required");
});
