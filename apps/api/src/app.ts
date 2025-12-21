import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "hono-rate-limiter";
import { randomUUID } from "crypto";

import { dataSourcesApp } from "./routes/data-sources.js";
import { templatesApp } from "./routes/templates.js";
import { rulesApp } from "./routes/rules.js";
import { campaignsApp } from "./routes/campaigns.js";
import { accountsApp } from "./routes/accounts.js";
import { registerOpenAPIEndpoints, openApiConfig } from "./lib/openapi.js";
import { ApiException, ErrorCode } from "./lib/errors.js";

// CORS origins from environment variable
const corsOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((origin) => origin.trim());

// Create the main app
const app = new OpenAPIHono();

// ============================================================================
// Middleware
// ============================================================================

// CORS configuration (origins from environment)
app.use(
  "*",
  cors({
    origin: corsOrigins,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// Rate limiting for API routes
app.use(
  "/api/*",
  rateLimiter({
    windowMs: 60 * 1000, // 1 minute window
    limit: 100, // 100 requests per minute per IP
    keyGenerator: (c) => {
      // Try multiple headers for IP detection
      const ip = c.req.header("x-forwarded-for")
        || c.req.header("x-real-ip")
        || "unknown";
      if (ip === "unknown") {
        console.warn("Rate limiter: No IP header found, using fallback");
      }
      // Handle comma-separated x-forwarded-for
      const firstIp = ip.split(",")[0];
      return firstIp ? firstIp.trim() : "unknown";
    },
    handler: (c) => {
      return c.json({
        error: "Too many requests. Please retry after 1 minute.",
        code: ErrorCode.TOO_MANY_REQUESTS,
        retryAfter: 60,
      }, 429);
    },
  })
);

// Request logging
app.use("*", logger());

// Pretty JSON output (for development)
app.use("*", prettyJSON());

// Security headers
app.use("*", secureHeaders());

// ============================================================================
// Health Check
// ============================================================================

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ============================================================================
// API Routes
// ============================================================================

// Mount all route apps
app.route("/", dataSourcesApp);
app.route("/", templatesApp);
app.route("/", rulesApp);
app.route("/", campaignsApp);
app.route("/", accountsApp);

// ============================================================================
// OpenAPI Documentation
// ============================================================================

// Register OpenAPI endpoints (spec + Swagger UI)
registerOpenAPIEndpoints(app);

// ============================================================================
// Global Error Handler
// ============================================================================

app.onError((err, c) => {
  // Handle our custom API exceptions
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  // Generate error ID for tracking
  const errorId = randomUUID();

  // Log with full context
  console.error("Unhandled error:", {
    errorId,
    method: c.req.method,
    path: c.req.path,
    error: err.message,
    stack: err.stack,
  });

  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
      errorId, // Include for user reference
    },
    500
  );
});

// ============================================================================
// 404 Handler
// ============================================================================

app.notFound((c) => {
  return c.json(
    {
      error: `Route not found: ${c.req.method} ${c.req.path}`,
      code: ErrorCode.NOT_FOUND,
    },
    404
  );
});

export { app };
export default app;
