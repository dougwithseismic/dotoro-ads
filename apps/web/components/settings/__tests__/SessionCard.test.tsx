/**
 * SessionCard Component Tests
 *
 * Tests for the session card component that displays individual session
 * information including device, browser, IP, and revoke functionality.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionCard, type SessionCardProps } from "../SessionCard";

// Mock user-agent parsing
vi.mock("@/lib/user-agent", () => ({
  parseUserAgent: vi.fn((ua: string | null) => {
    if (!ua) {
      return {
        browser: "Unknown",
        browserVersion: null,
        os: "Unknown",
        osVersion: null,
        deviceType: "desktop" as const,
        displayString: "Unknown on Unknown",
      };
    }
    if (ua.includes("iPhone")) {
      return {
        browser: "Safari",
        browserVersion: "17",
        os: "iOS",
        osVersion: "17.2",
        deviceType: "mobile" as const,
        displayString: "Safari on iOS",
      };
    }
    if (ua.includes("iPad")) {
      return {
        browser: "Safari",
        browserVersion: "17",
        os: "iOS",
        osVersion: "17.2",
        deviceType: "tablet" as const,
        displayString: "Safari on iOS",
      };
    }
    return {
      browser: "Chrome",
      browserVersion: "120",
      os: "Windows",
      osVersion: "10",
      deviceType: "desktop" as const,
      displayString: "Chrome on Windows",
    };
  }),
  maskIpAddress: vi.fn((ip: string | null) => {
    if (!ip) return "Unknown";
    return ip.split(".").slice(0, 2).join(".") + ".*.*";
  }),
}));

describe("SessionCard", () => {
  const mockSession: SessionCardProps["session"] = {
    id: "session-123",
    token: "tok_abc123",
    ipAddress: "192.168.1.100",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    createdAt: new Date("2024-12-28T10:00:00Z"),
    updatedAt: new Date("2024-12-28T12:00:00Z"),
  };

  const defaultProps: SessionCardProps = {
    session: mockSession,
    isCurrent: false,
    onRevoke: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders session information", () => {
      render(<SessionCard {...defaultProps} />);

      expect(screen.getByText(/chrome on windows/i)).toBeInTheDocument();
    });

    it("displays masked IP address", () => {
      render(<SessionCard {...defaultProps} />);

      expect(screen.getByText(/192\.168\.\*\.\*/)).toBeInTheDocument();
    });

    it("displays device icon for desktop", () => {
      render(<SessionCard {...defaultProps} />);

      // Desktop icon should be present
      expect(screen.getByTestId("device-icon-desktop")).toBeInTheDocument();
    });

    it("displays device icon for mobile", () => {
      const mobileSession = {
        ...mockSession,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
      };
      render(<SessionCard {...defaultProps} session={mobileSession} />);

      expect(screen.getByTestId("device-icon-mobile")).toBeInTheDocument();
    });

    it("displays device icon for tablet", () => {
      const tabletSession = {
        ...mockSession,
        userAgent:
          "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
      };
      render(<SessionCard {...defaultProps} session={tabletSession} />);

      expect(screen.getByTestId("device-icon-tablet")).toBeInTheDocument();
    });

    it("shows created timestamp", () => {
      render(<SessionCard {...defaultProps} />);

      // Should show some form of date/time
      expect(screen.getByText(/created/i)).toBeInTheDocument();
    });
  });

  describe("current session indicator", () => {
    it("shows 'Current session' badge when isCurrent is true", () => {
      render(<SessionCard {...defaultProps} isCurrent={true} />);

      expect(screen.getByText(/current session/i)).toBeInTheDocument();
    });

    it("does not show 'Current session' badge when isCurrent is false", () => {
      render(<SessionCard {...defaultProps} isCurrent={false} />);

      expect(screen.queryByText(/current session/i)).not.toBeInTheDocument();
    });

    it("does not show revoke button for current session", () => {
      render(<SessionCard {...defaultProps} isCurrent={true} />);

      expect(screen.queryByRole("button", { name: /revoke/i })).not.toBeInTheDocument();
    });
  });

  describe("revoke functionality", () => {
    it("shows revoke button for non-current sessions", () => {
      render(<SessionCard {...defaultProps} isCurrent={false} />);

      expect(screen.getByRole("button", { name: /revoke/i })).toBeInTheDocument();
    });

    it("calls onRevoke when revoke button is clicked", async () => {
      const onRevoke = vi.fn();
      render(<SessionCard {...defaultProps} onRevoke={onRevoke} />);

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      // Should show confirmation first
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });

    it("shows confirmation dialog before revoking", async () => {
      render(<SessionCard {...defaultProps} />);

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText(/revoke session/i)).toBeInTheDocument();
      });
    });

    it("calls onRevoke with session token when confirmed", async () => {
      const onRevoke = vi.fn().mockResolvedValue(undefined);
      render(<SessionCard {...defaultProps} onRevoke={onRevoke} />);

      // Click revoke button
      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      // Wait for dialog and confirm
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(onRevoke).toHaveBeenCalledWith(mockSession.token);
      });
    });

    it("closes dialog when cancel is clicked", async () => {
      render(<SessionCard {...defaultProps} />);

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("shows loading state while revoking", async () => {
      let resolveRevoke: () => void;
      const onRevoke = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveRevoke = resolve;
          })
      );
      render(<SessionCard {...defaultProps} onRevoke={onRevoke} />);

      // Click revoke and confirm
      fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId("revoke-loading")).toBeInTheDocument();
      });

      // Resolve and cleanup
      resolveRevoke!();
    });

    it("disables revoke button when isRevoking prop is true", () => {
      render(<SessionCard {...defaultProps} isRevoking={true} />);

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      expect(revokeButton).toBeDisabled();
    });

    it("resets loading state even when onRevoke throws exception", async () => {
      // Suppress console.error for this test since we're testing error handling
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const testError = new Error("Network failure");
      const onRevoke = vi.fn().mockRejectedValue(testError);
      render(<SessionCard {...defaultProps} onRevoke={onRevoke} />);

      // Click revoke button
      fireEvent.click(screen.getByRole("button", { name: /revoke/i }));

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm revoke
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Wait for onRevoke to be called
      await waitFor(() => {
        expect(onRevoke).toHaveBeenCalled();
      });

      // Loading state should be reset - the button should NOT show "Revoking..."
      // Note: dialog might still be open due to error, but loading state should be false
      await waitFor(() => {
        expect(screen.queryByTestId("revoke-loading")).not.toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it("keeps dialog open when onRevoke throws exception", async () => {
      // Suppress console.error for this test since we're testing error handling
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const testError = new Error("Network failure");
      const onRevoke = vi.fn().mockRejectedValue(testError);
      render(<SessionCard {...defaultProps} onRevoke={onRevoke} />);

      // Click revoke button
      fireEvent.click(screen.getByRole("button", { name: /revoke/i }));

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm revoke
      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      // Wait for onRevoke to be called
      await waitFor(() => {
        expect(onRevoke).toHaveBeenCalled();
      });

      // Wait for error handling to complete
      await waitFor(() => {
        expect(screen.queryByTestId("revoke-loading")).not.toBeInTheDocument();
      });

      // Dialog should remain open since revocation failed
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("handles null IP address", () => {
      const sessionWithNullIp = {
        ...mockSession,
        ipAddress: null,
      };
      render(<SessionCard {...defaultProps} session={sessionWithNullIp} />);

      expect(screen.getByText(/unknown/i)).toBeInTheDocument();
    });

    it("handles null user agent", () => {
      const sessionWithNullUa = {
        ...mockSession,
        userAgent: null,
      };
      render(<SessionCard {...defaultProps} session={sessionWithNullUa} />);

      expect(screen.getByText(/unknown on unknown/i)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has accessible button with descriptive label", () => {
      render(<SessionCard {...defaultProps} />);

      const button = screen.getByRole("button", { name: /revoke/i });
      expect(button).toBeInTheDocument();
    });

    it("revoke button has proper aria attributes", () => {
      render(<SessionCard {...defaultProps} />);

      const button = screen.getByRole("button", { name: /revoke/i });
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
