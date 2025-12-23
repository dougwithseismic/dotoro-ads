import { render, screen, within, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HierarchyPreview } from "../HierarchyPreview";
import type { CampaignConfig, HierarchyConfig } from "../../types";
import { generateId } from "../../types";

// Helper to create a valid hierarchy config with the new structure
const createValidHierarchyConfig = (): HierarchyConfig => ({
  adGroups: [{
    id: generateId(),
    namePattern: "{product}",
    ads: [{
      id: generateId(),
      headline: "{headline}",
      description: "{description}",
    }],
  }],
});

const defaultCampaignConfig: CampaignConfig = {
  namePattern: "{brand}-performance",
};

const mockSampleData: Record<string, unknown>[] = [
  { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe ever" },
  { brand: "Nike", product: "Air Max", headline: "Speed Up", description: "Top rated" },
  { brand: "Nike", product: "Jordan", headline: "Jump High", description: "Classic" },
  { brand: "Adidas", product: "Ultraboost", headline: "Run Faster", description: "Premium comfort" },
];

describe("HierarchyPreview", () => {
  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe("Loading State", () => {
    it("shows loading skeleton when loading", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={[]}
          loading={true}
        />
      );

      expect(screen.getByTestId("hierarchy-preview-loading")).toBeInTheDocument();
    });

    it("does not show tree view when loading", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={[]}
          loading={true}
        />
      );

      expect(screen.queryByTestId("tree-view")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Error State Tests
  // ==========================================================================

  describe("Error State", () => {
    it("shows error message when error is provided", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={[]}
          error="Failed to load data"
        />
      );

      expect(screen.getByTestId("hierarchy-preview-error")).toBeInTheDocument();
      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    });

    it("shows retry button when onRetry is provided", () => {
      const onRetry = vi.fn();

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={[]}
          error="Failed to load data"
          onRetry={onRetry}
        />
      );

      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("calls onRetry when retry button is clicked", () => {
      const onRetry = vi.fn();

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={[]}
          error="Failed to load data"
          onRetry={onRetry}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(onRetry).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe("Empty State", () => {
    it("shows empty message when no sample data", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={[]}
        />
      );

      expect(screen.getByTestId("hierarchy-preview-empty")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Tree View Tests
  // ==========================================================================

  describe("Tree View", () => {
    it("renders campaigns at top level", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      expect(screen.getByText("Nike-performance")).toBeInTheDocument();
      expect(screen.getByText("Adidas-performance")).toBeInTheDocument();
    });

    it("renders ad groups within campaigns", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      // Air Max and Jordan should be visible as ad groups
      expect(screen.getByText("Air Max")).toBeInTheDocument();
      expect(screen.getByText("Jordan")).toBeInTheDocument();
      expect(screen.getByText("Ultraboost")).toBeInTheDocument();
    });

    it("renders ads within ad groups", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      expect(screen.getByText("Run Fast")).toBeInTheDocument();
      expect(screen.getByText("Speed Up")).toBeInTheDocument();
      expect(screen.getByText("Jump High")).toBeInTheDocument();
    });

    it("can collapse campaigns", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      // Find Nike campaign's toggle button (first toggle within the campaign node)
      const nikeCampaign = screen.getByTestId("tree-campaign-Nike-performance");
      const toggleButtons = within(nikeCampaign).getAllByTestId("toggle-button");
      const toggleButton = toggleButtons[0]; // Get the first one (campaign's own toggle)

      // Click to collapse
      fireEvent.click(toggleButton);

      // Ad groups should now be hidden
      expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    });

    it("can collapse ad groups", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      // Find Air Max ad group's toggle button
      const adGroupKey = "Nike-performance-Air Max";
      const adGroup = screen.getByTestId(`tree-adgroup-${adGroupKey}`);
      const toggleButton = within(adGroup).getByTestId("toggle-button");

      // Click to collapse
      fireEvent.click(toggleButton);

      expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    });

    it("expands nodes again when clicked", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      const nikeCampaign = screen.getByTestId("tree-campaign-Nike-performance");
      const toggleButtons = within(nikeCampaign).getAllByTestId("toggle-button");
      const toggleButton = toggleButtons[0]; // Get the first one (campaign's own toggle)

      // Click twice (collapse then expand)
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);

      expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    });
  });

  // ==========================================================================
  // Statistics Panel Tests
  // ==========================================================================

  describe("Statistics Panel", () => {
    it("shows correct campaign count", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      const statsPanel = screen.getByTestId("stat-campaigns");
      expect(within(statsPanel).getByText("2")).toBeInTheDocument();
    });

    it("shows correct ad group count", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      const statsPanel = screen.getByTestId("stat-ad-groups");
      // Nike: Air Max, Jordan. Adidas: Ultraboost = 3 ad groups
      expect(within(statsPanel).getByText("3")).toBeInTheDocument();
    });

    it("shows correct ad count", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      const statsPanel = screen.getByTestId("stat-ads");
      // 4 rows = 4 ads
      expect(within(statsPanel).getByText("4")).toBeInTheDocument();
    });

    it("shows correct rows processed count", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      const statsPanel = screen.getByTestId("stat-rows-processed");
      expect(within(statsPanel).getByText("4")).toBeInTheDocument();
    });

    it("shows rows skipped when provided", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
          rowsSkipped={2}
        />
      );

      const statsPanel = screen.getByTestId("stat-rows-skipped");
      expect(within(statsPanel).getByText("2")).toBeInTheDocument();
    });

    it("does not show rows skipped when zero", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
          rowsSkipped={0}
        />
      );

      expect(screen.queryByTestId("stat-rows-skipped")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Warnings Section Tests
  // ==========================================================================

  describe("Warnings Section", () => {
    it("shows warnings when provided", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
          warnings={[
            { type: "missing_field", message: "Some rows are missing the 'description' field" },
          ]}
        />
      );

      expect(screen.getByTestId("warnings-section")).toBeInTheDocument();
      expect(screen.getByText(/missing the 'description' field/)).toBeInTheDocument();
    });

    it("shows warning count in header", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
          warnings={[
            { type: "missing_field", message: "Warning 1" },
            { type: "missing_field", message: "Warning 2" },
          ]}
        />
      );

      const header = screen.getByTestId("warnings-header");
      expect(within(header).getByText(/2 warnings/)).toBeInTheDocument();
    });

    it("shows row index in warning when provided", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
          warnings={[
            { type: "missing_field", message: "Field is missing", rowIndex: 5 },
          ]}
        />
      );

      expect(screen.getByText(/Row 5:/)).toBeInTheDocument();
    });

    it("does not show warnings section when no warnings", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
          warnings={[]}
        />
      );

      expect(screen.queryByTestId("warnings-section")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Multiple Ad Groups Tests
  // ==========================================================================

  describe("Multiple Ad Groups", () => {
    it("handles multiple ad group definitions", () => {
      const hierarchyConfig: HierarchyConfig = {
        adGroups: [
          {
            id: "ag-1",
            namePattern: "{product}",
            ads: [{ id: "ad-1", headline: "{headline}", description: "{description}" }],
          },
          {
            id: "ag-2",
            namePattern: "{brand} - General",
            ads: [{ id: "ad-2", headline: "Brand Ad", description: "Shop now" }],
          },
        ],
      };

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={hierarchyConfig}
          sampleData={mockSampleData}
        />
      );

      // Should see ad groups from both definitions
      expect(screen.getByText("Air Max")).toBeInTheDocument();
      expect(screen.getByText("Nike - General")).toBeInTheDocument();
    });

    it("handles multiple ads per ad group", () => {
      const hierarchyConfig: HierarchyConfig = {
        adGroups: [{
          id: "ag-1",
          namePattern: "{product}",
          ads: [
            { id: "ad-1", headline: "{headline}", description: "{description}" },
            { id: "ad-2", headline: "Special Offer", description: "Limited time" },
          ],
        }],
      };

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={hierarchyConfig}
          sampleData={mockSampleData}
        />
      );

      // Should show both ads for each row's ad group
      // "Run Fast" comes from interpolated data
      expect(screen.getByText("Run Fast")).toBeInTheDocument();
      // "Special Offer" appears multiple times (once per ad group)
      const specialOfferElements = screen.getAllByText("Special Offer");
      expect(specialOfferElements.length).toBeGreaterThan(0);
    });

    it("counts ads correctly with multiple ad groups and ads", () => {
      const hierarchyConfig: HierarchyConfig = {
        adGroups: [
          {
            id: "ag-1",
            namePattern: "{product}",
            ads: [
              { id: "ad-1", headline: "{headline}", description: "{description}" },
              { id: "ad-2", headline: "Promo", description: "Promo desc" },
            ],
          },
        ],
      };

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={hierarchyConfig}
          sampleData={mockSampleData}
        />
      );

      // 4 rows * 2 ads per ad group = 8 ads total
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("8")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles empty adGroups array", () => {
      const hierarchyConfig: HierarchyConfig = {
        adGroups: [],
      };

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={hierarchyConfig}
          sampleData={mockSampleData}
        />
      );

      // Should show empty tree message
      expect(screen.getByText(/no campaigns generated/i)).toBeInTheDocument();
    });

    it("handles missing pattern fields gracefully", () => {
      const hierarchyConfig: HierarchyConfig = {
        adGroups: [{
          id: "ag-1",
          namePattern: "{missing_column}",
          ads: [{ id: "ad-1", headline: "{missing_headline}", description: "{description}" }],
        }],
      };

      // Should not throw
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={hierarchyConfig}
          sampleData={mockSampleData}
        />
      );

      expect(screen.getByTestId("hierarchy-preview")).toBeInTheDocument();
    });

    it("shows 'more ads' message when many ads in one group", () => {
      // Create sample data that produces many ads in one ad group
      const largeSampleData = Array.from({ length: 10 }, (_, i) => ({
        brand: "Nike",
        product: "Air Max",
        headline: `Headline ${i}`,
        description: `Description ${i}`,
      }));

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={largeSampleData}
        />
      );

      // Should show some ads and a "more" message (limited to 5)
      expect(screen.getByText(/more ads/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has toggle buttons with aria-expanded attribute", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      const toggleButtons = screen.getAllByTestId("toggle-button");
      toggleButtons.forEach((button) => {
        expect(button).toHaveAttribute("aria-expanded");
      });
    });

    it("has aria-label on toggle buttons", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      const toggleButtons = screen.getAllByTestId("toggle-button");
      toggleButtons.forEach((button) => {
        expect(button).toHaveAttribute("aria-label");
      });
    });

    it("has title attribute on truncated labels", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mockSampleData}
        />
      );

      const nodeLabels = screen.getAllByTestId("node-label");
      nodeLabels.forEach((label) => {
        expect(label).toHaveAttribute("title");
      });
    });
  });
});
