import mongoose from "mongoose";
import type { ClientSession } from "mongoose";

// Runs `work` in a transaction so multi-document changes apply together or not
// at all. Throwing aborts the transaction. MongoDB may retry the callback after
// a transient error, so read current state inside it and run writes one at a
// time rather than in parallel.
export async function inTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(work);
  } finally {
    await session.endSession();
  }
}
