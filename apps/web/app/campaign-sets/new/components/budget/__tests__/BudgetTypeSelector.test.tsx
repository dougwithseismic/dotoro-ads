import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetTypeSelector } from "../BudgetTypeSelector";
import type { BudgetType } from "../../../types";

describe("BudgetTypeSelector", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders all budget type options", () => {
      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("budget-type-daily")).toBeInTheDocument();
      expect(screen.getByTestId("budget-type-lifetime")).toBeInTheDocument();
      expect(screen.getByTestId("budget-type-shared")).toBeInTheDocument();
    });

    it("displays budget type names and descriptions", () => {
      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      expect(screen.getByText("Daily")).toBeInTheDocument();
      expect(screen.getByText("Lifetime")).toBeInTheDocument();
      expect(screen.getByText("Shared")).toBeInTheDocument();

      // Should have descriptive text
      expect(screen.getByText(/resets each day/i)).toBeInTheDocument();
      expect(screen.getByText(/total for campaign/i)).toBeInTheDocument();
      expect(screen.getByText(/share across/i)).toBeInTheDocument();
    });

    it("renders with a label when provided", () => {
      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
          label="Budget Type"
        />
      );

      expect(screen.getByText("Budget Type")).toBeInTheDocument();
    });

    it("renders without label when not provided", () => {
      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Selection State Tests
  // ==========================================================================

  describe("Selection State", () => {
    it("marks daily as selected when value is daily", () => {
      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      const dailyCard = screen.getByTestId("budget-type-daily");
      expect(dailyCard).toHaveAttribute("aria-checked", "true");

      const lifetimeCard = screen.getByTestId("budget-type-lifetime");
      expect(lifetimeCard).toHaveAttribute("aria-checked", "false");
    });

    it("marks lifetime as selected when value is lifetime", () => {
      render(
        <BudgetTypeSelector
          value="lifetime"
          onChange={onChange}
        />
      );

      const dailyCard = screen.getByTestId("budget-type-daily");
      expect(dailyCard).toHaveAttribute("aria-checked", "false");

      const lifetimeCard = screen.getByTestId("budget-type-lifetime");
      expect(lifetimeCard).toHaveAttribute("aria-checked", "true");
    });

    it("marks shared as selected when value is shared", () => {
      render(
        <BudgetTypeSelector
          value="shared"
          onChange={onChange}
        />
      );

      const sharedCard = screen.getByTestId("budget-type-shared");
      expect(sharedCard).toHaveAttribute("aria-checked", "true");
    });

    it("applies selected styling to the selected type", () => {
      render(
        <BudgetTypeSelector
          value="lifetime"
          onChange={onChange}
        />
      );

      const lifetimeCard = screen.getByTestId("budget-type-lifetime");
      expect(lifetimeCard.className).toMatch(/selected/i);
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onChange with daily when daily is clicked", async () => {
      const user = userEvent.setup();

      render(
        <BudgetTypeSelector
          value="lifetime"
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("budget-type-daily"));

      expect(onChange).toHaveBeenCalledWith("daily");
    });

    it("calls onChange with lifetime when lifetime is clicked", async () => {
      const user = userEvent.setup();

      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("budget-type-lifetime"));

      expect(onChange).toHaveBeenCalledWith("lifetime");
    });

    it("calls onChange with shared when shared is clicked", async () => {
      const user = userEvent.setup();

      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("budget-type-shared"));

      expect(onChange).toHaveBeenCalledWith("shared");
    });

    it("does not call onChange when clicking already selected type", async () => {
      const user = userEvent.setup();

      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("budget-type-daily"));

      expect(onChange).not.toHaveBeenCalled();
    });

    it("supports keyboard selection with Enter", async () => {
      const user = userEvent.setup();

      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      const lifetimeCard = screen.getByTestId("budget-type-lifetime");
      lifetimeCard.focus();

      await user.keyboard("{Enter}");

      expect(onChange).toHaveBeenCalledWith("lifetime");
    });

    it("supports keyboard selection with Space", async () => {
      const user = userEvent.setup();

      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      const sharedCard = screen.getByTestId("budget-type-shared");
      sharedCard.focus();

      await user.keyboard(" ");

      expect(onChange).toHaveBeenCalledWith("shared");
    });
  });

  // ==========================================================================
  // Disabled State Tests
  // ==========================================================================

  describe("Disabled State", () => {
    it("disables all options when disabled prop is true", () => {
      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
          disabled
        />
      );

      expect(screen.getByTestId("budget-type-daily")).toBeDisabled();
      expect(screen.getByTestId("budget-type-lifetime")).toBeDisabled();
      expect(screen.getByTestId("budget-type-shared")).toBeDisabled();
    });

    it("does not call onChange when disabled", async () => {
      const user = userEvent.setup();

      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
          disabled
        />
      );

      await user.click(screen.getByTestId("budget-type-lifetime"));

      expect(onChange).not.toHaveBeenCalled();
    });

    it("applies disabled styling when disabled", () => {
      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
          disabled
        />
      );

      const container = screen.getByTestId("budget-type-daily").closest('[role="radiogroup"]');
      expect(container?.className).toMatch(/disabled/i);
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper radiogroup role", () => {
      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    });

    it("has accessible labels for each option", () => {
      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
        />
      );

      expect(screen.getByRole("radio", { name: /daily/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /lifetime/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /shared/i })).toBeInTheDocument();
    });

    it("announces selection state via aria-checked", () => {
      render(
        <BudgetTypeSelector
          value="lifetime"
          onChange={onChange}
        />
      );

      const dailyRadio = screen.getByRole("radio", { name: /daily/i });
      expect(dailyRadio).toHaveAttribute("aria-checked", "false");

      const lifetimeRadio = screen.getByRole("radio", { name: /lifetime/i });
      expect(lifetimeRadio).toHaveAttribute("aria-checked", "true");
    });

    it("has a group label when label prop is provided", () => {
      render(
        <BudgetTypeSelector
          value="daily"
          onChange={onChange}
          label="Select Budget Type"
        />
      );

      expect(screen.getByRole("radiogroup", { name: /select budget type/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Shared Budget Note Tests
  // ==========================================================================

  describe("Shared Budget", () => {
    it("shows shared budget ID input when shared is selected and showSharedConfig is true", () => {
      render(
        <BudgetTypeSelector
          value="shared"
          onChange={onChange}
          showSharedConfig
        />
      );

      expect(screen.getByPlaceholderText(/budget id/i)).toBeInTheDocument();
    });

    it("does not show shared config when showSharedConfig is false", () => {
      render(
        <BudgetTypeSelector
          value="shared"
          onChange={onChange}
          showSharedConfig={false}
        />
      );

      expect(screen.queryByPlaceholderText(/budget id/i)).not.toBeInTheDocument();
    });

    it("calls onSharedBudgetIdChange when shared budget ID is entered", async () => {
      const user = userEvent.setup();
      const onSharedBudgetIdChange = vi.fn();

      render(
        <BudgetTypeSelector
          value="shared"
          onChange={onChange}
          showSharedConfig
          sharedBudgetId=""
          onSharedBudgetIdChange={onSharedBudgetIdChange}
        />
      );

      const input = screen.getByPlaceholderText(/budget id/i);
      await user.type(input, "budget-123");

      expect(onSharedBudgetIdChange).toHaveBeenCalled();
    });
  });
});
