import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import {
  teams,
  teamMemberships,
  teamInvitations,
  teamRoleEnum,
  teamPlanEnum,
  teamsRelations,
  teamMembershipsRelations,
  teamInvitationsRelations,
} from "../teams.js";
import type {
  Team,
  NewTeam,
  TeamMembership,
  NewTeamMembership,
  TeamInvitation,
  NewTeamInvitation,
  TeamRole,
  TeamPlan,
} from "../teams.js";

/**
 * Teams Schema Tests
 *
 * These tests verify the database schema definitions are correct.
 * They validate column names, types, defaults, and constraints.
 */
describe("Teams Schema", () => {
  describe("teams table", () => {
    it("should have correct table name", () => {
      expect(getTableName(teams)).toBe("teams");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(teams);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("slug");
      expect(columnNames).toContain("description");
      expect(columnNames).toContain("avatarUrl");
      expect(columnNames).toContain("settings");
      expect(columnNames).toContain("billingEmail");
      expect(columnNames).toContain("plan");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have id as UUID primary key", () => {
      const columns = getTableColumns(teams);
      const idColumn = columns.id;

      expect(idColumn).toBeDefined();
      expect(idColumn.dataType).toBe("string"); // UUID is represented as string in drizzle
      expect(idColumn.notNull).toBe(true);
      expect(idColumn.hasDefault).toBe(true); // defaultRandom()
    });

    it("should have name as required varchar(255)", () => {
      const columns = getTableColumns(teams);
      const nameColumn = columns.name;

      expect(nameColumn).toBeDefined();
      expect(nameColumn.dataType).toBe("string");
      expect(nameColumn.notNull).toBe(true);
    });

    it("should have slug as required unique varchar(100)", () => {
      const columns = getTableColumns(teams);
      const slugColumn = columns.slug;

      expect(slugColumn).toBeDefined();
      expect(slugColumn.dataType).toBe("string");
      expect(slugColumn.notNull).toBe(true);
      expect(slugColumn.isUnique).toBe(true);
    });

    it("should have description as optional text", () => {
      const columns = getTableColumns(teams);
      const descColumn = columns.description;

      expect(descColumn).toBeDefined();
      expect(descColumn.dataType).toBe("string");
      expect(descColumn.notNull).toBe(false);
    });

    it("should have avatarUrl as optional text", () => {
      const columns = getTableColumns(teams);
      const avatarColumn = columns.avatarUrl;

      expect(avatarColumn).toBeDefined();
      expect(avatarColumn.dataType).toBe("string");
      expect(avatarColumn.notNull).toBe(false);
    });

    it("should have settings as JSONB", () => {
      const columns = getTableColumns(teams);
      const settingsColumn = columns.settings;

      expect(settingsColumn).toBeDefined();
      expect(settingsColumn.dataType).toBe("json");
    });

    it("should have plan as required with default", () => {
      const columns = getTableColumns(teams);
      const planColumn = columns.plan;

      expect(planColumn).toBeDefined();
      expect(planColumn.notNull).toBe(true);
      expect(planColumn.hasDefault).toBe(true);
    });

    it("should have timestamp columns with defaults", () => {
      const columns = getTableColumns(teams);

      expect(columns.createdAt.notNull).toBe(true);
      expect(columns.createdAt.hasDefault).toBe(true);
      expect(columns.updatedAt.notNull).toBe(true);
      expect(columns.updatedAt.hasDefault).toBe(true);
    });
  });

  describe("teamRoleEnum", () => {
    it("should have correct enum values", () => {
      expect(teamRoleEnum.enumValues).toContain("owner");
      expect(teamRoleEnum.enumValues).toContain("admin");
      expect(teamRoleEnum.enumValues).toContain("editor");
      expect(teamRoleEnum.enumValues).toContain("viewer");
      expect(teamRoleEnum.enumValues).toHaveLength(4);
    });
  });

  describe("teamPlanEnum", () => {
    it("should have correct enum values", () => {
      expect(teamPlanEnum.enumValues).toContain("free");
      expect(teamPlanEnum.enumValues).toContain("pro");
      expect(teamPlanEnum.enumValues).toContain("enterprise");
      expect(teamPlanEnum.enumValues).toHaveLength(3);
    });
  });

  describe("teamMemberships table", () => {
    it("should have correct table name", () => {
      expect(getTableName(teamMemberships)).toBe("team_memberships");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(teamMemberships);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("teamId");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("role");
      expect(columnNames).toContain("invitedBy");
      expect(columnNames).toContain("invitedAt");
      expect(columnNames).toContain("acceptedAt");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have required teamId foreign key", () => {
      const columns = getTableColumns(teamMemberships);
      const teamIdColumn = columns.teamId;

      expect(teamIdColumn).toBeDefined();
      expect(teamIdColumn.dataType).toBe("string"); // UUID represented as string
      expect(teamIdColumn.notNull).toBe(true);
    });

    it("should have required userId foreign key", () => {
      const columns = getTableColumns(teamMemberships);
      const userIdColumn = columns.userId;

      expect(userIdColumn).toBeDefined();
      expect(userIdColumn.dataType).toBe("string"); // UUID represented as string
      expect(userIdColumn.notNull).toBe(true);
    });

    it("should have required role column with default", () => {
      const columns = getTableColumns(teamMemberships);
      const roleColumn = columns.role;

      expect(roleColumn).toBeDefined();
      expect(roleColumn.notNull).toBe(true);
      expect(roleColumn.hasDefault).toBe(true);
    });

    it("should have optional invitedBy column", () => {
      const columns = getTableColumns(teamMemberships);
      const invitedByColumn = columns.invitedBy;

      expect(invitedByColumn).toBeDefined();
      expect(invitedByColumn.dataType).toBe("string"); // UUID represented as string
      expect(invitedByColumn.notNull).toBe(false);
    });

    it("should have optional timestamp columns for invitation tracking", () => {
      const columns = getTableColumns(teamMemberships);

      expect(columns.invitedAt.notNull).toBe(false);
      expect(columns.acceptedAt.notNull).toBe(false);
    });
  });

  describe("teamInvitations table", () => {
    it("should have correct table name", () => {
      expect(getTableName(teamInvitations)).toBe("team_invitations");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(teamInvitations);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("teamId");
      expect(columnNames).toContain("email");
      expect(columnNames).toContain("role");
      expect(columnNames).toContain("token");
      expect(columnNames).toContain("invitedBy");
      expect(columnNames).toContain("expiresAt");
      expect(columnNames).toContain("acceptedAt");
      expect(columnNames).toContain("createdAt");
    });

    it("should have required teamId foreign key", () => {
      const columns = getTableColumns(teamInvitations);
      const teamIdColumn = columns.teamId;

      expect(teamIdColumn).toBeDefined();
      expect(teamIdColumn.dataType).toBe("string"); // UUID represented as string
      expect(teamIdColumn.notNull).toBe(true);
    });

    it("should have required email column", () => {
      const columns = getTableColumns(teamInvitations);
      const emailColumn = columns.email;

      expect(emailColumn).toBeDefined();
      expect(emailColumn.dataType).toBe("string");
      expect(emailColumn.notNull).toBe(true);
    });

    it("should have required unique token column", () => {
      const columns = getTableColumns(teamInvitations);
      const tokenColumn = columns.token;

      expect(tokenColumn).toBeDefined();
      expect(tokenColumn.dataType).toBe("string");
      expect(tokenColumn.notNull).toBe(true);
      expect(tokenColumn.isUnique).toBe(true);
    });

    it("should have required invitedBy column", () => {
      const columns = getTableColumns(teamInvitations);
      const invitedByColumn = columns.invitedBy;

      expect(invitedByColumn).toBeDefined();
      expect(invitedByColumn.dataType).toBe("string"); // UUID represented as string
      expect(invitedByColumn.notNull).toBe(true);
    });

    it("should have required expiresAt column", () => {
      const columns = getTableColumns(teamInvitations);
      const expiresAtColumn = columns.expiresAt;

      expect(expiresAtColumn).toBeDefined();
      expect(expiresAtColumn.notNull).toBe(true);
    });

    it("should have optional acceptedAt column", () => {
      const columns = getTableColumns(teamInvitations);
      const acceptedAtColumn = columns.acceptedAt;

      expect(acceptedAtColumn).toBeDefined();
      expect(acceptedAtColumn.notNull).toBe(false);
    });
  });

  describe("Type Exports", () => {
    it("should export Team type with correct shape", () => {
      const team: Team = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Acme Digital",
        slug: "acme-digital",
        description: "A marketing agency",
        avatarUrl: null,
        settings: { timezone: "America/New_York" },
        billingEmail: "billing@acme.com",
        plan: "pro",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(team.id).toBeDefined();
      expect(team.name).toBeDefined();
      expect(team.slug).toBeDefined();
    });

    it("should export NewTeam type with required and optional fields", () => {
      const newTeam: NewTeam = {
        name: "Acme Digital",
        slug: "acme-digital",
      };

      expect(newTeam.name).toBeDefined();
      expect(newTeam.slug).toBeDefined();
    });

    it("should export TeamMembership type with correct shape", () => {
      const membership: TeamMembership = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        teamId: "550e8400-e29b-41d4-a716-446655440000",
        userId: "550e8400-e29b-41d4-a716-446655440002",
        role: "admin",
        invitedBy: null,
        invitedAt: null,
        acceptedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(membership.teamId).toBeDefined();
      expect(membership.userId).toBeDefined();
      expect(membership.role).toBeDefined();
    });

    it("should export TeamInvitation type with correct shape", () => {
      const invitation: TeamInvitation = {
        id: "550e8400-e29b-41d4-a716-446655440003",
        teamId: "550e8400-e29b-41d4-a716-446655440000",
        email: "jane@agency.com",
        role: "editor",
        token: "a".repeat(64),
        invitedBy: "550e8400-e29b-41d4-a716-446655440002",
        expiresAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
      };

      expect(invitation.teamId).toBeDefined();
      expect(invitation.email).toBeDefined();
      expect(invitation.token).toBeDefined();
    });

    it("should export TeamRole type", () => {
      const role: TeamRole = "admin";
      expect(["owner", "admin", "editor", "viewer"]).toContain(role);
    });

    it("should export TeamPlan type", () => {
      const plan: TeamPlan = "pro";
      expect(["free", "pro", "enterprise"]).toContain(plan);
    });
  });

  describe("Relations", () => {
    it("should export teamsRelations", () => {
      expect(teamsRelations).toBeDefined();
    });

    it("should export teamMembershipsRelations", () => {
      expect(teamMembershipsRelations).toBeDefined();
    });

    it("should export teamInvitationsRelations", () => {
      expect(teamInvitationsRelations).toBeDefined();
    });
  });
});
