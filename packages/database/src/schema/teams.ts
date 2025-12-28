import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.js";

// ============================================================================
// Enums
// ============================================================================

/**
 * Team Role Enum
 * Defines the permission levels for team members
 *
 * - owner: Full access, can delete team, manage billing
 * - admin: Manage members, all CRUD operations
 * - editor: Create/edit campaigns, templates, data sources
 * - viewer: Read-only access to all resources
 */
export const teamRoleEnum = pgEnum("team_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);

/**
 * Team Plan Enum
 * Defines billing tiers for teams (for future monetization)
 */
export const teamPlanEnum = pgEnum("team_plan", ["free", "pro", "enterprise"]);

// ============================================================================
// Teams Table
// ============================================================================

/**
 * Teams Table
 * Stores team/workspace information
 *
 * Teams are the primary unit of organization. Resources belong to teams,
 * and users access resources through team membership.
 */
export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    avatarUrl: text("avatar_url"),
    settings: jsonb("settings").$type<TeamSettings>(),
    billingEmail: varchar("billing_email", { length: 255 }),
    plan: teamPlanEnum("plan").notNull().default("free"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Unique index on slug for URL-based lookups
    uniqueIndex("teams_slug_idx").on(table.slug),
    // Index on plan for filtering by tier
    index("teams_plan_idx").on(table.plan),
  ]
);

// ============================================================================
// Team Memberships Table
// ============================================================================

/**
 * Team Memberships Table
 * Links users to teams with specific roles
 *
 * A user can be a member of multiple teams, and each membership
 * has a specific role that determines permissions.
 */
export const teamMemberships = pgTable(
  "team_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    // User ID is text to match Better Auth's user.id type
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: teamRoleEnum("role").notNull().default("viewer"),
    invitedBy: text("invited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Unique constraint: user can only have one membership per team
    uniqueIndex("team_memberships_team_user_idx").on(table.teamId, table.userId),
    // Index for finding all teams a user belongs to
    index("team_memberships_user_idx").on(table.userId),
    // Index for filtering by role
    index("team_memberships_role_idx").on(table.role),
  ]
);

// ============================================================================
// Team Invitations Table
// ============================================================================

/**
 * Team Invitations Table
 * Stores pending invitations to join teams
 *
 * Invitations are sent via email with a secure token.
 * When accepted, a team membership is created.
 */
export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: teamRoleEnum("role").notNull().default("viewer"),
    token: varchar("token", { length: 64 }).notNull().unique(),
    // User ID is text to match Better Auth's user.id type
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Unique index on token for secure lookups
    uniqueIndex("team_invitations_token_idx").on(table.token),
    // Index for finding invitations for a team/email combo (deduplication)
    index("team_invitations_team_email_idx").on(table.teamId, table.email),
    // Index for cleanup jobs to find expired invitations
    index("team_invitations_expires_idx").on(table.expiresAt),
  ]
);

// ============================================================================
// Relations
// ============================================================================

export const teamsRelations = relations(teams, ({ many }) => ({
  memberships: many(teamMemberships),
  invitations: many(teamInvitations),
}));

export const teamMembershipsRelations = relations(
  teamMemberships,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamMemberships.teamId],
      references: [teams.id],
    }),
    user: one(user, {
      fields: [teamMemberships.userId],
      references: [user.id],
    }),
    inviter: one(user, {
      fields: [teamMemberships.invitedBy],
      references: [user.id],
    }),
  })
);

export const teamInvitationsRelations = relations(
  teamInvitations,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamInvitations.teamId],
      references: [teams.id],
    }),
    inviter: one(user, {
      fields: [teamInvitations.invitedBy],
      references: [user.id],
    }),
  })
);

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Team Settings interface
 * Stored in JSONB column for flexibility
 */
export interface TeamSettings {
  /** Team timezone for scheduling */
  timezone?: string;
  /** Default currency for campaigns */
  defaultCurrency?: string;
  /** Notification preferences */
  notifications?: {
    emailDigest?: boolean;
    slackWebhook?: string;
  };
  /** Additional settings */
  [key: string]: unknown;
}

// Type exports for database operations
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamMembership = typeof teamMemberships.$inferSelect;
export type NewTeamMembership = typeof teamMemberships.$inferInsert;

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type NewTeamInvitation = typeof teamInvitations.$inferInsert;

export type TeamRole = (typeof teamRoleEnum.enumValues)[number];
export type TeamPlan = (typeof teamPlanEnum.enumValues)[number];
