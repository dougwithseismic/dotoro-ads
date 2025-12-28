/**
 * Invitation Page Tests
 *
 * Integration tests for the full invitation acceptance flow.
 * Tests the InvitationPageClient component which contains all the logic.
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { InvitationPageClient } from "../InvitationPageClient";

// Mock the hooks
vi.mock("@/lib/hooks/useInvitation", () => ({
  useInvitation: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

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

// Import mocks
import { useInvitation } from "@/lib/hooks/useInvitation";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api-client";

const mockUseInvitation = useInvitation as Mock;
const mockUseSession = useSession as Mock;
const mockApi = api as { post: Mock };

// Test data
const mockValidInvitation = {
  teamName: "Acme Corporation",
  teamSlug: "acme-corp",
  inviterEmail: "admin@acme.com",
  inviteeEmail: "invited@acme.com",
  role: "editor" as const,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockSession = {
  user: {
    id: "user-123",
    email: "invited@acme.com", // Matches inviteeEmail
    name: "Test User",
  },
};

describe("InvitationPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.post = vi.fn();
  });

  describe("Loading State", () => {
    it("should show loading skeleton while fetching invitation", () => {
      mockUseInvitation.mockReturnValue({
        invitation: null,
        isLoading: true,
        error: null,
        errorType: null,
        refetch: vi.fn(),
      });
      mockUseSession.mockReturnValue({ data: null, isPending: true });

      render(<InvitationPageClient token="test-token" />);

      expect(screen.getByTestId("invitation-loading")).toBeInTheDocument();
    });
  });

  describe("Valid Invitation - Not Authenticated", () => {
    beforeEach(() => {
      mockUseInvitation.mockReturnValue({
        invitation: mockValidInvitation,
        isLoading: false,
        error: null,
        errorType: null,
        refetch: vi.fn(),
      });
      mockUseSession.mockReturnValue({ data: null, isPending: false });
    });

    it("should display invitation card with team details", () => {
      render(<InvitationPageClient token="test-token" />);

      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
      expect(screen.getByText(/admin@acme.com/)).toBeInTheDocument();
    });

    it("should show sign in prompt", () => {
      render(<InvitationPageClient token="test-token" />);

      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    it("should display OAuth buttons", () => {
      render(<InvitationPageClient token="test-token" />);

      expect(screen.getByTestId("oauth-buttons")).toBeInTheDocument();
    });
  });

  describe("Valid Invitation - Authenticated", () => {
    beforeEach(() => {
      mockUseInvitation.mockReturnValue({
        invitation: mockValidInvitation,
        isLoading: false,
        error: null,
        errorType: null,
        refetch: vi.fn(),
      });
      mockUseSession.mockReturnValue({ data: mockSession, isPending: false });
    });

    it("should display Accept and Decline buttons", () => {
      render(<InvitationPageClient token="test-token" />);

      expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
    });

    it("should show user email in user info", () => {
      render(<InvitationPageClient token="test-token" />);

      // Find the user info text - there may also be email mismatch warning
      const userInfoElements = screen.getAllByText(/invited@acme.com/i);
      expect(userInfoElements.length).toBeGreaterThan(0);
    });
  });

  describe("Error States", () => {
    it("should show Invalid Token error for not_found", () => {
      mockUseInvitation.mockReturnValue({
        invitation: null,
        isLoading: false,
        error: { message: "Not found", status: 404 },
        errorType: "not_found",
        refetch: vi.fn(),
      });
      mockUseSession.mockReturnValue({ data: null, isPending: false });

      render(<InvitationPageClient token="invalid-token" />);

      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });

    it("should show Expired error for expired invitations", () => {
      mockUseInvitation.mockReturnValue({
        invitation: null,
        isLoading: false,
        error: { message: "Expired", status: 404 },
        errorType: "expired",
        refetch: vi.fn(),
      });
      mockUseSession.mockReturnValue({ data: null, isPending: false });

      render(<InvitationPageClient token="expired-token" />);

      expect(screen.getByTestId("expired-error")).toBeInTheDocument();
    });

    it("should show Already Accepted error", () => {
      mockUseInvitation.mockReturnValue({
        invitation: null,
        isLoading: false,
        error: { message: "Already accepted", status: 404 },
        errorType: "already_accepted",
        refetch: vi.fn(),
      });
      mockUseSession.mockReturnValue({ data: null, isPending: false });

      render(<InvitationPageClient token="accepted-token" />);

      // This should show a generic not found since we don't have team info
      expect(screen.getByTestId("invalid-token-error")).toBeInTheDocument();
    });
  });

  describe("Accept Flow", () => {
    beforeEach(() => {
      mockUseInvitation.mockReturnValue({
        invitation: mockValidInvitation,
        isLoading: false,
        error: null,
        errorType: null,
        refetch: vi.fn(),
      });
      mockUseSession.mockReturnValue({ data: mockSession, isPending: false });
    });

    it("should show success view after accepting", async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        teamId: "team-123",
        teamSlug: "acme-corp",
      });

      render(<InvitationPageClient token="test-token" />);

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });
    });

    it("should show error when accept fails", async () => {
      const error = new Error("Server error");
      (error as any).status = 500;
      mockApi.post.mockRejectedValue(error);

      render(<InvitationPageClient token="test-token" />);

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });
    });
  });

  describe("Decline Flow", () => {
    beforeEach(() => {
      mockUseInvitation.mockReturnValue({
        invitation: mockValidInvitation,
        isLoading: false,
        error: null,
        errorType: null,
        refetch: vi.fn(),
      });
      mockUseSession.mockReturnValue({ data: mockSession, isPending: false });
    });

    it("should show confirmation dialog when Decline is clicked", () => {
      render(<InvitationPageClient token="test-token" />);

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it("should show declined view after confirming decline", async () => {
      mockApi.post.mockResolvedValue({ success: true });

      render(<InvitationPageClient token="test-token" />);

      // Click decline
      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      // Confirm
      const confirmButton = screen.getByRole("button", { name: /yes.*decline/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByTestId("declined-view")).toBeInTheDocument();
      });
    });
  });

  describe("SEO Metadata", () => {
    it("should have correct page structure for SEO", () => {
      mockUseInvitation.mockReturnValue({
        invitation: mockValidInvitation,
        isLoading: false,
        error: null,
        errorType: null,
        refetch: vi.fn(),
      });
      mockUseSession.mockReturnValue({ data: null, isPending: false });

      render(<InvitationPageClient token="test-token" />);

      // Check for main landmark
      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });
});
