import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
const mockPathname = "/settings";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
  })),
  useSearchParams: vi.fn(() => mockSearchParams),
  usePathname: vi.fn(() => mockPathname),
}));

// Import after mocks
import { SettingsLayout, type SettingsTab } from "../SettingsLayout";

describe("SettingsLayout", () => {
  const user = userEvent.setup();

  const defaultTabs: SettingsTab[] = [
    { id: "account", label: "Account" },
    { id: "sessions", label: "Sessions" },
    { id: "security", label: "Security" },
    { id: "notifications", label: "Notifications" },
    { id: "danger", label: "Danger Zone" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("tab");
  });

  describe("Rendering", () => {
    it("should render the settings layout with title", () => {
      render(
        <SettingsLayout
          title="Account Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={vi.fn()}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      expect(screen.getByRole("heading", { name: /account settings/i })).toBeInTheDocument();
    });

    it("should render all provided tabs", () => {
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={vi.fn()}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      expect(screen.getByRole("tab", { name: /account/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /sessions/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /security/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /notifications/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /danger zone/i })).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={vi.fn()}
        >
          <div data-testid="child-content">Child Content</div>
        </SettingsLayout>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });
  });

  describe("Tab Navigation", () => {
    it("should mark the active tab as selected", () => {
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="sessions"
          onTabChange={vi.fn()}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      const sessionsTab = screen.getByRole("tab", { name: /sessions/i });
      expect(sessionsTab).toHaveAttribute("aria-selected", "true");
    });

    it("should call onTabChange when a tab is clicked", async () => {
      const handleTabChange = vi.fn();
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={handleTabChange}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      const securityTab = screen.getByRole("tab", { name: /security/i });
      await user.click(securityTab);

      expect(handleTabChange).toHaveBeenCalledWith("security");
    });

    it("should not call onTabChange when clicking already active tab", async () => {
      const handleTabChange = vi.fn();
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={handleTabChange}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      const accountTab = screen.getByRole("tab", { name: /account/i });
      await user.click(accountTab);

      expect(handleTabChange).not.toHaveBeenCalled();
    });
  });

  describe("Tab Icons", () => {
    it("should render tab icons when provided", () => {
      const tabsWithIcons: SettingsTab[] = [
        { id: "account", label: "Account", icon: <span data-testid="account-icon">A</span> },
        { id: "security", label: "Security", icon: <span data-testid="security-icon">S</span> },
      ];

      render(
        <SettingsLayout
          title="Settings"
          tabs={tabsWithIcons}
          activeTab="account"
          onTabChange={vi.fn()}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      expect(screen.getByTestId("account-icon")).toBeInTheDocument();
      expect(screen.getByTestId("security-icon")).toBeInTheDocument();
    });
  });

  describe("Danger Tab Styling", () => {
    it("should apply danger styling to danger tab", () => {
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={vi.fn()}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      const dangerTab = screen.getByRole("tab", { name: /danger zone/i });
      expect(dangerTab).toHaveClass("text-red-500");
    });
  });

  describe("Container Styling", () => {
    it("should have proper max-width container", () => {
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={vi.fn()}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      const container = screen.getByTestId("settings-layout");
      expect(container).toHaveClass("max-w-4xl");
    });
  });

  describe("Accessibility", () => {
    it("should have tablist role for navigation", () => {
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={vi.fn()}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("should have tabpanel role for content area", () => {
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={vi.fn()}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    });

    it("should associate tabs with tabpanel using aria-controls", () => {
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={vi.fn()}
        >
          <div>Content</div>
        </SettingsLayout>
      );

      const activeTab = screen.getByRole("tab", { name: /account/i });
      const tabpanel = screen.getByRole("tabpanel");

      expect(activeTab).toHaveAttribute("aria-controls", tabpanel.id);
    });
  });

  describe("Loading State", () => {
    it("should render loading state when isLoading is true", () => {
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={vi.fn()}
          isLoading
        >
          <div>Content</div>
        </SettingsLayout>
      );

      expect(screen.getByTestId("settings-loading")).toBeInTheDocument();
    });

    it("should hide children when loading", () => {
      render(
        <SettingsLayout
          title="Settings"
          tabs={defaultTabs}
          activeTab="account"
          onTabChange={vi.fn()}
          isLoading
        >
          <div data-testid="child-content">Content</div>
        </SettingsLayout>
      );

      expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });
  });
});
