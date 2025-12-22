import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";

const port = Number(process.env.PORT) || 3001;

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
} catch (err) {
  console.error(`Failed to start server on port ${port}:`, err);
  process.exit(1);
}
