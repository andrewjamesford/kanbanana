import { test, expect, type Page } from "@playwright/test";

async function saved(page: Page) {
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
}
async function addColumn(page: Page, name: string) {
  await page.getByRole("button", { name: "Add column", exact: true }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill(name);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add column", exact: true })
    .click();
  await saved(page);
}
async function addCard(page: Page, column: string, title: string) {
  await page
    .getByRole("region", { name: `${column} column`, exact: true })
    .getByRole("button", { name: "Add card", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await page
    .getByRole("textbox", { name: "Description optional" })
    .fill("Notes for this task");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add card", exact: true })
    .click();
  await saved(page);
}

test("board, column, and card workflows persist through reloads, drag, keyboard, and form movement", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let boardId: string | undefined;
  const name = `Workflow check ${Date.now()}`;
  try {
    await page.goto("/");
    await expect(page).toHaveURL(/\/boards$/);
    await page.getByRole("button", { name: "New board", exact: true }).click();
    await page.getByRole("textbox", { name: "Name", exact: true }).fill(name);
    await page
      .getByRole("textbox", { name: "Description optional" })
      .fill("A test board for the complete workflow.");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create board", exact: true })
      .click();
    await expect(page).toHaveURL(/\/boards\/[a-f\d]{24}$/);
    boardId = page.url().split("/").pop();
    await expect(page.getByText("Make room for your workflow")).toBeVisible();
    await addColumn(page, "Todo");
    await addColumn(page, "Doing");
    await addColumn(page, "Done");
    await addCard(page, "Todo", "First task");
    await addCard(page, "Todo", "Second task");
    await addCard(page, "Doing", "Existing task");

    const initial = (
      await (await page.request.get(`/api/boards/${boardId}`)).json()
    ).data;
    const firstId = initial.cards.find(
      (card: { title: string }) => card.title === "First task",
    )._id;
    const secondId = initial.cards.find(
      (card: { title: string }) => card.title === "Second task",
    )._id;
    const doingId = initial.columns.find(
      (column: { name: string }) => column.name === "Doing",
    )._id;

    // Reorder via the keyboard-aware drag handle.
    await page
      .getByRole("button", { name: "Drag card First task", exact: true })
      .focus();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Drag card First task", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("status").last()).toContainText(
      "was moved over droppable area",
    );
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("status").last()).toContainText(secondId);
    await page.keyboard.press("ArrowUp");
    await expect(page.getByRole("status").last()).toContainText(firstId);
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("status").last()).toContainText(secondId);
    await page.keyboard.press("Space");
    await saved(page);
    await page.reload();
    const todo = page.getByRole("region", { name: "Todo column", exact: true });
    await expect(todo.getByRole("heading", { level: 3 })).toHaveText([
      "Second task",
      "First task",
    ]);

    // Cross-column pointer drag to an empty column.
    const source = await page
      .getByRole("button", { name: "Drag card First task", exact: true })
      .boundingBox();
    const target = await page
      .getByRole("region", { name: "Done column", exact: true })
      .getByText("Drop a card here or add your first one.")
      .boundingBox();
    if (!source || !target) throw new Error("Drag targets were not rendered");
    await page.mouse.move(
      source.x + source.width / 2,
      source.y + source.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      source.x + source.width / 2 + 10,
      source.y + source.height / 2,
      { steps: 4 },
    );
    await page.mouse.move(
      target.x + target.width / 2,
      target.y + target.height / 2,
      { steps: 30 },
    );
    await page.mouse.up();
    await saved(page);
    await page.reload();
    await expect(
      page
        .getByRole("region", { name: "Done column", exact: true })
        .getByRole("heading", { name: "First task", exact: true }),
    ).toBeVisible();

    // Edit and place a card at a chosen position without dragging.
    await page
      .getByRole("button", { name: "Edit card First task", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Title", exact: true })
      .fill("Renamed task");
    await page
      .getByLabel("Column", { exact: true })
      .selectOption({ label: "Doing" });
    await page.getByLabel("Position", { exact: true }).selectOption("0");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await saved(page);
    await page.reload();
    await expect(
      page
        .getByRole("region", { name: "Doing column", exact: true })
        .getByRole("heading", { level: 3 }),
    ).toHaveText(["Renamed task", "Existing task"]);

    // Column keyboard reordering and the non-drag fallback both persist.
    await page
      .getByRole("button", { name: "Drag column Todo", exact: true })
      .focus();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Drag column Todo", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("status").last()).toContainText(
      "was moved over droppable area",
    );
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("status").last()).toContainText(doingId);
    await page.keyboard.press("Space");
    await saved(page);
    await page.reload();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Doing",
      "Todo",
      "Done",
    ]);
    await page
      .getByRole("button", { name: "Move Done left", exact: true })
      .click();
    await saved(page);
    await page.reload();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Doing",
      "Done",
      "Todo",
    ]);

    await page
      .getByRole("button", { name: "Edit column Done", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Shipped");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await saved(page);
    await expect(
      page.getByRole("heading", { name: "Shipped", exact: true }),
    ).toBeVisible();

    // An interrupted mutation rolls back its optimistic state and reports the error.
    await page.route(`**/api/boards/${boardId}/columns/reorder`, (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Test reorder rejected",
        }),
      }),
    );
    await page
      .getByRole("button", { name: "Move Shipped left", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Test reorder rejected",
    );
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Doing",
      "Shipped",
      "Todo",
    ]);
    await page.unroute(`**/api/boards/${boardId}/columns/reorder`);
    await page.getByRole("button", { name: "Dismiss", exact: true }).click();

    await page.getByRole("button", { name: "Edit board", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .fill(`${name} edited`);
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await saved(page);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `${name} edited`,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveClass("dark");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Edit card Renamed task", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await saved(page);
    await expect(
      page.getByRole("button", { name: "Edit card Renamed task", exact: true }),
    ).toHaveCount(0);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole("button", { name: "Edit column Doing", exact: true })
      .click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await saved(page);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Existing task", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Delete board", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page).toHaveURL(/\/boards$/);
    await expect(
      page.getByRole("heading", { name: `${name} edited`, exact: true }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    if (boardId) await page.request.delete(`/api/boards/${boardId}`);
  }
});

