import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignConfig } from "../CampaignConfig";
import type { CampaignConfig as CampaignConfigType, DataSourceColumn, ValidationResult } from "../../types";

const mockColumns: DataSourceColumn[] = [
  { name: "brand_name", type: "string", sampleValues: ["Nike", "Adidas", "Puma"] },
  { name: "region", type: "string", sampleValues: ["US", "EU", "APAC"] },
  { name: "product_name", type: "string", sampleValues: ["Air Max", "Ultraboost"] },
  { name: "budget", type: "number", sampleValues: ["100", "250", "500"] },
  { name: "launch_date", type: "date", sampleValues: ["2024-01-15", "2024-02-01"] },
];

const defaultConfig: CampaignConfigType = {
  namePattern: "",
};

describe("CampaignConfig", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  // ==========================================================================
  // Campaign Name Pattern Tests
  // ==========================================================================

  describe("Campaign Name Pattern", () => {
    it("renders campaign name input field", () => {
      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/campaign name pattern/i)).toBeInTheDocument();
    });

    it("displays current name pattern value", () => {
      const config: CampaignConfigType = {
        ...defaultConfig,
        namePattern: "{brand_name}-performance",
      };

      render(
        <CampaignConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i) as HTMLInputElement;
      expect(input.value).toBe("{brand_name}-performance");
    });

    it("calls onChange when name pattern is typed", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      await user.type(input, "test");

      // Should call onChange for each character typed
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].namePattern).toContain("t");
    });

    it("shows variable autocomplete dropdown when { is typed", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      // Use double braces to escape the special character in userEvent
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // Should show all available columns
      expect(screen.getByText("brand_name")).toBeInTheDocument();
      expect(screen.getByText("region")).toBeInTheDocument();
      expect(screen.getByText("product_name")).toBeInTheDocument();
    });

    it("filters autocomplete options based on partial input", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      // First open the dropdown with {
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // Then type the filter - this simulates typing inside an open brace
      await user.type(input, "bra");

      await waitFor(() => {
        // Should only show brand_name after filtering
        expect(screen.getByText("brand_name")).toBeInTheDocument();
        expect(screen.queryByText("region")).not.toBeInTheDocument();
      });
    });

    it("selects variable from dropdown and completes syntax", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // Click on brand_name option
      await user.click(screen.getByText("brand_name"));

      // Should have inserted {brand_name}
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].namePattern).toBe("{brand_name}");
    });

    it("closes autocomplete dropdown when clicking outside", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // Click outside
      await user.click(document.body);

      await waitFor(() => {
        expect(screen.queryByTestId("variable-dropdown")).not.toBeInTheDocument();
      });
    });

    it("navigates dropdown options with arrow keys", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // Press down arrow to highlight first option
      await user.keyboard("{ArrowDown}");

      const firstOption = screen.getByTestId("variable-option-brand_name");
      expect(firstOption).toHaveAttribute("aria-selected", "true");
    });

    it("selects highlighted option with Enter key", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].namePattern).toBe("{brand_name}");
    });

    it("closes dropdown on Escape key", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      await user.keyboard("{Escape}");

      expect(screen.queryByTestId("variable-dropdown")).not.toBeInTheDocument();
    });

    it("shows sample values for variables in dropdown", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // Should show sample values as hints
      expect(screen.getByText(/Nike, Adidas/)).toBeInTheDocument();
    });

    it("displays placeholder text with example pattern", () => {
      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i) as HTMLInputElement;
      expect(input.placeholder).toContain("{brand_name}");
    });
  });

  // ==========================================================================
  // Budget Configuration Tests (Removed - Budget now in PlatformSelector)
  // ==========================================================================

  describe("Budget Configuration (Removed)", () => {
    it("does not render budget toggle", () => {
      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.queryByLabelText(/enable budget/i)).not.toBeInTheDocument();
    });

    it("does not render budget fields", () => {
      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.queryByLabelText(/budget amount/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/currency/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Validation Display Tests
  // ==========================================================================

  describe("Validation Display", () => {
    it("displays validation errors", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ['Variable "{invalid_var}" not found in data source columns'],
        warnings: [],
      };

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.getByTestId("validation-errors")).toBeInTheDocument();
      expect(screen.getByText(/invalid_var.*not found/i)).toBeInTheDocument();
    });

    it("displays validation warnings", () => {
      const validation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: ["Consider using more specific variable names"],
      };

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.getByTestId("validation-warnings")).toBeInTheDocument();
      expect(screen.getByText(/consider using more specific/i)).toBeInTheDocument();
    });

    it("does not show validation section when valid with no warnings", () => {
      const validation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
      };

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.queryByTestId("validation-errors")).not.toBeInTheDocument();
      expect(screen.queryByTestId("validation-warnings")).not.toBeInTheDocument();
    });

    it("highlights invalid fields based on validation errors", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ["Pattern cannot be empty"],
        warnings: [],
      };

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      const nameInput = screen.getByLabelText(/campaign name pattern/i);
      expect(nameInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper ARIA labels for all inputs", () => {
      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/campaign name pattern/i)).toHaveAttribute("aria-describedby");
    });

    it("announces autocomplete options to screen readers", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // Dropdown should have proper ARIA attributes
      const dropdown = screen.getByTestId("variable-dropdown");
      expect(dropdown).toHaveAttribute("role", "listbox");
    });

    it("supports tab navigation through form", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Tab through the form elements
      await user.tab();
      expect(screen.getByLabelText(/campaign name pattern/i)).toHaveFocus();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles empty columns list", () => {
      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={[]}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/campaign name pattern/i)).toBeInTheDocument();
      // Should show a hint that no variables are available
      expect(screen.getByText(/no variables available/i)).toBeInTheDocument();
    });

    it("handles special characters in column names", async () => {
      const user = userEvent.setup();
      const columnsWithSpecialChars: DataSourceColumn[] = [
        { name: "product_name_v2", type: "string" },
        { name: "price_usd", type: "number" },
      ];

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={columnsWithSpecialChars}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByText("product_name_v2")).toBeInTheDocument();
        expect(screen.getByText("price_usd")).toBeInTheDocument();
      });
    });

    it("handles rapid typing without crashing", async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i);
      // Use double braces for escaping
      await user.type(input, "{{brand_name}}-{{region}}-{{product_name}}");

      // Should not crash and onChange should have been called
      expect(onChange).toHaveBeenCalled();
    });

    it("preserves cursor position when selecting from autocomplete", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/campaign name pattern/i) as HTMLInputElement;
      // Type prefix then open the variable dropdown
      await user.type(input, "prefix-{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      await user.click(screen.getByText("brand_name"));

      // Pattern should be prefix-{brand_name}
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].namePattern).toBe("prefix-{brand_name}");
    });
  });
});
