import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HierarchyConfig } from "../HierarchyConfig";
import type {
  HierarchyConfig as HierarchyConfigType,
  CampaignConfig as CampaignConfigType,
  DataSourceColumn,
  ValidationResult
} from "../../types";

const mockColumns: DataSourceColumn[] = [
  { name: "brand", type: "string", sampleValues: ["Nike", "Adidas", "Puma"] },
  { name: "product", type: "string", sampleValues: ["Air Max", "Ultraboost", "Suede"] },
  { name: "headline", type: "string", sampleValues: ["Run Fast", "Speed Up", "Jump High"] },
  { name: "description", type: "string", sampleValues: ["Best shoe ever", "Top rated", "Classic"] },
  { name: "display_url", type: "string", sampleValues: ["nike.com", "adidas.com"] },
  { name: "final_url", type: "string", sampleValues: ["https://nike.com/shoes", "https://adidas.com/shoes"] },
];

const defaultHierarchyConfig: HierarchyConfigType = {
  adGroupNamePattern: "",
  adMapping: {
    headline: "",
    description: "",
  },
};

const defaultCampaignConfig: CampaignConfigType = {
  namePattern: "{brand}-performance",
  platform: "google",
};

const mockSampleData: Record<string, unknown>[] = [
  { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe ever" },
  { brand: "Nike", product: "Air Max", headline: "Speed Up", description: "Top rated" },
  { brand: "Nike", product: "Jordan", headline: "Jump High", description: "Classic" },
  { brand: "Adidas", product: "Ultraboost", headline: "Run Faster", description: "Premium comfort" },
];

describe("HierarchyConfig", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  // ==========================================================================
  // Ad Group Name Pattern Tests
  // ==========================================================================

  describe("Ad Group Name Pattern", () => {
    it("renders ad group name pattern input field", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/ad group.*pattern/i)).toBeInTheDocument();
    });

    it("displays current ad group name pattern value", () => {
      const config: HierarchyConfigType = {
        ...defaultHierarchyConfig,
        adGroupNamePattern: "{product}",
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group.*pattern/i) as HTMLInputElement;
      expect(input.value).toBe("{product}");
    });

    it("calls onChange when ad group pattern is typed", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group.*pattern/i);
      await user.type(input, "test");

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroupNamePattern).toContain("t");
    });

    it("shows variable autocomplete dropdown when { is typed", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group.*pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      expect(screen.getByText("brand")).toBeInTheDocument();
      expect(screen.getByText("product")).toBeInTheDocument();
    });

    it("filters autocomplete options based on partial input", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group.*pattern/i);
      await user.type(input, "{{pro");

      await waitFor(() => {
        expect(screen.getByText("product")).toBeInTheDocument();
        expect(screen.queryByText("brand")).not.toBeInTheDocument();
      });
    });

    it("selects variable from dropdown and completes syntax", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group.*pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      await user.click(screen.getByText("product"));

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroupNamePattern).toBe("{product}");
    });

    it("supports keyboard navigation in dropdown", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group.*pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      await user.keyboard("{ArrowDown}");
      const firstOption = screen.getByTestId("variable-option-brand");
      expect(firstOption).toHaveAttribute("aria-selected", "true");

      await user.keyboard("{Enter}");
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroupNamePattern).toBe("{brand}");
    });
  });

  // ==========================================================================
  // Ad Field Mapping Tests
  // ==========================================================================

  describe("Ad Field Mapping", () => {
    it("renders headline mapping input", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/headline/i)).toBeInTheDocument();
    });

    it("renders description mapping input", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("renders optional display URL mapping input", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/display url/i)).toBeInTheDocument();
    });

    it("renders optional final URL mapping input", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/final url/i)).toBeInTheDocument();
    });

    it("displays current ad mapping values", () => {
      const config: HierarchyConfigType = {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
          displayUrl: "{display_url}",
          finalUrl: "{final_url}",
        },
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect((screen.getByLabelText(/headline/i) as HTMLInputElement).value).toBe("{headline}");
      expect((screen.getByLabelText(/description/i) as HTMLInputElement).value).toBe("{description}");
      expect((screen.getByLabelText(/display url/i) as HTMLInputElement).value).toBe("{display_url}");
      expect((screen.getByLabelText(/final url/i) as HTMLInputElement).value).toBe("{final_url}");
    });

    it("calls onChange when headline is updated", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const headlineInput = screen.getByLabelText(/headline/i);
      await user.type(headlineInput, "{{headline}}");

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adMapping.headline).toContain("headline");
    });

    it("calls onChange when description is updated", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const descInput = screen.getByLabelText(/description/i);
      await user.type(descInput, "{{description}}");

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adMapping.description).toContain("description");
    });

    it("shows variable autocomplete for all ad mapping fields", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Test headline field autocomplete
      const headlineInput = screen.getByLabelText(/headline/i);
      await user.type(headlineInput, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      expect(screen.getByText("headline")).toBeInTheDocument();
    });

    it("supports multiple headline/description variants syntax", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const headlineInput = screen.getByLabelText(/headline/i);
      await user.type(headlineInput, "{{headline}} - {{product}}");

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adMapping.headline).toContain("headline");
    });
  });

  // ==========================================================================
  // Hierarchy Preview Tests
  // ==========================================================================

  describe("Hierarchy Preview (Real-time)", () => {
    it("renders hierarchy preview section", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("hierarchy-preview")).toBeInTheDocument();
    });

    it("shows campaign level in tree from campaignConfig", () => {
      const config: HierarchyConfigType = {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const preview = screen.getByTestId("hierarchy-preview");
      // Should show campaign based on campaign pattern
      expect(within(preview).getByText(/Nike-performance/)).toBeInTheDocument();
    });

    it("shows ad groups grouped by pattern", () => {
      const config: HierarchyConfigType = {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const preview = screen.getByTestId("hierarchy-preview");
      // Should show ad groups based on product pattern
      expect(within(preview).getByText(/Air Max/)).toBeInTheDocument();
      expect(within(preview).getByText(/Jordan/)).toBeInTheDocument();
    });

    it("shows ads within ad groups", () => {
      const config: HierarchyConfigType = {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const preview = screen.getByTestId("hierarchy-preview");
      // Should show ads with interpolated values (use exact match to avoid partial matches)
      expect(within(preview).getByText("Run Fast")).toBeInTheDocument();
      expect(within(preview).getByText("Speed Up")).toBeInTheDocument();
    });

    it("displays campaign count estimate", () => {
      const config: HierarchyConfigType = {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      // Should show stats with campaign count
      const statsElement = screen.getByTestId("stats-campaigns");
      expect(statsElement).toBeInTheDocument();
      // 2 brands = 2 campaigns - check within the stats element
      expect(within(statsElement).getByText("2")).toBeInTheDocument();
    });

    it("displays ad group count estimate", () => {
      const config: HierarchyConfigType = {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("stats-ad-groups")).toBeInTheDocument();
      // Nike has Air Max and Jordan, Adidas has Ultraboost = 3 ad groups
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    it("displays ad count estimate", () => {
      const config: HierarchyConfigType = {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("stats-ads")).toBeInTheDocument();
      // 4 rows = 4 ads
      expect(screen.getByText(/4/)).toBeInTheDocument();
    });

    it("updates preview in real-time as user types", async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      // Initially no grouping, so preview shows basic structure
      const input = screen.getByLabelText(/ad group.*pattern/i);
      await user.type(input, "{{product}}");

      // Get the last onChange call to simulate controlled component update
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];

      // Rerender with updated config
      rerender(
        <HierarchyConfig
          config={lastCall[0]}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      // Preview should now show grouped structure
      const preview = screen.getByTestId("hierarchy-preview");
      await waitFor(() => {
        expect(within(preview).getByText(/Air Max/)).toBeInTheDocument();
      });
    });

    it("shows placeholder when no sample data is provided", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/no sample data/i)).toBeInTheDocument();
    });

    it("shows tree structure with collapsible nodes", () => {
      const config: HierarchyConfigType = {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      // Tree nodes should be present
      const preview = screen.getByTestId("hierarchy-preview");
      const campaignNodes = within(preview).getAllByTestId(/tree-node-campaign/);
      expect(campaignNodes.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Validation Display Tests
  // ==========================================================================

  describe("Validation Display", () => {
    it("displays validation errors", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ['Ad group pattern: Variable "{invalid_var}" not found in data source columns'],
        warnings: [],
      };

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
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
        warnings: ["Display URL: Variable \"{missing}\" not found"],
      };

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.getByTestId("validation-warnings")).toBeInTheDocument();
      expect(screen.getByText(/missing.*not found/i)).toBeInTheDocument();
    });

    it("does not show validation section when valid with no warnings", () => {
      const validation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
      };

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.queryByTestId("validation-errors")).not.toBeInTheDocument();
      expect(screen.queryByTestId("validation-warnings")).not.toBeInTheDocument();
    });

    it("highlights invalid ad group pattern field", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ["Ad group pattern: Pattern cannot be empty"],
        warnings: [],
      };

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      const input = screen.getByLabelText(/ad group.*pattern/i);
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("highlights invalid headline field", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ["Headline: Variable \"{invalid}\" not found"],
        warnings: [],
      };

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      const input = screen.getByLabelText(/headline/i);
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("highlights invalid description field", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ["Description: Variable \"{invalid}\" not found"],
        warnings: [],
      };

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      const input = screen.getByLabelText(/description/i);
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper ARIA labels for all inputs", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/ad group.*pattern/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/headline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("has descriptive help text for ad group pattern", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // The help text describes how rows are grouped into ad groups
      expect(screen.getByText(/rows are grouped/i)).toBeInTheDocument();
    });

    it("supports tab navigation through form fields", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      await user.tab();
      expect(screen.getByLabelText(/ad group.*pattern/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/headline/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();
    });

    it("announces dropdown options to screen readers", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group.*pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      const dropdown = screen.getByTestId("variable-dropdown");
      expect(dropdown).toHaveAttribute("role", "listbox");
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles empty columns list", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={[]}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/ad group.*pattern/i)).toBeInTheDocument();
      expect(screen.getByText(/no variables available/i)).toBeInTheDocument();
    });

    it("handles empty sample data array", () => {
      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={[]}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/no sample data/i)).toBeInTheDocument();
    });

    it("handles missing columns in sample data gracefully", () => {
      const config: HierarchyConfigType = {
        adGroupNamePattern: "{missing_column}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      // Should not crash even if pattern references non-existent column
      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("hierarchy-preview")).toBeInTheDocument();
    });

    it("handles rapid typing without crashing", async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <HierarchyConfig
          config={defaultHierarchyConfig}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group.*pattern/i);
      await user.type(input, "{{brand}}-{{product}}-{{headline}}");

      expect(onChange).toHaveBeenCalled();
    });

    it("preserves other config fields when updating one field", async () => {
      const user = userEvent.setup();
      const config: HierarchyConfigType = {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
          displayUrl: "example.com",
          finalUrl: "https://example.com",
        },
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const headlineInput = screen.getByLabelText(/headline/i);
      await user.clear(headlineInput);
      await user.type(headlineInput, "{{brand}}");

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      // Other fields should be preserved
      expect(lastCall[0].adGroupNamePattern).toBe("{product}");
      expect(lastCall[0].adMapping.description).toBe("{description}");
      expect(lastCall[0].adMapping.displayUrl).toBe("example.com");
    });
  });
});
