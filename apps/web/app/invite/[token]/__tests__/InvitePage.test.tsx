import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
  useParams: vi.fn(() => ({ token: "valid-token-123" })),
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
  getInvitationDetails: vi.fn(),
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
}));

// Import after mocks
import InvitePage from "../page";
import {
  getInvitationDetails,
  acceptInvitation,
  declineInvitation,
} from "@/lib/teams";
import { useAuth } from "@/lib/auth";

const mockInvitationDetails = {
  teamName: "Acme Corp",
  teamSlug: "acme-corp",
  inviterEmail: "owner@acme.com",
  role: "editor" as const,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
};

describe("InvitePage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    });
    (getInvitationDetails as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockInvitationDetails
    );
  });

  describe("Loading State", () => {
    it("should show loading state while fetching invitation details", async () => {
      (getInvitationDetails as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(() => {})
      );

      render(<InvitePage />);

      expect(screen.getByTestId("invite-loading")).toBeInTheDocument();
    });
  });

  describe("Invitation Display", () => {
    it("should display team name", async () => {
      render(<InvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      });
    });

    it("should display inviter email", async () => {
      render(<InvitePage />);

      await waitFor(() => {
        expect(screen.getByText(/owner@acme.com/i)).toBeInTheDocument();
      });
    });

    it("should display role offered", async () => {
      render(<InvitePage />);

      await waitFor(() => {
        expect(screen.getByText(/editor/i)).toBeInTheDocument();
      });
    });

    it("should display accept and decline buttons", async () => {
      render(<InvitePage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /accept/i })
        ).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
    });
  });

  describe("Accept Invitation", () => {
    it("should accept invitation when accept button is clicked", async () => {
      (acceptInvitation as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        teamId: "team-1",
        teamSlug: "acme-corp",
      });

      render(<InvitePage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /accept/i })
        ).toBeInTheDocument();
      });

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      await user.click(acceptButton);

      await waitFor(() => {
        expect(acceptInvitation).toHaveBeenCalledWith("valid-token-123");
      });
    });

    it("should show success message after accepting", async () => {
      (acceptInvitation as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        teamId: "team-1",
        teamSlug: "acme-corp",
      });

      render(<InvitePage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /accept/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /accept/i }));

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /successfully joined/i })).toBeInTheDocument();
      });
    });

    it("should redirect to team page after accepting", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      (acceptInvitation as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        teamId: "team-1",
        teamSlug: "acme-corp",
      });

      render(<InvitePage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /accept/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /accept/i }));

      // Wait for the accepted state
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /successfully joined/i })).toBeInTheDocument();
      });

      // Advance timers to trigger redirect
      await vi.advanceTimersByTimeAsync(2500);

      expect(mockPush).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("Decline Invitation", () => {
    it("should decline invitation when decline button is clicked", async () => {
      (declineInvitation as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      render(<InvitePage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /decline/i })
        ).toBeInTheDocument();
      });

      const declineButton = screen.getByRole("button", { name: /decline/i });
      await user.click(declineButton);

      await waitFor(() => {
        expect(declineInvitation).toHaveBeenCalledWith("valid-token-123");
      });
    });

    it("should show confirmation after declining", async () => {
      (declineInvitation as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      render(<InvitePage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /decline/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /decline/i }));

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /invitation declined/i })).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error for expired token", async () => {
      (getInvitationDetails as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Invitation has expired")
      );

      render(<InvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /expired/i })).toBeInTheDocument();
      });
    });

    it("should show error for invalid token", async () => {
      (getInvitationDetails as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Invitation not found")
      );

      render(<InvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /not found/i })).toBeInTheDocument();
      });
    });

    it("should show error when accept fails", async () => {
      (acceptInvitation as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Already a member")
      );

      render(<InvitePage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /accept/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /accept/i }));

      await waitFor(() => {
        expect(screen.getByText(/already a member/i)).toBeInTheDocument();
      });
    });
  });

  describe("Authentication", () => {
    it("should show login prompt for unauthenticated users", async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      render(<InvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      });

      expect(screen.getByText(/sign in to accept/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    });

    it("should still allow declining when unauthenticated", async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      (declineInvitation as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      render(<InvitePage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /decline/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /decline/i }));

      await waitFor(() => {
        expect(declineInvitation).toHaveBeenCalledWith("valid-token-123");
      });
    });
  });
});
