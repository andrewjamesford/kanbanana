import test from "node:test";
import assert from "node:assert/strict";

import { Types } from "mongoose";

import { BoardModel } from "./board.js";
import { CardModel } from "./card.js";
import { ColumnModel } from "./column.js";

test("BoardModel trims names and defaults optional fields for soft delete support", () => {
  const board = new BoardModel({
    name: "  Product Roadmap  ",
  });

  const validationError = board.validateSync();

  assert.equal(validationError, undefined);
  assert.equal(board.name, "Product Roadmap");
  assert.equal(board.description, null);
  assert.deepEqual(board.columnOrder, []);
  assert.equal(board.deletedAt, null);
  assert.equal(board.schema.path("columnOrder").instance, "Array");
});

test("ColumnModel requires a board relation and keeps card ordering metadata", () => {
  const boardId = new Types.ObjectId();
  const cardId = new Types.ObjectId();
  const column = new ColumnModel({
    boardId,
    name: "  Doing  ",
    cardOrder: [cardId],
  });

  const validationError = column.validateSync();

  assert.equal(validationError, undefined);
  assert.equal(column.name, "Doing");
  assert.equal(column.boardId.toString(), boardId.toString());
  assert.equal(column.cardOrder[0]?.toString(), cardId.toString());
  assert.equal(column.deletedAt, null);
});

test("CardModel requires board and column relations and defaults description", () => {
  const card = new CardModel({
    boardId: new Types.ObjectId(),
    columnId: new Types.ObjectId(),
    title: "  Write tests  ",
  });

  const validationError = card.validateSync();

  assert.equal(validationError, undefined);
  assert.equal(card.title, "Write tests");
  assert.equal(card.description, null);
  assert.equal(card.deletedAt, null);
});

test("CardModel rejects missing relation fields", () => {
  const card = new CardModel({
    title: "Broken card",
  });

  const validationError = card.validateSync();

  assert.ok(validationError);
  assert.ok(validationError.errors.boardId);
  assert.ok(validationError.errors.columnId);
});

test("schemas include timestamps for persisted records", () => {
  assert.equal(BoardModel.schema.get("timestamps"), true);
  assert.equal(ColumnModel.schema.get("timestamps"), true);
  assert.equal(CardModel.schema.get("timestamps"), true);
});
