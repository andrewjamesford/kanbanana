import assert from "node:assert/strict";
import { after, afterEach, before, mock, test } from "node:test";

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { seedData } from "../seed-data.js";
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
  await mongoServer?.stop();
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

  const patchResponse = await request(app)
    .patch(`/api/boards/${boardId}`)
    .send({
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
  assert.deepEqual(reorderColumnsResponse.body.data.columnOrder, [
    doingId,
    todoId,
  ]);

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
  assert.deepEqual(reorderCardsResponse.body.data.cardOrder, [
    cardTwoId,
    cardOneId,
  ]);

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
    detailResponse.body.data.columns.map(
      (column: { _id: string }) => column._id,
    ),
    [doingId, todoId],
  );
  assert.deepEqual(
    detailResponse.body.data.cards.map((card: { _id: string }) => card._id),
    [cardTwoId, cardOneId],
  );

  const deleteCardResponse = await request(app).delete(
    `/api/cards/${cardOneId}`,
  );
  assert.equal(deleteCardResponse.status, 200);

  const afterCardDelete = await request(app).get(`/api/boards/${boardId}`);
  assert.deepEqual(
    afterCardDelete.body.data.cards.map((card: { _id: string }) => card._id),
    [cardTwoId],
  );

  const deleteColumnResponse = await request(app).delete(
    `/api/columns/${doingId}`,
  );
  assert.equal(deleteColumnResponse.status, 200);

  const afterColumnDelete = await request(app).get(`/api/boards/${boardId}`);
  assert.deepEqual(
    afterColumnDelete.body.data.columns.map(
      (column: { _id: string }) => column._id,
    ),
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

test("malformed fields and IDs return consistent client errors without creating records", async () => {
  const app = createApp();
  for (const body of [
    { name: 42 },
    { name: [] },
    { name: {} },
    { name: null },
    { name: "   " },
    { name: "a".repeat(201) },
    { name: "Board", description: 1 },
    { name: "Board", deletedAt: null },
    {},
  ]) {
    const response = await request(app).post("/api/boards").send(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(response.body.success, false);
    assert.equal(typeof response.body.error, "string");
  }
  assert.equal(await BoardModel.countDocuments(), 0);
  assert.equal((await request(app).get("/api/boards/not-an-id")).status, 400);
  assert.equal(
    (await request(app).get("/api/no-such-route")).body.error,
    "Endpoint not found",
  );
});

test("duplicate, foreign, and incomplete orders never change saved ordering", async () => {
  const app = createApp();
  const board = (await request(app).post("/api/boards").send({ name: "One" }))
    .body.data;
  const second = (await request(app).post("/api/boards").send({ name: "Two" }))
    .body.data;
  const a = (
    await request(app)
      .post(`/api/boards/${board._id}/columns`)
      .send({ name: "A" })
  ).body.data;
  const b = (
    await request(app)
      .post(`/api/boards/${board._id}/columns`)
      .send({ name: "B" })
  ).body.data;
  const foreign = (
    await request(app)
      .post(`/api/boards/${second._id}/columns`)
      .send({ name: "Other" })
  ).body.data;
  const card = (
    await request(app)
      .post(`/api/columns/${a._id}/cards`)
      .send({ title: "Stay here" })
  ).body.data;
  for (const columnOrder of [
    [a._id, a._id],
    [a._id, foreign._id],
    [a._id],
    [42],
    null,
  ]) {
    assert.equal(
      (
        await request(app)
          .post(`/api/boards/${board._id}/columns/reorder`)
          .send({ columnOrder })
      ).status,
      400,
    );
  }
  const before = (await request(app).get(`/api/boards/${board._id}`)).body.data;
  for (const payload of [
    {
      sourceColumnId: a._id,
      destinationColumnId: b._id,
      sourceCardOrder: [],
      destinationCardOrder: [],
    },
    {
      sourceColumnId: a._id,
      destinationColumnId: foreign._id,
      sourceCardOrder: [],
      destinationCardOrder: [card._id],
    },
    {
      sourceColumnId: b._id,
      destinationColumnId: a._id,
      sourceCardOrder: [],
      destinationCardOrder: [card._id],
    },
    {
      sourceColumnId: a._id,
      destinationColumnId: a._id,
      sourceCardOrder: [],
      destinationCardOrder: [card._id],
    },
  ]) {
    assert.equal(
      (await request(app).post(`/api/cards/${card._id}/move`).send(payload))
        .status,
      400,
    );
    assert.deepEqual(
      (await request(app).get(`/api/boards/${board._id}`)).body.data,
      before,
    );
  }
});

test("seed is repeatable, preserves edits, and board deletion cascades soft deletes", async () => {
  const app = createApp();
  assert.equal(await seedData(), true);
  const board = await BoardModel.findOne();
  assert.ok(board);
  const column = await ColumnModel.findOne({ boardId: board._id });
  const card = await CardModel.findOne({ boardId: board._id });
  assert.ok(column && card);
  assert.equal(
    (await request(app).get(`/api/cards/${card._id}`)).body.data.title,
    card.title,
  );
  await request(app)
    .patch(`/api/boards/${board._id}`)
    .send({ name: "My edited sample" });
  assert.equal(await seedData(), false);
  assert.equal(await BoardModel.countDocuments(), 1);
  assert.equal(
    (await BoardModel.findById(board._id))?.name,
    "My edited sample",
  );
  await request(app).delete(`/api/boards/${board._id}`);
  assert.equal(
    await CardModel.countDocuments({ boardId: board._id, deletedAt: null }),
    0,
  );
  assert.equal(
    await ColumnModel.countDocuments({ boardId: board._id, deletedAt: null }),
    0,
  );
  assert.equal((await request(app).get(`/api/cards/${card._id}`)).status, 404);
  assert.equal(
    (
      await request(app)
        .post(`/api/columns/${column._id}/cards`)
        .send({ title: "Hidden" })
    ).status,
    404,
  );
  assert.equal(await seedData(), false);
});

test("Zod rejects invalid mutations for every body contract without changing board data", async () => {
  const app = createApp();
  const board = (
    await request(app).post("/api/boards").send({ name: "Validation" })
  ).body.data;
  const column = (
    await request(app)
      .post(`/api/boards/${board._id}/columns`)
      .send({ name: "Todo" })
  ).body.data;
  const card = (
    await request(app)
      .post(`/api/columns/${column._id}/cards`)
      .send({ title: "Task" })
  ).body.data;
  const before = (await request(app).get(`/api/boards/${board._id}`)).body.data;
  const cases = [
    ["post", "/api/boards", { description: "Missing name" }],
    ["patch", `/api/boards/${board._id}`, {}],
    ["patch", `/api/boards/${board._id}`, { description: [] }],
    ["post", `/api/boards/${board._id}/columns`, { name: null }],
    ["patch", `/api/columns/${column._id}`, { name: " " }],
    [
      "post",
      `/api/columns/${column._id}/cards`,
      { description: "Missing title" },
    ],
    ["patch", `/api/cards/${card._id}`, { title: "x".repeat(201) }],
    ["patch", `/api/cards/${card._id}`, { columnId: column._id }],
    [
      "post",
      `/api/boards/${board._id}/columns/reorder`,
      { columnOrder: [column._id, column._id.toUpperCase()] },
    ],
    ["post", `/api/columns/${column._id}/cards/reorder`, { cardOrder: [42] }],
    [
      "post",
      `/api/cards/${card._id}/move`,
      {
        sourceColumnId: column._id,
        destinationColumnId: column._id,
        sourceCardOrder: [],
        destinationCardOrder: [card._id],
      },
    ],
  ] as const;
  for (const [method, path, payload] of cases) {
    const response = await request(app)[method](path).send(payload);
    assert.equal(response.status, 400, path);
    assert.equal(response.body.success, false);
    assert.equal(typeof response.body.error, "string");
  }
  assert.deepEqual(
    (await request(app).get(`/api/boards/${board._id}`)).body.data,
    before,
  );
});

type Created = { _id: string };

// A board with two columns; "Todo" holds cards "One" and "Two".
async function createWorkspace(app: ReturnType<typeof createApp>) {
  const post = async (path: string, body: object) =>
    (await request(app).post(path).send(body)).body.data as Created;
  const board = await post("/api/boards", { name: "Atomic" });
  const todo = await post(`/api/boards/${board._id}/columns`, { name: "Todo" });
  const done = await post(`/api/boards/${board._id}/columns`, { name: "Done" });
  const one = await post(`/api/columns/${todo._id}/cards`, { title: "One" });
  const two = await post(`/api/columns/${todo._id}/cards`, { title: "Two" });
  return { board, todo, done, one, two };
}

async function boardDetail(app: ReturnType<typeof createApp>, id: string) {
  return (await request(app).get(`/api/boards/${id}`)).body.data;
}

test("card update saves text and a cross-column move in one request", async () => {
  const app = createApp();
  const { board, todo, done, one, two } = await createWorkspace(app);

  const response = await request(app)
    .patch(`/api/cards/${one._id}`)
    .send({
      title: "Renamed",
      description: "Moved too",
      placement: {
        sourceColumnId: todo._id,
        destinationColumnId: done._id,
        sourceCardOrder: [two._id],
        destinationCardOrder: [one._id],
      },
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.title, "Renamed");
  assert.equal(response.body.data.columnId, done._id);
  const detail = await boardDetail(app, board._id);
  assert.deepEqual(
    detail.columns.map((column: { cardOrder: string[] }) => column.cardOrder),
    [[two._id], [one._id]],
  );
});

test("card update can reorder a card within its own column", async () => {
  const app = createApp();
  const { board, todo, one, two } = await createWorkspace(app);

  const response = await request(app)
    .patch(`/api/cards/${one._id}`)
    .send({
      placement: {
        sourceColumnId: todo._id,
        destinationColumnId: todo._id,
        sourceCardOrder: [two._id],
        destinationCardOrder: [two._id, one._id],
      },
    });

  assert.equal(response.status, 200);
  const detail = await boardDetail(app, board._id);
  assert.deepEqual(detail.columns[0].cardOrder, [two._id, one._id]);
});

test("a rejected placement leaves the card's text unchanged", async () => {
  const app = createApp();
  const { board, todo, done, one, two } = await createWorkspace(app);
  const before = await boardDetail(app, board._id);

  const badPlacements = [
    // Destination order omits the moved card.
    { sourceCardOrder: [two._id], destinationCardOrder: [] },
    // Source order still lists the moved card.
    { sourceCardOrder: [one._id, two._id], destinationCardOrder: [one._id] },
  ];
  for (const orders of badPlacements) {
    const response = await request(app)
      .patch(`/api/cards/${one._id}`)
      .send({
        title: "Should not persist",
        placement: {
          sourceColumnId: todo._id,
          destinationColumnId: done._id,
          ...orders,
        },
      });
    assert.equal(response.status, 400);
  }

  assert.deepEqual(await boardDetail(app, board._id), before);
});

test("failed deletes roll back every related write", async (t) => {
  const app = createApp();
  // The API logs the simulated 500s; keep test output readable.
  const quiet = mock.method(console, "error", () => {});
  t.after(() => quiet.mock.restore());
  const { board, todo, one } = await createWorkspace(app);
  const before = await boardDetail(app, board._id);
  const failure = new Error("simulated write failure");

  // Each delete does its last write through a different model.
  const cases = [
    { model: ColumnModel, method: "updateOne", path: `/api/cards/${one._id}` },
    {
      model: CardModel,
      method: "updateMany",
      path: `/api/columns/${todo._id}`,
    },
    {
      model: CardModel,
      method: "updateMany",
      path: `/api/boards/${board._id}`,
    },
  ] as const;
  for (const { model, method, path } of cases) {
    const stub = mock.method(model, method, async () => {
      throw failure;
    });
    try {
      const response = await request(app).delete(path);
      assert.equal(response.status, 500, path);
    } finally {
      stub.mock.restore();
    }
    assert.deepEqual(await boardDetail(app, board._id), before, path);
    assert.equal(
      await CardModel.countDocuments({ deletedAt: { $ne: null } }),
      0,
    );
    assert.equal(
      await ColumnModel.countDocuments({ deletedAt: { $ne: null } }),
      0,
    );
  }
});

test("failed creates and reorders do not leave partial writes", async (t) => {
  const app = createApp();
  // The API logs the simulated 500s; keep test output readable.
  const quiet = mock.method(console, "error", () => {});
  t.after(() => quiet.mock.restore());
  const { board, todo, done, one, two } = await createWorkspace(app);
  const before = await boardDetail(app, board._id);

  // Creating a card or column saves the new record first, then its parent.
  const parentSaves = [
    {
      model: ColumnModel,
      call: () =>
        request(app)
          .post(`/api/columns/${todo._id}/cards`)
          .send({ title: "New" }),
    },
    {
      model: BoardModel,
      call: () =>
        request(app)
          .post(`/api/boards/${board._id}/columns`)
          .send({ name: "New" }),
    },
    {
      model: ColumnModel,
      call: () =>
        request(app)
          .post(`/api/columns/${todo._id}/cards/reorder`)
          .send({ cardOrder: [two._id, one._id] }),
    },
    {
      model: BoardModel,
      call: () =>
        request(app)
          .post(`/api/boards/${board._id}/columns/reorder`)
          .send({ columnOrder: [done._id, todo._id] }),
    },
  ];
  for (const { model, call } of parentSaves) {
    const stub = mock.method(model.prototype, "save", async () => {
      throw new Error("simulated write failure");
    });
    try {
      assert.equal((await call()).status, 500);
    } finally {
      stub.mock.restore();
    }
  }

  assert.deepEqual(await boardDetail(app, board._id), before);
  assert.equal(await CardModel.countDocuments(), 2);
  assert.equal(await ColumnModel.countDocuments(), 2);
});
