/**
 * TeamNavigationProvider Tests
 *
 * Tests for the team navigation context and hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TeamNavigationProvider, useTeamNavigation } from "../TeamNavigationProvider";

// Mock next/navigation
const mockPush = vi.fn();
const mockPathname = vi.fn(() => "/en/acme-corp/dashboard");

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  usePathname: () => mockPathname(),
  useParams: () => ({ locale: "en", teamSlug: "acme-corp" }),
}));

// Mock useTeam hook
const mockSetCurrentTeam = vi.fn();
vi.mock("@/lib/teams", () => ({
  useTeam: () => ({
    currentTeam: {
      id: "team-1",
      name: "Acme Corp",
      slug: "acme-corp",
      description: null,
      avatarUrl: null,
      plan: "pro" as const,
      memberCount: 5,
      role: "owner" as const,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    teams: [],
    setCurrentTeam: mockSetCurrentTeam,
    isLoading: false,
    error: null,
    refetchTeams: vi.fn(),
  }),
}));

describe("TeamNavigationProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/en/acme-corp/dashboard");
  });

  describe("useTeamNavigation hook", () => {
    it("should throw error when used outside provider", () => {
      expect(() => {
        renderHook(() => useTeamNavigation());
      }).toThrow("useTeamNavigation must be used within a TeamNavigationProvider");
    });

    it("should provide team slug from URL", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TeamNavigationProvider>{children}</TeamNavigationProvider>
      );

      const { result } = renderHook(() => useTeamNavigation(), { wrapper });

      expect(result.current.teamSlug).toBe("acme-corp");
    });

    it("should provide locale from URL", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TeamNavigationProvider>{children}</TeamNavigationProvider>
      );

      const { result } = renderHook(() => useTeamNavigation(), { wrapper });

      expect(result.current.locale).toBe("en");
    });

    it("should build team path correctly", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TeamNavigationProvider>{children}</TeamNavigationProvider>
      );

      const { result } = renderHook(() => useTeamNavigation(), { wrapper });

      expect(result.current.buildPath("/settings")).toBe("/en/acme-corp/settings");
      expect(result.current.buildPath("/campaign-sets/new")).toBe(
        "/en/acme-corp/campaign-sets/new"
      );
    });

    it("should navigate to team path", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TeamNavigationProvider>{children}</TeamNavigationProvider>
      );

      const { result } = renderHook(() => useTeamNavigation(), { wrapper });

      act(() => {
        result.current.navigateTo("/settings");
      });

      expect(mockPush).toHaveBeenCalledWith("/en/acme-corp/settings");
    });

    it("should get current path without team slug", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TeamNavigationProvider>{children}</TeamNavigationProvider>
      );

      const { result } = renderHook(() => useTeamNavigation(), { wrapper });

      expect(result.current.currentPath).toBe("/dashboard");
    });

    it("should switch team and preserve current path", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TeamNavigationProvider>{children}</TeamNavigationProvider>
      );

      const { result } = renderHook(() => useTeamNavigation(), { wrapper });

      act(() => {
        result.current.switchTeam("new-team");
      });

      expect(mockPush).toHaveBeenCalledWith("/en/new-team/dashboard");
    });
  });
});
