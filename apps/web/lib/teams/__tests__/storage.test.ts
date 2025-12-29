import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We'll test the storage module which should export:
// - getStoredTeamId(): string | null
// - setStoredTeamId(teamId: string): void
// - clearStoredTeamId(): void
// - STORAGE_KEY constant

describe("Team Storage Utilities", () => {
  const STORAGE_KEY = "dotoro_current_team_id";

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getStoredTeamId", () => {
    it("should return null when no team ID is stored", async () => {
      const { getStoredTeamId } = await import("../storage");
      expect(getStoredTeamId()).toBeNull();
    });

    it("should return stored team ID when one exists", async () => {
      localStorage.setItem(STORAGE_KEY, "team-123");
      const { getStoredTeamId } = await import("../storage");
      // Re-import to get fresh module
      vi.resetModules();
      const storage = await import("../storage");
      expect(storage.getStoredTeamId()).toBe("team-123");
    });

    it("should return null for empty string value", async () => {
      localStorage.setItem(STORAGE_KEY, "");
      vi.resetModules();
      const { getStoredTeamId } = await import("../storage");
      expect(getStoredTeamId()).toBeNull();
    });
  });

  describe("setStoredTeamId", () => {
    it("should store team ID in localStorage", async () => {
      const { setStoredTeamId } = await import("../storage");
      setStoredTeamId("team-456");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("team-456");
    });

    it("should overwrite existing team ID", async () => {
      localStorage.setItem(STORAGE_KEY, "team-old");
      const { setStoredTeamId } = await import("../storage");
      setStoredTeamId("team-new");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("team-new");
    });
  });

  describe("clearStoredTeamId", () => {
    it("should remove team ID from localStorage", async () => {
      localStorage.setItem(STORAGE_KEY, "team-123");
      const { clearStoredTeamId } = await import("../storage");
      clearStoredTeamId();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("should not throw when no team ID exists", async () => {
      const { clearStoredTeamId } = await import("../storage");
      expect(() => clearStoredTeamId()).not.toThrow();
    });
  });

  describe("SSR Safety", () => {
    it("should export STORAGE_KEY constant", async () => {
      const { STORAGE_KEY } = await import("../storage");
      expect(STORAGE_KEY).toBe("dotoro_current_team_id");
    });

    it("should handle server-side rendering gracefully", async () => {
      // Simulate SSR by temporarily removing window
      const originalWindow = global.window;
      // @ts-expect-error - Intentionally testing SSR scenario
      delete global.window;

      vi.resetModules();

      // Import should not throw on server
      const storage = await import("../storage");

      // Functions should return safe defaults and not throw
      expect(storage.getStoredTeamId()).toBeNull();
      expect(() => storage.setStoredTeamId("team-123")).not.toThrow();
      expect(() => storage.clearStoredTeamId()).not.toThrow();

      // Restore window
      global.window = originalWindow;
    });
  });
});
