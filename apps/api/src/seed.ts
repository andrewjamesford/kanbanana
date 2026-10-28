import mongoose from "mongoose";
import { connectToDatabase } from "./config/mongoose.js";
import { seedData } from "./seed-data.js";

try {
  await connectToDatabase();
  console.log(
    (await seedData())
      ? "Sample board created."
      : "Sample board already exists. No data changed.",
  );
} catch (error) {
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
