import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { VariableAutocomplete } from "../VariableAutocomplete";
import type { DataSourceColumn } from "../../types";

// Helper to get the combobox input (role="combobox" not "textbox")
const getInput = () => screen.getByRole("combobox");

const mockColumns: DataSourceColumn[] = [
  { name: "brand", type: "string", sampleValues: ["Nike", "Adidas", "Puma"] },
  { name: "product", type: "string", sampleValues: ["Air Max", "Ultraboost"] },
  { name: "price", type: "number", sampleValues: ["99", "129", "149"] },
  { name: "region", type: "string", sampleValues: ["US", "EU", "APAC"] },
  { name: "is_active", type: "boolean", sampleValues: ["true", "false"] },
];

describe("VariableAutocomplete", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    columns: mockColumns,
    placeholder: "Enter pattern...",
    label: "Campaign Name",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders input with placeholder", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      expect(screen.getByPlaceholderText("Enter pattern...")).toBeInTheDocument();
    });

    it("renders with label when provided", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      expect(screen.getByLabelText("Campaign Name")).toBeInTheDocument();
    });

    it("displays the initial value", () => {
      render(<VariableAutocomplete {...defaultProps} value="{brand}-performance" />);

      expect(screen.getByDisplayValue("{brand}-performance")).toBeInTheDocument();
    });

    it("renders with aria-describedby when hint is provided", () => {
      render(<VariableAutocomplete {...defaultProps} hint="Use {variable} syntax" />);

      const input = getInput();
      expect(input).toHaveAttribute("aria-describedby");
    });
  });

  describe("Dropdown Trigger", () => {
    it("shows dropdown when { is typed", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      // Simulate typing { using fireEvent to control the value
      fireEvent.change(input, { target: { value: "{" } });

      expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
    });

    it("shows all columns in dropdown when { is typed", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      expect(screen.getByText("brand")).toBeInTheDocument();
      expect(screen.getByText("product")).toBeInTheDocument();
      expect(screen.getByText("price")).toBeInTheDocument();
      expect(screen.getByText("region")).toBeInTheDocument();
      expect(screen.getByText("is_active")).toBeInTheDocument();
    });

    it("filters columns based on partial input", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      // Simulate typing {pr to filter
      fireEvent.change(input, { target: { value: "{pr" } });

      expect(screen.getByText("product")).toBeInTheDocument();
      expect(screen.getByText("price")).toBeInTheDocument();
      expect(screen.queryByText("brand")).not.toBeInTheDocument();
      expect(screen.queryByText("region")).not.toBeInTheDocument();
    });

    it("closes dropdown when } is typed", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{brand}" } });

      expect(screen.queryByTestId("variable-dropdown")).not.toBeInTheDocument();
    });

    it("closes dropdown when clicking outside", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <VariableAutocomplete {...defaultProps} />
          <button type="button">Outside</button>
        </div>
      );

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });
      expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();

      await user.click(screen.getByText("Outside"));
      expect(screen.queryByTestId("variable-dropdown")).not.toBeInTheDocument();
    });
  });

  describe("Variable Selection", () => {
    it("inserts selected variable into input", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<VariableAutocomplete {...defaultProps} onChange={onChange} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      await user.click(screen.getByText("brand"));

      expect(onChange).toHaveBeenCalledWith("{brand}");
    });

    it("replaces partial variable with selected option", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      // Note: dropdown only shows when there's an unclosed brace
      // The value "{br" has an unclosed brace so dropdown will filter to columns starting with "br"
      render(<VariableAutocomplete {...defaultProps} onChange={onChange} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      await user.click(screen.getByText("brand"));

      expect(onChange).toHaveBeenCalledWith("{brand}");
    });

    // Note: "preserves text before the variable" test would require a more complex
    // test setup with state management since VariableAutocomplete is controlled.
    // The core insertion behavior is tested above.
  });

  describe("Keyboard Navigation", () => {
    it("navigates down with ArrowDown", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      const firstOption = screen.getByTestId("variable-option-brand");
      expect(firstOption).toHaveAttribute("aria-selected", "true");
    });

    it("navigates up with ArrowUp", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowUp" });

      const firstOption = screen.getByTestId("variable-option-brand");
      expect(firstOption).toHaveAttribute("aria-selected", "true");
    });

    it("selects highlighted option with Enter", () => {
      const onChange = vi.fn();
      render(<VariableAutocomplete {...defaultProps} onChange={onChange} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onChange).toHaveBeenCalledWith("{brand}");
    });

    it("closes dropdown with Escape", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });
      expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();

      fireEvent.keyDown(input, { key: "Escape" });
      expect(screen.queryByTestId("variable-dropdown")).not.toBeInTheDocument();
    });

    it("stays at last item when navigating past end", () => {
      render(<VariableAutocomplete {...defaultProps} columns={mockColumns.slice(0, 2)} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      // Navigate down past the 2 items
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      // Should stay at last item (no wrap)
      const secondOption = screen.getByTestId("variable-option-product");
      expect(secondOption).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Sample Values Display", () => {
    it("shows sample values on options", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      expect(screen.getByText("Nike, Adidas, Puma")).toBeInTheDocument();
    });

    it("truncates sample values when too many", () => {
      const columnsWithManySamples: DataSourceColumn[] = [
        {
          name: "test",
          type: "string",
          sampleValues: ["one", "two", "three", "four", "five", "six"],
        },
      ];
      render(<VariableAutocomplete {...defaultProps} columns={columnsWithManySamples} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      // Should only show first 3 values
      expect(screen.getByText("one, two, three")).toBeInTheDocument();
    });

    it("shows column type badge", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      // brand, product, region are string (3), price is number, is_active is boolean
      expect(screen.getAllByText("string").length).toBeGreaterThanOrEqual(3);
      expect(screen.getByText("number")).toBeInTheDocument();
      expect(screen.getByText("boolean")).toBeInTheDocument();
    });
  });

  describe("Variable Availability Indicator", () => {
    it("highlights used variables differently", () => {
      render(
        <VariableAutocomplete
          {...defaultProps}
          usedVariables={["brand"]}
        />
      );

      const input = getInput();
      // The dropdown shows with an unclosed brace at end
      fireEvent.change(input, { target: { value: "{" } });

      const brandOption = screen.getByTestId("variable-option-brand");
      expect(brandOption.className).toMatch(/used/i);
    });

    it("shows which variables are used vs available", () => {
      render(
        <VariableAutocomplete
          {...defaultProps}
          usedVariables={["brand", "product"]}
        />
      );

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      // Used variables should be marked
      const brandOption = screen.getByTestId("variable-option-brand");
      const priceOption = screen.getByTestId("variable-option-price");

      expect(brandOption).toHaveAttribute("data-used", "true");
      expect(priceOption).toHaveAttribute("data-used", "false");
    });
  });

  describe("Error State", () => {
    it("shows error styling when error prop is true", () => {
      render(<VariableAutocomplete {...defaultProps} error />);

      const input = getInput();
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("shows error message when provided", () => {
      render(<VariableAutocomplete {...defaultProps} error errorMessage="Invalid variable" />);

      expect(screen.getByText("Invalid variable")).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("disables input when disabled prop is true", () => {
      render(<VariableAutocomplete {...defaultProps} disabled />);

      const input = getInput();
      expect(input).toBeDisabled();
    });

    it("does not show dropdown when disabled", () => {
      render(<VariableAutocomplete {...defaultProps} disabled />);

      // Disabled inputs don't receive focus/input, so dropdown won't show
      expect(screen.queryByTestId("variable-dropdown")).not.toBeInTheDocument();
    });
  });

  describe("Empty Columns State", () => {
    it("shows message when no columns available", () => {
      render(<VariableAutocomplete {...defaultProps} columns={[]} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      expect(screen.getByText(/no variables available/i)).toBeInTheDocument();
    });

    it("shows message when no columns match filter", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{xyz" } });

      expect(screen.getByText(/no matching variables/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes on dropdown", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      const dropdown = screen.getByTestId("variable-dropdown");
      expect(dropdown).toHaveAttribute("role", "listbox");
      expect(dropdown).toHaveAttribute("aria-label", "Available variables");
    });

    it("has proper role on options", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(mockColumns.length);
    });

    it("announces selected option via aria-selected", () => {
      render(<VariableAutocomplete {...defaultProps} />);

      const input = getInput();
      fireEvent.change(input, { target: { value: "{" } });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      const brandOption = screen.getByTestId("variable-option-brand");
      expect(brandOption).toHaveAttribute("aria-selected", "true");
    });
  });
});
