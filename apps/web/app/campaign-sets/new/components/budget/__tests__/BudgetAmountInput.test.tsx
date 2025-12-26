import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetAmountInput } from "../BudgetAmountInput";
import type { DataSourceColumn } from "../../../types";

describe("BudgetAmountInput", () => {
  let onChange: ReturnType<typeof vi.fn>;

  const mockColumns: DataSourceColumn[] = [
    { name: "budget", type: "number", sampleValues: ["100", "200", "300"] },
    { name: "daily_budget", type: "number", sampleValues: ["50", "75", "100"] },
    { name: "product_name", type: "string", sampleValues: ["Widget A", "Widget B"] },
  ];

  const mockSampleData: Record<string, unknown>[] = [
    { budget: 100, daily_budget: 50, product_name: "Widget A" },
    { budget: 200, daily_budget: 75, product_name: "Widget B" },
  ];

  beforeEach(() => {
    onChange = vi.fn();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders input with currency symbol", () => {
      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByText("$")).toBeInTheDocument();
    });

    it("renders with label when provided", () => {
      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          label="Budget Amount"
        />
      );

      expect(screen.getByText("Budget Amount")).toBeInTheDocument();
    });

    it("renders with placeholder when provided", () => {
      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          placeholder="Enter amount or {variable}"
        />
      );

      expect(screen.getByPlaceholderText("Enter amount or {variable}")).toBeInTheDocument();
    });

    it("renders with hint text when provided", () => {
      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          hint="Use a fixed value or {variable} pattern"
        />
      );

      expect(screen.getByText(/fixed value or.*variable/i)).toBeInTheDocument();
    });

    it("displays the current value", () => {
      render(
        <BudgetAmountInput
          value="500"
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByDisplayValue("500")).toBeInTheDocument();
    });

    it("displays variable pattern in input", () => {
      render(
        <BudgetAmountInput
          value="{budget}"
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByDisplayValue("{budget}")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Currency Symbol Tests
  // ==========================================================================

  describe("Currency Symbol", () => {
    it("shows $ for USD", () => {
      render(
        <BudgetAmountInput
          value="100"
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByText("$")).toBeInTheDocument();
    });

    it("shows euro symbol for EUR", () => {
      render(
        <BudgetAmountInput
          value="100"
          onChange={onChange}
          currency="EUR"
        />
      );

      // Euro symbol is the actual unicode character
      expect(screen.getByText("\u20AC")).toBeInTheDocument();
    });

    it("shows pound symbol for GBP", () => {
      render(
        <BudgetAmountInput
          value="100"
          onChange={onChange}
          currency="GBP"
        />
      );

      // Pound symbol is the actual unicode character
      expect(screen.getByText("\u00A3")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onChange when value is typed", async () => {
      const user = userEvent.setup();

      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
        />
      );

      await user.type(screen.getByRole("textbox"), "100");

      expect(onChange).toHaveBeenCalled();
      // Check last call
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0]).toContain("0"); // Last character typed
    });

    it("allows typing variable patterns", async () => {
      const user = userEvent.setup();

      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
        />
      );

      // Use double curly braces to escape special characters in userEvent
      await user.type(screen.getByRole("textbox"), "{{budget}}");

      expect(onChange).toHaveBeenCalled();
    });

    it("clears value when cleared", async () => {
      const user = userEvent.setup();

      render(
        <BudgetAmountInput
          value="100"
          onChange={onChange}
          currency="USD"
        />
      );

      const input = screen.getByRole("textbox");
      await user.clear(input);

      expect(onChange).toHaveBeenCalledWith("");
    });
  });

  // ==========================================================================
  // Preview Tests
  // ==========================================================================

  describe("Preview", () => {
    it("shows interpolated preview when variable pattern and sample data provided", () => {
      render(
        <BudgetAmountInput
          value="{budget}"
          onChange={onChange}
          currency="USD"
          columns={mockColumns}
          sampleData={mockSampleData}
          showPreview
        />
      );

      // Should show preview with first sample value
      expect(screen.getByText(/preview/i)).toBeInTheDocument();
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it("does not show preview when showPreview is false", () => {
      render(
        <BudgetAmountInput
          value="{budget}"
          onChange={onChange}
          currency="USD"
          columns={mockColumns}
          sampleData={mockSampleData}
          showPreview={false}
        />
      );

      expect(screen.queryByText(/preview/i)).not.toBeInTheDocument();
    });

    it("shows fixed value as preview when not using variable", () => {
      render(
        <BudgetAmountInput
          value="250"
          onChange={onChange}
          currency="USD"
          showPreview
        />
      );

      expect(screen.getByText(/\$250/)).toBeInTheDocument();
    });

    it("shows variable not found message when variable does not exist", () => {
      render(
        <BudgetAmountInput
          value="{nonexistent}"
          onChange={onChange}
          currency="USD"
          columns={mockColumns}
          sampleData={mockSampleData}
          showPreview
        />
      );

      // Should show the unresolved variable
      expect(screen.getByText(/{nonexistent}/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Error State Tests
  // ==========================================================================

  describe("Error State", () => {
    it("shows error styling when error prop is true", () => {
      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          error
        />
      );

      const input = screen.getByRole("textbox");
      expect(input.className).toMatch(/error/i);
    });

    it("shows error message when provided", () => {
      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          error
          errorMessage="Budget amount is required"
        />
      );

      expect(screen.getByText("Budget amount is required")).toBeInTheDocument();
    });

    it("hides hint when error message is shown", () => {
      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          hint="This is a hint"
          error
          errorMessage="This is an error"
        />
      );

      expect(screen.queryByText("This is a hint")).not.toBeInTheDocument();
      expect(screen.getByText("This is an error")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Disabled State Tests
  // ==========================================================================

  describe("Disabled State", () => {
    it("disables input when disabled prop is true", () => {
      render(
        <BudgetAmountInput
          value="100"
          onChange={onChange}
          currency="USD"
          disabled
        />
      );

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("does not call onChange when disabled", async () => {
      const user = userEvent.setup();

      render(
        <BudgetAmountInput
          value="100"
          onChange={onChange}
          currency="USD"
          disabled
        />
      );

      const input = screen.getByRole("textbox");
      await user.type(input, "200");

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has accessible label", () => {
      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          label="Budget Amount"
        />
      );

      expect(screen.getByLabelText("Budget Amount")).toBeInTheDocument();
    });

    it("has aria-invalid when error is true", () => {
      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          error
        />
      );

      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("has aria-describedby linked to error message", () => {
      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          error
          errorMessage="Budget is required"
        />
      );

      const input = screen.getByRole("textbox");
      const errorId = input.getAttribute("aria-describedby");
      expect(errorId).toBeTruthy();

      const errorElement = document.getElementById(errorId!);
      expect(errorElement).toHaveTextContent("Budget is required");
    });
  });

  // ==========================================================================
  // Variable Autocomplete Tests
  // ==========================================================================

  describe("Variable Autocomplete", () => {
    it("shows autocomplete dropdown when typing {", async () => {
      const user = userEvent.setup();

      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          columns={mockColumns}
          enableAutocomplete
        />
      );

      // When enableAutocomplete is true, the role is "combobox"
      const input = screen.getByRole("combobox");
      // Use double curly braces to escape the special character
      await user.type(input, "{{");

      expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
    });

    it("shows all variables in dropdown when just { is typed", async () => {
      const user = userEvent.setup();

      render(
        <BudgetAmountInput
          value=""
          onChange={onChange}
          currency="USD"
          columns={mockColumns}
          enableAutocomplete
        />
      );

      // When enableAutocomplete is true, the role is "combobox"
      const input = screen.getByRole("combobox");
      // Use double curly braces to escape the special character
      await user.type(input, "{{");

      // Should show all variable options
      expect(screen.getByTestId("variable-option-budget")).toBeInTheDocument();
      expect(screen.getByTestId("variable-option-daily_budget")).toBeInTheDocument();
      expect(screen.getByTestId("variable-option-product_name")).toBeInTheDocument();
    });
  });
});
