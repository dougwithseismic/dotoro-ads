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

// Mock the teams API
vi.mock("@/lib/teams", () => ({
  getTeams: vi.fn(),
  createTeam: vi.fn(),
}));

// Import after mocks
import { TeamSwitcher } from "../TeamSwitcher";
import { getTeams, createTeam } from "@/lib/teams";
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
    (getTeams as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockTeams });
  });

  it("should render loading state initially", async () => {
    // Make getTeams hang to test loading state
    (getTeams as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

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
    (getTeams as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

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
});
