import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlatformTabs } from "../PlatformTabs";
import type { Platform } from "../../../types";

describe("PlatformTabs", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders tabs for all provided platforms", () => {
      render(
        <PlatformTabs
          platforms={["google", "reddit", "facebook"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 1, reddit: 0, facebook: 2 }}
          onChange={onChange}
        />
      );

      expect(screen.getByRole("tab", { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /reddit/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /facebook/i })).toBeInTheDocument();
    });

    it("renders platform icons", () => {
      render(
        <PlatformTabs
          platforms={["google"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0 }}
          onChange={onChange}
        />
      );

      const tab = screen.getByTestId("platform-tab-google");
      expect(tab).toBeInTheDocument();
    });

    it("shows selected ad type count for each platform", () => {
      render(
        <PlatformTabs
          platforms={["google", "reddit"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 2, reddit: 3 }}
          onChange={onChange}
        />
      );

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("hides count badge when count is zero", () => {
      render(
        <PlatformTabs
          platforms={["google"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0 }}
          onChange={onChange}
        />
      );

      // Should not have a count badge
      const badge = screen.queryByTestId("count-badge-google");
      expect(badge).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  describe("Selection", () => {
    it("marks the selected platform tab as active", () => {
      render(
        <PlatformTabs
          platforms={["google", "reddit"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0, reddit: 0 }}
          onChange={onChange}
        />
      );

      const googleTab = screen.getByRole("tab", { name: /google/i });
      const redditTab = screen.getByRole("tab", { name: /reddit/i });

      expect(googleTab).toHaveAttribute("aria-selected", "true");
      expect(redditTab).toHaveAttribute("aria-selected", "false");
    });

    it("calls onChange when a different tab is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PlatformTabs
          platforms={["google", "reddit"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0, reddit: 0 }}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole("tab", { name: /reddit/i }));

      expect(onChange).toHaveBeenCalledWith("reddit");
    });

    it("does not call onChange when clicking the already selected tab", async () => {
      const user = userEvent.setup();

      render(
        <PlatformTabs
          platforms={["google", "reddit"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0, reddit: 0 }}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole("tab", { name: /google/i }));

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Keyboard Navigation Tests
  // ==========================================================================

  describe("Keyboard Navigation", () => {
    it("supports arrow key navigation between tabs", async () => {
      const user = userEvent.setup();

      render(
        <PlatformTabs
          platforms={["google", "reddit", "facebook"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0, reddit: 0, facebook: 0 }}
          onChange={onChange}
        />
      );

      const googleTab = screen.getByRole("tab", { name: /google/i });
      googleTab.focus();

      // Press right arrow to move to reddit
      await user.keyboard("{ArrowRight}");
      expect(onChange).toHaveBeenCalledWith("reddit");
    });

    it("wraps around when navigating past the last tab", async () => {
      const user = userEvent.setup();

      render(
        <PlatformTabs
          platforms={["google", "reddit"]}
          selectedPlatform="reddit"
          selectedAdTypeCounts={{ google: 0, reddit: 0 }}
          onChange={onChange}
        />
      );

      const redditTab = screen.getByRole("tab", { name: /reddit/i });
      redditTab.focus();

      // Press right arrow should wrap to google
      await user.keyboard("{ArrowRight}");
      expect(onChange).toHaveBeenCalledWith("google");
    });

    it("wraps around when navigating before the first tab", async () => {
      const user = userEvent.setup();

      render(
        <PlatformTabs
          platforms={["google", "reddit"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0, reddit: 0 }}
          onChange={onChange}
        />
      );

      const googleTab = screen.getByRole("tab", { name: /google/i });
      googleTab.focus();

      // Press left arrow should wrap to reddit
      await user.keyboard("{ArrowLeft}");
      expect(onChange).toHaveBeenCalledWith("reddit");
    });

    it("activates tab on Enter key", async () => {
      const user = userEvent.setup();

      render(
        <PlatformTabs
          platforms={["google", "reddit"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0, reddit: 0 }}
          onChange={onChange}
        />
      );

      const redditTab = screen.getByRole("tab", { name: /reddit/i });
      redditTab.focus();
      await user.keyboard("{Enter}");

      expect(onChange).toHaveBeenCalledWith("reddit");
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper tablist role", () => {
      render(
        <PlatformTabs
          platforms={["google"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0 }}
          onChange={onChange}
        />
      );

      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("has proper tab roles for each platform", () => {
      render(
        <PlatformTabs
          platforms={["google", "reddit"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0, reddit: 0 }}
          onChange={onChange}
        />
      );

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);
    });

    it("only the selected tab is in the tab sequence", () => {
      render(
        <PlatformTabs
          platforms={["google", "reddit"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0, reddit: 0 }}
          onChange={onChange}
        />
      );

      const googleTab = screen.getByRole("tab", { name: /google/i });
      const redditTab = screen.getByRole("tab", { name: /reddit/i });

      expect(googleTab).toHaveAttribute("tabIndex", "0");
      expect(redditTab).toHaveAttribute("tabIndex", "-1");
    });

    it("has accessible labels with platform names", () => {
      render(
        <PlatformTabs
          platforms={["google"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 2 }}
          onChange={onChange}
        />
      );

      const tab = screen.getByRole("tab", { name: /google/i });
      expect(tab).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles single platform gracefully", () => {
      render(
        <PlatformTabs
          platforms={["google"]}
          selectedPlatform="google"
          selectedAdTypeCounts={{ google: 0 }}
          onChange={onChange}
        />
      );

      expect(screen.getByRole("tab")).toBeInTheDocument();
    });

    it("handles empty platforms array", () => {
      render(
        <PlatformTabs
          platforms={[]}
          selectedPlatform={null as unknown as Platform}
          selectedAdTypeCounts={{}}
          onChange={onChange}
        />
      );

      expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    });
  });
});
