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
import { generateId, createDefaultAdGroup } from "../../types";

const mockColumns: DataSourceColumn[] = [
  { name: "brand", type: "string", sampleValues: ["Nike", "Adidas", "Puma"] },
  { name: "product", type: "string", sampleValues: ["Air Max", "Ultraboost", "Suede"] },
  { name: "headline", type: "string", sampleValues: ["Run Fast", "Speed Up", "Jump High"] },
  { name: "description", type: "string", sampleValues: ["Best shoe ever", "Top rated", "Classic"] },
  { name: "display_url", type: "string", sampleValues: ["nike.com", "adidas.com"] },
  { name: "final_url", type: "string", sampleValues: ["https://nike.com/shoes", "https://adidas.com/shoes"] },
];

// Helper to create a default hierarchy config with the new structure
const createDefaultHierarchyConfig = (): HierarchyConfigType => ({
  adGroups: [createDefaultAdGroup()],
});

// Helper to create a populated hierarchy config
const createPopulatedHierarchyConfig = (): HierarchyConfigType => ({
  adGroups: [{
    id: "test-ag-1",
    namePattern: "{product}",
    ads: [{
      id: "test-ad-1",
      headline: "{headline}",
      description: "{description}",
    }],
  }],
});

const defaultCampaignConfig: CampaignConfigType = {
  namePattern: "{brand}-performance",
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
  // Ad Group Builder Tests
  // ==========================================================================

  describe("Ad Group Builder", () => {
    it("renders at least one ad group by default", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByText("Ad Group 1")).toBeInTheDocument();
    });

    it("renders add ad group button", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("add-ad-group")).toBeInTheDocument();
    });

    it("adds a new ad group when add button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("add-ad-group"));

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups).toHaveLength(2);
    });

    it("removes an ad group when remove button is clicked", async () => {
      const user = userEvent.setup();
      const configWithTwoAdGroups: HierarchyConfigType = {
        adGroups: [
          { id: "ag-1", namePattern: "{product}", ads: [{ id: "ad-1", headline: "{headline}", description: "{description}" }] },
          { id: "ag-2", namePattern: "{brand}", ads: [{ id: "ad-2", headline: "{headline}", description: "{description}" }] },
        ],
      };

      render(
        <HierarchyConfig
          config={configWithTwoAdGroups}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Find and click the remove button for the second ad group
      const removeButton = screen.getByTestId("remove-ad-group-ag-2");
      await user.click(removeButton);

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups).toHaveLength(1);
      expect(lastCall[0].adGroups[0].id).toBe("ag-1");
    });

    it("does not show remove button when only one ad group exists", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Should not find any remove-ad-group buttons
      const removeButtons = screen.queryAllByTestId(/^remove-ad-group-/);
      expect(removeButtons).toHaveLength(0);
    });

    it("expands and collapses ad groups", async () => {
      const user = userEvent.setup();
      const config = createPopulatedHierarchyConfig();

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Find the toggle button
      const toggleButton = screen.getByTestId("toggle-ad-group-test-ag-1");
      expect(toggleButton).toHaveAttribute("aria-expanded", "true");

      // Click to collapse
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute("aria-expanded", "false");

      // Click to expand again
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    });
  });

  // ==========================================================================
  // Ad Group Name Pattern Tests
  // ==========================================================================

  describe("Ad Group Name Pattern", () => {
    it("displays current ad group name pattern value", () => {
      const config = createPopulatedHierarchyConfig();

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i) as HTMLInputElement;
      expect(input.value).toBe("{product}");
    });

    it("calls onChange when ad group pattern is typed", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "test");

      expect(onChange).toHaveBeenCalled();
    });

    it("shows variable autocomplete dropdown when { is typed", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      expect(screen.getByText("brand")).toBeInTheDocument();
      expect(screen.getByText("product")).toBeInTheDocument();
    });

    it("shows columns in dropdown when opened", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      const dropdown = screen.getByTestId("variable-dropdown");
      // Should show all columns
      expect(within(dropdown).getByText("brand")).toBeInTheDocument();
      expect(within(dropdown).getByText("product")).toBeInTheDocument();
      expect(within(dropdown).getByText("headline")).toBeInTheDocument();
      expect(within(dropdown).getByText("description")).toBeInTheDocument();
    });

    it("selects variable from dropdown and completes syntax", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      await user.click(screen.getByText("product"));

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups[0].namePattern).toBe("{product}");
    });
  });

  // ==========================================================================
  // Ad Field Mapping Tests
  // ==========================================================================

  describe("Ad Field Mapping", () => {
    it("renders headline mapping input", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
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
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("displays current ad mapping values", () => {
      const config: HierarchyConfigType = {
        adGroups: [{
          id: "ag-1",
          namePattern: "{product}",
          ads: [{
            id: "ad-1",
            headline: "{headline}",
            description: "{description}",
            displayUrl: "{display_url}",
            finalUrl: "{final_url}",
          }],
        }],
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
    });

    it("calls onChange when headline is updated", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const headlineInput = screen.getByLabelText(/headline/i);
      await user.type(headlineInput, "test");

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when description is updated", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const descInput = screen.getByLabelText(/description/i);
      await user.type(descInput, "test");

      expect(onChange).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Multiple Ads Per Ad Group Tests
  // ==========================================================================

  describe("Multiple Ads Per Ad Group", () => {
    it("can add multiple ads to an ad group", async () => {
      const user = userEvent.setup();
      const config: HierarchyConfigType = {
        adGroups: [{
          id: "ag-1",
          namePattern: "{product}",
          ads: [{
            id: "ad-1",
            headline: "{headline}",
            description: "{description}",
          }],
        }],
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Click add ad button
      await user.click(screen.getByTestId("add-ad-ag-1"));

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups[0].ads).toHaveLength(2);
    });

    it("can remove an ad from an ad group when multiple ads exist", async () => {
      const user = userEvent.setup();
      const config: HierarchyConfigType = {
        adGroups: [{
          id: "ag-1",
          namePattern: "{product}",
          ads: [
            { id: "ad-1", headline: "{headline}", description: "{description}" },
            { id: "ad-2", headline: "{headline} 2", description: "{description} 2" },
          ],
        }],
      };

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Click remove ad button
      await user.click(screen.getByTestId("remove-ad-ad-2"));

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].adGroups[0].ads).toHaveLength(1);
      expect(lastCall[0].adGroups[0].ads[0].id).toBe("ad-1");
    });

    it("does not show remove button for single ad", () => {
      const config = createPopulatedHierarchyConfig();

      render(
        <HierarchyConfig
          config={config}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Should not find any remove-ad buttons
      const removeButtons = screen.queryAllByTestId(/^remove-ad-/);
      expect(removeButtons).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Hierarchy Preview Tests
  // ==========================================================================

  describe("Hierarchy Preview (Real-time)", () => {
    it("renders hierarchy preview section", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("hierarchy-preview")).toBeInTheDocument();
    });

    it("shows campaign level in tree from campaignConfig", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const preview = screen.getByTestId("hierarchy-preview");
      expect(within(preview).getByText(/Nike-performance/)).toBeInTheDocument();
    });

    it("shows ad groups grouped by pattern", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const preview = screen.getByTestId("hierarchy-preview");
      expect(within(preview).getByText(/Air Max/)).toBeInTheDocument();
      expect(within(preview).getByText(/Jordan/)).toBeInTheDocument();
    });

    it("shows ads within ad groups", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const preview = screen.getByTestId("hierarchy-preview");
      expect(within(preview).getByText("Run Fast")).toBeInTheDocument();
      expect(within(preview).getByText("Speed Up")).toBeInTheDocument();
    });

    it("displays campaign count estimate", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          sampleData={mockSampleData}
          onChange={onChange}
        />
      );

      const statsElement = screen.getByTestId("stats-campaigns");
      expect(statsElement).toBeInTheDocument();
      // 2 brands = 2 campaigns
      expect(within(statsElement).getByText("2")).toBeInTheDocument();
    });

    it("displays ad group count estimate", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
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
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
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

    it("shows placeholder when no sample data is provided", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/no sample data/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Validation Display Tests
  // ==========================================================================

  describe("Validation Display", () => {
    it("displays validation errors", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ['Ad Group 1 name pattern: Variable "{invalid_var}" not found in data source columns'],
        warnings: [],
      };

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
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
        warnings: ["Ad Group 1, Ad 1 display URL: Variable \"{missing}\" not found"],
      };

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
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
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.queryByTestId("validation-errors")).not.toBeInTheDocument();
      expect(screen.queryByTestId("validation-warnings")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper ARIA labels for inputs", () => {
      render(
        <HierarchyConfig
          config={createPopulatedHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/ad group name pattern/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/headline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("has descriptive help text for ad group pattern", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // The text includes "{variable}" which creates multiple text nodes,
      // so we need to look for the hint element directly
      const hintElements = screen.getAllByText(/syntax/i);
      expect(hintElements.length).toBeGreaterThan(0);
    });

    it("announces dropdown options to screen readers", async () => {
      const user = userEvent.setup();

      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
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
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={[]}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/no variables available/i)).toBeInTheDocument();
    });

    it("handles empty sample data array", () => {
      render(
        <HierarchyConfig
          config={createDefaultHierarchyConfig()}
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
        adGroups: [{
          id: "ag-1",
          namePattern: "{missing_column}",
          ads: [{
            id: "ad-1",
            headline: "{headline}",
            description: "{description}",
          }],
        }],
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
          config={createDefaultHierarchyConfig()}
          campaignConfig={defaultCampaignConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const input = screen.getByLabelText(/ad group name pattern/i);
      await user.type(input, "{{brand}}-{{product}}-{{headline}}");

      expect(onChange).toHaveBeenCalled();
    });
  });
});
