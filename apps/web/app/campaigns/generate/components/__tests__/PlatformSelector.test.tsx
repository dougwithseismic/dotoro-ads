import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlatformSelector } from "../PlatformSelector";
import type { Platform } from "../../types";

describe("PlatformSelector", () => {
  let onToggle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onToggle = vi.fn();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders all platform options as checkable cards", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      expect(screen.getByTestId("platform-checkbox-google")).toBeInTheDocument();
      expect(screen.getByTestId("platform-checkbox-reddit")).toBeInTheDocument();
      expect(screen.getByTestId("platform-checkbox-facebook")).toBeInTheDocument();
    });

    it("displays platform names and descriptions", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      expect(screen.getByText("Google")).toBeInTheDocument();
      expect(screen.getByText("Reddit")).toBeInTheDocument();
      expect(screen.getByText("Facebook")).toBeInTheDocument();

      // Should have descriptive hints
      expect(screen.getByText(/google ads/i)).toBeInTheDocument();
      expect(screen.getByText(/reddit ads/i)).toBeInTheDocument();
      expect(screen.getByText(/facebook ads/i)).toBeInTheDocument();
    });

    it("shows selected count when platforms are selected", () => {
      render(
        <PlatformSelector
          selectedPlatforms={["google", "reddit"]}
          onToggle={onToggle}
        />
      );

      expect(screen.getByText(/2 platforms? selected/i)).toBeInTheDocument();
    });

    it("shows singular 'platform' when one is selected", () => {
      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          onToggle={onToggle}
        />
      );

      expect(screen.getByText(/1 platform selected/i)).toBeInTheDocument();
    });

    it("shows prompt to select when none selected", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      expect(screen.getByText(/select at least one platform/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Selection State Tests
  // ==========================================================================

  describe("Selection State", () => {
    it("marks selected platforms as checked", () => {
      render(
        <PlatformSelector
          selectedPlatforms={["google", "facebook"]}
          onToggle={onToggle}
        />
      );

      const googleCheckbox = screen.getByTestId("platform-checkbox-google");
      const redditCheckbox = screen.getByTestId("platform-checkbox-reddit");
      const facebookCheckbox = screen.getByTestId("platform-checkbox-facebook");

      expect(googleCheckbox).toHaveAttribute("aria-checked", "true");
      expect(redditCheckbox).toHaveAttribute("aria-checked", "false");
      expect(facebookCheckbox).toHaveAttribute("aria-checked", "true");
    });

    it("applies selected styling to checked platforms", () => {
      render(
        <PlatformSelector
          selectedPlatforms={["reddit"]}
          onToggle={onToggle}
        />
      );

      const redditCard = screen.getByTestId("platform-checkbox-reddit");
      expect(redditCard.className).toMatch(/selected/i);
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onToggle with platform when clicked", async () => {
      const user = userEvent.setup();

      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      await user.click(screen.getByTestId("platform-checkbox-google"));

      expect(onToggle).toHaveBeenCalledWith("google");
    });

    it("calls onToggle to deselect when selected platform is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          onToggle={onToggle}
        />
      );

      await user.click(screen.getByTestId("platform-checkbox-google"));

      expect(onToggle).toHaveBeenCalledWith("google");
    });

    it("allows selecting multiple platforms", async () => {
      const user = userEvent.setup();

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          onToggle={onToggle}
        />
      );

      // Click reddit (should add to selection)
      await user.click(screen.getByTestId("platform-checkbox-reddit"));
      expect(onToggle).toHaveBeenCalledWith("reddit");

      // Click facebook (should add to selection)
      await user.click(screen.getByTestId("platform-checkbox-facebook"));
      expect(onToggle).toHaveBeenCalledWith("facebook");
    });

    it("supports keyboard selection with Enter", async () => {
      const user = userEvent.setup();

      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      const googleCard = screen.getByTestId("platform-checkbox-google");
      googleCard.focus();

      await user.keyboard("{Enter}");

      expect(onToggle).toHaveBeenCalledWith("google");
    });

    it("supports keyboard selection with Space", async () => {
      const user = userEvent.setup();

      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      const redditCard = screen.getByTestId("platform-checkbox-reddit");
      redditCard.focus();

      await user.keyboard(" ");

      expect(onToggle).toHaveBeenCalledWith("reddit");
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper role for checkbox behavior", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(3);
    });

    it("has accessible labels for each platform", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      expect(screen.getByRole("checkbox", { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /reddit/i })).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /facebook/i })).toBeInTheDocument();
    });

    it("announces selection state via aria-checked", () => {
      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          onToggle={onToggle}
        />
      );

      const googleCheckbox = screen.getByRole("checkbox", { name: /google/i });
      expect(googleCheckbox).toHaveAttribute("aria-checked", "true");

      const redditCheckbox = screen.getByRole("checkbox", { name: /reddit/i });
      expect(redditCheckbox).toHaveAttribute("aria-checked", "false");
    });

    it("supports tab navigation through all platforms", async () => {
      const user = userEvent.setup();

      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      // Tab to first platform
      await user.tab();
      expect(screen.getByTestId("platform-checkbox-google")).toHaveFocus();

      // Tab to second platform
      await user.tab();
      expect(screen.getByTestId("platform-checkbox-reddit")).toHaveFocus();

      // Tab to third platform
      await user.tab();
      expect(screen.getByTestId("platform-checkbox-facebook")).toHaveFocus();
    });

    it("has a group label for the platform selection", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      expect(screen.getByRole("group", { name: /select platforms/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Validation Display Tests
  // ==========================================================================

  describe("Validation", () => {
    it("shows error styling when no platforms selected and showError is true", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
          showError
        />
      );

      // Should display error message
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/at least one platform/i)).toBeInTheDocument();
    });

    it("does not show error when platforms are selected", () => {
      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          onToggle={onToggle}
          showError
        />
      );

      // Should not display error
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not show error when showError is false", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
          showError={false}
        />
      );

      // Should not display error role (still shows the prompt but not as error)
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles all platforms being selected", () => {
      render(
        <PlatformSelector
          selectedPlatforms={["google", "reddit", "facebook"]}
          onToggle={onToggle}
        />
      );

      expect(screen.getByText(/3 platforms selected/i)).toBeInTheDocument();

      // All should be checked
      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute("aria-checked", "true");
      });
    });

    it("handles rapid clicking without issues", async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <PlatformSelector
          selectedPlatforms={[]}
          onToggle={onToggle}
        />
      );

      // Rapid clicks on different platforms
      await user.click(screen.getByTestId("platform-checkbox-google"));
      await user.click(screen.getByTestId("platform-checkbox-reddit"));
      await user.click(screen.getByTestId("platform-checkbox-facebook"));

      expect(onToggle).toHaveBeenCalledTimes(3);
      expect(onToggle).toHaveBeenCalledWith("google");
      expect(onToggle).toHaveBeenCalledWith("reddit");
      expect(onToggle).toHaveBeenCalledWith("facebook");
    });

    it("handles unknown platforms in selectedPlatforms gracefully", () => {
      // This shouldn't happen in practice, but component should not crash
      render(
        <PlatformSelector
          selectedPlatforms={["google", "unknown" as Platform]}
          onToggle={onToggle}
        />
      );

      // Should still render known platforms
      expect(screen.getByTestId("platform-checkbox-google")).toBeInTheDocument();
      // Count should reflect what's actually selected and valid
      expect(screen.getByText(/1 platform selected/i)).toBeInTheDocument();
    });
  });
});
