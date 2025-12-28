/**
 * InvitationActions Component Tests
 *
 * TDD tests for the invitation accept/decline actions component.
 * Tests authentication states and action handlers.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { InvitationActions } from "../InvitationActions";
import type { InvitationDetails } from "@/lib/hooks/useInvitation";

// Mock the auth client
vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

// Mock the API client
vi.mock("@/lib/api-client", () => ({
  api: {
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    data?: unknown;
    constructor(message: string, status: number, data?: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  },
}));

// Import mocks to access them
import { useSession, signOut } from "@/lib/auth-client";
import { api } from "@/lib/api-client";

const mockUseSession = useSession as Mock;
const mockSignOut = signOut as Mock;
const mockApi = api as { post: Mock };

// Test data
const mockInvitation: InvitationDetails = {
  teamName: "Acme Corporation",
  teamSlug: "acme-corp",
  inviterEmail: "admin@acme.com",
  inviteeEmail: "invited@example.com",
  role: "editor",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockToken = "test-invitation-token";

const mockSessionMatchingEmail = {
  user: {
    id: "user-123",
    email: "invited@example.com",
    name: "Test User",
  },
};

const mockSessionDifferentEmail = {
  user: {
    id: "user-456",
    email: "different@example.com",
    name: "Other User",
  },
};

describe("InvitationActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.post = vi.fn();
  });

  describe("Not Authenticated State", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: false,
      });
    });

    it("should show sign in message when not authenticated", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    it("should display OAuth buttons for signing in", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      // Should show Google or GitHub buttons (from OAuthButtons component)
      expect(screen.getByTestId("oauth-buttons")).toBeInTheDocument();
    });

    it("should not show Accept button when not authenticated", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
    });
  });

  describe("Authenticated with Matching Email", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSessionMatchingEmail,
        isPending: false,
      });
    });

    it("should show Accept button when authenticated", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    });

    it("should show Decline button when authenticated", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
    });

    it("should display logged-in user info", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      expect(screen.getByText(/invited@example.com/)).toBeInTheDocument();
    });

    it("should call API when Accept is clicked", async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        teamId: "team-123",
        teamSlug: "acme-corp",
      });

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          `/api/invitations/${mockToken}/accept`
        );
      });
    });

    it("should call onSuccess callback after successful accept", async () => {
      const onSuccess = vi.fn();
      mockApi.post.mockResolvedValue({
        success: true,
        teamId: "team-123",
        teamSlug: "acme-corp",
      });

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={onSuccess}
          onDeclined={vi.fn()}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({
          teamId: "team-123",
          teamSlug: "acme-corp",
        });
      });
    });

    it("should show loading state on Accept button during request", async () => {
      // Keep the promise pending
      mockApi.post.mockReturnValue(new Promise(() => {}));

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(acceptButton).toBeDisabled();
      });
    });

    it("should disable buttons during accept request", async () => {
      mockApi.post.mockReturnValue(new Promise(() => {}));

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(acceptButton).toBeDisabled();
        expect(declineButton).toBeDisabled();
      });
    });
  });

  describe("Decline Flow", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSessionMatchingEmail,
        isPending: false,
      });
    });

    it("should show confirmation dialog when Decline is clicked", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it("should call API when decline is confirmed", async () => {
      mockApi.post.mockResolvedValue({ success: true });

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      // Click decline to show dialog
      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      // Confirm decline
      const confirmButton = screen.getByRole("button", { name: /yes.*decline/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          `/api/invitations/${mockToken}/decline`
        );
      });
    });

    it("should call onDeclined callback after successful decline", async () => {
      const onDeclined = vi.fn();
      mockApi.post.mockResolvedValue({ success: true });

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={onDeclined}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      const confirmButton = screen.getByRole("button", { name: /yes.*decline/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(onDeclined).toHaveBeenCalled();
      });
    });

    it("should close dialog when Cancel is clicked", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });
  });

  describe("Authenticated with Different Email (Mismatch)", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSessionDifferentEmail,
        isPending: false,
      });
    });

    it("should show email mismatch warning", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      // Use the data-testid to verify the warning is shown
      const warningBox = screen.getByTestId("email-mismatch-warning");
      expect(warningBox).toBeInTheDocument();
      expect(warningBox).toHaveTextContent(/different email/i);
    });

    it("should show Switch Account button", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /switch account/i })).toBeInTheDocument();
    });

    it("should call signOut when Switch Account is clicked", async () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const switchButton = screen.getByRole("button", { name: /switch account/i });
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it("should still allow Accept for mismatched email", () => {
      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      // Accept should still be available (business rule: allow any authenticated user)
      expect(screen.getByRole("button", { name: /accept anyway/i })).toBeInTheDocument();
    });

    it("should show loading state on Switch Account button during sign out", async () => {
      // Keep signOut pending
      mockSignOut.mockReturnValue(new Promise(() => {}));

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const switchButton = screen.getByRole("button", { name: /switch account/i });
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(switchButton).toBeDisabled();
        expect(switchButton).toHaveTextContent(/switching/i);
      });
    });

    it("should show error message when sign out fails", async () => {
      const error = new Error("Sign out failed");
      mockSignOut.mockRejectedValue(error);

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const switchButton = screen.getByRole("button", { name: /switch account/i });
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
        expect(screen.getByText(/sign out failed/i)).toBeInTheDocument();
      });
    });

    it("should disable all action buttons while switching account", async () => {
      mockSignOut.mockReturnValue(new Promise(() => {}));

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const switchButton = screen.getByRole("button", { name: /switch account/i });
      const acceptButton = screen.getByRole("button", { name: /accept anyway/i });
      const declineButton = screen.getByRole("button", { name: /decline/i });

      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(switchButton).toBeDisabled();
        expect(acceptButton).toBeDisabled();
        expect(declineButton).toBeDisabled();
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSessionMatchingEmail,
        isPending: false,
      });
    });

    it("should show error message when accept fails", async () => {
      const error = new Error("Network error");
      mockApi.post.mockRejectedValue(error);

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });
    });

    it("should show already member error for 400 response", async () => {
      const error = new Error("Already a member");
      (error as any).status = 400;
      (error as any).data = { message: "You are already a member of this team" };
      mockApi.post.mockRejectedValue(error);

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByText(/already a member/i)).toBeInTheDocument();
      });
    });

    it("should show retry button on error", async () => {
      mockApi.post.mockRejectedValue(new Error("Network error"));

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading state while session is pending", () => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: true,
      });

      render(
        <InvitationActions
          invitation={mockInvitation}
          token={mockToken}
          onSuccess={vi.fn()}
          onDeclined={vi.fn()}
        />
      );

      expect(screen.getByTestId("actions-loading")).toBeInTheDocument();
    });
  });
});
