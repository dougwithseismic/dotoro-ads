/**
 * Tests for Campaign Set UI Language
 *
 * This test suite verifies that the UI uses consistent "Campaign Set" terminology
 * instead of the older "Generate Campaigns" language.
 *
 * Key concept:
 * - Campaign Set = what users create/edit (the container)
 * - Campaigns = what gets pushed to ad platforms (generated from the set)
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CampaignEditor } from "../CampaignEditor";
import { GenerationPreview } from "../GenerationPreview";
import type { CampaignConfig, HierarchyConfig, Platform, BudgetConfig } from "../../types";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock data sources response
const mockDataSources = [
  {
    id: "ds1",
    name: "Products Q4",
    type: "csv",
    rowCount: 1500,
    createdAt: "2024-01-01",
  },
];

// Mock columns response
const mockColumns = [
  { name: "brand_name", type: "string" },
  { name: "product_name", type: "string" },
  { name: "headline", type: "string" },
  { name: "description", type: "string" },
];

// Mock sample data
const mockSampleData = [
  { brand_name: "Nike", product_name: "Air Max", headline: "Run Fast", description: "Best shoe" },
  { brand_name: "Adidas", product_name: "Ultraboost", headline: "Go Further", description: "Comfort" },
];

// Setup mock fetch to handle all API calls
function setupMockFetch() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/v1/data-sources") && url.includes("/columns")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockColumns }),
        headers: new Headers({ "content-type": "application/json" }),
      });
    }
    if (url.includes("/api/v1/data-sources") && url.includes("/sample")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockSampleData, total: mockSampleData.length }),
        headers: new Headers({ "content-type": "application/json" }),
      });
    }
    if (url.includes("/api/v1/data-sources")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockDataSources }),
        headers: new Headers({ "content-type": "application/json" }),
      });
    }
    if (url.includes("/api/v1/rules")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
        headers: new Headers({ "content-type": "application/json" }),
      });
    }
    return Promise.reject(new Error(`Unhandled URL: ${url}`));
  });
}

describe("Campaign Set UI Language", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    setupMockFetch();
    // Clear localStorage to prevent restore dialog from showing
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("CampaignEditor component", () => {
    it("displays 'Create Campaign Set' as the main title in create mode", async () => {
      render(<CampaignEditor />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          "Create Campaign Set"
        );
      });
    });

    it("displays appropriate subtitle about building campaign sets", async () => {
      render(<CampaignEditor />);

      await waitFor(() => {
        // Check specifically for the header subtitle
        const subtitle = screen.getByText("Build a campaign set from your data sources");
        expect(subtitle).toBeInTheDocument();
        expect(subtitle.tagName).toBe("P");
      });
    });

    it("displays 'Generate' as the main action button text in create mode", async () => {
      render(<CampaignEditor />);

      await waitFor(() => {
        // The main action button in create mode says "Generate"
        const generateButton = screen.getByRole("button", { name: /generate/i });
        expect(generateButton).toBeInTheDocument();
      });
    });

    it("restore dialog mentions campaign set, not campaigns", async () => {
      // Simulate saved session by setting localStorage with a valid structure
      // The persisted state format is the WizardState object directly (without wrapper)
      localStorage.setItem(
        "campaign-wizard-state",
        JSON.stringify({
          currentStep: "campaign-config",
          dataSourceId: "ds1",
          campaignSetName: "Test Set",
          campaignSetDescription: "",
          availableColumns: [{ name: "brand", type: "string" }],
          selectedPlatforms: ["google"],
          selectedAdTypes: {},
          platformBudgets: { google: null, reddit: null, facebook: null },
          ruleIds: [],
          inlineRules: [],
        })
      );

      render(<CampaignEditor />);

      await waitFor(() => {
        // Dialog should mention campaign set
        expect(screen.getByText(/unfinished campaign set/i)).toBeInTheDocument();
      });
    });

    it("section titles use 'Campaign Set' terminology", async () => {
      render(<CampaignEditor />);

      await waitFor(() => {
        // The first section should be "Campaign Set" naming section
        // Look for the section title (there's also text elsewhere)
        const sectionTitle = screen.getByRole("button", {
          name: /campaign set.*name your campaign set/i,
        });
        expect(sectionTitle).toBeInTheDocument();
      });
    });
  });

  describe("GenerationPreview component", () => {
    const mockCampaignConfig: CampaignConfig = {
      namePattern: "{brand_name}-performance",
    };

    const mockHierarchyConfig: HierarchyConfig = {
      adGroups: [
        {
          id: "ag-1",
          namePattern: "{product_name}",
          ads: [
            {
              id: "ad-1",
              headline: "{headline}",
              description: "{description}",
            },
          ],
        },
      ],
    };

    const mockSelectedPlatforms: Platform[] = ["google"];

    const mockPlatformBudgets: Record<Platform, BudgetConfig | null> = {
      google: null,
      reddit: null,
      facebook: null,
    };

    const defaultProps = {
      campaignSetName: "Test Campaign Set",
      campaignSetDescription: "Test description",
      dataSourceId: "ds1",
      ruleIds: [] as string[],
      campaignConfig: mockCampaignConfig,
      hierarchyConfig: mockHierarchyConfig,
      selectedPlatforms: mockSelectedPlatforms,
      platformBudgets: mockPlatformBudgets,
      sampleData: mockSampleData,
      onGenerateComplete: vi.fn(),
    };

    it("displays 'Create Campaign Set' as the action button text", () => {
      render(<GenerationPreview {...defaultProps} />);

      const createButton = screen.getByTestId("config-generate-button");
      expect(createButton).toHaveTextContent(/create campaign set/i);
    });

    it("success message mentions campaign set was created", async () => {
      // Mock successful campaign set creation
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes("/api/v1/campaign-sets") && options?.method === "POST" && !url.includes("/generate")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              campaignSet: { id: "cs1", name: "Test Set", status: "draft" },
            }),
            headers: new Headers({ "content-type": "application/json" }),
          });
        }
        if (url.includes("/generate")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              campaigns: [{ id: "c1", name: "Nike-performance" }],
              created: 1,
              updated: 0,
            }),
            headers: new Headers({ "content-type": "application/json" }),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<GenerationPreview {...defaultProps} />);

      const createButton = screen.getByTestId("config-generate-button");
      fireEvent.click(createButton);

      await waitFor(() => {
        // Success message should mention campaign set
        expect(screen.getByTestId("config-generate-success")).toBeInTheDocument();
        expect(screen.getByText(/campaign set created/i)).toBeInTheDocument();
      });
    });

    it("success message includes campaign count from the set", async () => {
      // Mock successful campaign set creation with multiple campaigns
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes("/api/v1/campaign-sets") && options?.method === "POST" && !url.includes("/generate")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              campaignSet: { id: "cs1", name: "Test Set", status: "draft" },
            }),
            headers: new Headers({ "content-type": "application/json" }),
          });
        }
        if (url.includes("/generate")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              campaigns: [
                { id: "c1", name: "Nike-performance" },
                { id: "c2", name: "Adidas-performance" },
              ],
              created: 2,
              updated: 0,
            }),
            headers: new Headers({ "content-type": "application/json" }),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<GenerationPreview {...defaultProps} />);

      const createButton = screen.getByTestId("config-generate-button");
      fireEvent.click(createButton);

      await waitFor(() => {
        // Should show campaign set created with X campaigns
        expect(screen.getByText(/campaign set created with 2 campaigns/i)).toBeInTheDocument();
      });
    });

    it("multi-platform button text mentions campaign set", () => {
      const multiPlatformProps = {
        ...defaultProps,
        selectedPlatforms: ["google", "reddit", "facebook"] as Platform[],
      };

      render(<GenerationPreview {...multiPlatformProps} />);

      const createButton = screen.getByTestId("config-generate-button");
      expect(createButton).toHaveTextContent(/create campaign set/i);
    });
  });

  describe("Preview section clarification", () => {
    const mockCampaignConfig: CampaignConfig = {
      namePattern: "{brand_name}-performance",
    };

    const mockHierarchyConfig: HierarchyConfig = {
      adGroups: [
        {
          id: "ag-1",
          namePattern: "{product_name}",
          ads: [
            {
              id: "ad-1",
              headline: "{headline}",
              description: "{description}",
            },
          ],
        },
      ],
    };

    const defaultProps = {
      campaignSetName: "Test Campaign Set",
      campaignSetDescription: "Test description",
      dataSourceId: "ds1",
      ruleIds: [] as string[],
      campaignConfig: mockCampaignConfig,
      hierarchyConfig: mockHierarchyConfig,
      selectedPlatforms: ["google"] as Platform[],
      platformBudgets: {
        google: null,
        reddit: null,
        facebook: null,
      },
      sampleData: mockSampleData,
      onGenerateComplete: vi.fn(),
    };

    it("preview section title clarifies it shows campaigns from this set", () => {
      render(<GenerationPreview {...defaultProps} />);

      // The preview should clarify these are campaigns that will be generated from the set
      expect(screen.getByText(/campaigns.*generated.*from.*set/i)).toBeInTheDocument();
    });
  });
});
