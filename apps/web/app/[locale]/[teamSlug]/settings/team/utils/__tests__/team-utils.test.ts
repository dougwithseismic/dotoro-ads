import { describe, it, expect } from "vitest";
import { isPersonalTeam } from "../team-utils";
import type { Team } from "@/lib/teams/types";

const createTeam = (overrides: Partial<Team> = {}): Team => ({
  id: "team-1",
  name: "Acme Corp",
  slug: "acme-corp",
  description: "Test team",
  avatarUrl: null,
  plan: "pro",
  memberCount: 5,
  role: "owner",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("isPersonalTeam", () => {
  describe("Name-based detection", () => {
    it("should return true when team name is 'Personal'", () => {
      const team = createTeam({ name: "Personal" });
      expect(isPersonalTeam(team)).toBe(true);
    });

    it("should return true when team name is 'personal' (case insensitive)", () => {
      const team = createTeam({ name: "personal" });
      expect(isPersonalTeam(team)).toBe(true);
    });

    it("should return true when team name is 'PERSONAL' (case insensitive)", () => {
      const team = createTeam({ name: "PERSONAL" });
      expect(isPersonalTeam(team)).toBe(true);
    });

    it("should return false when team name contains 'Personal' but is not exactly 'Personal'", () => {
      const team = createTeam({ name: "Personal Team" });
      expect(isPersonalTeam(team)).toBe(false);
    });
  });

  describe("Slug-based detection", () => {
    it("should return true when team slug is 'personal'", () => {
      const team = createTeam({ name: "My Team", slug: "personal" });
      expect(isPersonalTeam(team)).toBe(true);
    });

    it("should return false when slug contains 'personal' but is not exactly 'personal'", () => {
      const team = createTeam({ name: "My Team", slug: "personal-workspace" });
      expect(isPersonalTeam(team)).toBe(false);
    });
  });

  describe("Member count detection", () => {
    it("should return true when team has exactly 1 member and owner role", () => {
      const team = createTeam({ memberCount: 1, role: "owner" });
      expect(isPersonalTeam(team)).toBe(true);
    });

    it("should return false when team has 1 member but is not owner", () => {
      const team = createTeam({ memberCount: 1, role: "admin" });
      expect(isPersonalTeam(team)).toBe(false);
    });

    it("should return false when team has more than 1 member even as owner", () => {
      const team = createTeam({ memberCount: 2, role: "owner" });
      expect(isPersonalTeam(team)).toBe(false);
    });
  });

  describe("Regular teams", () => {
    it("should return false for a standard team", () => {
      const team = createTeam({
        name: "Acme Corp",
        slug: "acme-corp",
        memberCount: 5,
        role: "owner",
      });
      expect(isPersonalTeam(team)).toBe(false);
    });

    it("should return false for a team with multiple members", () => {
      const team = createTeam({
        name: "Marketing",
        slug: "marketing",
        memberCount: 10,
        role: "editor",
      });
      expect(isPersonalTeam(team)).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should return true for team with name 'Personal' even with multiple members", () => {
      // Name takes precedence over member count
      const team = createTeam({ name: "Personal", memberCount: 5 });
      expect(isPersonalTeam(team)).toBe(true);
    });

    it("should return true for team with slug 'personal' even with multiple members", () => {
      // Slug takes precedence over member count
      const team = createTeam({
        name: "My Workspace",
        slug: "personal",
        memberCount: 5,
      });
      expect(isPersonalTeam(team)).toBe(true);
    });
  });
});
