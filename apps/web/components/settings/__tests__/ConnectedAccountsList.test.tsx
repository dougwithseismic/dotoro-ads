/**
 * ConnectedAccountsList Component Tests
 *
 * Tests for the connected accounts list component that displays all linked
 * authentication methods with ability to link/unlink providers.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConnectedAccountsList } from "../ConnectedAccountsList";

// Mock auth-client
vi.mock("@/lib/auth-client", () => ({
  listAccounts: vi.fn(),
  linkSocial: vi.fn(),
  unlinkAccount: vi.fn(),
}));

// Import mocked functions
import { listAccounts, linkSocial, unlinkAccount } from "@/lib/auth-client";

const mockListAccounts = listAccounts as ReturnType<typeof vi.fn>;
const mockLinkSocial = linkSocial as ReturnType<typeof vi.fn>;
const mockUnlinkAccount = unlinkAccount as ReturnType<typeof vi.fn>;

describe("ConnectedAccountsList", () => {
  const mockGoogleAccount = {
    id: "account-1",
    providerId: "google",
    accountId: "google-user-123",
    createdAt: new Date("2024-12-20T10:00:00Z"),
    updatedAt: new Date("2024-12-20T10:00:00Z"),
    userId: "user-123",
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: null,
  };

  const mockGitHubAccount = {
    id: "account-2",
    providerId: "github",
    accountId: "github-user-456",
    createdAt: new Date("2024-12-25T14:30:00Z"),
    updatedAt: new Date("2024-12-25T14:30:00Z"),
    userId: "user-123",
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: null,
  };

  const mockCredentialAccount = {
    id: "account-3",
    providerId: "credential",
    accountId: "user@example.com",
    createdAt: new Date("2024-12-15T08:00:00Z"),
    updatedAt: new Date("2024-12-15T08:00:00Z"),
    userId: "user-123",
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows loading skeleton while fetching accounts", async () => {
      // Never resolve to keep in loading state
      mockListAccounts.mockReturnValue(new Promise(() => {}));

      render(<ConnectedAccountsList />);

      expect(screen.getByTestId("accounts-loading")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message when fetch fails", async () => {
      mockListAccounts.mockResolvedValue({
        error: { message: "Failed to fetch accounts" },
        data: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it("shows retry button on error", async () => {
      mockListAccounts.mockResolvedValue({
        error: { message: "Network error" },
        data: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      });
    });

    it("retries fetching accounts when retry button is clicked", async () => {
      mockListAccounts
        .mockResolvedValueOnce({ error: { message: "Error" }, data: null })
        .mockResolvedValueOnce({ data: [mockGoogleAccount], error: null });

      render(<ConnectedAccountsList />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      // Should call listAccounts again
      await waitFor(() => {
        expect(mockListAccounts).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("displaying accounts", () => {
    it("displays all connected accounts", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockGoogleAccount, mockGitHubAccount],
        error: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
        expect(screen.getByText("GitHub")).toBeInTheDocument();
      });
    });

    it("displays credential account as Email", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockCredentialAccount],
        error: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByText("Email")).toBeInTheDocument();
      });
    });

    it("shows connected accounts count", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockGoogleAccount, mockGitHubAccount, mockCredentialAccount],
        error: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByText(/3 connected/i)).toBeInTheDocument();
      });
    });
  });

  describe("connect new provider", () => {
    it("shows connect buttons for providers not yet linked", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockCredentialAccount], // Only email, no OAuth
        error: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /connect google/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /connect github/i })).toBeInTheDocument();
      });
    });

    it("does not show connect button for already linked provider", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockGoogleAccount],
        error: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /connect google/i })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /connect github/i })).toBeInTheDocument();
      });
    });

    it("calls linkSocial when connect button is clicked", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockCredentialAccount],
        error: null,
      });
      mockLinkSocial.mockResolvedValue({ data: null, error: null });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /connect google/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /connect google/i }));

      await waitFor(() => {
        expect(mockLinkSocial).toHaveBeenCalledWith({
          provider: "google",
          callbackURL: expect.stringContaining("/settings"),
        });
      });
    });

    it("shows loading state when connecting", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockCredentialAccount],
        error: null,
      });
      // Keep promise pending
      mockLinkSocial.mockReturnValue(new Promise(() => {}));

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /connect google/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /connect google/i }));

      await waitFor(() => {
        expect(screen.getByTestId("connect-loading-google")).toBeInTheDocument();
      });
    });

    it("shows error when linkSocial fails", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockCredentialAccount],
        error: null,
      });
      mockLinkSocial.mockResolvedValue({
        error: { message: "OAuth provider unavailable" },
        data: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /connect google/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /connect google/i }));

      await waitFor(() => {
        expect(screen.getByText(/oauth provider unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe("unlink functionality", () => {
    it("allows unlinking when multiple accounts exist", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockGoogleAccount, mockGitHubAccount],
        error: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        // Should have disconnect buttons since there are multiple accounts
        const disconnectButtons = screen.getAllByRole("button", { name: /disconnect/i });
        expect(disconnectButtons.length).toBeGreaterThan(0);
      });
    });

    it("prevents unlinking when only one account exists", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockGoogleAccount], // Only one account
        error: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        // Should show "Only sign-in method" warning
        expect(screen.getByText(/only.*method/i)).toBeInTheDocument();
        // Should NOT have disconnect button
        expect(screen.queryByRole("button", { name: /disconnect/i })).not.toBeInTheDocument();
      });
    });

    it("calls unlinkAccount when disconnect is confirmed", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockGoogleAccount, mockGitHubAccount],
        error: null,
      });
      mockUnlinkAccount.mockResolvedValue({ data: null, error: null });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: /disconnect/i })).toHaveLength(2);
      });

      // Click first disconnect button (Google)
      const disconnectButtons = screen.getAllByRole("button", { name: /disconnect/i });
      fireEvent.click(disconnectButtons[0]);

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm unlink
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockUnlinkAccount).toHaveBeenCalledWith({ providerId: "google" });
      });
    });

    it("removes account from list after successful unlink", async () => {
      mockListAccounts.mockResolvedValue({
        data: [mockGoogleAccount, mockGitHubAccount],
        error: null,
      });
      mockUnlinkAccount.mockResolvedValue({ data: null, error: null });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
        expect(screen.getByText("GitHub")).toBeInTheDocument();
      });

      // Click Google's disconnect button
      const disconnectButtons = screen.getAllByRole("button", { name: /disconnect/i });
      fireEvent.click(disconnectButtons[0]);

      // Confirm
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Google should be removed
      await waitFor(() => {
        expect(screen.queryByText("Google")).not.toBeInTheDocument();
        expect(screen.getByText("GitHub")).toBeInTheDocument();
      });
    });

    it("shows error when unlink fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockListAccounts.mockResolvedValue({
        data: [mockGoogleAccount, mockGitHubAccount],
        error: null,
      });
      mockUnlinkAccount.mockResolvedValue({
        error: { message: "Cannot unlink last account" },
        data: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
      });

      // Click disconnect and confirm
      const disconnectButtons = screen.getAllByRole("button", { name: /disconnect/i });
      fireEvent.click(disconnectButtons[0]);
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Error should be shown
      await waitFor(() => {
        expect(screen.getByText(/cannot unlink last account/i)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it("updates error state even when previous error exists (no race condition)", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockCredentialForTest = {
        ...mockCredentialAccount,
        id: "account-cred",
        providerId: "credential",
      };
      mockListAccounts.mockResolvedValue({
        data: [mockGoogleAccount, mockGitHubAccount, mockCredentialForTest],
        error: null,
      });

      // First unlink fails
      mockUnlinkAccount
        .mockResolvedValueOnce({
          error: { message: "First error" },
          data: null,
        })
        .mockResolvedValueOnce({
          error: { message: "Second error" },
          data: null,
        });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
      });

      // First unlink attempt - Google
      const disconnectButtons = screen.getAllByRole("button", { name: /disconnect/i });
      fireEvent.click(disconnectButtons[0]);
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // First error should be shown
      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument();
      });

      // Close dialog by clicking cancel
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Second unlink attempt - GitHub (should overwrite error state)
      const newDisconnectButtons = screen.getAllByRole("button", { name: /disconnect/i });
      fireEvent.click(newDisconnectButtons[1]); // GitHub
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Second error should overwrite first error (no race condition)
      await waitFor(() => {
        expect(screen.getByText(/second error/i)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("empty state", () => {
    it("shows empty state when no accounts exist", async () => {
      mockListAccounts.mockResolvedValue({
        data: [],
        error: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByText(/no accounts connected/i)).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("loading skeleton has proper testid", async () => {
      mockListAccounts.mockReturnValue(new Promise(() => {}));

      render(<ConnectedAccountsList />);

      expect(screen.getByTestId("accounts-loading")).toBeInTheDocument();
    });

    it("error message has proper role", async () => {
      mockListAccounts.mockResolvedValue({
        error: { message: "Error" },
        data: null,
      });

      render(<ConnectedAccountsList />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });
});
