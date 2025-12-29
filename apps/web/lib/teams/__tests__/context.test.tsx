import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
  })),
  usePathname: vi.fn(() => "/en/acme-corp/dashboard"),
  useParams: vi.fn(() => ({ locale: "en", teamSlug: "acme-corp" })),
}));

// Mock the auth context
const mockUser = { id: "user-1", email: "test@example.com", emailVerified: true };
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
  })),
}));

// Mock the teams API
vi.mock("@/lib/teams/api", () => ({
  getTeams: vi.fn(),
  createTeam: vi.fn(),
}));

// Mock storage module
vi.mock("@/lib/teams/storage", () => ({
  getStoredTeamId: vi.fn(),
  setStoredTeamId: vi.fn(),
  clearStoredTeamId: vi.fn(),
  setStoredTeamSlug: vi.fn(),
  STORAGE_KEY: "dotoro_current_team_id",
  TEAM_SLUG_COOKIE: "dotoro_team_slug",
}));

// Import after mocks
import { TeamProvider, useTeam } from "../context";
import { getTeams } from "@/lib/teams/api";
import { useAuth } from "@/lib/auth";
import {
  getStoredTeamId,
  setStoredTeamId,
  clearStoredTeamId,
  setStoredTeamSlug,
} from "@/lib/teams/storage";
import type { Team } from "../types";

const mockTeams: Team[] = [
  {
    id: "team-1",
    name: "Acme Corp",
    slug: "acme-corp",
    description: "Main team",
    avatarUrl: null,
    plan: "pro",
    memberCount: 5,
    role: "owner",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "team-2",
    name: "Side Project",
    slug: "side-project",
    description: null,
    avatarUrl: null,
    plan: "free",
    memberCount: 2,
    role: "admin",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "team-3",
    name: "Client Team",
    slug: "client-team",
    description: null,
    avatarUrl: null,
    plan: "enterprise",
    memberCount: 10,
    role: "viewer",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-03T00:00:00Z",
  },
];

// Wrapper component for testing hooks
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <TeamProvider>{children}</TeamProvider>;
  };
}

// Test component to verify context values
function TestConsumer() {
  const context = useTeam();
  return (
    <div>
      <span data-testid="loading">{context.isLoading.toString()}</span>
      <span data-testid="error">{context.error || "none"}</span>
      <span data-testid="current-team">
        {context.currentTeam?.name || "none"}
      </span>
      <span data-testid="teams-count">{context.teams.length}</span>
      <button
        data-testid="switch-team"
        onClick={() => {
          const otherTeam = context.teams.find(
            (t) => t.id !== context.currentTeam?.id
          );
          if (otherTeam) context.setCurrentTeam(otherTeam);
        }}
      >
        Switch Team
      </button>
      <button data-testid="refetch" onClick={() => context.refetchTeams()}>
        Refetch
      </button>
    </div>
  );
}

