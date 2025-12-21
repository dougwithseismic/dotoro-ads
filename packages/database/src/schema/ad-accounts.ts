import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * SECURITY NOTE: The credentials, accessToken, and refreshToken fields
 * store sensitive data that MUST be encrypted at the application layer
 * before insertion. The database stores the encrypted ciphertext.
 *
 * An encryption service must be implemented to:
 * 1. Encrypt values before insert/update
 * 2. Decrypt values after select
 *
 * TODO: Implement encryption service in packages/core/src/services/encryption.ts
 */

/**
 * Account Status Enum
 */
export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "inactive",
  "error",
  "revoked",
]);

/**
 * Ad Accounts Table
 * Stores connected ad platform accounts
 */
export const adAccounts = pgTable(
  "ad_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"), // Nullable for now, will be required when auth is implemented
    platform: varchar("platform", { length: 50 }).notNull(), // 'google_ads', 'meta', 'tiktok', etc.
    accountId: varchar("account_id", { length: 255 }).notNull(),
    accountName: varchar("account_name", { length: 255 }).notNull(),
    credentials: text("credentials"), // REQUIRES app-layer encryption (see security note above)
    status: accountStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("ad_accounts_platform_idx").on(table.platform),
    index("ad_accounts_status_idx").on(table.status),
    index("ad_accounts_platform_account_idx").on(table.platform, table.accountId),
    index("ad_accounts_user_idx").on(table.userId),
    uniqueIndex("ad_accounts_platform_account_unique_idx").on(
      table.platform,
      table.accountId
    ),
  ]
);

/**
 * OAuth Tokens Table
 * Stores OAuth tokens for ad accounts
 */
export const oauthTokens = pgTable(
  "oauth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adAccountId: uuid("ad_account_id")
      .notNull()
      .references(() => adAccounts.id, { onDelete: "cascade" }),
    accessToken: text("access_token").notNull(), // REQUIRES app-layer encryption (see security note above)
    refreshToken: text("refresh_token"), // REQUIRES app-layer encryption (see security note above)
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: text("scopes"), // Comma-separated scopes
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("oauth_tokens_account_idx").on(table.adAccountId),
    index("oauth_tokens_expires_idx").on(table.expiresAt),
    uniqueIndex("oauth_tokens_account_unique_idx").on(table.adAccountId),
  ]
);

// Relations
export const adAccountsRelations = relations(adAccounts, ({ one }) => ({
  // Changed from many to one since oauthTokens now has a unique constraint on adAccountId
  oauthToken: one(oauthTokens, {
    fields: [adAccounts.id],
    references: [oauthTokens.adAccountId],
  }),
}));

export const oauthTokensRelations = relations(oauthTokens, ({ one }) => ({
  adAccount: one(adAccounts, {
    fields: [oauthTokens.adAccountId],
    references: [adAccounts.id],
  }),
}));

// Type exports
export type AdAccount = typeof adAccounts.$inferSelect;
export type NewAdAccount = typeof adAccounts.$inferInsert;

export type OAuthToken = typeof oauthTokens.$inferSelect;
export type NewOAuthToken = typeof oauthTokens.$inferInsert;
