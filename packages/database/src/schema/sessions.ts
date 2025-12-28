import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";

/**
 * Sessions Table
 * Stores authenticated user sessions
 *
 * Security Notes:
 * - The `token` field stores SHA-256 hash of the session token
 * - Session tokens are stored in HTTP-only cookies
 * - Sessions expire after 7 days (default) with sliding expiry
 * - lastActiveAt is updated on each authenticated request
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // SHA-256 hash of the session token (64 hex chars)
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Metadata for security auditing
    userAgent: text("user_agent"),
    // IPv6 addresses can be up to 45 chars (with zone ID)
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Updated on each authenticated request for sliding expiry
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Index for session lookups during authentication
    index("sessions_token_idx").on(table.token),
    // Index for finding all sessions for a user
    index("sessions_user_idx").on(table.userId),
    // Index for cleanup of expired sessions
    index("sessions_expires_idx").on(table.expiresAt),
  ]
);

// Relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Type exports
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
