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

/**
 * Check and log status of optional integrations
 */
function logIntegrationStatus(): void {
  // Google OAuth status
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  if (!googleConfigured) {
    console.log(
      "\x1b[33m⚠ Google OAuth not configured - Google Sheets and Google Ads integration disabled\x1b[0m"
    );
    console.log(
      "  Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable. See README for setup instructions."
    );
  } else {
    console.log("✓ Google OAuth configured");
  }

  // Reddit OAuth status
  const redditConfigured = Boolean(
    process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET
  );
  if (!redditConfigured) {
    console.log(
      "\x1b[33m⚠ Reddit OAuth not configured - Reddit Ads integration disabled\x1b[0m"
    );
    console.log(
      "  Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to enable."
    );
  } else {
    console.log("✓ Reddit OAuth configured");
  }

  // Storage status
  const storageConfigured = Boolean(
    process.env.STORAGE_ENDPOINT && process.env.STORAGE_BUCKET
  );
  if (!storageConfigured) {
    console.log(
      "\x1b[33m⚠ S3 storage not configured - using in-memory mock storage\x1b[0m"
    );
  } else {
    console.log("✓ S3 storage configured");
  }
}

console.log(`Starting Dotoro API server...`);

try {
  serve({
    fetch: app.fetch,
    port,
  });

  console.log(`Server running at http://localhost:${port}`);
  console.log(`API docs: http://localhost:${port}/api/v1/docs`);
  console.log(`OpenAPI spec: http://localhost:${port}/api/v1/openapi.json`);
  console.log(""); // Empty line before integration status
  logIntegrationStatus();

  // Initialize job queue after server is running
  initJobQueue();
} catch (err) {
  console.error(`Failed to start server on port ${port}:`, err);
  process.exit(1);
}
