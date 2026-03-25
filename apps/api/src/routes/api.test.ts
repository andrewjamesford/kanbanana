import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { createApp } from "../app.js";
import { BoardModel, CardModel, ColumnModel } from "../models/index.js";

let mongoServer: MongoMemoryReplSet;

before(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "kanbanana-api-tests",
  });
});

afterEach(async () => {
  await Promise.all([
    BoardModel.deleteMany({}),
    ColumnModel.deleteMany({}),
    CardModel.deleteMany({}),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test("board CRUD endpoints create, update, list, hydrate, and soft delete boards", async () => {
  const app = createApp();

  const createResponse = await request(app).post("/api/boards").send({
    name: "Product Launch",
    description: "Q3 launch board",
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.data.name, "Product Launch");
  assert.equal(createResponse.body.data.description, "Q3 launch board");

  const boardId = createResponse.body.data._id as string;

  const patchResponse = await request(app).patch(`/api/boards/${boardId}`).send({
    name: "Updated Product Launch",
    description: "Revised board",
  });

  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.body.data.name, "Updated Product Launch");

  const listResponse = await request(app).get("/api/boards");

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.data.length, 1);
  assert.equal(listResponse.body.data[0].name, "Updated Product Launch");

  const detailResponse = await request(app).get(`/api/boards/${boardId}`);

  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.body.data.board._id, boardId);
  assert.deepEqual(detailResponse.body.data.columns, []);
  assert.deepEqual(detailResponse.body.data.cards, []);

  const deleteResponse = await request(app).delete(`/api/boards/${boardId}`);

  assert.equal(deleteResponse.status, 200);

  const deletedBoard = await BoardModel.findById(boardId);
  assert.ok(deletedBoard?.deletedAt);

  const postDeleteList = await request(app).get("/api/boards");
  assert.equal(postDeleteList.body.data.length, 0);

  const missingDetail = await request(app).get(`/api/boards/${boardId}`);
  assert.equal(missingDetail.status, 404);
});

test("column and card endpoints support hydrated board detail, reorder, move, and soft deletes", async () => {
  const app = createApp();

  const boardResponse = await request(app).post("/api/boards").send({
    name: "Delivery Board",
  });
  const boardId = boardResponse.body.data._id as string;

  const todoResponse = await request(app)
    .post(`/api/boards/${boardId}/columns`)
    .send({ name: "Todo" });
  const doingResponse = await request(app)
    .post(`/api/boards/${boardId}/columns`)
    .send({ name: "Doing" });

  const todoId = todoResponse.body.data._id as string;
  const doingId = doingResponse.body.data._id as string;

  const reorderColumnsResponse = await request(app)
    .post(`/api/boards/${boardId}/columns/reorder`)
    .send({ columnOrder: [doingId, todoId] });

  assert.equal(reorderColumnsResponse.status, 200);
  assert.deepEqual(reorderColumnsResponse.body.data.columnOrder, [doingId, todoId]);

  const cardOneResponse = await request(app)
    .post(`/api/columns/${todoId}/cards`)
    .send({ title: "Write docs" });
  const cardTwoResponse = await request(app)
    .post(`/api/columns/${todoId}/cards`)
    .send({ title: "Ship feature", description: "Production rollout" });

  const cardOneId = cardOneResponse.body.data._id as string;
  const cardTwoId = cardTwoResponse.body.data._id as string;

  const reorderCardsResponse = await request(app)
    .post(`/api/columns/${todoId}/cards/reorder`)
    .send({ cardOrder: [cardTwoId, cardOneId] });

  assert.equal(reorderCardsResponse.status, 200);
  assert.deepEqual(reorderCardsResponse.body.data.cardOrder, [cardTwoId, cardOneId]);

  const moveResponse = await request(app)
    .post(`/api/cards/${cardTwoId}/move`)
    .send({
      sourceColumnId: todoId,
      destinationColumnId: doingId,
      sourceCardOrder: [cardOneId],
      destinationCardOrder: [cardTwoId],
    });

  assert.equal(moveResponse.status, 200);
  assert.equal(moveResponse.body.data.updatedCard.columnId, doingId);

  const updateCardResponse = await request(app)
    .patch(`/api/cards/${cardOneId}`)
    .send({ title: "Write test plan", description: "API coverage" });

  assert.equal(updateCardResponse.status, 200);
  assert.equal(updateCardResponse.body.data.title, "Write test plan");

  const detailResponse = await request(app).get(`/api/boards/${boardId}`);

  assert.equal(detailResponse.status, 200);
  assert.deepEqual(
    detailResponse.body.data.columns.map((column: { _id: string }) => column._id),
    [doingId, todoId],
  );
  assert.deepEqual(
    detailResponse.body.data.cards.map((card: { _id: string }) => card._id),
    [cardTwoId, cardOneId],
  );

  const deleteCardResponse = await request(app).delete(`/api/cards/${cardOneId}`);
  assert.equal(deleteCardResponse.status, 200);

  const afterCardDelete = await request(app).get(`/api/boards/${boardId}`);
  assert.deepEqual(
    afterCardDelete.body.data.cards.map((card: { _id: string }) => card._id),
    [cardTwoId],
  );

  const deleteColumnResponse = await request(app).delete(`/api/columns/${doingId}`);
  assert.equal(deleteColumnResponse.status, 200);

  const afterColumnDelete = await request(app).get(`/api/boards/${boardId}`);
  assert.deepEqual(
    afterColumnDelete.body.data.columns.map((column: { _id: string }) => column._id),
    [todoId],
  );
  assert.deepEqual(afterColumnDelete.body.data.cards, []);
});

test("invalid reorder payloads are rejected", async () => {
  const app = createApp();

  const boardResponse = await request(app).post("/api/boards").send({
    name: "Validation Board",
  });
  const boardId = boardResponse.body.data._id as string;

  const firstColumn = await request(app)
    .post(`/api/boards/${boardId}/columns`)
    .send({ name: "Todo" });
  const secondColumn = await request(app)
    .post(`/api/boards/${boardId}/columns`)
    .send({ name: "Done" });

  const invalidReorder = await request(app)
    .post(`/api/boards/${boardId}/columns/reorder`)
    .send({ columnOrder: [firstColumn.body.data._id] });

  assert.equal(invalidReorder.status, 400);

  const cardResponse = await request(app)
    .post(`/api/columns/${firstColumn.body.data._id}/cards`)
    .send({ title: "Card one" });

  const invalidMove = await request(app)
    .post(`/api/cards/${cardResponse.body.data._id}/move`)
    .send({
      sourceColumnId: firstColumn.body.data._id,
      destinationColumnId: secondColumn.body.data._id,
      sourceCardOrder: [],
      destinationCardOrder: [],
    });

  assert.equal(invalidMove.status, 400);
});

test("invalid JSON bodies return a 400 response instead of a 500", async () => {
  const app = createApp();

  const response = await request(app)
    .post("/api/boards")
    .set("Content-Type", "application/json")
    .send("{ invalid json");

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});
