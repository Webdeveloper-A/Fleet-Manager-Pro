import app from "./app";
import { logger } from "./lib/logger";
import { scheduleExpiryJob } from "./lib/expiryJob";
import { seedAdminIfMissing } from "./lib/seed";

import { validateBackendEnv } from "./lib/env";

validateBackendEnv();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}



app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  try {
    await seedAdminIfMissing();
  } catch (e) {
    logger.error({ err: e }, "Seed failed");
  }

  scheduleExpiryJob();
});


