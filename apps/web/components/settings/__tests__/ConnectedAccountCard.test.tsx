/**
 * ConnectedAccountCard Component Tests
 *
 * Tests for the connected account card component that displays individual
 * linked authentication methods with provider info and unlink functionality.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConnectedAccountCard, type ConnectedAccountCardProps } from "../ConnectedAccountCard";

describe("ConnectedAccountCard", () => {
  const mockGoogleAccount: ConnectedAccountCardProps["account"] = {
    id: "account-123",
    providerId: "google",
    accountId: "google-user-id-123",
    createdAt: new Date("2024-12-20T10:00:00Z"),
  };

  const mockGitHubAccount: ConnectedAccountCardProps["account"] = {
    id: "account-456",
    providerId: "github",
    accountId: "github-user-id-456",
    createdAt: new Date("2024-12-25T14:30:00Z"),
  };

  const mockCredentialAccount: ConnectedAccountCardProps["account"] = {
    id: "account-789",
    providerId: "credential",
    accountId: "user@example.com",
    createdAt: new Date("2024-12-15T08:00:00Z"),
  };

  const defaultProps: ConnectedAccountCardProps = {
    account: mockGoogleAccount,
    canUnlink: true,
    onUnlink: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders Google account with correct provider name and icon", () => {
      render(<ConnectedAccountCard {...defaultProps} />);

      expect(screen.getByText("Google")).toBeInTheDocument();
      expect(screen.getByTestId("provider-icon-google")).toBeInTheDocument();
    });

    it("renders GitHub account with correct provider name and icon", () => {
      render(<ConnectedAccountCard {...defaultProps} account={mockGitHubAccount} />);

      expect(screen.getByText("GitHub")).toBeInTheDocument();
      expect(screen.getByTestId("provider-icon-github")).toBeInTheDocument();
    });

    it("renders credential/magic link account with correct display", () => {
      render(<ConnectedAccountCard {...defaultProps} account={mockCredentialAccount} />);

      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByTestId("provider-icon-email")).toBeInTheDocument();
    });

    it("displays connected date", () => {
      render(<ConnectedAccountCard {...defaultProps} />);

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it("renders with proper testid", () => {
      render(<ConnectedAccountCard {...defaultProps} />);

      expect(screen.getByTestId("connected-account-card")).toBeInTheDocument();
    });
  });

  describe("unlink functionality", () => {
    it("shows unlink button when canUnlink is true", () => {
      render(<ConnectedAccountCard {...defaultProps} canUnlink={true} />);

      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });

    it("does not show unlink button when canUnlink is false", () => {
      render(<ConnectedAccountCard {...defaultProps} canUnlink={false} />);

      expect(screen.queryByRole("button", { name: /disconnect/i })).not.toBeInTheDocument();
    });

    it("shows warning tooltip when canUnlink is false (last auth method)", () => {
      render(<ConnectedAccountCard {...defaultProps} canUnlink={false} />);

      expect(screen.getByText(/only.*method/i)).toBeInTheDocument();
    });

    it("shows confirmation dialog when disconnect is clicked", async () => {
      render(<ConnectedAccountCard {...defaultProps} />);

      const disconnectButton = screen.getByRole("button", { name: /disconnect/i });
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });

    it("calls onUnlink with providerId when confirmed", async () => {
      const onUnlink = vi.fn().mockResolvedValue(undefined);
      render(<ConnectedAccountCard {...defaultProps} onUnlink={onUnlink} />);

      // Click disconnect
      fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(onUnlink).toHaveBeenCalledWith("google");
      });
    });

    it("closes dialog when cancel is clicked", async () => {
      render(<ConnectedAccountCard {...defaultProps} />);

      // Click disconnect
      fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Cancel
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("shows loading state while unlinking", async () => {
      let resolveUnlink: () => void;
      const onUnlink = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveUnlink = resolve;
          })
      );
      render(<ConnectedAccountCard {...defaultProps} onUnlink={onUnlink} />);

      // Click disconnect and confirm
      fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Should show loading
      await waitFor(() => {
        expect(screen.getByTestId("unlink-loading")).toBeInTheDocument();
      });

      // Cleanup
      resolveUnlink!();
    });

    it("disables unlink button when isUnlinking prop is true", () => {
      render(<ConnectedAccountCard {...defaultProps} isUnlinking={true} />);

      const disconnectButton = screen.getByRole("button", { name: /disconnect/i });
      expect(disconnectButton).toBeDisabled();
    });

    it("resets loading state when onUnlink throws exception", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onUnlink = vi.fn().mockRejectedValue(new Error("Network error"));
      render(<ConnectedAccountCard {...defaultProps} onUnlink={onUnlink} />);

      // Click disconnect and confirm
      fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(onUnlink).toHaveBeenCalled();
      });

      // Loading should be reset
      await waitFor(() => {
        expect(screen.queryByTestId("unlink-loading")).not.toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it("logs error to console when onUnlink throws exception", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const testError = new Error("Network error");
      const onUnlink = vi.fn().mockRejectedValue(testError);
      render(<ConnectedAccountCard {...defaultProps} onUnlink={onUnlink} />);

      // Click disconnect and confirm
      fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Verify error is logged for debugging
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to unlink account:", testError);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("provider display names", () => {
    it.each([
      ["google", "Google"],
      ["github", "GitHub"],
      ["credential", "Email"],
      ["unknown-provider", "Unknown Provider"],
    ])("displays correct name for provider %s", (providerId, expectedName) => {
      const account = { ...mockGoogleAccount, providerId };
      render(<ConnectedAccountCard {...defaultProps} account={account} />);

      expect(screen.getByText(expectedName)).toBeInTheDocument();
    });
  });

  describe("date formatting", () => {
    it("formats recent date as relative time", () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 30); // 30 minutes ago
      const account = { ...mockGoogleAccount, createdAt: recentDate };
      render(<ConnectedAccountCard {...defaultProps} account={account} />);

      expect(screen.getByText(/minute/i)).toBeInTheDocument();
    });

    it("formats older date as absolute date", () => {
      const oldDate = new Date("2024-01-15T10:00:00Z");
      const account = { ...mockGoogleAccount, createdAt: oldDate };
      render(<ConnectedAccountCard {...defaultProps} account={account} />);

      expect(screen.getByText(/jan/i)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has accessible disconnect button", () => {
      render(<ConnectedAccountCard {...defaultProps} />);

      const button = screen.getByRole("button", { name: /disconnect/i });
      expect(button).toHaveAttribute("type", "button");
    });

    it("provider icon has aria-hidden for screen readers", () => {
      render(<ConnectedAccountCard {...defaultProps} />);

      const icon = screen.getByTestId("provider-icon-google");
      expect(icon.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    });
  });
});
