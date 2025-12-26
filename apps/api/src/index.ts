import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";
import { getJobQueue, stopJobQueue } from "./jobs/queue.js";
import { registerSyncCampaignSetHandler } from "./jobs/handlers/sync-campaign-set.js";

const port = Number(process.env.PORT) || 3001;

/**
 * Initialize the job queue and register all job handlers.
 * Called at application startup.
 */
async function initJobQueue(): Promise<void> {
  try {
    const boss = await getJobQueue();
    await registerSyncCampaignSetHandler(boss);
    console.log("Job queue initialized and handlers registered");
  } catch (error) {
    // Log error but don't crash the server - jobs can be processed later
    console.error("Failed to initialize job queue:", error);
  }
}

/**
 * Graceful shutdown handler.
 * Stops the job queue and exits cleanly.
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, gracefully shutting down...`);
  try {
    await stopJobQueue();
    console.log("Job queue stopped");
  } catch (error) {
    console.error("Error stopping job queue:", error);
  }
  process.exit(0);
}

// Register graceful shutdown handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

console.log(`Starting Dotoro API server...`);

try {
  serve({
    fetch: app.fetch,
    port,
  });

  console.log(`Server running at http://localhost:${port}`);
  console.log(`API docs: http://localhost:${port}/api/v1/docs`);
  console.log(`OpenAPI spec: http://localhost:${port}/api/v1/openapi.json`);

  // Initialize job queue after server is running
  initJobQueue();
} catch (err) {
  console.error(`Failed to start server on port ${port}:`, err);
  process.exit(1);
}
