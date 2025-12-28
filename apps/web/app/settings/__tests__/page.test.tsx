import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: mockReplace,
  })),
  useSearchParams: vi.fn(() => mockSearchParams),
  usePathname: vi.fn(() => "/settings"),
}));

// Mock session data
const mockUser = {
  id: "user-123",
  email: "john@example.com",
  emailVerified: true,
  name: "John Doe",
  image: "https://example.com/avatar.jpg",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-12-28T00:00:00Z",
};

// Mock the auth hooks
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    logout: vi.fn(),
    refreshSession: vi.fn(),
  })),
  useRequireAuth: vi.fn(() => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    logout: vi.fn(),
    refreshSession: vi.fn(),
  })),
}));

// Import after mocks
import SettingsPage from "../page";
import { useAuth } from "@/lib/auth";

describe("SettingsPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  describe("Page Structure", () => {
    it("should render Settings heading", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
      });
    });

    it("should render tab navigation", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });
    });
  });

  describe("Tab Navigation", () => {
    it("should render Account tab", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /account/i })).toBeInTheDocument();
      });
    });

    it("should render Sessions tab", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /sessions/i })).toBeInTheDocument();
      });
    });

    it("should render Security tab", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /security/i })).toBeInTheDocument();
      });
    });

    it("should render Notifications tab", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /notifications/i })).toBeInTheDocument();
      });
    });

    it("should render Danger Zone tab", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /danger zone/i })).toBeInTheDocument();
      });
    });

    it("should default to Account tab when no tab param", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        const accountTab = screen.getByRole("tab", { name: /account/i });
        expect(accountTab).toHaveAttribute("aria-selected", "true");
      });
    });

    it("should activate tab based on URL query param", async () => {
      mockSearchParams = new URLSearchParams("tab=sessions");
      render(<SettingsPage />);

      await waitFor(() => {
        const sessionsTab = screen.getByRole("tab", { name: /sessions/i });
        expect(sessionsTab).toHaveAttribute("aria-selected", "true");
      });
    });

    it("should update URL when tab is clicked", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /sessions/i })).toBeInTheDocument();
      });

      const sessionsTab = screen.getByRole("tab", { name: /sessions/i });
      await user.click(sessionsTab);

      expect(mockReplace).toHaveBeenCalledWith("/settings?tab=sessions");
    });

    it("should switch tab content when tab is clicked", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("tabpanel")).toBeInTheDocument();
      });

      // Should show Account content initially
      expect(screen.getByTestId("account-tab-content")).toBeInTheDocument();

      // Click Sessions tab
      const sessionsTab = screen.getByRole("tab", { name: /sessions/i });
      await user.click(sessionsTab);

      await waitFor(() => {
        expect(screen.getByTestId("sessions-tab-content")).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading skeleton while fetching user data", () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.getByTestId("settings-loading")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should show error message when user is not authenticated", () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.getByText(/unable to load settings/i)).toBeInTheDocument();
    });

    it("should show retry button on error", () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<SettingsPage />);

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

      render(<SettingsPage />);

      const retryButton = screen.getByRole("button", { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefreshSession).toHaveBeenCalled();
    });
  });

  describe("Tab Content", () => {
    it("should render Account tab content by default", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("account-tab-content")).toBeInTheDocument();
      });
    });

    it("should render placeholder content for Sessions tab", async () => {
      mockSearchParams = new URLSearchParams("tab=sessions");
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("sessions-tab-content")).toBeInTheDocument();
      });
    });

    it("should render placeholder content for Security tab", async () => {
      mockSearchParams = new URLSearchParams("tab=security");
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("security-tab-content")).toBeInTheDocument();
      });
    });

    it("should render placeholder content for Notifications tab", async () => {
      mockSearchParams = new URLSearchParams("tab=notifications");
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("notifications-tab-content")).toBeInTheDocument();
      });
    });

    it("should render placeholder content for Danger Zone tab", async () => {
      mockSearchParams = new URLSearchParams("tab=danger");
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("danger-tab-content")).toBeInTheDocument();
      });
    });
  });

  describe("Invalid Tab Handling", () => {
    it("should default to Account tab for invalid tab param", async () => {
      mockSearchParams = new URLSearchParams("tab=invalid");
      render(<SettingsPage />);

      await waitFor(() => {
        const accountTab = screen.getByRole("tab", { name: /account/i });
        expect(accountTab).toHaveAttribute("aria-selected", "true");
      });
    });
  });

  describe("Accessibility", () => {
    it("should have main landmark", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("main")).toBeInTheDocument();
      });
    });

    it("should have proper heading hierarchy", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading).toHaveTextContent(/settings/i);
      });
    });
  });
});
