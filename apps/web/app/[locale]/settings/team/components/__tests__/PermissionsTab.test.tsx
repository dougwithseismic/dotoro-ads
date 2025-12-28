import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PermissionsTab } from "../PermissionsTab";

// Mock the resize observer
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("PermissionsTab", () => {
  describe("rendering", () => {
    it("renders the current role banner", () => {
      render(<PermissionsTab currentRole="editor" />);

      expect(screen.getByTestId("current-role-banner")).toBeInTheDocument();
    });

    it("displays the correct role in the banner", () => {
      render(<PermissionsTab currentRole="admin" />);

      expect(screen.getByTestId("current-role-banner")).toHaveAttribute(
        "data-role",
        "admin"
      );
    });

    it("renders the role descriptions section", () => {
      render(<PermissionsTab currentRole="editor" />);

      expect(screen.getByText("Role Hierarchy")).toBeInTheDocument();
    });

    it("shows all four role descriptions", () => {
      render(<PermissionsTab currentRole="viewer" />);

      expect(
        screen.getByText("Full access to everything")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Manage team and resources")
      ).toBeInTheDocument();
      expect(screen.getByText("Create and edit content")).toBeInTheDocument();
      // "View only" appears twice - in the banner and in the role card
      expect(screen.getAllByText("View only").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("role-specific content", () => {
    it("marks current role in hierarchy section", () => {
      render(<PermissionsTab currentRole="editor" />);

      const editorCard = screen.getByTestId("role-card-editor");
      expect(editorCard).toHaveAttribute("data-current", "true");
    });

    it("shows owner-only audit section for owners", () => {
      render(<PermissionsTab currentRole="owner" isOwner />);

      expect(screen.getByText("Permission Audit")).toBeInTheDocument();
    });

    it("hides owner-only audit section for non-owners", () => {
      render(<PermissionsTab currentRole="admin" isOwner={false} />);

      expect(screen.queryByText("Permission Audit")).not.toBeInTheDocument();
    });
  });

  describe("permissions display", () => {
    it("renders the permissions matrix/view on desktop", () => {
      // Mock desktop viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<PermissionsTab currentRole="editor" />);

      // Should render either matrix or cards depending on viewport
      expect(
        screen.getByTestId("permission-matrix") ||
          screen.getByTestId("permission-cards")
      ).toBeInTheDocument();
    });
  });
});