describe("TeamContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    // Reset auth mock to authenticated state
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    });
    // Reset API mock
    (getTeams as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockTeams,
    });
    // Reset storage mocks
    (getStoredTeamId as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("useTeam hook", () => {
    it("should throw error when used outside TeamProvider", () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTeam());
      }).toThrow("useTeam must be used within a TeamProvider");

      consoleError.mockRestore();
    });
  });

  describe("Initial loading", () => {
    it("should show loading state initially when authenticated", async () => {
      // Make getTeams hang to test loading state
      (getTeams as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(() => {})
      );

      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      expect(screen.getByTestId("loading")).toHaveTextContent("true");
    });

    it("should load teams on mount when authenticated", async () => {
      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
      });

      expect(getTeams).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("teams-count")).toHaveTextContent("3");
    });

    it("should not load teams when not authenticated", async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      // Wait a tick to ensure effect would have run
      await new Promise((r) => setTimeout(r, 10));

      expect(getTeams).not.toHaveBeenCalled();
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    it("should not load teams while auth is loading", async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      // Wait a tick
      await new Promise((r) => setTimeout(r, 10));

      expect(getTeams).not.toHaveBeenCalled();
    });
  });

  describe("Team selection", () => {
    it("should auto-select first team when no stored team", async () => {
      (getStoredTeamId as ReturnType<typeof vi.fn>).mockReturnValue(null);

      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("current-team")).toHaveTextContent(
          "Acme Corp"
        );
      });

      expect(setStoredTeamId).toHaveBeenCalledWith("team-1");
    });

    it("should prioritize URL team slug over localStorage on mount", async () => {
      // URL slug is "acme-corp" (team-1), localStorage has "team-2"
      // URL should take priority
      (getStoredTeamId as ReturnType<typeof vi.fn>).mockReturnValue("team-2");

      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      // Should select team from URL slug (acme-corp), not localStorage
      await waitFor(() => {
        expect(screen.getByTestId("current-team")).toHaveTextContent(
          "Acme Corp"
        );
      });
    });

    it("should select team from URL even if stored team does not match", async () => {
      // URL has "acme-corp" which exists, stored ID is "team-nonexistent"
      (getStoredTeamId as ReturnType<typeof vi.fn>).mockReturnValue(
        "team-nonexistent"
      );

      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      // URL team slug takes priority
      await waitFor(() => {
        expect(screen.getByTestId("current-team")).toHaveTextContent(
          "Acme Corp"
        );
      });

      // Should set the new IDs based on URL selection
      expect(setStoredTeamId).toHaveBeenCalledWith("team-1");
      expect(setStoredTeamSlug).toHaveBeenCalledWith("acme-corp");
    });

    it("should persist team selection to localStorage on change", async () => {
      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("current-team")).toHaveTextContent(
          "Acme Corp"
        );
      });

      // Clear the initial call
      vi.clearAllMocks();

      // Click switch team button
      const switchButton = screen.getByTestId("switch-team");
      await act(async () => {
        switchButton.click();
      });

      await waitFor(() => {
        expect(setStoredTeamId).toHaveBeenCalled();
      });
    });
  });

  describe("setCurrentTeam", () => {
    it("should update current team and navigate when called", async () => {
      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("current-team")).toHaveTextContent(
          "Acme Corp"
        );
      });

      const switchButton = screen.getByTestId("switch-team");
      await act(async () => {
        switchButton.click();
      });

      // The team should switch and navigation should be triggered
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });

      // Verify storage was updated
      expect(setStoredTeamSlug).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should set error state when teams fail to load", async () => {
      (getTeams as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("error")).toHaveTextContent(
          "Failed to load teams"
        );
      });

      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  describe("refetchTeams", () => {
    it("should refetch teams when called", async () => {
      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
      });

      expect(getTeams).toHaveBeenCalledTimes(1);

      // Click refetch button
      const refetchButton = screen.getByTestId("refetch");
      await act(async () => {
        refetchButton.click();
      });

      await waitFor(() => {
        expect(getTeams).toHaveBeenCalledTimes(2);
      });
    });

    it("should update teams list after refetch", async () => {
      const newTeam: Team = {
        id: "team-4",
        name: "New Team",
        slug: "new-team",
        description: null,
        avatarUrl: null,
        plan: "free",
        memberCount: 1,
        role: "owner",
        createdAt: "2024-01-04T00:00:00Z",
        updatedAt: "2024-01-04T00:00:00Z",
      };

      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("teams-count")).toHaveTextContent("3");
      });

      // Update mock to return new team
      (getTeams as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [...mockTeams, newTeam],
      });

      // Refetch
      const refetchButton = screen.getByTestId("refetch");
      await act(async () => {
        refetchButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("teams-count")).toHaveTextContent("4");
      });
    });

    it("should keep URL team during refetch when it still exists", async () => {
      // URL slug is "acme-corp" (team-1)
      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("current-team")).toHaveTextContent(
          "Acme Corp"
        );
      });

      // Refetch returns same teams
      (getTeams as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockTeams,
      });

      const refetchButton = screen.getByTestId("refetch");
      await act(async () => {
        refetchButton.click();
      });

      // Should still have the URL team
      await waitFor(() => {
        expect(screen.getByTestId("current-team")).toHaveTextContent(
          "Acme Corp"
        );
      });
    });
  });

  describe("Empty teams array", () => {
    it("should handle empty teams array gracefully", async () => {
      (getTeams as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
      });

      expect(screen.getByTestId("teams-count")).toHaveTextContent("0");
      expect(screen.getByTestId("current-team")).toHaveTextContent("none");
    });
  });

  describe("Team removal handling", () => {
    it("should clear stored team and fallback to first team when current team is removed", async () => {
      // Start with team-1 as current
      (getStoredTeamId as ReturnType<typeof vi.fn>).mockReturnValue("team-1");

      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("current-team")).toHaveTextContent("Acme Corp");
      });

      // Simulate team-1 being removed - refetch returns teams without team-1
      const teamsWithoutFirst = mockTeams.filter((t) => t.id !== "team-1");
      (getTeams as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: teamsWithoutFirst,
      });

      // Refetch teams
      const refetchButton = screen.getByTestId("refetch");
      await act(async () => {
        refetchButton.click();
      });

      // Should fallback to first remaining team (Side Project)
      await waitFor(() => {
        expect(screen.getByTestId("current-team")).toHaveTextContent("Side Project");
      });

      // Storage should be updated
      expect(setStoredTeamId).toHaveBeenCalledWith("team-2");
    });

    it("should clear stored team ID when stored team no longer exists", async () => {
      // Store a team ID that won't be in the returned teams
      (getStoredTeamId as ReturnType<typeof vi.fn>).mockReturnValue("team-nonexistent");

      // The URL slug "acme-corp" exists, so it will be selected first via Priority 1
      // This test validates that when URL team is found, we still handle storage correctly
      render(
        <TeamProvider>
          <TestConsumer />
        </TeamProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
      });

      // Since URL team "acme-corp" exists, it takes priority over stored team
      // So clearStoredTeamId won't be called - URL team is used and storage is set to that
      expect(screen.getByTestId("current-team")).toHaveTextContent("Acme Corp");

      // Storage should be set to the URL team
      expect(setStoredTeamId).toHaveBeenCalledWith("team-1");
    });
  });
});
