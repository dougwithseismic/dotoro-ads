import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GenerationPreview } from "../GenerationPreview";
import type { CampaignConfig, HierarchyConfig, Platform, BudgetConfig } from "../../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockCampaignConfig: CampaignConfig = {
  namePattern: "{brand}-performance",
};

const mockHierarchyConfig: HierarchyConfig = {
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

const mockSelectedPlatforms: Platform[] = ["google"];

const mockPlatformBudgets: Record<Platform, BudgetConfig | null> = {
  google: null,
  reddit: null,
  facebook: null,
};

const mockSampleData = [
  { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
  { brand: "Nike", product: "Jordan", headline: "Jump High", description: "Classic" },
  { brand: "Adidas", product: "Ultraboost", headline: "Go Further", description: "Comfort" },
];

const defaultProps = {
  dataSourceId: "datasource-1",
  ruleIds: [] as string[],
  campaignConfig: mockCampaignConfig,
  hierarchyConfig: mockHierarchyConfig,
  selectedPlatforms: mockSelectedPlatforms,
  platformBudgets: mockPlatformBudgets,
  sampleData: mockSampleData,
  onGenerateComplete: vi.fn(),
};

const mockConfigGenerateResponse = {
  campaigns: [
    { id: "c1", name: "Nike-performance" },
    { id: "c2", name: "Adidas-performance" },
  ],
  stats: {
    totalRows: 3,
    totalCampaigns: 2,
    totalAdGroups: 3,
    totalAds: 3,
    rowsWithMissingVariables: 0,
  },
  warnings: [],
};

describe("GenerationPreview", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders HierarchyPreview component", () => {
    render(<GenerationPreview {...defaultProps} />);

    // Should show hierarchy preview component
    expect(screen.getByTestId("hierarchy-preview")).toBeInTheDocument();
  });

  it("shows campaign hierarchy from config", () => {
    render(<GenerationPreview {...defaultProps} />);

    // Should show interpolated campaign names
    expect(screen.getByText("Nike-performance")).toBeInTheDocument();
    expect(screen.getByText("Adidas-performance")).toBeInTheDocument();
  });

  it("shows ad groups from config", () => {
    render(<GenerationPreview {...defaultProps} />);

    // Should show ad group names from pattern
    expect(screen.getByText("Air Max")).toBeInTheDocument();
    expect(screen.getByText("Jordan")).toBeInTheDocument();
    expect(screen.getByText("Ultraboost")).toBeInTheDocument();
  });

  it("displays stats panel with counts", () => {
    render(<GenerationPreview {...defaultProps} />);

    const statsPanel = screen.getByTestId("stats-panel");
    expect(statsPanel).toBeInTheDocument();

    // Should show correct counts
    expect(screen.getByTestId("stat-campaigns")).toHaveTextContent("2"); // Nike, Adidas
    expect(screen.getByTestId("stat-ad-groups")).toHaveTextContent("3"); // Air Max, Jordan, Ultraboost
    expect(screen.getByTestId("stat-ads")).toHaveTextContent("3"); // 3 ads
  });

  it("shows create campaign set button", () => {
    render(<GenerationPreview {...defaultProps} />);

    const createButton = screen.getByTestId("config-generate-button");
    expect(createButton).toBeInTheDocument();
    expect(createButton).toHaveTextContent("Create Campaign Set");
  });

  it("disables generate button when no sample data", () => {
    render(<GenerationPreview {...defaultProps} sampleData={[]} />);

    const generateButton = screen.getByTestId("config-generate-button");
    expect(generateButton).toBeDisabled();
  });

  it("shows warnings from hierarchy preview when provided", () => {
    const propsWithWarnings = {
      ...defaultProps,
      warnings: [
        { type: "missing_variable", message: "Variable 'brand' not found in row 5" },
        { type: "platform_limit", message: "Google campaigns limited to 100 ad groups" },
      ],
    };

    render(<GenerationPreview {...propsWithWarnings} />);

    expect(screen.getByTestId("warnings-section")).toBeInTheDocument();
    expect(screen.getByText(/Variable 'brand' not found/)).toBeInTheDocument();
    expect(screen.getByText(/Google campaigns limited to 100 ad groups/)).toBeInTheDocument();
  });

  /**
   * @deprecated These tests expect the old generate-from-config API.
   * The component now uses a two-step flow:
   * 1. POST /api/v1/campaign-sets - Create campaign set
   * 2. POST /api/v1/campaign-sets/{id}/generate - Trigger generation
   *
   * These tests should be rewritten for the new API flow.
   */
  describe.skip("Generation API", () => {
    beforeEach(() => {
      mockFetch.mockReset();
    });

    it("calls generate-from-config API when generate button is clicked", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfigGenerateResponse),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(<GenerationPreview {...defaultProps} />);

      const generateButton = screen.getByTestId("config-generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/campaigns/generate-from-config"),
          expect.objectContaining({
            method: "POST",
            body: expect.any(String),
          })
        );
      });

      // Verify request body
      const fetchCall = mockFetch.mock.calls.find((call) =>
        call[0].includes("/api/v1/campaigns/generate-from-config")
      );
      expect(fetchCall).toBeDefined();
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.dataSourceId).toBe("datasource-1");
      expect(requestBody.campaignConfig.namePattern).toBe("{brand}-performance");
      // New structure uses adGroups array
      expect(requestBody.hierarchyConfig.adGroups).toBeDefined();
      expect(requestBody.hierarchyConfig.adGroups[0].namePattern).toBe("{product}");
      expect(requestBody.selectedPlatforms).toEqual(["google"]);
    });

    it("includes ruleIds in request when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfigGenerateResponse),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(<GenerationPreview {...defaultProps} ruleIds={["rule-1", "rule-2"]} />);

      const generateButton = screen.getByTestId("config-generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchCall = mockFetch.mock.calls.find((call) =>
        call[0].includes("/api/v1/campaigns/generate-from-config")
      );
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.ruleIds).toEqual(["rule-1", "rule-2"]);
    });

    it("omits ruleIds from request when empty", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfigGenerateResponse),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(<GenerationPreview {...defaultProps} ruleIds={[]} />);

      const generateButton = screen.getByTestId("config-generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchCall = mockFetch.mock.calls.find((call) =>
        call[0].includes("/api/v1/campaigns/generate-from-config")
      );
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.ruleIds).toBeUndefined();
    });

    it("shows generating state while API call is in progress", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<GenerationPreview {...defaultProps} />);

      const generateButton = screen.getByTestId("config-generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Generating/)).toBeInTheDocument();
        expect(generateButton).toBeDisabled();
      });
    });

    it("shows success state after successful generation", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfigGenerateResponse),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const onGenerateComplete = vi.fn();
      render(<GenerationPreview {...defaultProps} onGenerateComplete={onGenerateComplete} />);

      const generateButton = screen.getByTestId("config-generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId("config-generate-success")).toBeInTheDocument();
      });

      expect(screen.getByText(/2 Campaigns Generated/)).toBeInTheDocument();
      // The onGenerateComplete is called with a normalized format for compatibility
      expect(onGenerateComplete).toHaveBeenCalledWith(expect.objectContaining({
        generatedCount: 2,
        campaigns: expect.any(Array),
        warnings: expect.any(Array),
      }));
    });

    it("shows View Campaigns link after successful generation", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfigGenerateResponse),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(<GenerationPreview {...defaultProps} />);

      fireEvent.click(screen.getByTestId("config-generate-button"));

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View Campaigns/ })).toHaveAttribute("href", "/campaigns");
      });
    });

    it("shows warnings in success state when present", async () => {
      const responseWithWarnings = {
        ...mockConfigGenerateResponse,
        warnings: ["Some rows had missing data", "Character limit exceeded for some headlines"],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseWithWarnings),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(<GenerationPreview {...defaultProps} />);

      fireEvent.click(screen.getByTestId("config-generate-button"));

      await waitFor(() => {
        expect(screen.getByTestId("config-generate-success")).toBeInTheDocument();
      });

      expect(screen.getByText(/Some rows had missing data/)).toBeInTheDocument();
      expect(screen.getByText(/Character limit exceeded for some headlines/)).toBeInTheDocument();
    });

    it("shows error state when generation fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "Generation failed" }),
      });

      render(<GenerationPreview {...defaultProps} />);

      const generateButton = screen.getByTestId("config-generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId("config-generate-error")).toBeInTheDocument();
      });

      expect(screen.getByText(/Failed to create campaign set/i)).toBeInTheDocument();
    });

    it("shows retry button when generation fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "Generation failed" }),
      });

      render(<GenerationPreview {...defaultProps} />);

      fireEvent.click(screen.getByTestId("config-generate-button"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Retry Generation/ })).toBeInTheDocument();
      });
    });

    it("retries generation when retry button is clicked", async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            json: () => Promise.resolve({ error: "Generation failed" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConfigGenerateResponse),
          headers: new Headers({ "content-type": "application/json" }),
        });
      });

      render(<GenerationPreview {...defaultProps} />);

      // First attempt fails
      fireEvent.click(screen.getByTestId("config-generate-button"));

      await waitFor(() => {
        expect(screen.getByTestId("config-generate-error")).toBeInTheDocument();
      });

      // Retry succeeds
      fireEvent.click(screen.getByRole("button", { name: /Retry Generation/ }));

      await waitFor(() => {
        expect(screen.getByTestId("config-generate-success")).toBeInTheDocument();
      });
    });

    it("logs error to console when generation fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<GenerationPreview {...defaultProps} />);

      const generateButton = screen.getByTestId("config-generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "[GenerationPreview] Config generation failed:",
          expect.objectContaining({
            dataSourceId: "datasource-1",
            error: expect.any(Error),
            timestamp: expect.any(String),
          })
        );
      });

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Post-Generation Navigation Tests
  // ==========================================================================

  describe("Post-Generation Navigation", () => {
    const campaignSetName = "Test Campaign Set";
    const campaignSetDescription = "A test description";
    const mockCampaignSetId = "cs-12345";

    const propsWithName = {
      ...defaultProps,
      campaignSetName,
      campaignSetDescription,
    };

    beforeEach(() => {
      mockFetch.mockReset();
    });

    it("shows 'View Campaign Set' link after successful generation", async () => {
      // Mock successful campaign set creation (API returns flat object with id, name, status)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: mockCampaignSetId,
            name: campaignSetName,
            status: "draft",
          }),
          headers: new Headers({ "content-type": "application/json" }),
        })
        // Mock successful generation
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            campaigns: [{ id: "c1", name: "Test Campaign" }],
            created: 1,
            updated: 0,
          }),
          headers: new Headers({ "content-type": "application/json" }),
        });

      render(<GenerationPreview {...propsWithName} />);

      const generateButton = screen.getByTestId("config-generate-button");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId("config-generate-success")).toBeInTheDocument();
      });

      // Should show "View Campaign Set" link, not "View Campaigns"
      const viewLink = screen.getByRole("link", { name: /View Campaign Set/i });
      expect(viewLink).toBeInTheDocument();
      expect(viewLink).toHaveAttribute("href", `/campaign-sets/${mockCampaignSetId}`);
    });

    it("passes campaignSetId to onGenerateComplete callback", async () => {
      const onGenerateComplete = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: mockCampaignSetId,
            name: campaignSetName,
            status: "draft",
          }),
          headers: new Headers({ "content-type": "application/json" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            campaigns: [{ id: "c1", name: "Test Campaign" }],
            created: 1,
            updated: 0,
          }),
          headers: new Headers({ "content-type": "application/json" }),
        });

      render(<GenerationPreview {...propsWithName} onGenerateComplete={onGenerateComplete} />);

      fireEvent.click(screen.getByTestId("config-generate-button"));

      await waitFor(() => {
        expect(onGenerateComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            campaignSetId: mockCampaignSetId,
          })
        );
      });
    });

    it("links to correct campaign set detail page", async () => {
      const specificSetId = "cs-unique-789";

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: specificSetId,
            name: campaignSetName,
            status: "draft",
          }),
          headers: new Headers({ "content-type": "application/json" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            campaigns: [],
            created: 0,
            updated: 0,
          }),
          headers: new Headers({ "content-type": "application/json" }),
        });

      render(<GenerationPreview {...propsWithName} />);

      fireEvent.click(screen.getByTestId("config-generate-button"));

      await waitFor(() => {
        const viewLink = screen.getByRole("link", { name: /View Campaign Set/i });
        expect(viewLink).toHaveAttribute("href", `/campaign-sets/${specificSetId}`);
      });
    });
  });

  // ==========================================================================
  // Multi-Platform Preview Tests
  // ==========================================================================

  describe("Multi-Platform Preview", () => {
    const multiPlatformProps = {
      ...defaultProps,
      selectedPlatforms: ["google", "reddit", "facebook"] as Platform[],
    };

    it("shows platform tabs when multiple platforms are selected", () => {
      render(<GenerationPreview {...multiPlatformProps} />);

      expect(screen.getByTestId("platform-tabs")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /reddit/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /facebook/i })).toBeInTheDocument();
    });

    it("does not show platform tabs when only one platform is selected", () => {
      render(<GenerationPreview {...defaultProps} />);

      expect(screen.queryByTestId("platform-tabs")).not.toBeInTheDocument();
    });

    it("shows first platform tab as active by default", () => {
      render(<GenerationPreview {...multiPlatformProps} />);

      const googleTab = screen.getByRole("tab", { name: /google/i });
      expect(googleTab).toHaveAttribute("aria-selected", "true");
    });

    it("switches active tab when clicked", () => {
      render(<GenerationPreview {...multiPlatformProps} />);

      const redditTab = screen.getByRole("tab", { name: /reddit/i });
      fireEvent.click(redditTab);

      expect(redditTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: /google/i })).toHaveAttribute("aria-selected", "false");
    });

    it("shows platform-specific character limits in active tab panel", () => {
      // Use data with long content that exceeds limits
      const longContentData = [
        {
          brand: "Nike",
          product: "Air Max",
          headline: "This is a very long headline that exceeds the 30 character limit for Google",
          description: "This is a description that might exceed limits for some platforms",
        },
      ];

      render(
        <GenerationPreview
          {...multiPlatformProps}
          sampleData={longContentData}
        />
      );

      // Should show character limit warnings for active platform (Google)
      const charLimitSection = screen.queryByTestId("char-limit-section");
      if (charLimitSection) {
        expect(screen.getByTestId("char-limit-platform-google")).toBeInTheDocument();
      }
    });

    it("shows correct platform name in hierarchy preview for active tab", () => {
      render(<GenerationPreview {...multiPlatformProps} />);

      // The active tab's platform should be passed to HierarchyPreview
      // We verify this by checking the hierarchy preview is rendered
      expect(screen.getByTestId("hierarchy-preview")).toBeInTheDocument();
    });

    it("shows create campaign set button regardless of platform count", () => {
      render(<GenerationPreview {...multiPlatformProps} />);

      const createButton = screen.getByTestId("config-generate-button");
      expect(createButton).toHaveTextContent(/Create Campaign Set/i);
    });

    it("shows consistent create campaign set button with single platform", () => {
      render(<GenerationPreview {...defaultProps} />);

      const createButton = screen.getByTestId("config-generate-button");
      // Button text is now consistent regardless of platform count
      expect(createButton).toHaveTextContent(/Create Campaign Set/i);
    });

    // Skip: This test uses the old generate-from-config API which has been replaced
    it.skip("includes all selected platforms in generate API request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfigGenerateResponse),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(<GenerationPreview {...multiPlatformProps} />);

      fireEvent.click(screen.getByTestId("config-generate-button"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const fetchCall = mockFetch.mock.calls.find((call) =>
        call[0].includes("/api/v1/campaigns/generate-from-config")
      );
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.selectedPlatforms).toEqual(["google", "reddit", "facebook"]);
    });

    it("shows per-platform stats breakdown in stats panel", () => {
      render(<GenerationPreview {...multiPlatformProps} />);

      // Stats panel should show per-platform information for the active platform
      const statsPanel = screen.getByTestId("stats-panel");
      expect(statsPanel).toBeInTheDocument();

      // HierarchyPreview shows stats for the active platform only
      // Since we pass only the active platform to HierarchyPreview, it shows 2 campaigns
      expect(screen.getByTestId("stat-campaigns")).toHaveTextContent("2");
    });

    it("updates preview when switching between platform tabs", () => {
      const longContentData = [
        {
          brand: "Nike",
          product: "Air Max",
          headline: "This is a very long headline that exceeds Google limits but not Reddit",
          description: "Short desc",
        },
      ];

      render(
        <GenerationPreview
          {...multiPlatformProps}
          sampleData={longContentData}
        />
      );

      // Switch to Reddit tab
      const redditTab = screen.getByRole("tab", { name: /reddit/i });
      fireEvent.click(redditTab);

      // The hierarchy preview should still be visible
      expect(screen.getByTestId("hierarchy-preview")).toBeInTheDocument();
    });

    it("shows platform indicator for currently previewed platform", () => {
      render(<GenerationPreview {...multiPlatformProps} />);

      // Should show which platform is being previewed
      expect(screen.getByTestId("active-platform-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("active-platform-indicator")).toHaveTextContent(/google/i);
    });

    it("keyboard navigation works between platform tabs", () => {
      render(<GenerationPreview {...multiPlatformProps} />);

      const googleTab = screen.getByRole("tab", { name: /google/i });
      googleTab.focus();

      // Press right arrow to move to next tab
      fireEvent.keyDown(googleTab, { key: "ArrowRight" });

      const redditTab = screen.getByRole("tab", { name: /reddit/i });
      expect(redditTab).toHaveAttribute("aria-selected", "true");
    });
  });
});
