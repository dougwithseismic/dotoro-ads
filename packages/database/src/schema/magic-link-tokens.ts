import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";

/**
 * Magic Link Tokens Table
 * Stores hashed magic link tokens for passwordless authentication
 *
 * Security Notes:
 * - The `token` field stores SHA-256 hash of the actual token
 * - Never store or log plaintext tokens
 * - Tokens expire after 15 minutes (default)
 * - Tokens are single-use (usedAt is set on verification)
 */
export const magicLinkTokens = pgTable(
  "magic_link_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable for pre-registration links (user created after verification)
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    // Email is required even when userId is null for pre-registration
    email: varchar("email", { length: 255 }).notNull(),
    // SHA-256 hash of the actual token (64 hex chars)
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Set when token is used - null means token is unused
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Index for token lookups during verification
    index("magic_link_tokens_token_idx").on(table.token),
    // Index for finding tokens by email (for rate limiting/cleanup)
    index("magic_link_tokens_email_idx").on(table.email),
    // Index for cleanup of expired tokens
    index("magic_link_tokens_expires_idx").on(table.expiresAt),
    // Composite index for cleanup of used/expired tokens
    index("magic_link_tokens_used_expires_idx").on(table.usedAt, table.expiresAt),
  ]
);

// Relations
export const magicLinkTokensRelations = relations(magicLinkTokens, ({ one }) => ({
  user: one(users, {
    fields: [magicLinkTokens.userId],
    references: [users.id],
  }),
}));

// Type exports
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type NewMagicLinkToken = typeof magicLinkTokens.$inferInsert;
