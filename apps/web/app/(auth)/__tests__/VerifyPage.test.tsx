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

// Mock the auth API
vi.mock("@/lib/auth", () => ({
  verifyMagicLink: vi.fn(),
}));

// Import after mocks
import VerifyPage from "../verify/page";
import { verifyMagicLink } from "@/lib/auth";
import { useSearchParams } from "next/navigation";

describe("VerifyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show error when token is missing", async () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => null),
    });

    render(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/invalid verification link/i)).toBeInTheDocument();
    });
  });

  it("should show loading state while verifying", () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "a".repeat(64) : null)),
    });

    const mockVerifyMagicLink = verifyMagicLink as ReturnType<typeof vi.fn>;
    // Return a promise that never resolves
    mockVerifyMagicLink.mockReturnValue(new Promise(() => {}));

    render(<VerifyPage />);

    expect(screen.getByText(/verifying your magic link/i)).toBeInTheDocument();
  });

  it("should show success and redirect after verification", async () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === "token") return "a".repeat(64);
        if (key === "redirect") return "/dashboard";
        return null;
      }),
    });

    const mockVerifyMagicLink = verifyMagicLink as ReturnType<typeof vi.fn>;
    mockVerifyMagicLink.mockResolvedValue({
      user: { id: "user-id", email: "test@example.com", emailVerified: true },
      expiresAt: new Date().toISOString(),
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

    const mockVerifyMagicLink = verifyMagicLink as ReturnType<typeof vi.fn>;
    mockVerifyMagicLink.mockResolvedValue({
      user: { id: "user-id", email: "test@example.com", emailVerified: true },
      expiresAt: new Date().toISOString(),
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

    const mockVerifyMagicLink = verifyMagicLink as ReturnType<typeof vi.fn>;
    mockVerifyMagicLink.mockRejectedValue(new Error("Invalid or expired token"));

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

    const mockVerifyMagicLink = verifyMagicLink as ReturnType<typeof vi.fn>;
    mockVerifyMagicLink.mockRejectedValue(new Error("Token has already been used"));

    render(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      expect(screen.getByText(/token has already been used/i)).toBeInTheDocument();
    });
  });

  it("should have link to request new magic link on error", async () => {
    const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "a".repeat(64) : null)),
    });

    const mockVerifyMagicLink = verifyMagicLink as ReturnType<typeof vi.fn>;
    mockVerifyMagicLink.mockRejectedValue(new Error("Token expired"));

    render(<VerifyPage />);

    await waitFor(() => {
      const newLinkButton = screen.getByRole("link", { name: /request a new magic link/i });
      expect(newLinkButton).toBeInTheDocument();
      expect(newLinkButton).toHaveAttribute("href", "/login");
    });
  });
});
