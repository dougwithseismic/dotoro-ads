import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// Lazy initialization state
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

/**
 * Get the database connection with lazy initialization.
 * The connection is only created on first use.
 */
export function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;

    // In test mode, allow fallback to local database
    if (!connectionString) {
      if (process.env.NODE_ENV === "test") {
        _client = postgres("postgres://localhost:5432/dotoro_test");
      } else {
        // In non-test environments, DATABASE_URL is required
        throw new Error(
          "DATABASE_URL environment variable is not set. " +
            "Please set DATABASE_URL to your PostgreSQL connection string."
        );
      }
    } else {
      _client = postgres(connectionString);
    }

    _db = drizzle(_client, { schema });
  }
  return _db;
}

/**
 * Close the database connection.
 * Useful for cleanup in tests or graceful shutdown.
 */
export async function closeDb(): Promise<void> {
  if (_client) {
    const clientToClose = _client;
    // Reset state first to ensure consistent state regardless of close outcome
    _client = null;
    _db = null;

    try {
      await clientToClose.end();
    } catch (error) {
      // Log but don't throw - we're shutting down anyway
      console.error(
        `Error closing database connection: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Backward-compatible db export using a Proxy.
 * This allows existing code that uses `db` directly to continue working,
 * while the actual connection is lazily initialized on first use.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle<typeof schema>>];
  },
});

// Export a function to create a new connection (useful for testing)
export function createDatabaseClient(url: string) {
  if (!url || typeof url !== "string") {
    throw new Error(
      "createDatabaseClient requires a valid PostgreSQL connection URL"
    );
  }

  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    throw new Error(
      `Invalid PostgreSQL connection URL format. URL must start with 'postgres://' or 'postgresql://'.`
    );
  }

  const client = postgres(url);
  return drizzle(client, { schema });
}

// Export type for the database instance
export type Database = ReturnType<typeof getDb>;
