import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * SECURITY NOTE: The accessToken and refreshToken fields
 * store sensitive data that MUST be encrypted at the application layer
 * before insertion. The database stores the encrypted ciphertext.
 *
 * An encryption service must be implemented to:
 * 1. Encrypt values before insert/update
 * 2. Decrypt values after select
 */

/**
 * User OAuth Tokens Table
 * Stores OAuth tokens for data source integrations (Google Sheets, etc.)
 *
 * This is separate from the oauthTokens table in ad-accounts.ts which
 * is specifically for ad platform OAuth (Google Ads, Meta, etc.)
 */
export const userOAuthTokens = pgTable(
  "user_oauth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(), // 'google', 'reddit', etc.
    accessToken: text("access_token").notNull(), // REQUIRES app-layer encryption (see security note above)
    refreshToken: text("refresh_token"), // REQUIRES app-layer encryption (see security note above)
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: text("scopes"), // space-separated scopes
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_oauth_tokens_user_provider_idx").on(
      table.userId,
      table.provider
    ),
    index("user_oauth_tokens_provider_idx").on(table.provider),
    index("user_oauth_tokens_expires_idx").on(table.expiresAt),
  ]
);

// Type exports
export type UserOAuthToken = typeof userOAuthTokens.$inferSelect;
export type NewUserOAuthToken = typeof userOAuthTokens.$inferInsert;
