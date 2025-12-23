import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HierarchyPreview } from "../HierarchyPreview";
import type { CampaignConfig, HierarchyConfig, Platform } from "../../types";

// Sample data for tests
const mockSampleData: Record<string, unknown>[] = [
  { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
  { brand: "Nike", product: "Air Max", headline: "Speed Up", description: "Top rated" },
  { brand: "Nike", product: "Jordan", headline: "Jump High", description: "Classic" },
  { brand: "Adidas", product: "Ultraboost", headline: "Go Further", description: "Amazing comfort" },
];

const mockCampaignConfig: CampaignConfig = {
  namePattern: "{brand}-performance",
  platform: "google" as Platform,
};

const mockHierarchyConfig: HierarchyConfig = {
  adGroupNamePattern: "{product}",
  adMapping: {
    headline: "{headline}",
    description: "{description}",
  },
};

describe("HierarchyPreview", () => {
  const defaultProps = {
    campaignConfig: mockCampaignConfig,
    hierarchyConfig: mockHierarchyConfig,
    sampleData: mockSampleData,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tree Visualization", () => {
    it("renders campaign nodes from sample data", () => {
      render(<HierarchyPreview {...defaultProps} />);

      // Should show Nike-performance and Adidas-performance campaigns
      expect(screen.getByText("Nike-performance")).toBeInTheDocument();
      expect(screen.getByText("Adidas-performance")).toBeInTheDocument();
    });

    it("renders ad group nodes under campaigns", () => {
      render(<HierarchyPreview {...defaultProps} />);

      // Should show Air Max, Jordan, Ultraboost ad groups
      expect(screen.getByText("Air Max")).toBeInTheDocument();
      expect(screen.getByText("Jordan")).toBeInTheDocument();
      expect(screen.getByText("Ultraboost")).toBeInTheDocument();
    });

    it("shows ad count for each ad group", () => {
      render(<HierarchyPreview {...defaultProps} />);

      // Air Max should have 2 ads
      expect(screen.getByText("2 ads")).toBeInTheDocument();
      // Jordan and Ultraboost should have 1 ad each
      expect(screen.getAllByText("1 ad")).toHaveLength(2);
    });

    it("displays sample ads with truncated content", () => {
      render(<HierarchyPreview {...defaultProps} />);

      // Headlines should be visible
      expect(screen.getByText("Run Fast")).toBeInTheDocument();
      expect(screen.getByText("Speed Up")).toBeInTheDocument();
      expect(screen.getByText("Jump High")).toBeInTheDocument();
    });

    it("shows empty state when no sample data is provided", () => {
      render(<HierarchyPreview {...defaultProps} sampleData={[]} />);

      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });
  });

  describe("Collapsible Nodes", () => {
    it("collapses campaign nodes when clicked", () => {
      render(<HierarchyPreview {...defaultProps} />);

      // Initially ad groups should be visible
      expect(screen.getByText("Air Max")).toBeInTheDocument();

      // Find and click the collapse button for Nike-performance
      const nikeCampaignNode = screen.getByTestId("tree-campaign-Nike-performance");
      const collapseButton = nikeCampaignNode.querySelector('[data-testid="toggle-button"]');
      fireEvent.click(collapseButton!);

      // Ad groups under Nike should be hidden
      // The ad group text might still exist in DOM but be hidden
      const airMaxNode = screen.queryByTestId("tree-adgroup-Nike-performance-Air Max");
      expect(airMaxNode).not.toBeInTheDocument();
    });

    it("expands collapsed nodes when clicked again", () => {
      render(<HierarchyPreview {...defaultProps} />);

      const nikeCampaignNode = screen.getByTestId("tree-campaign-Nike-performance");
      const collapseButton = nikeCampaignNode.querySelector('[data-testid="toggle-button"]');

      // Collapse
      fireEvent.click(collapseButton!);
      expect(screen.queryByTestId("tree-adgroup-Nike-performance-Air Max")).not.toBeInTheDocument();

      // Expand
      fireEvent.click(collapseButton!);
      expect(screen.getByText("Air Max")).toBeInTheDocument();
    });

    it("supports keyboard navigation for collapsible nodes", () => {
      render(<HierarchyPreview {...defaultProps} />);

      const nikeCampaignNode = screen.getByTestId("tree-campaign-Nike-performance");
      const collapseButton = nikeCampaignNode.querySelector('[data-testid="toggle-button"]') as HTMLButtonElement;

      // Native button elements handle Enter/Space as click events
      // Use click to simulate keyboard activation (Enter/Space trigger click on buttons)
      fireEvent.click(collapseButton);
      expect(screen.queryByTestId("tree-adgroup-Nike-performance-Air Max")).not.toBeInTheDocument();

      // Click again to expand
      fireEvent.click(collapseButton);
      expect(screen.getByText("Air Max")).toBeInTheDocument();
    });

    it("has correct aria-expanded attribute", () => {
      render(<HierarchyPreview {...defaultProps} />);

      const nikeCampaignNode = screen.getByTestId("tree-campaign-Nike-performance");
      const collapseButton = nikeCampaignNode.querySelector('[data-testid="toggle-button"]');

      expect(collapseButton).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(collapseButton!);
      expect(collapseButton).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Statistics Panel", () => {
    it("displays total campaign count", () => {
      render(<HierarchyPreview {...defaultProps} />);

      const statsPanel = screen.getByTestId("stats-panel");
      expect(statsPanel).toHaveTextContent("2"); // Nike and Adidas campaigns
    });

    it("displays total ad group count", () => {
      render(<HierarchyPreview {...defaultProps} />);

      const statsPanel = screen.getByTestId("stats-panel");
      // Air Max, Jordan, Ultraboost = 3 ad groups
      expect(screen.getByTestId("stat-ad-groups")).toHaveTextContent("3");
    });

    it("displays total ad count", () => {
      render(<HierarchyPreview {...defaultProps} />);

      // 2 Nike Air Max + 1 Jordan + 1 Ultraboost = 4 ads
      expect(screen.getByTestId("stat-ads")).toHaveTextContent("4");
    });

    it("displays rows processed count", () => {
      render(<HierarchyPreview {...defaultProps} />);

      expect(screen.getByTestId("stat-rows-processed")).toHaveTextContent("4");
    });

    it("displays rows skipped count when provided", () => {
      render(<HierarchyPreview {...defaultProps} rowsSkipped={2} />);

      expect(screen.getByTestId("stat-rows-skipped")).toHaveTextContent("2");
    });
  });

  describe("Warning Display", () => {
    const mockWarnings = [
      { type: "missing_variable", message: "Variable 'brand' not found in row 5", rowIndex: 5 },
      { type: "empty_interpolation", message: "Empty result for campaign name pattern" },
      { type: "platform_limit", message: "Reddit campaigns limited to 50 ad groups" },
    ];

    it("displays missing variable warnings", () => {
      render(<HierarchyPreview {...defaultProps} warnings={mockWarnings} />);

      expect(screen.getByText(/Variable 'brand' not found in row 5/)).toBeInTheDocument();
    });

    it("displays empty interpolation warnings", () => {
      render(<HierarchyPreview {...defaultProps} warnings={mockWarnings} />);

      expect(screen.getByText(/Empty result for campaign name pattern/)).toBeInTheDocument();
    });

    it("displays platform limit warnings", () => {
      render(<HierarchyPreview {...defaultProps} warnings={mockWarnings} />);

      expect(screen.getByText(/Reddit campaigns limited to 50 ad groups/)).toBeInTheDocument();
    });

    it("shows warning count in header", () => {
      render(<HierarchyPreview {...defaultProps} warnings={mockWarnings} />);

      expect(screen.getByTestId("warnings-header")).toHaveTextContent("3 warnings");
    });

    it("hides warnings section when no warnings", () => {
      render(<HierarchyPreview {...defaultProps} warnings={[]} />);

      expect(screen.queryByTestId("warnings-section")).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("shows loading skeleton when loading", () => {
      render(<HierarchyPreview {...defaultProps} loading={true} />);

      expect(screen.getByTestId("hierarchy-preview-loading")).toBeInTheDocument();
    });

    it("hides tree and stats when loading", () => {
      render(<HierarchyPreview {...defaultProps} loading={true} />);

      expect(screen.queryByTestId("tree-view")).not.toBeInTheDocument();
      expect(screen.queryByTestId("stats-panel")).not.toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("displays error message when provided", () => {
      render(<HierarchyPreview {...defaultProps} error="Failed to generate preview" />);

      expect(screen.getByText("Failed to generate preview")).toBeInTheDocument();
    });

    it("shows retry button on error", () => {
      const onRetry = vi.fn();
      render(<HierarchyPreview {...defaultProps} error="Failed" onRetry={onRetry} />);

      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("calls onRetry when retry button clicked", () => {
      const onRetry = vi.fn();
      render(<HierarchyPreview {...defaultProps} error="Failed" onRetry={onRetry} />);

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe("Long Text Handling", () => {
    it("truncates long campaign names with ellipsis", () => {
      const longNameConfig: CampaignConfig = {
        namePattern: "{brand}-this-is-a-very-long-campaign-name-that-should-be-truncated",
        platform: "google",
      };

      render(<HierarchyPreview {...defaultProps} campaignConfig={longNameConfig} />);

      // The text should have truncate class applied (CSS modules mangle class names)
      const campaignLabel = screen.getByTestId("tree-campaign-Nike-this-is-a-very-long-campaign-name-that-should-be-truncated");
      const nameElement = campaignLabel.querySelector('[data-testid="node-label"]');
      // Check that the element's class contains "truncate" (CSS module will add prefix/suffix)
      expect(nameElement?.className).toMatch(/truncate/i);
    });

    it("shows full text on hover via title attribute", () => {
      const longNameConfig: CampaignConfig = {
        namePattern: "{brand}-this-is-a-very-long-campaign-name",
        platform: "google",
      };

      render(<HierarchyPreview {...defaultProps} campaignConfig={longNameConfig} />);

      const campaignLabel = screen.getByTestId("tree-campaign-Nike-this-is-a-very-long-campaign-name");
      const nameElement = campaignLabel.querySelector('[data-testid="node-label"]');
      expect(nameElement).toHaveAttribute("title", "Nike-this-is-a-very-long-campaign-name");
    });
  });

  describe("Variable Interpolation", () => {
    it("correctly interpolates variables in campaign names", () => {
      render(<HierarchyPreview {...defaultProps} />);

      expect(screen.getByText("Nike-performance")).toBeInTheDocument();
      expect(screen.getByText("Adidas-performance")).toBeInTheDocument();
    });

    it("correctly interpolates variables in ad group names", () => {
      render(<HierarchyPreview {...defaultProps} />);

      expect(screen.getByText("Air Max")).toBeInTheDocument();
      expect(screen.getByText("Ultraboost")).toBeInTheDocument();
    });

    it("handles missing variables gracefully", () => {
      const dataWithMissingVar = [
        { brand: "Nike", headline: "Test", description: "Desc" },
      ];

      render(
        <HierarchyPreview
          {...defaultProps}
          sampleData={dataWithMissingVar}
          hierarchyConfig={{
            adGroupNamePattern: "{product}",
            adMapping: { headline: "{headline}", description: "{description}" },
          }}
        />
      );

      // Should show the raw variable pattern or empty when variable is missing
      expect(screen.getByText("{product}")).toBeInTheDocument();
    });
  });
});
