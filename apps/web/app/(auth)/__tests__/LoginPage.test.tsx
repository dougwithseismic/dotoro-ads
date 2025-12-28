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

// Mock the Better Auth client
const mockMagicLink = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  signIn: {
    magicLink: (...args: unknown[]) => mockMagicLink(...args),
  },
}));

// Import after mocks
import LoginPage from "../login/page";

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
    // Create a promise that doesn't resolve immediately
    mockMagicLink.mockReturnValue(new Promise(() => {}));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: /continue with email/i });
    await user.click(submitButton);

    expect(await screen.findByText(/sending magic link/i)).toBeInTheDocument();
  });

  it("should show success state after successful submission", async () => {
    mockMagicLink.mockResolvedValue({
      data: { status: true },
      error: null,
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

  it("should call signIn.magicLink with correct parameters", async () => {
    mockMagicLink.mockResolvedValue({
      data: { status: true },
      error: null,
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: /continue with email/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMagicLink).toHaveBeenCalledWith({
        email: "test@example.com",
        callbackURL: "/",
      });
    });
  });

  it("should show error message on API failure with error response", async () => {
    mockMagicLink.mockResolvedValue({
      data: null,
      error: { message: "Rate limit exceeded" },
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: /continue with email/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    });
  });

  it("should show error message on API rejection", async () => {
    mockMagicLink.mockRejectedValue(new Error("Network error"));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", { name: /continue with email/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("should allow resending magic link after success", async () => {
    mockMagicLink.mockResolvedValue({
      data: { status: true },
      error: null,
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
