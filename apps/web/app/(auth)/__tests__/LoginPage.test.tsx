import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock the auth API
vi.mock("@/lib/auth", () => ({
  requestMagicLink: vi.fn(),
}));

// Import after mocks
import LoginPage from "../login/page";
import { requestMagicLink } from "@/lib/auth";

describe("LoginPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render email input and submit button", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with email/i })).toBeInTheDocument();
  });

  it("should show error for empty email", async () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole("button", { name: /continue with email/i });

    // Button should be disabled when email is empty
    expect(submitButton).toBeDisabled();
  });

  it("should have email input with type=email for browser validation", () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toBeRequired();
  });

  it("should show loading state while submitting", async () => {
    const mockRequestMagicLink = requestMagicLink as ReturnType<typeof vi.fn>;
    // Create a promise that doesn't resolve immediately
    mockRequestMagicLink.mockReturnValue(new Promise(() => {}));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: /continue with email/i });
    await user.click(submitButton);

    expect(await screen.findByText(/sending magic link/i)).toBeInTheDocument();
  });

  it("should show success state after successful submission", async () => {
    const mockRequestMagicLink = requestMagicLink as ReturnType<typeof vi.fn>;
    mockRequestMagicLink.mockResolvedValue({
      success: true,
      message: "Magic link sent",
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: /continue with email/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
  });

  it("should show error message on API failure", async () => {
    const mockRequestMagicLink = requestMagicLink as ReturnType<typeof vi.fn>;
    mockRequestMagicLink.mockRejectedValue(new Error("Rate limit exceeded"));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: /continue with email/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    });
  });

  it("should allow resending magic link after success", async () => {
    const mockRequestMagicLink = requestMagicLink as ReturnType<typeof vi.fn>;
    mockRequestMagicLink.mockResolvedValue({
      success: true,
      message: "Magic link sent",
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: /continue with email/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    // Click "send again" link
    const resendLink = screen.getByText(/send again/i);
    await user.click(resendLink);

    // Should go back to email form with email prefilled
    expect(screen.getByLabelText(/email address/i)).toHaveValue("test@example.com");
  });
});
