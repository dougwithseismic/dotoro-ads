import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
  usePathname: vi.fn(() => "/settings/profile"),
}));

// Mock session data
const mockSession = {
  user: {
    id: "user-123",
    email: "john@example.com",
    emailVerified: true,
    name: "John Doe",
    image: "https://example.com/avatar.jpg",
  },
};

// Mock the auth hooks
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: mockSession.user,
    isLoading: false,
    isAuthenticated: true,
    logout: vi.fn(),
    refreshSession: vi.fn(),
  })),
  useRequireAuth: vi.fn(() => ({
    user: mockSession.user,
    isLoading: false,
    isAuthenticated: true,
    logout: vi.fn(),
    refreshSession: vi.fn(),
  })),
  useSession: vi.fn(() => ({
    data: mockSession,
    isPending: false,
    error: null,
  })),
}));

// Import after mocks
import ProfilePage from "../page";
import { useAuth } from "@/lib/auth";

describe("ProfilePage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockSession.user,
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  describe("Page Title", () => {
    it("should display Profile Settings heading", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading skeleton while fetching data", () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByTestId("profile-loading")).toBeInTheDocument();
    });

    it("should display skeleton elements matching profile layout", () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<ProfilePage />);

      // Should have skeleton elements for avatar, name, and details
      expect(screen.getByTestId("skeleton-avatar")).toBeInTheDocument();
      expect(screen.getByTestId("skeleton-name")).toBeInTheDocument();
      expect(screen.getByTestId("skeleton-details")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should show error message when user data fails to load", () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByText(/unable to load profile/i)).toBeInTheDocument();
    });

    it("should show retry button on error", () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<ProfilePage />);

      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("should call refreshSession when retry is clicked", async () => {
      const mockRefreshSession = vi.fn();
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: mockRefreshSession,
      });

      render(<ProfilePage />);

      const retryButton = screen.getByRole("button", { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefreshSession).toHaveBeenCalled();
    });
  });

  describe("Profile Data Display", () => {
    it("should display user avatar", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole("img", { name: /john doe's avatar/i })).toBeInTheDocument();
      });
    });

    it("should display user name", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });
    });

    it("should display user email", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        // Email appears in both ProfileHeader (secondary) and ProfileDetails (email section)
        const emailElements = screen.getAllByText("john@example.com");
        expect(emailElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should display email verification status", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
      });
    });

    it("should display unverified badge for unverified email", async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: {
          ...mockSession.user,
          emailVerified: false,
        },
        isLoading: false,
        isAuthenticated: true,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId("unverified-badge")).toBeInTheDocument();
      });
    });
  });

  describe("Profile Components Integration", () => {
    it("should render ProfileHeader component", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId("profile-header")).toBeInTheDocument();
      });
    });

    it("should render ProfileDetails component", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId("profile-details")).toBeInTheDocument();
      });
    });
  });

  describe("User with Missing Data", () => {
    it("should handle user with null name gracefully", async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: {
          ...mockSession.user,
          name: null,
        },
        isLoading: false,
        isAuthenticated: true,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        // Email should be used as display name
        const displayName = screen.getByTestId("profile-display-name");
        expect(displayName).toHaveTextContent("john@example.com");
      });
    });

    it("should handle user with null image gracefully", async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: {
          ...mockSession.user,
          image: null,
        },
        isLoading: false,
        isAuthenticated: true,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        // Should show initials instead of image
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.getByText("JD")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have main landmark", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole("main")).toBeInTheDocument();
      });
    });

    it("should have proper heading hierarchy", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading).toHaveTextContent(/profile/i);
      });
    });
  });
});
