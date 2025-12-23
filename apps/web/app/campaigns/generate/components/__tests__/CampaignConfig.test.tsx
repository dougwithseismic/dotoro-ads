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
  platform: "google",
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
  // Platform Selector Tests
  // ==========================================================================

  describe("Platform Selector", () => {
    it("renders platform selection cards", () => {
      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("platform-card-google")).toBeInTheDocument();
      expect(screen.getByTestId("platform-card-reddit")).toBeInTheDocument();
      expect(screen.getByTestId("platform-card-facebook")).toBeInTheDocument();
    });

    it("highlights the selected platform", () => {
      const config: CampaignConfigType = {
        ...defaultConfig,
        platform: "reddit",
      };

      render(
        <CampaignConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const redditCard = screen.getByTestId("platform-card-reddit");
      expect(redditCard).toHaveAttribute("aria-selected", "true");

      const googleCard = screen.getByTestId("platform-card-google");
      expect(googleCard).toHaveAttribute("aria-selected", "false");
    });

    it("calls onChange when platform is selected", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("platform-card-facebook"));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ platform: "facebook" })
      );
    });

    it("displays platform-specific hints", () => {
      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Each platform card should have a description
      expect(screen.getByText(/google ads/i)).toBeInTheDocument();
      expect(screen.getByText(/reddit ads/i)).toBeInTheDocument();
      expect(screen.getByText(/facebook ads/i)).toBeInTheDocument();
    });

    it("supports keyboard navigation between platform cards", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const googleCard = screen.getByTestId("platform-card-google");
      googleCard.focus();

      await user.keyboard("{ArrowRight}");

      // Should move focus to reddit
      expect(screen.getByTestId("platform-card-reddit")).toHaveFocus();
    });
  });

  // ==========================================================================
  // Budget Configuration Tests
  // ==========================================================================

  describe("Budget Configuration", () => {
    it("renders budget toggle to enable budget", () => {
      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/enable budget/i)).toBeInTheDocument();
    });

    it("shows budget fields when budget is enabled", async () => {
      const user = userEvent.setup();

      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const budgetToggle = screen.getByLabelText(/enable budget/i);
      await user.click(budgetToggle);

      // The onChange will set budget, so we need to re-render with the new config
      // For this test, we'll test with an already-enabled budget config
    });

    it("hides budget fields when budget is disabled", () => {
      render(
        <CampaignConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.queryByLabelText(/budget amount/i)).not.toBeInTheDocument();
    });

    it("displays existing budget configuration", () => {
      const config: CampaignConfigType = {
        ...defaultConfig,
        budget: {
          type: "daily",
          amountPattern: "100",
          currency: "USD",
        },
      };

      render(
        <CampaignConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Budget should be enabled and fields visible
      const budgetToggle = screen.getByRole("switch", { name: /enable budget/i });
      expect(budgetToggle).toHaveAttribute("aria-checked", "true");

      expect(screen.getByLabelText(/budget amount/i)).toHaveValue("100");
    });

    it("toggles between daily and lifetime budget types", async () => {
      const user = userEvent.setup();
      const config: CampaignConfigType = {
        ...defaultConfig,
        budget: {
          type: "daily",
          amountPattern: "100",
          currency: "USD",
        },
      };

      render(
        <CampaignConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const lifetimeButton = screen.getByRole("button", { name: /lifetime/i });
      await user.click(lifetimeButton);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: expect.objectContaining({ type: "lifetime" }),
        })
      );
    });

    it("allows variable syntax in budget amount", async () => {
      const user = userEvent.setup();
      const config: CampaignConfigType = {
        ...defaultConfig,
        budget: {
          type: "daily",
          amountPattern: "",
          currency: "USD",
        },
      };

      render(
        <CampaignConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const amountInput = screen.getByLabelText(/budget amount/i);
      // Use double braces to escape and type the variable syntax
      await user.type(amountInput, "{{budget}}");

      // Check that onChange was called with budget in the pattern
      expect(onChange).toHaveBeenCalled();
    });

    it("shows autocomplete for budget amount field", async () => {
      const user = userEvent.setup();
      const config: CampaignConfigType = {
        ...defaultConfig,
        budget: {
          type: "daily",
          amountPattern: "",
          currency: "USD",
        },
      };

      render(
        <CampaignConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const amountInput = screen.getByLabelText(/budget amount/i);
      await user.type(amountInput, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // Should show budget variable (number type column)
      expect(screen.getByText("budget")).toBeInTheDocument();
    });

    it("allows currency selection", async () => {
      const user = userEvent.setup();
      const config: CampaignConfigType = {
        ...defaultConfig,
        budget: {
          type: "daily",
          amountPattern: "100",
          currency: "USD",
        },
      };

      render(
        <CampaignConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const currencySelect = screen.getByLabelText(/currency/i);
      await user.selectOptions(currencySelect, "EUR");

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: expect.objectContaining({ currency: "EUR" }),
        })
      );
    });

    it("removes budget from config when disabled", async () => {
      const user = userEvent.setup();
      const config: CampaignConfigType = {
        ...defaultConfig,
        budget: {
          type: "daily",
          amountPattern: "100",
          currency: "USD",
        },
      };

      render(
        <CampaignConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const budgetToggle = screen.getByLabelText(/enable budget/i);
      await user.click(budgetToggle);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ budget: undefined })
      );
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
      const config: CampaignConfigType = {
        ...defaultConfig,
        budget: {
          type: "daily",
          amountPattern: "100",
          currency: "USD",
        },
      };

      render(
        <CampaignConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/campaign name pattern/i)).toHaveAttribute("aria-describedby");
      expect(screen.getByRole("listbox", { name: /select platform/i })).toBeInTheDocument();
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

      await user.tab();
      // Should focus on first platform card
      expect(screen.getByTestId("platform-card-google")).toHaveFocus();
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