test("load failures, retries, missing boards, and dialog keyboard dismissal", async ({
  page,
}) => {
  await page.route("**/api/boards", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: "Temporarily unavailable",
      }),
    }),
  );
  await page.goto("/boards");
  await expect(page.getByRole("alert")).toContainText(
    "Temporarily unavailable",
  );
  await page.unroute("**/api/boards");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "New board", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "New board", exact: true }),
  ).toBeFocused();
  await page.goto("/boards/ffffffffffffffffffffffff");
  await expect(page.getByRole("alert")).toContainText("Board not found");
});

test("board-list editing and pointer reordering persist; blank workspace has a create action", async ({
  page,
}) => {
  const board = (
    await (
      await page.request.post("/api/boards", {
        data: { name: `Pointer check ${Date.now()}` },
      })
    ).json()
  ).data;
  try {
    const first = (
      await (
        await page.request.post(`/api/boards/${board._id}/columns`, {
          data: { name: "Plan" },
        })
      ).json()
    ).data;
    await page.request.post(`/api/boards/${board._id}/columns`, {
      data: { name: "Finish" },
    });
    await page.request.post(`/api/columns/${first._id}/cards`, {
      data: { title: "Alpha" },
    });
    await page.request.post(`/api/columns/${first._id}/cards`, {
      data: { title: "Beta" },
    });
    await page.goto("/boards");
    await page
      .getByRole("button", { name: `Edit ${board.name}`, exact: true })
      .click();
    const renamed = `${board.name} renamed`;
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .fill(renamed);
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await page.getByRole("heading", { name: renamed, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);

    async function drag(sourceName: string, targetName: string) {
      const source = await page
        .getByRole("button", { name: sourceName, exact: true })
        .boundingBox();
      const target = await page
        .getByRole("button", { name: targetName, exact: true })
        .boundingBox();
      if (!source || !target) throw new Error("Missing drag handles");
      await page.mouse.move(
        source.x + source.width / 2,
        source.y + source.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        source.x + source.width / 2 + 8,
        source.y + source.height / 2,
        { steps: 4 },
      );
      await page.mouse.move(
        target.x + target.width / 2,
        target.y + target.height / 2,
        { steps: 25 },
      );
      await page.mouse.up();
      await saved(page);
    }
    await drag("Drag card Alpha", "Drag card Beta");
    await page.reload();
    await expect(page.getByRole("heading", { level: 3 })).toHaveText([
      "Beta",
      "Alpha",
    ]);
    await drag("Drag column Plan", "Drag column Finish");
    await page.reload();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Finish",
      "Plan",
    ]);
    await page.getByRole("link", { name: "All boards", exact: true }).click();
    await page
      .getByRole("button", { name: `Delete ${renamed}`, exact: true })
      .click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: renamed, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: `Delete ${renamed}`, exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: renamed, exact: true }),
    ).toHaveCount(0);

    await page.route("**/api/boards", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      }),
    );
    await page.reload();
    await expect(
      page.getByText("A fresh start", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Create your first board", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
  } finally {
    await page.request.delete(`/api/boards/${board._id}`);
  }
});

