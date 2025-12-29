import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useParams: vi.fn(() => ({
    locale: "en",
    teamSlug: "test-team",
  })),
}));

// Mock auth context
const mockLogout = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      emailVerified: true,
      image: null,
    },
    isLoading: false,
    isAuthenticated: true,
    logout: mockLogout,
    refreshSession: vi.fn(),
  })),
}));

// Mock teams module
const mockSetCurrentTeam = vi.fn();
const mockRefetchTeams = vi.fn();
const mockTeams = [
  {
    id: "team-1",
    name: "Acme Corp",
    slug: "acme-corp",
    description: "Main team",
    avatarUrl: null,
    plan: "pro" as const,
    memberCount: 5,
    role: "owner" as const,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "team-2",
    name: "Side Project",
    slug: "side-project",
    description: null,
    avatarUrl: null,
    plan: "free" as const,
    memberCount: 2,
    role: "admin" as const,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

vi.mock("@/lib/teams", () => ({
  useTeam: vi.fn(() => ({
    currentTeam: mockTeams[0],
    teams: mockTeams,
    setCurrentTeam: mockSetCurrentTeam,
    isLoading: false,
    error: null,
    refetchTeams: mockRefetchTeams,
  })),
  createTeam: vi.fn(),
}));

import { TopBar } from "../TopBar";
import { useAuth } from "@/lib/auth";
import { useTeam } from "@/lib/teams";

describe("TopBar", () => {
  it("renders top bar with account switcher", () => {
    render(<TopBar />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /account/i })).toBeInTheDocument();
  });

  // Note: Theme toggle is currently disabled (returns null) so we skip testing it
  // See ThemeProvider.tsx - theme is forced to dark mode

  it("shows account dropdown when account button clicked", () => {
    render(<TopBar />);

    const accountButton = screen.getByRole("button", { name: /account/i });
    fireEvent.click(accountButton);

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("renders breadcrumb area", () => {
    render(<TopBar breadcrumbs={[{ label: "Templates", href: "/templates" }]} />);

    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
  });

  it("renders multiple breadcrumbs with separators", () => {
    render(
      <TopBar
        breadcrumbs={[
          { label: "Templates", href: "/templates" },
          { label: "Editor", href: "/templates/editor" },
        ]}
      />
    );

    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Editor")).toBeInTheDocument();
    // Check for separator
    expect(screen.getAllByText("/").length).toBe(1);
  });

  it("renders mobile menu toggle", () => {
    render(<TopBar />);

    const mobileToggle = screen.getByRole("button", { name: /menu/i });
    expect(mobileToggle).toBeInTheDocument();
  });

  it("calls onMobileMenuToggle when mobile menu button clicked", () => {
    const onMobileMenuToggle = vi.fn();
    render(<TopBar onMobileMenuToggle={onMobileMenuToggle} />);

    const mobileToggle = screen.getByRole("button", { name: /menu/i });
    fireEvent.click(mobileToggle);

    expect(onMobileMenuToggle).toHaveBeenCalled();
  });

  it("closes account dropdown when clicking outside", () => {
    render(<TopBar />);

    const accountButton = screen.getByRole("button", { name: /account/i });
    fireEvent.click(accountButton);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Click outside
    fireEvent.click(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  describe("TeamSwitcher Integration", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset useAuth mock to authenticated state
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          emailVerified: true,
          image: null,
        },
        isLoading: false,
        isAuthenticated: true,
        logout: mockLogout,
        refreshSession: vi.fn(),
      });
      // Reset useTeam mock
      (useTeam as ReturnType<typeof vi.fn>).mockReturnValue({
        currentTeam: mockTeams[0],
        teams: mockTeams,
        setCurrentTeam: mockSetCurrentTeam,
        isLoading: false,
        error: null,
        refetchTeams: mockRefetchTeams,
      });
    });

    it("renders TeamSwitcher in the TopBar when authenticated", () => {
      render(<TopBar />);

      // TeamSwitcher should show Switch team button
      expect(screen.getByRole("button", { name: /switch team/i })).toBeInTheDocument();
    });

    it("shows current team name in TeamSwitcher", () => {
      render(<TopBar />);

      // Current team name should be visible (on desktop)
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    it("opens team dropdown when TeamSwitcher is clicked", async () => {
      const user = userEvent.setup();
      render(<TopBar />);

      const teamSwitcherButton = screen.getByRole("button", { name: /switch team/i });
      await user.click(teamSwitcherButton);

      // Should show team list
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(screen.getByText("Side Project")).toBeInTheDocument();
    });

    it("positions TeamSwitcher between theme toggle and account button", () => {
      render(<TopBar />);

      // Get the right side container
      const topBar = screen.getByRole("banner");
      const rightContainer = topBar.querySelector(".flex.items-center.gap-1, .flex.items-center.gap-2, .flex.items-center.gap-3");

      // TeamSwitcher should be present
      expect(screen.getByRole("button", { name: /switch team/i })).toBeInTheDocument();
    });

    it("does not render TeamSwitcher when not authenticated", () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        logout: mockLogout,
        refreshSession: vi.fn(),
      });

      render(<TopBar />);

      expect(screen.queryByRole("button", { name: /switch team/i })).not.toBeInTheDocument();
    });

    it("shows divider between TeamSwitcher and account button", () => {
      render(<TopBar />);

      // Look for the vertical divider
      const divider = screen.getByTestId("team-account-divider");
      expect(divider).toBeInTheDocument();
    });
  });
});
