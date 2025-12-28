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
  useParams: vi.fn(() => ({ teamId: "team-1" })),
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
  updateTeam,
  getTeamMembers,
  updateMemberRole,
  removeMember,
  getTeamInvitations,
  sendInvitation,
  revokeInvitation,
} from "@/lib/teams";
import { useAuth } from "@/lib/auth";

const mockTeam = {
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
  {
    id: "membership-2",
    userId: "user-2",
    email: "admin@acme.com",
    role: "admin" as const,
    invitedAt: "2024-01-02T00:00:00Z",
    acceptedAt: "2024-01-02T00:00:00Z",
    createdAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "membership-3",
    userId: "user-3",
    email: "viewer@acme.com",
    role: "viewer" as const,
    invitedAt: "2024-01-03T00:00:00Z",
    acceptedAt: "2024-01-03T00:00:00Z",
    createdAt: "2024-01-03T00:00:00Z",
  },
];

const mockInvitations = [
  {
    id: "invite-1",
    email: "pending@example.com",
    role: "editor" as const,
    inviterEmail: "owner@acme.com",
    expiresAt: "2024-02-01T00:00:00Z",
    createdAt: "2024-01-15T00:00:00Z",
  },
];

describe("TeamSettingsPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    });
    (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeam);
    (getTeamMembers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockMembers,
      total: mockMembers.length,
    });
    (getTeamInvitations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockInvitations,
      total: mockInvitations.length,
    });
  });

  describe("Loading State", () => {
    it("should show loading state while data is fetching", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

      render(<TeamSettingsPage />);

      expect(screen.getByTestId("team-settings-loading")).toBeInTheDocument();
    });
  });

  describe("Tab Navigation", () => {
    it("should render all three tabs", async () => {
      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /general/i })).toBeInTheDocument();
      });

      expect(screen.getByRole("tab", { name: /members/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /invitations/i })).toBeInTheDocument();
    });

    it("should default to General tab", async () => {
      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /general/i })).toHaveAttribute(
          "aria-selected",
          "true"
        );
      });
    });

    it("should switch tabs when clicked", async () => {
      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /general/i })).toBeInTheDocument();
      });

      const membersTab = screen.getByRole("tab", { name: /members/i });
      await user.click(membersTab);

      expect(membersTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("General Tab", () => {
    it("should display team name in an editable field", async () => {
      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/team name/i)).toHaveValue("Acme Corp");
      });
    });

    it("should display team description in an editable field", async () => {
      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/description/i)).toHaveValue("Our main team");
      });
    });

    it("should update team when save button is clicked", async () => {
      (updateTeam as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTeam,
        name: "Updated Corp",
      });

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/team name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Corp");

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(updateTeam).toHaveBeenCalledWith("team-1", {
          name: "Updated Corp",
          description: "Our main team",
        });
      });
    });

    it("should show success message after saving", async () => {
      (updateTeam as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTeam,
        name: "Updated Corp",
      });

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/team name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Corp");

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });
    });
  });

  describe("Members Tab", () => {
    it("should display list of team members", async () => {
      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /members/i })).toBeInTheDocument();
      });

      const membersTab = screen.getByRole("tab", { name: /members/i });
      await user.click(membersTab);

      await waitFor(() => {
        expect(screen.getByText("owner@acme.com")).toBeInTheDocument();
      });

      expect(screen.getByText("admin@acme.com")).toBeInTheDocument();
      expect(screen.getByText("viewer@acme.com")).toBeInTheDocument();
    });

    it("should display role badges for each member", async () => {
      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /members/i })).toBeInTheDocument();
      });

      const membersTab = screen.getByRole("tab", { name: /members/i });
      await user.click(membersTab);

      await waitFor(() => {
        expect(screen.getByText("Owner")).toBeInTheDocument();
      });

      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Viewer")).toBeInTheDocument();
    });

    it("should allow changing member role", async () => {
      (updateMemberRole as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockMembers[2],
        role: "editor",
      });

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /members/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /members/i }));

      await waitFor(() => {
        expect(screen.getByText("viewer@acme.com")).toBeInTheDocument();
      });

      // Find the row with viewer@acme.com and click the role change button
      const viewerRow = screen.getByText("viewer@acme.com").closest("[data-testid='member-row']");
      expect(viewerRow).toBeInTheDocument();

      const roleButton = within(viewerRow!).getByRole("button", { name: /change role/i });
      await user.click(roleButton);

      const editorOption = screen.getByRole("option", { name: /editor/i });
      await user.click(editorOption);

      await waitFor(() => {
        expect(updateMemberRole).toHaveBeenCalledWith("team-1", "user-3", "editor");
      });
    });

    it("should allow removing a member", async () => {
      (removeMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /members/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /members/i }));

      await waitFor(() => {
        expect(screen.getByText("viewer@acme.com")).toBeInTheDocument();
      });

      const viewerRow = screen.getByText("viewer@acme.com").closest("[data-testid='member-row']");
      const removeButton = within(viewerRow!).getByRole("button", { name: /remove/i });
      await user.click(removeButton);

      // Confirm removal
      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(removeMember).toHaveBeenCalledWith("team-1", "user-3");
      });
    });

    it("should not allow removing the owner", async () => {
      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /members/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /members/i }));

      await waitFor(() => {
        expect(screen.getByText("owner@acme.com")).toBeInTheDocument();
      });

      const ownerRow = screen.getByText("owner@acme.com").closest("[data-testid='member-row']");
      const removeButton = within(ownerRow!).queryByRole("button", { name: /remove/i });

      expect(removeButton).not.toBeInTheDocument();
    });
  });

  describe("Invitations Tab", () => {
    it("should display send invitation form", async () => {
      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /invitations/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /invitations/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /send invite/i })).toBeInTheDocument();
    });

    it("should display list of pending invitations", async () => {
      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /invitations/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /invitations/i }));

      await waitFor(() => {
        expect(screen.getByText("pending@example.com")).toBeInTheDocument();
      });
    });

    it("should send invitation when form is submitted", async () => {
      (sendInvitation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "invite-2",
        email: "newuser@example.com",
        role: "viewer",
        inviterEmail: "owner@acme.com",
        expiresAt: "2024-02-01T00:00:00Z",
        createdAt: "2024-01-20T00:00:00Z",
      });

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /invitations/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /invitations/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "newuser@example.com");

      // Select role
      const roleSelect = screen.getByLabelText(/role/i);
      await user.click(roleSelect);
      await user.click(screen.getByRole("option", { name: /viewer/i }));

      const sendButton = screen.getByRole("button", { name: /send invite/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(sendInvitation).toHaveBeenCalledWith("team-1", {
          email: "newuser@example.com",
          role: "viewer",
        });
      });
    });

    it("should revoke invitation when revoke button is clicked", async () => {
      (revokeInvitation as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /invitations/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /invitations/i }));

      await waitFor(() => {
        expect(screen.getByText("pending@example.com")).toBeInTheDocument();
      });

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      await user.click(revokeButton);

      await waitFor(() => {
        expect(revokeInvitation).toHaveBeenCalledWith("team-1", "invite-1");
      });
    });
  });

  describe("Access Control", () => {
    it("should show read-only view for non-admin users", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTeam,
        role: "viewer",
      });

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/team name/i)).toBeDisabled();
      });

      expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
    });

    it("should not show invitations tab for viewers", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTeam,
        role: "viewer",
      });

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /general/i })).toBeInTheDocument();
      });

      expect(screen.queryByRole("tab", { name: /invitations/i })).not.toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should show error message when team fails to load", async () => {
      (getTeam as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load team/i)).toBeInTheDocument();
      });
    });

    it("should show error message when save fails", async () => {
      (updateTeam as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Update failed"));

      render(<TeamSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/team name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Corp");

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });
  });
});