async function mockReviewBoard(page: Page, name: string) {
  const boardId = "111111111111111111111111";
  const todoId = "222222222222222222222222";
  const doneId = "333333333333333333333333";
  const cardId = "444444444444444444444444";
  const writes: string[] = [];
  const detail = {
    board: {
      _id: boardId,
      name,
      description: "",
      columnOrder: [todoId, doneId],
      createdAt: "2026-10-29T00:00:00Z",
      updatedAt: "2026-10-29T00:00:00Z",
    },
    columns: [
      { _id: todoId, boardId, name: "Todo", cardOrder: [cardId] },
      { _id: doneId, boardId, name: "Done", cardOrder: [] },
    ],
    cards: [
      {
        _id: cardId,
        boardId,
        columnId: todoId,
        title: "Stay put",
        description: null,
      },
    ],
  };
  await page.route("**/api/**", (route) => {
    if (route.request().method() !== "GET") writes.push(route.request().url());
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: detail }),
    });
  });
  await page.goto(`/boards/${boardId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  return { writes, cardId };
}

test("pointer release outside the board cancels card and column drags without writing", async ({
  page,
}) => {
  const { writes } = await mockReviewBoard(page, "Drop boundary");
  const destination = await page
    .getByRole("region", { name: "Done column", exact: true })
    .boundingBox();
  if (!destination) throw new Error("Missing destination column");
  for (const name of ["Drag card Stay put", "Drag column Todo"]) {
    const handle = page.getByRole("button", { name, exact: true });
    const source = await handle.boundingBox();
    if (!source) throw new Error("Missing drag handle");
    await page.mouse.move(
      source.x + source.width / 2,
      source.y + source.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      source.x + source.width / 2 + 10,
      source.y + source.height / 2,
      { steps: 4 },
    );
    await expect(handle).toHaveAttribute("aria-pressed", "true");
    // Pass through a valid target, then release above all columns.
    await page.mouse.move(
      destination.x + destination.width / 2,
      destination.y + destination.height / 2,
      { steps: 20 },
    );
    await page.mouse.move(destination.x + destination.width / 2, 120, {
      steps: 20,
    });
    await expect(page.getByRole("status").last()).toContainText(
      "no longer over a droppable area",
    );
    await page.mouse.up();
    await expect(handle).not.toHaveAttribute("aria-pressed", "true");
    await expect(
      page
        .getByRole("region", { name: "Todo column", exact: true })
        .getByRole("heading", { level: 3 }),
    ).toHaveText("Stay put");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Todo",
      "Done",
    ]);
    expect(writes).toEqual([]);
  }
});

test("maximum-length unbroken board names fit mobile viewports", async ({
  page,
}) => {
  const name = "A".repeat(200);
  await page.setViewportSize({ width: 390, height: 844 });
  await mockReviewBoard(page, name);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(heading).not.toBeNull();
    expect(heading!.x + heading!.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("shared Zod rules reject invalid form input before writing and normalize submitted values", async ({
  page,
}) => {
  const { writes } = await mockReviewBoard(page, "Client validation");
  for (const [button, field, submit, message] of [
    ["Edit board", "Name", "Save changes", "Name is required"],
    ["Edit column Todo", "Name", "Save changes", "Name is required"],
    ["Edit card Stay put", "Title", "Save changes", "Title is required"],
  ]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await page.getByRole("textbox", { name: field, exact: true }).fill("   ");
    await page.getByRole("button", { name: submit, exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(message);
    expect(writes).toEqual([]);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Edit card Stay put", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("  Updated title  ");
  await page
    .getByRole("textbox", { name: "Description optional" })
    .fill("  Updated description  ");
  const submitted = page.waitForRequest(
    (request) =>
      request.method() === "PATCH" && request.url().includes("/api/cards/"),
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await submitted).postDataJSON()).toEqual({
    title: "Updated title",
    description: "Updated description",
  });
  await saved(page);
});
