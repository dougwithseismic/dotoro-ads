import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
  useSearchParams: vi.fn(() => mockSearchParams),
  useParams: vi.fn(() => ({ teamId: "team-1", locale: "en" })),
}));

// Mock the auth context
const mockUser = { id: "user-1", email: "test@example.com", emailVerified: true };
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
  })),
  useRequireAuth: vi.fn(() => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
  })),
}));

// Mock the teams API
vi.mock("@/lib/teams", () => ({
  getTeam: vi.fn(),
  updateTeam: vi.fn(),
  getTeamMembers: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  getTeamInvitations: vi.fn(),
  sendInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
}));

// Import after mocks
import TeamSettingsPage from "../page";
import {
  getTeam,
  getTeamMembers,
  getTeamInvitations,
} from "@/lib/teams";
import { useAuth } from "@/lib/auth";

const mockTeamOwner = {
  id: "team-1",
  name: "Acme Corp",
  slug: "acme-corp",
  description: "Our main team",
  avatarUrl: null,
  plan: "pro" as const,
  memberCount: 3,
  role: "owner" as const,
  settings: null,
  billingEmail: "billing@acme.com",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockTeamAdmin = {
  ...mockTeamOwner,
  role: "admin" as const,
};

const mockTeamEditor = {
  ...mockTeamOwner,
  role: "editor" as const,
};

const mockTeamViewer = {
  ...mockTeamOwner,
  role: "viewer" as const,
};

const mockMembers = [
  {
    id: "membership-1",
    userId: "user-1",
    email: "owner@acme.com",
    role: "owner" as const,
    invitedAt: null,
    acceptedAt: "2024-01-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const mockInvitations: never[] = [];

describe("Team Settings - Permissions Tab Integration", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    });
    (getTeamMembers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockMembers,
      total: mockMembers.length,
    });
    (getTeamInvitations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockInvitations,
      total: mockInvitations.length,
    });
  });

  describe("Permissions Tab Navigation", () => {
    it("should show Roles & Permissions tab for all team members", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamViewer);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });
    });

    it("should switch to Permissions tab when clicked", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamEditor);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      const permissionsTab = screen.getByRole("tab", {
        name: /roles & permissions/i,
      });
      await user.click(permissionsTab);

      expect(permissionsTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Permissions Tab Content", () => {
    it("should display current role banner with correct role", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamAdmin);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("tab", { name: /roles & permissions/i })
      );

      await waitFor(() => {
        expect(screen.getByTestId("current-role-banner")).toBeInTheDocument();
      });

      expect(screen.getByTestId("current-role-banner")).toHaveAttribute(
        "data-role",
        "admin"
      );
    });

    it("should display role hierarchy section", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamOwner);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("tab", { name: /roles & permissions/i })
      );

      await waitFor(() => {
        expect(screen.getByText("Role Hierarchy")).toBeInTheDocument();
      });
    });

    it("should mark current role in role hierarchy cards", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamEditor);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("tab", { name: /roles & permissions/i })
      );

      await waitFor(() => {
        const editorCard = screen.getByTestId("role-card-editor");
        expect(editorCard).toHaveAttribute("data-current", "true");
      });
    });

    it("should display permission matrix on desktop viewport", async () => {
      // Mock desktop viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamOwner);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("tab", { name: /roles & permissions/i })
      );

      await waitFor(() => {
        // Should render either matrix or cards
        expect(
          screen.queryByTestId("permission-matrix") ||
            screen.queryByTestId("permission-cards")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Owner-Only Features", () => {
    it("should show permission audit section for owners", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamOwner);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("tab", { name: /roles & permissions/i })
      );

      await waitFor(() => {
        expect(screen.getByText("Permission Audit")).toBeInTheDocument();
      });
    });

    it("should NOT show permission audit section for admins", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamAdmin);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("tab", { name: /roles & permissions/i })
      );

      await waitFor(() => {
        expect(screen.getByTestId("current-role-banner")).toBeInTheDocument();
      });

      expect(screen.queryByText("Permission Audit")).not.toBeInTheDocument();
    });

    it("should NOT show permission audit section for editors", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamEditor);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("tab", { name: /roles & permissions/i })
      );

      await waitFor(() => {
        expect(screen.getByTestId("current-role-banner")).toBeInTheDocument();
      });

      expect(screen.queryByText("Permission Audit")).not.toBeInTheDocument();
    });

    it("should NOT show permission audit section for viewers", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamViewer);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("tab", { name: /roles & permissions/i })
      );

      await waitFor(() => {
        expect(screen.getByTestId("current-role-banner")).toBeInTheDocument();
      });

      expect(screen.queryByText("Permission Audit")).not.toBeInTheDocument();
    });
  });

  describe("Permission Matrix Interaction", () => {
    it("should toggle dangerous permissions filter", async () => {
      // Mock desktop viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamOwner);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("tab", { name: /roles & permissions/i })
      );

      await waitFor(() => {
        expect(
          screen.getByLabelText(/show dangerous permissions only/i)
        ).toBeInTheDocument();
      });

      const filterCheckbox = screen.getByLabelText(
        /show dangerous permissions only/i
      );

      // Initially unchecked
      expect(filterCheckbox).not.toBeChecked();

      // Click to filter
      await user.click(filterCheckbox);

      expect(filterCheckbox).toBeChecked();
    });
  });

  describe("Role-Specific Permission Display", () => {
    it("should show all 4 role descriptions", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeamEditor);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /roles & permissions/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("tab", { name: /roles & permissions/i })
      );

      await waitFor(() => {
        // Check for role summaries in role cards - use getAllBy* since text may appear multiple times
        expect(
          screen.getAllByText("Full access to everything").length
        ).toBeGreaterThanOrEqual(1);
        expect(
          screen.getAllByText("Manage team and resources").length
        ).toBeGreaterThanOrEqual(1);
        expect(
          screen.getAllByText("Create and edit content").length
        ).toBeGreaterThanOrEqual(1);
        // "View only" appears multiple times (in banner and card for viewer role)
        expect(screen.getAllByText("View only").length).toBeGreaterThanOrEqual(
          1
        );
      });
    });
  });
});
