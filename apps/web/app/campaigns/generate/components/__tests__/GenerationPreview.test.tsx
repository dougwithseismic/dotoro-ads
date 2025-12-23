import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GenerationPreview } from "../GenerationPreview";
import type { CampaignConfig, HierarchyConfig, Platform } from "../../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockCampaignConfig: CampaignConfig = {
  namePattern: "{brand}-performance",
};

const mockHierarchyConfig: HierarchyConfig = {
  adGroupNamePattern: "{product}",
  adMapping: {
    headline: "{headline}",
    description: "{description}",
  },
};

const mockSelectedPlatforms: Platform[] = ["google"];

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

  it("shows generate button", () => {
    render(<GenerationPreview {...defaultProps} />);

    const generateButton = screen.getByTestId("config-generate-button");
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).toHaveTextContent("Generate 2 Campaign");
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

  describe("Generation API", () => {
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
      expect(requestBody.hierarchyConfig.adGroupNamePattern).toBe("{product}");
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

      expect(screen.getByText(/Failed to generate campaigns/i)).toBeInTheDocument();
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
});
