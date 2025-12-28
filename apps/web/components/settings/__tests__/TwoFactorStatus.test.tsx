/**
 * TwoFactorStatus Component Tests
 *
 * Tests for the 2FA status section in security settings that shows
 * current 2FA status and allows enabling/disabling 2FA.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TwoFactorStatus } from "../TwoFactorStatus";

// Mock the auth client
vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(),
  twoFactor: {
    disable: vi.fn(),
    generateBackupCodes: vi.fn(),
  },
}));

// Import mocked functions
import { useSession, twoFactor } from "@/lib/auth-client";

const mockUseSession = useSession as ReturnType<typeof vi.fn>;
const mockTwoFactor = twoFactor as {
  disable: ReturnType<typeof vi.fn>;
  generateBackupCodes: ReturnType<typeof vi.fn>;
};

describe("TwoFactorStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: 2FA is disabled
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
          twoFactorEnabled: false,
        },
      },
      isPending: false,
    });
    mockTwoFactor.disable.mockResolvedValue({
      data: { success: true },
      error: null,
    });
    mockTwoFactor.generateBackupCodes.mockResolvedValue({
      data: { backupCodes: ["AAAA-BBBB", "CCCC-DDDD"] },
      error: null,
    });
  });

  describe("when 2FA is disabled", () => {
    it("shows 2FA is disabled status", () => {
      render(<TwoFactorStatus />);

      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
      expect(screen.getByText(/disabled|not enabled/i)).toBeInTheDocument();
    });

    it("shows enable 2FA button", () => {
      render(<TwoFactorStatus />);

      expect(screen.getByRole("button", { name: /enable/i })).toBeInTheDocument();
    });

    it("opens setup wizard when enable button is clicked", async () => {
      render(<TwoFactorStatus />);

      fireEvent.click(screen.getByRole("button", { name: /enable/i }));

      await waitFor(() => {
        expect(screen.getByTestId("two-factor-setup")).toBeInTheDocument();
      });
    });

    it("shows security benefit message", () => {
      render(<TwoFactorStatus />);

      expect(screen.getByText(/add.*layer.*security/i)).toBeInTheDocument();
    });
  });

  describe("when 2FA is enabled", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            twoFactorEnabled: true,
          },
        },
        isPending: false,
      });
    });

    it("shows 2FA is enabled status", () => {
      render(<TwoFactorStatus />);

      expect(screen.getByText(/enabled|active/i)).toBeInTheDocument();
    });

    it("shows enabled indicator (checkmark or badge)", () => {
      render(<TwoFactorStatus />);

      expect(screen.getByTestId("2fa-enabled-badge")).toBeInTheDocument();
    });

    it("shows disable 2FA button", () => {
      render(<TwoFactorStatus />);

      expect(screen.getByRole("button", { name: /disable/i })).toBeInTheDocument();
    });

    it("shows regenerate backup codes option", () => {
      render(<TwoFactorStatus />);

      expect(screen.getByRole("button", { name: /regenerate codes/i })).toBeInTheDocument();
    });

    it("opens confirmation dialog when disable is clicked", async () => {
      render(<TwoFactorStatus />);

      fireEvent.click(screen.getByRole("button", { name: /disable/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });

    it("calls twoFactor.disable when confirmed", async () => {
      render(<TwoFactorStatus />);

      fireEvent.click(screen.getByRole("button", { name: /disable/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(mockTwoFactor.disable).toHaveBeenCalled();
      });
    });

    it("closes dialog when cancel is clicked", async () => {
      render(<TwoFactorStatus />);

      fireEvent.click(screen.getByRole("button", { name: /disable/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("shows confirmation dialog before regenerating backup codes", async () => {
      render(<TwoFactorStatus />);

      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));

      await waitFor(() => {
        // Should show confirmation dialog with warning
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText(/invalidate all your existing codes/i)).toBeInTheDocument();
      });
    });

    it("generates new backup codes after confirming regeneration", async () => {
      render(<TwoFactorStatus />);

      // Click regenerate button
      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Get the dialog and find the confirm button inside it
      const dialog = screen.getByRole("dialog");
      const confirmButton = dialog.querySelector("button:last-of-type") as HTMLButtonElement;
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockTwoFactor.generateBackupCodes).toHaveBeenCalled();
      });
    });

    it("cancels regeneration when cancel is clicked", async () => {
      render(<TwoFactorStatus />);

      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Should NOT have called generateBackupCodes
      expect(mockTwoFactor.generateBackupCodes).not.toHaveBeenCalled();
    });
  });

  describe("loading states", () => {
    it("shows loading skeleton when session is pending", () => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: true,
      });

      render(<TwoFactorStatus />);

      expect(screen.getByTestId("2fa-loading")).toBeInTheDocument();
    });

    it("shows loading state during disable operation", async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            twoFactorEnabled: true,
          },
        },
        isPending: false,
      });

      mockTwoFactor.disable.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<TwoFactorStatus />);

      fireEvent.click(screen.getByRole("button", { name: /disable/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(screen.getByTestId("confirm-loading")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows error when disable fails", async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            twoFactorEnabled: true,
          },
        },
        isPending: false,
      });

      mockTwoFactor.disable.mockResolvedValue({
        data: null,
        error: { message: "Failed to disable 2FA" },
      });

      render(<TwoFactorStatus />);

      fireEvent.click(screen.getByRole("button", { name: /disable/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to disable/i)).toBeInTheDocument();
      });
    });
  });

  describe("setup completion", () => {
    it("opens setup wizard when enable button clicked", async () => {
      render(<TwoFactorStatus />);

      fireEvent.click(screen.getByRole("button", { name: /enable/i }));

      // Verify the setup wizard is shown
      await waitFor(() => {
        expect(screen.getByTestId("two-factor-setup")).toBeInTheDocument();
      });
    });
  });

  describe("backup codes validation", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            twoFactorEnabled: true,
          },
        },
        isPending: false,
      });
    });

    it("shows error when server returns empty backup codes on regenerate", async () => {
      mockTwoFactor.generateBackupCodes.mockResolvedValue({
        data: { backupCodes: [] }, // Empty backup codes
        error: null,
      });

      render(<TwoFactorStatus />);

      // Click regenerate button
      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm regeneration
      const dialog = screen.getByRole("dialog");
      const confirmButton = dialog.querySelector("button:last-of-type") as HTMLButtonElement;
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/server did not return backup codes/i)).toBeInTheDocument();
      });
    });

    it("shows error when server returns null backup codes on regenerate", async () => {
      mockTwoFactor.generateBackupCodes.mockResolvedValue({
        data: { backupCodes: null }, // Null backup codes
        error: null,
      });

      render(<TwoFactorStatus />);

      // Click regenerate button
      fireEvent.click(screen.getByRole("button", { name: /regenerate codes/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm regeneration
      const dialog = screen.getByRole("dialog");
      const confirmButton = dialog.querySelector("button:last-of-type") as HTMLButtonElement;
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/server did not return backup codes/i)).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("has proper heading for section", () => {
      render(<TwoFactorStatus />);

      expect(screen.getByRole("heading", { name: /two-factor/i })).toBeInTheDocument();
    });

    it("buttons have accessible names", () => {
      render(<TwoFactorStatus />);

      const enableButton = screen.getByRole("button", { name: /enable/i });
      expect(enableButton).toBeInTheDocument();
    });
  });
});
