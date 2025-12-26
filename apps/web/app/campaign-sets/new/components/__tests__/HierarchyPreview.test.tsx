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

      // mockSampleData has 4 rows, but with deduplication:
      // - Air Max ad group (2 rows): 3 unique ads (2 dynamic headlines + 1 static "Promo")
      // - Jordan ad group (1 row): 2 unique ads
      // - Ultraboost ad group (1 row): 2 unique ads
      // Total: 7 unique ads
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("7")).toBeInTheDocument();
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
      expect(screen.getByText(/no campaigns will be created/i)).toBeInTheDocument();
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

  // ==========================================================================
  // Ad Deduplication Tests
  // ==========================================================================

  describe("Ad Deduplication", () => {
    it("deduplicates identical ads across rows with same campaign and ad group", () => {
      // Given: 3 rows with same brand/product producing same ad content
      const duplicateAdSampleData: Record<string, unknown>[] = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe ever" },
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe ever" },
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe ever" },
      ];

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={duplicateAdSampleData}
        />
      );

      // Then: Only 1 ad should appear (not 3)
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("1")).toBeInTheDocument();
    });

    it("keeps different ads separate when headline differs", () => {
      // Given: 3 rows with different headlines producing different ad content
      const differentHeadlineData: Record<string, unknown>[] = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe ever" },
        { brand: "Nike", product: "Air Max", headline: "Speed Up", description: "Best shoe ever" },
        { brand: "Nike", product: "Air Max", headline: "Go Quick", description: "Best shoe ever" },
      ];

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={differentHeadlineData}
        />
      );

      // Then: All 3 unique ads should appear
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("3")).toBeInTheDocument();
    });

    it("keeps different ads separate when description differs", () => {
      // Given: 2 ads with same headline but different descriptions
      const differentDescriptionData: Record<string, unknown>[] = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe ever" },
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Top rated" },
      ];

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={differentDescriptionData}
        />
      );

      // Then: Both ads should appear (they're different by description)
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("2")).toBeInTheDocument();
    });

    it("deduplicates by headline+description only, ignoring displayUrl and finalUrl", () => {
      // Given: ads with same headline+description but different URLs
      const hierarchyWithUrls: HierarchyConfig = {
        adGroups: [{
          id: generateId(),
          namePattern: "{product}",
          ads: [{
            id: generateId(),
            headline: "{headline}",
            description: "{description}",
            displayUrl: "{url}",
            finalUrl: "{final_url}",
          }],
        }],
      };

      const dataWithDifferentUrls: Record<string, unknown>[] = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe", url: "nike.com/1", final_url: "https://nike.com/1" },
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe", url: "nike.com/2", final_url: "https://nike.com/2" },
      ];

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={hierarchyWithUrls}
          sampleData={dataWithDifferentUrls}
        />
      );

      // Then: Only 1 ad should appear (deduped by headline+description)
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("1")).toBeInTheDocument();
    });

    it("deduplicates per ad group, not globally", () => {
      // Given: same ad content appears in different ad groups (different products)
      const sameAdDifferentGroups: Record<string, unknown>[] = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
        { brand: "Nike", product: "Jordan", headline: "Run Fast", description: "Best shoe" },
      ];

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={sameAdDifferentGroups}
        />
      );

      // Then: 2 ads should appear (1 per ad group, even though content is identical)
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("2")).toBeInTheDocument();
    });

    it("deduplicates when multiple ad definitions produce same content", () => {
      // Given: multiple ad definitions that produce identical output
      const hierarchyWithMultipleAds: HierarchyConfig = {
        adGroups: [{
          id: generateId(),
          namePattern: "{product}",
          ads: [
            { id: generateId(), headline: "{headline}", description: "{description}" },
            { id: generateId(), headline: "{headline}", description: "{description}" }, // Same patterns = same output
          ],
        }],
      };

      const singleRowData: Record<string, unknown>[] = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
      ];

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={hierarchyWithMultipleAds}
          sampleData={singleRowData}
        />
      );

      // Then: Only 1 unique ad should appear (not 2)
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("1")).toBeInTheDocument();
    });

    it("handles empty headline and description in deduplication", () => {
      // Given: rows with empty/undefined values that produce same empty content
      const hierarchyConfig: HierarchyConfig = {
        adGroups: [{
          id: generateId(),
          namePattern: "{product}",
          ads: [{ id: generateId(), headline: "{missing_field}", description: "{other_missing}" }],
        }],
      };

      const dataWithMissingFields: Record<string, unknown>[] = [
        { brand: "Nike", product: "Air Max" },
        { brand: "Nike", product: "Air Max" },
      ];

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={hierarchyConfig}
          sampleData={dataWithMissingFields}
        />
      );

      // Then: Only 1 ad should appear (both produce same empty-ish content)
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("1")).toBeInTheDocument();
    });

    it("correctly counts ads when some are duplicates and some are unique", () => {
      // Given: mix of duplicate and unique ads
      const mixedData: Record<string, unknown>[] = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" }, // duplicate
        { brand: "Nike", product: "Air Max", headline: "Speed Up", description: "Top rated" }, // unique
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" }, // duplicate
        { brand: "Nike", product: "Air Max", headline: "Go Quick", description: "Premium quality" }, // unique
      ];

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={mixedData}
        />
      );

      // Then: 3 unique ads should appear
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("3")).toBeInTheDocument();
    });

    it("handles pipe character in content without causing false deduplication", () => {
      // Given: two ads where headline|description contain pipes that could cause key collision
      // With a pipe delimiter: "Buy|Now|Fast" vs "Buy|Now|Fast" (collision!)
      // With null delimiter: "Buy|Now\0Fast" vs "Buy\0Now|Fast" (no collision)
      const pipeData: Record<string, unknown>[] = [
        { brand: "Nike", product: "Air Max", headline: "Buy|Now", description: "Fast" },
        { brand: "Nike", product: "Air Max", headline: "Buy", description: "Now|Fast" },
      ];

      // When: rendered with these ads
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={pipeData}
        />
      );

      // Then: both ads should appear (not deduplicated despite pipe collision potential)
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("2")).toBeInTheDocument();
    });

    it("handles template filter syntax with pipes without causing false deduplication", () => {
      // Given: ads using template filter syntax like {brand|uppercase}
      // The templating system uses | for filters, so this tests real-world usage
      const filterData: Record<string, unknown>[] = [
        { brand: "Nike", product: "Air Max", headline: "Shop {brand|uppercase}", description: "Now" },
        { brand: "Nike", product: "Air Max", headline: "Shop {brand", description: "uppercase}|Now" },
      ];

      // When: rendered with these ads (the interpolatePattern will preserve the filter syntax)
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={filterData}
        />
      );

      // Then: both ads should be distinct
      const statsPanel = screen.getByTestId("stat-ads");
      expect(within(statsPanel).getByText("2")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Character Limit Warning Tests
  // ==========================================================================

  describe("Character Limit Warnings", () => {
    // Sample data with content exceeding Google limits (headline: 30, description: 90)
    const longContentSampleData: Record<string, unknown>[] = [
      {
        brand: "Nike",
        product: "Air Max",
        headline: "This is a very long headline that exceeds the 30 character limit for Google Ads",
        description: "This is a very long description that exceeds the 90 character limit for Google Ads. It contains more than ninety characters to trigger a warning.",
      },
    ];

    // Sample data within limits
    const shortContentSampleData: Record<string, unknown>[] = [
      {
        brand: "Nike",
        product: "Air Max",
        headline: "Short headline",
        description: "Short description within limits",
      },
    ];

    it("shows character limit section when content exceeds platform limits", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={longContentSampleData}
          selectedPlatforms={["google"]}
        />
      );

      expect(screen.getByTestId("char-limit-section")).toBeInTheDocument();
      expect(screen.getByTestId("char-limit-header")).toBeInTheDocument();
    });

    it("hides character limit section when content is within limits", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={shortContentSampleData}
          selectedPlatforms={["google"]}
        />
      );

      expect(screen.queryByTestId("char-limit-section")).not.toBeInTheDocument();
    });

    it("hides character limit section when no platforms selected", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={longContentSampleData}
          selectedPlatforms={[]}
        />
      );

      expect(screen.queryByTestId("char-limit-section")).not.toBeInTheDocument();
    });

    it("displays correct platform badge for character limit warnings", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={longContentSampleData}
          selectedPlatforms={["google"]}
        />
      );

      expect(screen.getByTestId("char-limit-platform-google")).toBeInTheDocument();
      expect(screen.getByText("google:", { exact: false })).toBeInTheDocument();
    });

    it("shows warnings for multiple platforms", () => {
      // Use data that exceeds limits for both platforms
      const multiPlatformLongData: Record<string, unknown>[] = [
        {
          brand: "Nike",
          product: "Air Max",
          headline: "This is a very long headline that exceeds limits for all platforms",
          description: "This is a very long description that definitely exceeds the 90 character limit for Google Ads and other platforms.",
        },
      ];

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={multiPlatformLongData}
          selectedPlatforms={["google", "facebook"]}
        />
      );

      expect(screen.getByTestId("char-limit-section")).toBeInTheDocument();
      // Should show google warnings (both headline and description exceed limits)
      expect(screen.getByTestId("char-limit-platform-google")).toBeInTheDocument();
      // Facebook has different limits - headline 40 chars, description 30 chars
      expect(screen.getByTestId("char-limit-platform-facebook")).toBeInTheDocument();
    });

    it("toggle show/hide details button works", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={longContentSampleData}
          selectedPlatforms={["google"]}
        />
      );

      const toggleButton = screen.getByTestId("char-limit-toggle");
      expect(toggleButton).toHaveTextContent("Show details");

      // Click to show details
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveTextContent("Hide details");

      // Click again to hide details
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveTextContent("Show details");
    });

    it("shows headline overflow warning with correct count", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={longContentSampleData}
          selectedPlatforms={["google"]}
        />
      );

      // Should show "1 headline exceeds 30 chars"
      expect(screen.getByText(/1 headline/)).toBeInTheDocument();
      expect(screen.getByText(/exceed 30 chars/)).toBeInTheDocument();
    });

    it("shows description overflow warning with correct count", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={longContentSampleData}
          selectedPlatforms={["google"]}
        />
      );

      // Should show "1 description exceeds 90 chars"
      expect(screen.getByText(/1 description/)).toBeInTheDocument();
      expect(screen.getByText(/exceed 90 chars/)).toBeInTheDocument();
    });

    it("shows details list when toggle is clicked", () => {
      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={longContentSampleData}
          selectedPlatforms={["google"]}
        />
      );

      // Click toggle to show details
      fireEvent.click(screen.getByTestId("char-limit-toggle"));

      // Should show the warning details with field names
      expect(screen.getByText("headline")).toBeInTheDocument();
      expect(screen.getByText("description")).toBeInTheDocument();
    });

    it("handles multiple rows with overflows correctly", () => {
      const multiRowLongData: Record<string, unknown>[] = [
        {
          brand: "Nike",
          product: "Air Max",
          headline: "This headline is way too long for the Google Ads limit of 30 characters",
          description: "Short desc",
        },
        {
          brand: "Adidas",
          product: "Ultraboost",
          headline: "Another very long headline that exceeds the character limit",
          description: "Short",
        },
      ];

      render(
        <HierarchyPreview
          campaignConfig={defaultCampaignConfig}
          hierarchyConfig={createValidHierarchyConfig()}
          sampleData={multiRowLongData}
          selectedPlatforms={["google"]}
        />
      );

      // Should show "2 headlines exceed 30 chars"
      expect(screen.getByText(/2 headlines/)).toBeInTheDocument();
    });
  });
});
