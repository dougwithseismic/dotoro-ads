// Re-export all schema definitions and types
export * from "./schema/index.js";

// Export database client
export { db, getDb, closeDb, createDatabaseClient } from "./client.js";
export type { Database } from "./client.js";
