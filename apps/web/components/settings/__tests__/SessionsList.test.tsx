/**
 * SessionsList Component Tests
 *
 * Tests for the sessions list component that displays all user sessions
 * with loading, error, and empty states.
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SessionsList } from "../SessionsList";

// Mock the auth-client module
const mockListSessions = vi.fn();
const mockRevokeSession = vi.fn();
const mockRevokeOtherSessions = vi.fn();
const mockUseSession = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  listSessions: () => mockListSessions(),
  revokeSession: (params: { token: string }) => mockRevokeSession(params),
  revokeOtherSessions: () => mockRevokeOtherSessions(),
  useSession: () => mockUseSession(),
}));

// Mock user-agent parsing
vi.mock("@/lib/user-agent", () => ({
  parseUserAgent: vi.fn((ua: string | null) => ({
    browser: "Chrome",
    browserVersion: "120",
    os: "Windows",
    osVersion: "10",
    deviceType: "desktop" as const,
    displayString: "Chrome on Windows",
  })),
  maskIpAddress: vi.fn((ip: string | null) => ip ? `${ip.split(".").slice(0, 2).join(".")}.*.*` : "Unknown"),
}));

describe("SessionsList", () => {
  const mockCurrentSessionToken = "current-token-123";

  const mockSessions = [
    {
      id: "session-1",
      token: mockCurrentSessionToken,
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      createdAt: new Date("2024-12-28T10:00:00Z"),
      updatedAt: new Date("2024-12-28T12:00:00Z"),
      expiresAt: new Date("2025-01-04T10:00:00Z"),
      userId: "user-1",
    },
    {
      id: "session-2",
      token: "other-token-456",
      ipAddress: "10.0.0.50",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      createdAt: new Date("2024-12-27T08:00:00Z"),
      updatedAt: new Date("2024-12-27T10:00:00Z"),
      expiresAt: new Date("2025-01-03T08:00:00Z"),
      userId: "user-1",
    },
    {
      id: "session-3",
      token: "another-token-789",
      ipAddress: "172.16.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      createdAt: new Date("2024-12-26T06:00:00Z"),
      updatedAt: new Date("2024-12-26T08:00:00Z"),
      expiresAt: new Date("2025-01-02T06:00:00Z"),
      userId: "user-1",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        session: { token: mockCurrentSessionToken },
        user: { id: "user-1", email: "test@example.com" },
      },
      isPending: false,
      error: null,
    });
  });

  describe("loading state", () => {
    it("shows loading skeleton while fetching sessions", async () => {
      mockListSessions.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<SessionsList />);

      expect(screen.getByTestId("sessions-loading")).toBeInTheDocument();
    });

    it("displays skeleton cards during loading", async () => {
      mockListSessions.mockImplementation(
        () => new Promise(() => {})
      );

      render(<SessionsList />);

      const skeletons = screen.getAllByTestId("session-skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("successful data fetch", () => {
    it("displays sessions list after loading", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.queryByTestId("sessions-loading")).not.toBeInTheDocument();
      });

      // Should show session cards
      const sessionCards = screen.getAllByTestId("session-card");
      expect(sessionCards).toHaveLength(3);
    });

    it("marks current session with badge", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getByText(/current session/i)).toBeInTheDocument();
      });
    });

    it("sorts sessions with current session first", async () => {
      // Return sessions in different order
      mockListSessions.mockResolvedValue({
        data: [mockSessions[2], mockSessions[0], mockSessions[1]], // Current session in middle
        error: null,
      });

      render(<SessionsList />);

      await waitFor(() => {
        const sessionCards = screen.getAllByTestId("session-card");
        expect(sessionCards).toHaveLength(3);
      });

      // Current session should be first (has the badge)
      const firstCard = screen.getAllByTestId("session-card")[0];
      expect(firstCard).toHaveTextContent(/current session/i);
    });
  });

  describe("error state", () => {
    it("shows error message when fetch fails", async () => {
      mockListSessions.mockResolvedValue({
        data: null,
        error: { message: "Failed to fetch sessions" },
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load sessions/i)).toBeInTheDocument();
      });
    });

    it("shows retry button on error", async () => {
      mockListSessions.mockResolvedValue({
        data: null,
        error: { message: "Network error" },
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      });
    });

    it("retries fetch when retry button is clicked", async () => {
      mockListSessions.mockResolvedValueOnce({
        data: null,
        error: { message: "Network error" },
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      });

      // Mock successful response for retry
      mockListSessions.mockResolvedValueOnce({
        data: mockSessions,
        error: null,
      });

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      await waitFor(() => {
        expect(mockListSessions).toHaveBeenCalledTimes(2);
      });
    });

    it("clears sessions state when fetch error occurs to avoid stale data", async () => {
      // First successful load
      mockListSessions.mockResolvedValueOnce({
        data: mockSessions,
        error: null,
      });

      const { rerender } = render(<SessionsList />);

      // Wait for sessions to load
      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      // Now mock an error for the next fetch
      mockListSessions.mockResolvedValueOnce({
        data: null,
        error: { message: "Network error" },
      });

      // Click retry to trigger a new fetch that fails
      // First we need to trigger an error state - unmount and remount with error
      rerender(<SessionsList key="reload" />);

      // Should show error state without any stale session cards
      await waitFor(() => {
        expect(screen.getByText(/failed to load sessions/i)).toBeInTheDocument();
      });

      // Verify no session cards are displayed (stale data cleared)
      expect(screen.queryAllByTestId("session-card")).toHaveLength(0);
    });

    it("logs actual error when fetchSessions throws exception", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const networkError = new Error("Network connection failed");
      mockListSessions.mockRejectedValueOnce(networkError);

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load sessions/i)).toBeInTheDocument();
      });

      // Should log the actual error for debugging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to fetch sessions:",
        networkError
      );

      consoleErrorSpy.mockRestore();
    });

    it("shows user-friendly message but includes error details when fetchSessions throws", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const specificError = new Error("CORS policy blocked the request");
      mockListSessions.mockRejectedValueOnce(specificError);

      render(<SessionsList />);

      // Should show generic user-facing message
      await waitFor(() => {
        expect(screen.getByText(/failed to load sessions/i)).toBeInTheDocument();
      });

      // But the actual error should be logged for debugging
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("empty state", () => {
    it("shows empty state for single session (current only)", async () => {
      mockListSessions.mockResolvedValue({
        data: [mockSessions[0]], // Only current session
        error: null,
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getByText(/only active session/i)).toBeInTheDocument();
      });
    });
  });

  describe("session revocation", () => {
    it("calls revokeSession when revoke is confirmed", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeSession.mockResolvedValue({ data: {}, error: null });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      // Find individual revoke buttons (not the "Revoke all other sessions" button)
      // These are the "Revoke" buttons inside session cards (exact match)
      const revokeButtons = screen.getAllByRole("button", { name: /^revoke$/i });
      expect(revokeButtons.length).toBe(2); // 2 non-current sessions have revoke buttons

      fireEvent.click(revokeButtons[0]);

      // Confirm in dialog
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockRevokeSession).toHaveBeenCalled();
      });
    });

    it("removes session from list after successful revocation", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeSession.mockResolvedValue({ data: {}, error: null });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      // Find individual revoke buttons (exact match)
      const revokeButtons = screen.getAllByRole("button", { name: /^revoke$/i });
      fireEvent.click(revokeButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        const sessionCards = screen.getAllByTestId("session-card");
        expect(sessionCards).toHaveLength(2);
      });
    });

    it("shows error message when session revocation fails", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeSession.mockResolvedValue({
        data: null,
        error: { message: "Failed to revoke session" },
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      // Click revoke on a non-current session
      const revokeButtons = screen.getAllByRole("button", { name: /^revoke$/i });
      fireEvent.click(revokeButtons[0]);

      // Confirm in dialog
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Should show error message to user
      await waitFor(() => {
        expect(screen.getByText(/failed to revoke session/i)).toBeInTheDocument();
      });
    });

    it("does not remove session from list when revocation fails", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeSession.mockResolvedValue({
        data: null,
        error: { message: "Failed to revoke session" },
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      // Click revoke on a non-current session
      const revokeButtons = screen.getAllByRole("button", { name: /^revoke$/i });
      fireEvent.click(revokeButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Wait for the error to appear
      await waitFor(() => {
        expect(screen.getByText(/failed to revoke session/i)).toBeInTheDocument();
      });

      // Sessions list should still have all 3 cards
      expect(screen.getAllByTestId("session-card")).toHaveLength(3);
    });

    it("handles thrown exceptions from revokeSession (network errors)", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const networkError = new Error("Network request failed");

      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeSession.mockRejectedValueOnce(networkError);

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      // Click revoke on a non-current session
      const revokeButtons = screen.getAllByRole("button", { name: /^revoke$/i });
      fireEvent.click(revokeButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Should show error message for thrown exception
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Should log the actual error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to revoke session:",
        networkError
      );

      // Sessions should not be removed
      expect(screen.getAllByTestId("session-card")).toHaveLength(3);

      consoleErrorSpy.mockRestore();
    });

    it("resets revoking state when revokeSession throws exception", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeSession.mockRejectedValueOnce(new Error("Network error"));

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      const revokeButtons = screen.getAllByRole("button", { name: /^revoke$/i });
      fireEvent.click(revokeButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // After error, revoke buttons should be enabled again (not disabled)
      await waitFor(() => {
        const enabledRevokeButtons = screen.getAllByRole("button", { name: /^revoke$/i });
        expect(enabledRevokeButtons[0]).not.toBeDisabled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("revoke all other sessions", () => {
    it("shows revoke all button when there are other sessions", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /revoke all other sessions/i })
        ).toBeInTheDocument();
      });
    });

    it("does not show revoke all button when only current session exists", async () => {
      mockListSessions.mockResolvedValue({
        data: [mockSessions[0]], // Only current session
        error: null,
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getByText(/only active session/i)).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("button", { name: /revoke all other sessions/i })
      ).not.toBeInTheDocument();
    });

    it("calls revokeOtherSessions when confirmed", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeOtherSessions.mockResolvedValue({ data: {}, error: null });

      render(<SessionsList />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /revoke all other sessions/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /revoke all other sessions/i })
      );

      // Confirm in dialog
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockRevokeOtherSessions).toHaveBeenCalled();
      });
    });

    it("removes all other sessions from list after successful bulk revocation", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeOtherSessions.mockResolvedValue({ data: {}, error: null });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      fireEvent.click(
        screen.getByRole("button", { name: /revoke all other sessions/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        // Only current session should remain
        const sessionCards = screen.getAllByTestId("session-card");
        expect(sessionCards).toHaveLength(1);
      });
    });

    it("shows error message when bulk revocation fails", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeOtherSessions.mockResolvedValue({
        data: null,
        error: { message: "Failed to revoke sessions" },
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      fireEvent.click(
        screen.getByRole("button", { name: /revoke all other sessions/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Should show error message to user
      await waitFor(() => {
        expect(screen.getByText(/failed to revoke sessions/i)).toBeInTheDocument();
      });
    });

    it("does not remove sessions from list when bulk revocation fails", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeOtherSessions.mockResolvedValue({
        data: null,
        error: { message: "Failed to revoke sessions" },
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      fireEvent.click(
        screen.getByRole("button", { name: /revoke all other sessions/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/failed to revoke sessions/i)).toBeInTheDocument();
      });

      // Sessions list should still have all 3 cards
      expect(screen.getAllByTestId("session-card")).toHaveLength(3);
    });

    it("handles thrown exceptions from revokeOtherSessions (network errors)", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const networkError = new Error("Network request failed");

      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeOtherSessions.mockRejectedValueOnce(networkError);

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      fireEvent.click(
        screen.getByRole("button", { name: /revoke all other sessions/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Should show error message for thrown exception
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Should log the actual error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to revoke other sessions:",
        networkError
      );

      // Sessions should not be removed
      expect(screen.getAllByTestId("session-card")).toHaveLength(3);

      consoleErrorSpy.mockRestore();
    });

    it("resets revokingAll state when revokeOtherSessions throws exception", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeOtherSessions.mockRejectedValueOnce(new Error("Network error"));

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      fireEvent.click(
        screen.getByRole("button", { name: /revoke all other sessions/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // After error, the revoke all button should be enabled again
      await waitFor(() => {
        const revokeAllButton = screen.getByRole("button", { name: /revoke all other sessions/i });
        expect(revokeAllButton).not.toBeDisabled();
      });

      consoleErrorSpy.mockRestore();
    });

    it("closes dialog when revokeOtherSessions throws exception", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });
      mockRevokeOtherSessions.mockRejectedValueOnce(new Error("Network error"));

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getAllByTestId("session-card")).toHaveLength(3);
      });

      fireEvent.click(
        screen.getByRole("button", { name: /revoke all other sessions/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Wait for error handling - dialog should close
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Error message should be visible
      expect(screen.getByRole("alert")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("session count display", () => {
    it("displays the total number of active sessions", async () => {
      mockListSessions.mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getByText(/3 active sessions/i)).toBeInTheDocument();
      });
    });

    it("uses singular form for single session", async () => {
      mockListSessions.mockResolvedValue({
        data: [mockSessions[0]],
        error: null,
      });

      render(<SessionsList />);

      await waitFor(() => {
        expect(screen.getByText(/1 active session$/i)).toBeInTheDocument();
      });
    });
  });
});
