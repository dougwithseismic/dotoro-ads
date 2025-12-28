import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Users Table
 * Core user identity for authentication
 *
 * Users are created when they first request a magic link.
 * emailVerified is set to true once they click the magic link.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => [
    // Index for login lookups by email
    uniqueIndex("users_email_idx").on(table.email),
  ]
);

// Import related tables for relations (circular import safe with relations())
import { magicLinkTokens } from "./magic-link-tokens.js";
import { sessions } from "./sessions.js";

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  magicLinkTokens: many(magicLinkTokens),
  sessions: many(sessions),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
