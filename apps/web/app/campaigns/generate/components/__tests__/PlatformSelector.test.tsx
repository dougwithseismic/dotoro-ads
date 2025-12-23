import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlatformSelector } from "../PlatformSelector";
import type { Platform, BudgetConfig } from "../../types";

describe("PlatformSelector", () => {
  let onToggle: ReturnType<typeof vi.fn>;
  let onBudgetChange: ReturnType<typeof vi.fn>;
  const emptyBudgets: Record<Platform, BudgetConfig | null> = {} as Record<Platform, BudgetConfig | null>;

  beforeEach(() => {
    onToggle = vi.fn();
    onBudgetChange = vi.fn();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders all platform options as checkable cards", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      expect(screen.getByText(/2 platforms? selected/i)).toBeInTheDocument();
    });

    it("shows singular 'platform' when one is selected", () => {
      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      expect(screen.getByText(/1 platform selected/i)).toBeInTheDocument();
    });

    it("shows prompt to select when none selected", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      const redditCard = screen.getByTestId("platform-checkbox-reddit");
      redditCard.focus();

      await user.keyboard(" ");

      expect(onToggle).toHaveBeenCalledWith("reddit");
    });
  });

  // ==========================================================================
  // Budget Configuration Tests
  // ==========================================================================

  describe("Budget Configuration", () => {
    it("shows budget toggle button when platform is selected", () => {
      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      expect(screen.getByTestId("budget-toggle-google")).toBeInTheDocument();
    });

    it("does not show budget toggle button when platform is not selected", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      expect(screen.queryByTestId("budget-toggle-google")).not.toBeInTheDocument();
    });

    it("expands budget panel when budget toggle is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      await user.click(screen.getByTestId("budget-toggle-google"));

      expect(screen.getByTestId("budget-panel-google")).toBeInTheDocument();
    });

    it("shows enable budget switch in budget panel", async () => {
      const user = userEvent.setup();

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      await user.click(screen.getByTestId("budget-toggle-google"));

      expect(screen.getByTestId("budget-enable-google")).toBeInTheDocument();
    });

    it("calls onBudgetChange with default values when budget is enabled", async () => {
      const user = userEvent.setup();

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      await user.click(screen.getByTestId("budget-toggle-google"));
      await user.click(screen.getByTestId("budget-enable-google"));

      expect(onBudgetChange).toHaveBeenCalledWith("google", {
        type: "daily",
        amountPattern: "",
        currency: "USD",
      });
    });

    it("shows budget fields when budget is enabled", async () => {
      const user = userEvent.setup();
      const budgetsWithGoogle: Record<Platform, BudgetConfig | null> = {
        google: { type: "daily", amountPattern: "100", currency: "USD" },
        reddit: null,
        facebook: null,
      };

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={budgetsWithGoogle}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      await user.click(screen.getByTestId("budget-toggle-google"));

      expect(screen.getByTestId("budget-amount-google")).toBeInTheDocument();
      expect(screen.getByTestId("budget-currency-google")).toBeInTheDocument();
      expect(screen.getByTestId("budget-type-daily-google")).toBeInTheDocument();
      expect(screen.getByTestId("budget-type-lifetime-google")).toBeInTheDocument();
    });

    it("calls onBudgetChange when budget type is changed", async () => {
      const user = userEvent.setup();
      const budgetsWithGoogle: Record<Platform, BudgetConfig | null> = {
        google: { type: "daily", amountPattern: "100", currency: "USD" },
        reddit: null,
        facebook: null,
      };

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={budgetsWithGoogle}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      await user.click(screen.getByTestId("budget-toggle-google"));
      await user.click(screen.getByTestId("budget-type-lifetime-google"));

      expect(onBudgetChange).toHaveBeenCalledWith("google", {
        type: "lifetime",
        amountPattern: "100",
        currency: "USD",
      });
    });

    it("calls onBudgetChange when amount is changed", async () => {
      const user = userEvent.setup();
      const budgetsWithGoogle: Record<Platform, BudgetConfig | null> = {
        google: { type: "daily", amountPattern: "", currency: "USD" },
        reddit: null,
        facebook: null,
      };

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={budgetsWithGoogle}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      await user.click(screen.getByTestId("budget-toggle-google"));
      await user.type(screen.getByTestId("budget-amount-google"), "500");

      // Should be called for each character typed
      expect(onBudgetChange).toHaveBeenCalled();
      const lastCall = onBudgetChange.mock.calls[onBudgetChange.mock.calls.length - 1];
      expect(lastCall[0]).toBe("google");
      expect(lastCall[1].amountPattern).toContain("0"); // Last character of "500"
    });

    it("calls onBudgetChange when currency is changed", async () => {
      const user = userEvent.setup();
      const budgetsWithGoogle: Record<Platform, BudgetConfig | null> = {
        google: { type: "daily", amountPattern: "100", currency: "USD" },
        reddit: null,
        facebook: null,
      };

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={budgetsWithGoogle}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      await user.click(screen.getByTestId("budget-toggle-google"));
      await user.selectOptions(screen.getByTestId("budget-currency-google"), "EUR");

      expect(onBudgetChange).toHaveBeenCalledWith("google", {
        type: "daily",
        amountPattern: "100",
        currency: "EUR",
      });
    });

    it("calls onBudgetChange with null when budget is disabled", async () => {
      const user = userEvent.setup();
      const budgetsWithGoogle: Record<Platform, BudgetConfig | null> = {
        google: { type: "daily", amountPattern: "100", currency: "USD" },
        reddit: null,
        facebook: null,
      };

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={budgetsWithGoogle}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      await user.click(screen.getByTestId("budget-toggle-google"));
      await user.click(screen.getByTestId("budget-enable-google"));

      expect(onBudgetChange).toHaveBeenCalledWith("google", null);
    });

    it("displays existing budget amount in toggle button", () => {
      const budgetsWithGoogle: Record<Platform, BudgetConfig | null> = {
        google: { type: "daily", amountPattern: "250", currency: "USD" },
        reddit: null,
        facebook: null,
      };

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={budgetsWithGoogle}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      expect(screen.getByText(/\$250 daily/i)).toBeInTheDocument();
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(3);
    });

    it("has accessible labels for each platform", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      const googleCheckbox = screen.getByRole("checkbox", { name: /google/i });
      expect(googleCheckbox).toHaveAttribute("aria-checked", "true");

      const redditCheckbox = screen.getByRole("checkbox", { name: /reddit/i });
      expect(redditCheckbox).toHaveAttribute("aria-checked", "false");
    });

    it("has a group label for the platform selection", () => {
      render(
        <PlatformSelector
          selectedPlatforms={[]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      expect(screen.getByRole("group", { name: /select platforms/i })).toBeInTheDocument();
    });

    it("budget panel has proper aria-expanded state", async () => {
      const user = userEvent.setup();

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      const budgetToggle = screen.getByTestId("budget-toggle-google");
      expect(budgetToggle).toHaveAttribute("aria-expanded", "false");

      await user.click(budgetToggle);
      expect(budgetToggle).toHaveAttribute("aria-expanded", "true");
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
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
          platformBudgets={emptyBudgets}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      // Should still render known platforms
      expect(screen.getByTestId("platform-checkbox-google")).toBeInTheDocument();
      // Count should reflect what's actually selected and valid
      expect(screen.getByText(/1 platform selected/i)).toBeInTheDocument();
    });

    it("clears budget when platform is deselected", async () => {
      const user = userEvent.setup();
      const budgetsWithGoogle: Record<Platform, BudgetConfig | null> = {
        google: { type: "daily", amountPattern: "100", currency: "USD" },
        reddit: null,
        facebook: null,
      };

      render(
        <PlatformSelector
          selectedPlatforms={["google"]}
          platformBudgets={budgetsWithGoogle}
          onToggle={onToggle}
          onBudgetChange={onBudgetChange}
        />
      );

      // Deselect google - should clear its budget
      await user.click(screen.getByTestId("platform-checkbox-google"));

      expect(onToggle).toHaveBeenCalledWith("google");
      expect(onBudgetChange).toHaveBeenCalledWith("google", null);
    });
  });
});
