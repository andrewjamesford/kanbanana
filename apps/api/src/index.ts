import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectToDatabase } from "./config/mongoose.js";

async function start() {
  await connectToDatabase();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`api listening on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error("api startup failed", error);
  process.exit(1);
});

