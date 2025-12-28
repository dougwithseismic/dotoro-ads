/**
 * TwoFactorVerify Component Tests
 *
 * Tests for the 2FA verification component used during login
 * when a user has 2FA enabled on their account.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TwoFactorVerify, type TwoFactorVerifyProps } from "../TwoFactorVerify";

// Mock the auth client
vi.mock("@/lib/auth-client", () => ({
  twoFactor: {
    verifyTotp: vi.fn(),
  },
}));

// Import mocked functions
import { twoFactor } from "@/lib/auth-client";

const mockTwoFactor = twoFactor as {
  verifyTotp: ReturnType<typeof vi.fn>;
};

describe("TwoFactorVerify", () => {
  const defaultProps: TwoFactorVerifyProps = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTwoFactor.verifyTotp.mockResolvedValue({
      data: { success: true },
      error: null,
    });
  });

  describe("rendering", () => {
    it("renders the verification form", () => {
      render(<TwoFactorVerify {...defaultProps} />);

      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    });

    it("displays 6-digit code input", () => {
      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("maxLength", "6");
    });

    it("has verify button", () => {
      render(<TwoFactorVerify {...defaultProps} />);

      expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
    });

    it("shows option to use backup code", () => {
      render(<TwoFactorVerify {...defaultProps} />);

      expect(screen.getByText(/use backup code/i)).toBeInTheDocument();
    });
  });

  describe("code input", () => {
    it("accepts only numeric input", () => {
      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "abc123" } });

      expect(input).toHaveValue("123");
    });

    it("limits input to 6 digits", () => {
      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "12345678" } });

      expect(input).toHaveValue("123456");
    });

    it("shows validation error for incomplete code", () => {
      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123" } });

      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      expect(screen.getByText(/6 digits/i)).toBeInTheDocument();
    });
  });

  describe("TOTP verification", () => {
    it("calls verifyTotp with the entered code", async () => {
      render(<TwoFactorVerify {...defaultProps} />);

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

      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });

      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      expect(screen.getByTestId("verify-loading")).toBeInTheDocument();
    });

    it("disables input and button during verification", async () => {
      mockTwoFactor.verifyTotp.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });

      const verifyButton = screen.getByRole("button", { name: /verify/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(input).toBeDisabled();
        expect(verifyButton).toBeDisabled();
      });
    });

    it("calls onSuccess when verification succeeds", async () => {
      const onSuccess = vi.fn();
      render(<TwoFactorVerify {...defaultProps} onSuccess={onSuccess} />);

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });

      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("shows error when verification fails", async () => {
      mockTwoFactor.verifyTotp.mockResolvedValue({
        data: null,
        error: { message: "Invalid code" },
      });

      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });

      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
      });
    });

    it("clears code and keeps focus on input after error", async () => {
      mockTwoFactor.verifyTotp.mockResolvedValue({
        data: null,
        error: { message: "Invalid code" },
      });

      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });

      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });
  });

  describe("backup code mode", () => {
    it("switches to backup code mode when clicked", async () => {
      render(<TwoFactorVerify {...defaultProps} />);

      fireEvent.click(screen.getByText(/use backup code/i));

      await waitFor(() => {
        expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
      });
    });

    it("shows different input format for backup codes", async () => {
      render(<TwoFactorVerify {...defaultProps} />);

      fireEvent.click(screen.getByText(/use backup code/i));

      await waitFor(() => {
        const input = screen.getByLabelText(/backup code/i);
        expect(input).toBeInTheDocument();
        // Backup codes are longer (e.g., XXXX-XXXX format)
        expect(input).toHaveAttribute("maxLength", "10");
      });
    });

    it("allows switching back to TOTP mode", async () => {
      render(<TwoFactorVerify {...defaultProps} />);

      fireEvent.click(screen.getByText(/use backup code/i));

      await waitFor(() => {
        expect(screen.getByText(/use authenticator/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/use authenticator/i));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });
    });

    it("calls verifyTotp with backup code", async () => {
      render(<TwoFactorVerify {...defaultProps} />);

      fireEvent.click(screen.getByText(/use backup code/i));

      await waitFor(() => {
        expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/backup code/i);
      fireEvent.change(input, { target: { value: "AAAA-BBBB" } });

      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        expect(mockTwoFactor.verifyTotp).toHaveBeenCalledWith({ code: "AAAA-BBBB" });
      });
    });
  });

  describe("cancel functionality", () => {
    it("shows cancel button", () => {
      render(<TwoFactorVerify {...defaultProps} />);

      expect(screen.getByRole("button", { name: /back to login/i })).toBeInTheDocument();
    });

    it("calls onCancel when cancel is clicked", () => {
      const onCancel = vi.fn();
      render(<TwoFactorVerify {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole("button", { name: /back to login/i }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("email display", () => {
    it("shows user email when provided", () => {
      render(<TwoFactorVerify {...defaultProps} email="test@example.com" />);

      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has proper form labeling", () => {
      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      expect(input).toBeInTheDocument();
    });

    it("has proper heading", () => {
      render(<TwoFactorVerify {...defaultProps} />);

      expect(screen.getByRole("heading")).toBeInTheDocument();
    });

    it("announces errors to screen readers", async () => {
      mockTwoFactor.verifyTotp.mockResolvedValue({
        data: null,
        error: { message: "Invalid code" },
      });

      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });

      fireEvent.click(screen.getByRole("button", { name: /verify/i }));

      await waitFor(() => {
        const errorElement = screen.getByRole("alert");
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe("keyboard navigation", () => {
    it("submits on Enter key in code input", async () => {
      render(<TwoFactorVerify {...defaultProps} />);

      const input = screen.getByLabelText(/verification code/i);
      fireEvent.change(input, { target: { value: "123456" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(mockTwoFactor.verifyTotp).toHaveBeenCalledWith({ code: "123456" });
      });
    });
  });
});
