import { Types } from "mongoose";
import { BoardModel, CardModel, ColumnModel } from "./models/index.js";

const boardId = new Types.ObjectId("000000000000000000000001");
const columns = [
  { _id: new Types.ObjectId("000000000000000000000011"), name: "Todo" },
  { _id: new Types.ObjectId("000000000000000000000012"), name: "Doing" },
  { _id: new Types.ObjectId("000000000000000000000013"), name: "Done" },
];
const tasks = [
  {
    title: "Make this board your own",
    description: "Rename a column, add a task, or give this board a new name.",
    column: 0,
  },
  {
    title: "Break a big idea into small steps",
    description: "One card per task keeps the next step clear.",
    column: 0,
  },
  {
    title: "Try moving a card",
    description:
      "Drag its handle, or open the card and change its column and position.",
    column: 1,
  },
  {
    title: "Find a little headspace",
    description:
      "Everything you change is saved. Come back whenever you're ready.",
    column: 2,
  },
];

// Fixed IDs make repeated seeds harmless, including after editing the sample board.
export async function seedData() {
  const session = await BoardModel.startSession();
  try {
    return await session.withTransaction(async () => {
      if (await BoardModel.exists({ _id: boardId }).session(session))
        return false;
      const cards = tasks.map((task, index) => ({
        _id: new Types.ObjectId((101 + index).toString(16).padStart(24, "0")),
        boardId,
        columnId: columns[task.column]!._id,
        title: task.title,
        description: task.description,
      }));
      await BoardModel.create(
        [
          {
            _id: boardId,
            name: "A fresh bunch of ideas",
            description:
              "Your first board. A place to plan, make progress, and enjoy the small wins.",
            columnOrder: columns.map((column) => column._id),
          },
        ],
        { session },
      );
      await ColumnModel.create(
        columns.map((column) => ({
          ...column,
          boardId,
          cardOrder: cards
            .filter((card) => card.columnId.equals(column._id))
            .map((card) => card._id),
        })),
        { session, ordered: true },
      );
      await CardModel.create(cards, { session, ordered: true });
      return true;
    });
  } finally {
    await session.endSession();
  }
}
