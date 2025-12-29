import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
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

// Mock teams module
const mockSetCurrentTeam = vi.fn();
const mockRefetchTeams = vi.fn();
vi.mock("@/lib/teams", () => ({
  useTeam: vi.fn(),
  createTeam: vi.fn(),
}));

// Import after mocks
import { TeamSwitcher } from "../TeamSwitcher";
import { useTeam, createTeam } from "@/lib/teams";
import { useAuth } from "@/lib/auth";

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
  {
    id: "team-3",
    name: "Client Team",
    slug: "client-team",
    description: null,
    avatarUrl: null,
    plan: "enterprise" as const,
    memberCount: 10,
    role: "viewer" as const,
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-03T00:00:00Z",
  },
];

describe("TeamSwitcher", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset useAuth mock to default authenticated state
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    });
    // Reset useTeam mock to default state with teams
    (useTeam as ReturnType<typeof vi.fn>).mockReturnValue({
      currentTeam: mockTeams[0],
      teams: mockTeams,
      setCurrentTeam: mockSetCurrentTeam,
      isLoading: false,
      error: null,
      refetchTeams: mockRefetchTeams,
    });
  });

  it("should render loading state initially", async () => {
    // Set loading state via context
    (useTeam as ReturnType<typeof vi.fn>).mockReturnValue({
      currentTeam: null,
      teams: [],
      setCurrentTeam: mockSetCurrentTeam,
      isLoading: true,
      error: null,
      refetchTeams: mockRefetchTeams,
    });

    render(<TeamSwitcher />);

    expect(screen.getByTestId("team-switcher-loading")).toBeInTheDocument();
  });

  it("should display current team name after loading", async () => {
    render(<TeamSwitcher currentTeamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });

  it("should show first team as current when no currentTeamId provided", async () => {
    render(<TeamSwitcher />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });

  it("should open dropdown when clicked", async () => {
    render(<TeamSwitcher currentTeamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const trigger = screen.getByRole("button", { name: /switch team/i });
    await user.click(trigger);

    // Should show all teams in the dropdown
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("Side Project")).toBeInTheDocument();
    expect(screen.getByText("Client Team")).toBeInTheDocument();
  });

  it("should display role badges for each team", async () => {
    render(<TeamSwitcher currentTeamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const trigger = screen.getByRole("button", { name: /switch team/i });
    await user.click(trigger);

    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
  });

  it("should call onTeamChange when selecting a different team", async () => {
    const onTeamChange = vi.fn();
    render(<TeamSwitcher currentTeamId="team-1" onTeamChange={onTeamChange} />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const trigger = screen.getByRole("button", { name: /switch team/i });
    await user.click(trigger);

    const sideProjectOption = screen.getByRole("option", { name: /side project/i });
    await user.click(sideProjectOption);

    // Should call both context setCurrentTeam and prop callback
    expect(mockSetCurrentTeam).toHaveBeenCalledWith(mockTeams[1]);
    expect(onTeamChange).toHaveBeenCalledWith(mockTeams[1]);
  });

  it("should show 'Create new team' option in dropdown", async () => {
    render(<TeamSwitcher currentTeamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const trigger = screen.getByRole("button", { name: /switch team/i });
    await user.click(trigger);

    expect(screen.getByRole("option", { name: /create new team/i })).toBeInTheDocument();
  });

  it("should show create team dialog when 'Create new team' is clicked", async () => {
    render(<TeamSwitcher currentTeamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const trigger = screen.getByRole("button", { name: /switch team/i });
    await user.click(trigger);

    const createOption = screen.getByRole("option", { name: /create new team/i });
    await user.click(createOption);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
  });

  it("should create a new team via the dialog", async () => {
    const newTeam = {
      id: "team-4",
      name: "New Team",
      slug: "new-team",
      description: null,
      avatarUrl: null,
      plan: "free" as const,
      memberCount: 1,
      role: "owner" as const,
      settings: null,
      billingEmail: null,
      createdAt: "2024-01-04T00:00:00Z",
      updatedAt: "2024-01-04T00:00:00Z",
    };
    (createTeam as ReturnType<typeof vi.fn>).mockResolvedValue(newTeam);
    mockRefetchTeams.mockResolvedValue(undefined);

    const onTeamChange = vi.fn();
    render(<TeamSwitcher currentTeamId="team-1" onTeamChange={onTeamChange} />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    // Open dropdown and click create
    const trigger = screen.getByRole("button", { name: /switch team/i });
    await user.click(trigger);

    const createOption = screen.getByRole("option", { name: /create new team/i });
    await user.click(createOption);

    // Fill in the dialog
    const nameInput = screen.getByLabelText(/team name/i);
    await user.type(nameInput, "New Team");

    const createButton = screen.getByRole("button", { name: /^create$/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(createTeam).toHaveBeenCalledWith({ name: "New Team" });
    });

    // Should refetch teams and set the new team as current
    expect(mockRefetchTeams).toHaveBeenCalled();
    expect(mockSetCurrentTeam).toHaveBeenCalledWith(newTeam);
    expect(onTeamChange).toHaveBeenCalledWith(newTeam);
  });

  it("should close dropdown after selecting a team", async () => {
    render(<TeamSwitcher currentTeamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const trigger = screen.getByRole("button", { name: /switch team/i });
    await user.click(trigger);

    const sideProjectOption = screen.getByRole("option", { name: /side project/i });
    await user.click(sideProjectOption);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("should show error state when teams fail to load", async () => {
    (useTeam as ReturnType<typeof vi.fn>).mockReturnValue({
      currentTeam: null,
      teams: [],
      setCurrentTeam: mockSetCurrentTeam,
      isLoading: false,
      error: "Failed to load teams",
      refetchTeams: mockRefetchTeams,
    });

    render(<TeamSwitcher />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load teams/i)).toBeInTheDocument();
    });
  });

  it("should not render when user is not authenticated", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    const { container } = render(<TeamSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should show member count in team options", async () => {
    render(<TeamSwitcher currentTeamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const trigger = screen.getByRole("button", { name: /switch team/i });
    await user.click(trigger);

    expect(screen.getByText(/5 members/i)).toBeInTheDocument();
    expect(screen.getByText(/2 members/i)).toBeInTheDocument();
    expect(screen.getByText(/10 members/i)).toBeInTheDocument();
  });

  it("should indicate current team with a checkmark", async () => {
    render(<TeamSwitcher currentTeamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const trigger = screen.getByRole("button", { name: /switch team/i });
    await user.click(trigger);

    // The current team option should be marked as selected
    const currentTeamOption = screen.getByRole("option", { name: /acme corp/i });
    expect(currentTeamOption).toHaveAttribute("aria-selected", "true");
  });

  describe("Search/Filter (5+ teams)", () => {
    const manyTeams = [
      ...mockTeams,
      {
        id: "team-4",
        name: "Marketing Team",
        slug: "marketing-team",
        description: null,
        avatarUrl: null,
        plan: "pro" as const,
        memberCount: 8,
        role: "editor" as const,
        createdAt: "2024-01-04T00:00:00Z",
        updatedAt: "2024-01-04T00:00:00Z",
      },
      {
        id: "team-5",
        name: "Engineering Squad",
        slug: "engineering-squad",
        description: null,
        avatarUrl: null,
        plan: "enterprise" as const,
        memberCount: 15,
        role: "admin" as const,
        createdAt: "2024-01-05T00:00:00Z",
        updatedAt: "2024-01-05T00:00:00Z",
      },
    ];

    beforeEach(() => {
      (useTeam as ReturnType<typeof vi.fn>).mockReturnValue({
        currentTeam: manyTeams[0],
        teams: manyTeams,
        setCurrentTeam: mockSetCurrentTeam,
        isLoading: false,
        error: null,
        refetchTeams: mockRefetchTeams,
      });
    });

    it("should show search input when user has 5+ teams", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      expect(screen.getByPlaceholderText(/search teams/i)).toBeInTheDocument();
    });

    it("should not show search input when user has less than 5 teams", async () => {
      (useTeam as ReturnType<typeof vi.fn>).mockReturnValue({
        currentTeam: mockTeams[0],
        teams: mockTeams, // only 3 teams
        setCurrentTeam: mockSetCurrentTeam,
        isLoading: false,
        error: null,
        refetchTeams: mockRefetchTeams,
      });

      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      expect(screen.queryByPlaceholderText(/search teams/i)).not.toBeInTheDocument();
    });

    it("should filter teams based on search input", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      const searchInput = screen.getByPlaceholderText(/search teams/i);
      await user.type(searchInput, "marketing");

      // Should show only Marketing Team in the dropdown options
      const dropdown = screen.getByRole("listbox");
      expect(dropdown).toHaveTextContent("Marketing Team");
      // Other teams should not be in the dropdown options (excluding trigger button and mobile header)
      const teamOptions = screen.getAllByRole("option");
      const teamNames = teamOptions.map((opt) => opt.textContent);
      expect(teamNames.some((name) => name?.includes("Acme Corp"))).toBe(false);
      expect(teamNames.some((name) => name?.includes("Side Project"))).toBe(false);
    });

    it("should filter case-insensitively", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      const searchInput = screen.getByPlaceholderText(/search teams/i);
      await user.type(searchInput, "ENGINEERING");

      expect(screen.getByText("Engineering Squad")).toBeInTheDocument();
    });

    it("should show empty state when no teams match search", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      const searchInput = screen.getByPlaceholderText(/search teams/i);
      await user.type(searchInput, "nonexistent");

      expect(screen.getByText(/no teams found/i)).toBeInTheDocument();
    });

    it("should clear search and show all teams when clear button is clicked", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      const searchInput = screen.getByPlaceholderText(/search teams/i);
      await user.type(searchInput, "marketing");

      // Should show only Marketing Team - verify via options count
      let teamOptions = screen.getAllByRole("option");
      // Should be 2 options: Marketing Team + Create new team
      expect(teamOptions.length).toBe(2);

      // Click clear button
      const clearButton = screen.getByLabelText(/clear search/i);
      await user.click(clearButton);

      // Should show all teams again (5 teams + create = 6 options)
      await waitFor(() => {
        teamOptions = screen.getAllByRole("option");
        expect(teamOptions.length).toBe(6);
      });
    });
  });

  describe("Keyboard Navigation", () => {
    it("should close dropdown when Escape is pressed", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("should navigate down through teams with ArrowDown", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      // Press ArrowDown to move through options
      await user.keyboard("{ArrowDown}");

      // First team should be highlighted
      const firstOption = screen.getByRole("option", { name: /acme corp/i });
      expect(firstOption).toHaveAttribute("data-highlighted", "true");

      await user.keyboard("{ArrowDown}");

      // Second team should be highlighted
      const secondOption = screen.getByRole("option", { name: /side project/i });
      expect(secondOption).toHaveAttribute("data-highlighted", "true");
    });

    it("should navigate up through teams with ArrowUp", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      // Navigate down first
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      // Then navigate up
      await user.keyboard("{ArrowUp}");

      const firstOption = screen.getByRole("option", { name: /acme corp/i });
      expect(firstOption).toHaveAttribute("data-highlighted", "true");
    });

    it("should select highlighted team when Enter is pressed", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      // Navigate to second team
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      // Press Enter to select
      await user.keyboard("{Enter}");

      expect(mockSetCurrentTeam).toHaveBeenCalledWith(mockTeams[1]);
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("should wrap around when navigating past last item", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      // Navigate past all teams (3 teams + create button = 4 items)
      await user.keyboard("{ArrowDown}"); // First
      await user.keyboard("{ArrowDown}"); // Second
      await user.keyboard("{ArrowDown}"); // Third
      await user.keyboard("{ArrowDown}"); // Create new team

      // Should be on create new team
      const createOption = screen.getByRole("option", { name: /create new team/i });
      expect(createOption).toHaveAttribute("data-highlighted", "true");
    });
  });

  describe("Mobile Responsive", () => {
    it("should show only avatar on mobile (team name hidden)", async () => {
      render(<TeamSwitcher />);

      // The team name has class "hidden sm:inline" so it's hidden on mobile
      const teamName = screen.getByText("Acme Corp");
      expect(teamName).toHaveClass("hidden");
      expect(teamName).toHaveClass("sm:inline");
    });

    it("should show current team name in dropdown header on mobile", async () => {
      render(<TeamSwitcher />);

      const trigger = screen.getByRole("button", { name: /switch team/i });
      await user.click(trigger);

      // The dropdown should show current team name prominently
      // Look for it in the dropdown, not in the trigger
      const dropdown = screen.getByRole("listbox");
      const teamNameInDropdown = dropdown.querySelector('[data-testid="dropdown-current-team"]');
      expect(teamNameInDropdown).toBeInTheDocument();
    });
  });
});
