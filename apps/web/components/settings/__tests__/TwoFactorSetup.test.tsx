/**
 * TwoFactorSetup Component Tests
 *
 * Tests for the 2FA setup wizard that guides users through enabling
 * two-factor authentication on their account.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TwoFactorSetup, type TwoFactorSetupProps } from "../TwoFactorSetup";

// Mock the auth client
vi.mock("@/lib/auth-client", () => ({
  twoFactor: {
    enable: vi.fn(),
    verifyTotp: vi.fn(),
    getTotpUri: vi.fn(),
  },
}));

// Mock the qrcode library for local QR generation
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockQRCode"),
  },
}));

// Import mocked functions
import { twoFactor } from "@/lib/auth-client";

const mockTwoFactor = twoFactor as {
  enable: ReturnType<typeof vi.fn>;
  verifyTotp: ReturnType<typeof vi.fn>;
  getTotpUri: ReturnType<typeof vi.fn>;
};

describe("TwoFactorSetup", () => {
  const defaultProps: TwoFactorSetupProps = {
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation for enable
    mockTwoFactor.enable.mockResolvedValue({
      data: {
        totpURI: "otpauth://totp/Dotoro:test@example.com?secret=TESTSECRET&issuer=Dotoro",
        backupCodes: [
          "AAAA-BBBB",
          "CCCC-DDDD",
          "EEEE-FFFF",
          "GGGG-HHHH",
          "IIII-JJJJ",
          "KKKK-LLLL",
          "MMMM-NNNN",
          "OOOO-PPPP",
          "QQQQ-RRRR",
          "SSSS-TTTT",
        ],
      },
      error: null,
    });
    mockTwoFactor.verifyTotp.mockResolvedValue({
      data: { success: true },
      error: null,
    });
  });

  describe("Step 1: Initial Setup", () => {
    it("renders the setup wizard with initial step", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/set up two-factor/i)).toBeInTheDocument();
      });
    });

    it("shows loading state while generating QR code", async () => {
      mockTwoFactor.enable.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<TwoFactorSetup {...defaultProps} />);

      expect(screen.getByTestId("setup-loading")).toBeInTheDocument();
    });

    it("calls twoFactor.enable on mount to generate TOTP URI", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(mockTwoFactor.enable).toHaveBeenCalled();
      });
    });

    it("displays QR code after successful generation", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });
    });

    it("shows manual entry option with secret key", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/can't scan/i)).toBeInTheDocument();
      });

      // Click to show manual entry
      fireEvent.click(screen.getByText(/can't scan/i));

      await waitFor(() => {
        expect(screen.getByText(/TESTSECRET/i)).toBeInTheDocument();
      });
    });

    it("shows error state when enable fails", async () => {
      mockTwoFactor.enable.mockResolvedValue({
        data: null,
        error: { message: "Failed to enable 2FA" },
      });

      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to enable/i)).toBeInTheDocument();
      });
    });

    it("has a cancel button that calls onCancel", async () => {
      const onCancel = vi.fn();
      render(<TwoFactorSetup {...defaultProps} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("Step 2: Code Verification", () => {
    it("shows code input after clicking continue", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      // Click continue to go to verification step
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });
    });

    it("allows entering 6-digit code", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });

      expect(input).toHaveValue("123456");
    });

    it("validates code format (6 digits only)", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "12345" } });

      // Click verify with incomplete code
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      expect(screen.getByText(/must be 6 digits/i)).toBeInTheDocument();
    });

    it("calls twoFactor.verifyTotp when verifying code", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(mockTwoFactor.verifyTotp).toHaveBeenCalledWith({ code: "123456" });
      });
    });

    it("shows loading state during verification", async () => {
      mockTwoFactor.verifyTotp.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      expect(screen.getByTestId("verify-loading")).toBeInTheDocument();
    });

    it("shows error when verification fails", async () => {
      mockTwoFactor.verifyTotp.mockResolvedValue({
        data: null,
        error: { message: "Invalid code" },
      });

      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
      });
    });

    it("allows going back to QR code step", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });
    });
  });

  describe("Step 3: Backup Codes", () => {
    it("shows backup codes after successful verification", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        // Check for specific backup codes displayed on screen
        expect(screen.getByText("AAAA-BBBB")).toBeInTheDocument();
      });
    });

    it("displays all backup codes", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByText("AAAA-BBBB")).toBeInTheDocument();
        expect(screen.getByText("CCCC-DDDD")).toBeInTheDocument();
      });
    });

    it("has copy all button", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
      });
    });

    it("has download button", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
      });
    });

    it("shows warning about saving codes securely", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        // Check for warning text about storing codes
        expect(screen.getByText(/save these backup codes/i)).toBeInTheDocument();
      });
    });

    it("requires confirmation checkbox before completing", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /complete setup/i })).toBeDisabled();
      });

      // Check the confirmation checkbox
      fireEvent.click(screen.getByLabelText(/i have saved/i));

      expect(screen.getByRole("button", { name: /complete setup/i })).not.toBeDisabled();
    });
  });

  describe("Step 4: Completion", () => {
    it("calls onComplete when setup is finished", async () => {
      const onComplete = vi.fn();
      render(<TwoFactorSetup {...defaultProps} onComplete={onComplete} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByRole("checkbox", { name: /i have saved/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("checkbox", { name: /i have saved/i }));
      fireEvent.click(screen.getByRole("button", { name: /complete setup/i }));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("shows error when clipboard copy fails", async () => {
      // Mock clipboard to throw error
      const originalClipboard = navigator.clipboard;
      const mockClipboard = {
        writeText: vi.fn().mockRejectedValue(new Error("Clipboard not available")),
      };
      Object.defineProperty(navigator, "clipboard", {
        value: mockClipboard,
        writable: true,
        configurable: true,
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByTestId("copy-backup-codes")).toBeInTheDocument();
      });

      // Click copy button
      fireEvent.click(screen.getByTestId("copy-backup-codes"));

      await waitFor(() => {
        expect(screen.getByText(/copy failed/i)).toBeInTheDocument();
        expect(screen.getByTestId("copy-error-message")).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to copy backup codes to clipboard:",
        expect.any(Error)
      );

      // Restore clipboard
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });
      consoleSpy.mockRestore();
    });

    it("shows success feedback when clipboard copy succeeds", async () => {
      // Mock clipboard to succeed
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(navigator, "clipboard", {
        value: mockClipboard,
        writable: true,
        configurable: true,
      });

      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByTestId("copy-backup-codes")).toBeInTheDocument();
      });

      // Click copy button
      fireEvent.click(screen.getByTestId("copy-backup-codes"));

      await waitFor(() => {
        expect(screen.getByText(/copied!/i)).toBeInTheDocument();
      });
    });

    it("shows error when server returns empty backup codes", async () => {
      mockTwoFactor.enable.mockResolvedValue({
        data: {
          totpURI: "otpauth://totp/Dotoro:test@example.com?secret=TESTSECRET&issuer=Dotoro",
          backupCodes: [], // Empty backup codes
        },
        error: null,
      });

      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/server did not return backup codes/i)).toBeInTheDocument();
      });
    });

    it("shows error when server returns null backup codes", async () => {
      mockTwoFactor.enable.mockResolvedValue({
        data: {
          totpURI: "otpauth://totp/Dotoro:test@example.com?secret=TESTSECRET&issuer=Dotoro",
          backupCodes: null, // Null backup codes
        },
        error: null,
      });

      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/server did not return backup codes/i)).toBeInTheDocument();
      });
    });

    it("logs error when parseSecretFromUri fails to parse invalid URI", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockTwoFactor.enable.mockResolvedValue({
        data: {
          totpURI: "invalid-uri-not-a-url",
          backupCodes: ["AAAA-BBBB", "CCCC-DDDD"],
        },
        error: null,
      });

      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse TOTP URI:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("accessibility", () => {
    it("has proper heading hierarchy", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
      });
    });

    it("has labeled form controls", async () => {
      render(<TwoFactorSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        const input = screen.getByLabelText(/verification code/i);
        expect(input).toBeInTheDocument();
      });
    });
  });
});
