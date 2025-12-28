import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
}));

// Mock the Better Auth client
const mockVerify = vi.fn();
const mockGetSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    magicLink: {
      verify: (...args: unknown[]) => mockVerify(...args),
    },
    getSession: (...args: unknown[]) => mockGetSession(...args),
  },
}));

// Import after mocks
import VerifyPage from "../verify/page";
import { useSearchParams } from "next/navigation";

describe("VerifyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getSession - no session
    mockGetSession.mockResolvedValue({ data: null });
  });

  it("should show error when token is missing", async () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => null),
    });

    // When no token, getSession returns no session
    mockGetSession.mockResolvedValue({ data: null });

    render(<VerifyPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/invalid verification link/i)
      ).toBeInTheDocument();
    });
  });

  it("should show loading state while verifying", () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "a".repeat(64) : null)),
    });

    // Return a promise that never resolves
    mockVerify.mockReturnValue(new Promise(() => {}));

    render(<VerifyPage />);

    expect(screen.getByText(/verifying your magic link/i)).toBeInTheDocument();
  });

  it("should show success and redirect after verification", async () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === "token") return "a".repeat(64);
        if (key === "callbackURL") return "/dashboard";
        return null;
      }),
    });

    mockVerify.mockResolvedValue({
      data: {
        user: { id: "user-id", email: "test@example.com", emailVerified: true },
        session: { expiresAt: new Date().toISOString() },
      },
      error: null,
    });

    render(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/you're signed in/i)).toBeInTheDocument();
    });

    // Should redirect after delay
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      },
      { timeout: 3000 }
    );
  });

  it("should redirect to / when no redirect param", async () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "a".repeat(64) : null)),
    });

    mockVerify.mockResolvedValue({
      data: {
        user: { id: "user-id", email: "test@example.com", emailVerified: true },
        session: { expiresAt: new Date().toISOString() },
      },
      error: null,
    });

    render(<VerifyPage />);

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/");
      },
      { timeout: 3000 }
    );
  });

  it("should show error when token is expired", async () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "a".repeat(64) : null)),
    });

    mockVerify.mockResolvedValue({
      data: null,
      error: { message: "Invalid or expired token" },
    });

    render(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
    });
  });

  it("should show error when token is already used", async () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "a".repeat(64) : null)),
    });

    mockVerify.mockResolvedValue({
      data: null,
      error: { message: "Token has already been used" },
    });

    render(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      expect(
        screen.getByText(/token has already been used/i)
      ).toBeInTheDocument();
    });
  });

  it("should have link to request new magic link on error", async () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "a".repeat(64) : null)),
    });

    mockVerify.mockResolvedValue({
      data: null,
      error: { message: "Token expired" },
    });

    render(<VerifyPage />);

    await waitFor(() => {
      const newLinkButton = screen.getByRole("link", {
        name: /request a new magic link/i,
      });
      expect(newLinkButton).toBeInTheDocument();
      expect(newLinkButton).toHaveAttribute("href", "/login");
    });
  });

  it("should check session when no token and user is already authenticated", async () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === "callbackURL") return "/dashboard";
        return null;
      }),
    });

    // User already has a session (arrived after Better Auth auto-verified)
    mockGetSession.mockResolvedValue({
      data: {
        user: { id: "user-id", email: "test@example.com", emailVerified: true },
      },
    });

    render(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/you're signed in/i)).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      },
      { timeout: 3000 }
    );
  });
});
