import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamList } from "../TeamList";
import type { Team } from "@/lib/teams/types";

// Mock the team context
const mockSetCurrentTeam = vi.fn();
const mockRefetchTeams = vi.fn();
let mockTeams: Team[] = [];
let mockCurrentTeam: Team | null = null;
let mockIsLoading = false;
let mockError: string | null = null;

vi.mock("@/lib/teams", () => ({
  useTeam: vi.fn(() => ({
    teams: mockTeams,
    currentTeam: mockCurrentTeam,
    setCurrentTeam: mockSetCurrentTeam,
    isLoading: mockIsLoading,
    error: mockError,
    refetchTeams: mockRefetchTeams,
  })),
}));

// Mock the router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
  useParams: vi.fn(() => ({ locale: "en" })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

const baseTeam: Team = {
  id: "team-1",
  name: "Acme Corp",
  slug: "acme-corp",
  description: "Our main team",
  avatarUrl: null,
  plan: "pro",
  memberCount: 5,
  role: "owner",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const personalTeam: Team = {
  id: "personal-team",
  name: "Personal",
  slug: "personal",
  description: null,
  avatarUrl: null,
  plan: "free",
  memberCount: 1,
  role: "owner",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const teamsList: Team[] = [
  personalTeam,
  baseTeam,
  {
    id: "team-2",
    name: "Marketing Team",
    slug: "marketing-team",
    description: "Marketing department",
    avatarUrl: null,
    plan: "pro",
    memberCount: 3,
    role: "editor",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

describe("TeamList", () => {
  const user = userEvent.setup();
  const mockOnLeaveTeam = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockTeams = teamsList;
    mockCurrentTeam = baseTeam;
    mockIsLoading = false;
    mockError = null;
  });

  describe("Rendering", () => {
    it("should render all teams from context", () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      // Personal team name appears twice (team name + Personal badge)
      const personalTexts = screen.getAllByText("Personal");
      expect(personalTexts.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Marketing Team")).toBeInTheDocument();
    });

    it("should show loading skeleton when isLoading is true", () => {
      mockIsLoading = true;
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      expect(screen.getByTestId("team-list-loading")).toBeInTheDocument();
    });

    it("should render team cards for each team", () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      expect(screen.getByTestId("team-card-personal-team")).toBeInTheDocument();
      expect(screen.getByTestId("team-card-team-1")).toBeInTheDocument();
      expect(screen.getByTestId("team-card-team-2")).toBeInTheDocument();
    });

    it("should show team count", () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      expect(screen.getByText(/3 teams/i)).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no teams exist", () => {
      mockTeams = [];
      mockCurrentTeam = null;
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      expect(screen.getByText(/no teams/i)).toBeInTheDocument();
    });
  });

  describe("Personal Team Identification", () => {
    it("should mark personal team with isPersonal prop", () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      // Personal badge should appear on the personal team (may appear with team name too)
      const personalBadges = screen.getAllByText("Personal");
      // At least 2: one for team name, one for Personal badge
      expect(personalBadges.length).toBeGreaterThanOrEqual(2);
    });

    it("should not allow leaving personal team", () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      const personalTeamCard = screen.getByTestId("team-card-personal-team");
      // Leave button should not be in the personal team card
      expect(
        personalTeamCard.querySelector('button[aria-label*="Leave"]')
      ).not.toBeInTheDocument();
    });
  });

  describe("Team Selection", () => {
    it("should mark current team as selected", () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      const selectedCard = screen.getByTestId("team-card-team-1");
      expect(selectedCard).toHaveAttribute("data-selected", "true");
    });

    it("should call setCurrentTeam when team is selected", async () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      const marketingCard = screen.getByTestId("team-card-team-2");
      await user.click(marketingCard);

      expect(mockSetCurrentTeam).toHaveBeenCalledWith(teamsList[2]);
    });

    it("should update URL when team is selected", async () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      const marketingCard = screen.getByTestId("team-card-team-2");
      await user.click(marketingCard);

      expect(mockPush).toHaveBeenCalledWith("/en/settings/team?teamId=team-2");
    });
  });

  describe("Leave Team", () => {
    it("should call onLeaveTeam when leave button is clicked", async () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      // Find leave button in the Acme Corp card
      const acmeCard = screen.getByTestId("team-card-team-1");
      const leaveButton = acmeCard.querySelector('button[aria-label*="Leave"]');
      expect(leaveButton).toBeInTheDocument();

      await user.click(leaveButton!);

      expect(mockOnLeaveTeam).toHaveBeenCalledWith(baseTeam);
    });
  });

  describe("Role Display", () => {
    it("should show correct role badges for each team", () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      // Owner badges (Personal and Acme Corp)
      const ownerBadges = screen.getAllByText("Owner");
      expect(ownerBadges).toHaveLength(2);

      // Editor badge (Marketing Team)
      expect(screen.getByText("Editor")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible heading", () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      expect(screen.getByRole("heading", { name: /your teams/i })).toBeInTheDocument();
    });

    it("should have list role for team container", () => {
      render(<TeamList onLeaveTeam={mockOnLeaveTeam} />);

      expect(screen.getByRole("list")).toBeInTheDocument();
    });
  });
});
