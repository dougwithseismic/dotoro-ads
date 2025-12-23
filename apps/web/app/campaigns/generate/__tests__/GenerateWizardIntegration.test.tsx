import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GenerateCampaignsPage from "../page";
import type { DataSource, Rule, PreviewResponse, GenerateResponse } from "../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockDataSources: DataSource[] = [
  {
    id: "ds1",
    name: "Products Q4",
    type: "csv",
    rowCount: 1500,
    createdAt: "2024-01-01",
  },
  {
    id: "ds2",
    name: "By Brand",
    type: "transform",
    rowCount: 45,
    createdAt: "2024-01-02",
  },
];

const mockRules: Rule[] = [
  {
    id: "r1",
    name: "Exclude Low Stock",
    enabled: true,
    conditions: [{}, {}],
    actions: [{}],
    createdAt: "2024-01-01",
  },
  {
    id: "r2",
    name: "Premium Only",
    enabled: true,
    conditions: [{}],
    actions: [{}, {}],
    createdAt: "2024-01-02",
  },
];

// Mock columns response
const mockColumns = [
  { name: "brand_name", type: "string" },
  { name: "product_name", type: "string" },
  { name: "headline", type: "string" },
  { name: "description", type: "string" },
];

const mockPreviewResponse: PreviewResponse = {
  campaign_count: 150,
  ad_group_count: 450,
  ad_count: 900,
  rows_processed: 150,
  rows_skipped: 10,
  preview: [
    {
      name: "Nike-performance",
      platform: "google",
      objective: "CONVERSIONS",
      adGroups: [
        {
          name: "Air Max",
          ads: [{ headline: "Run Fast", description: "Best shoe" }],
        },
      ],
      sourceRowId: "row_1",
    },
  ],
  warnings: [],
  validation_warnings: [],
};

const mockGenerateResponse: GenerateResponse = {
  generatedCount: 150,
  campaigns: [{ id: "c1", name: "Nike-performance", status: "draft" }],
  warnings: [],
};

// Helper to mock API responses based on URL
function setupMockFetch() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/v1/data-sources") && url.includes("/columns")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockColumns }),
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
        json: () => Promise.resolve({ data: mockRules }),
        headers: new Headers({ "content-type": "application/json" }),
      });
    }
    if (url.includes("/api/v1/campaigns/preview")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPreviewResponse),
        headers: new Headers({ "content-type": "application/json" }),
      });
    }
    if (url.includes("/api/v1/campaigns/generate")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGenerateResponse),
        headers: new Headers({ "content-type": "application/json" }),
      });
    }
    return Promise.reject(new Error(`Unhandled URL: ${url}`));
  });
}

describe("Campaign Generation Wizard Integration", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    setupMockFetch();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders with initial step data-source", async () => {
    render(<GenerateCampaignsPage />);

    // Should show page heading
    expect(screen.getByRole("heading", { name: "Generate Campaigns" })).toBeInTheDocument();

    // Should show data source selector first (new flow starts with data-source)
    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Select Data Source" })).toBeInTheDocument();
  });

  it("navigates through the first few steps", async () => {
    const user = userEvent.setup();
    render(<GenerateCampaignsPage />);

    // Step 1: Data source selection
    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    expect(screen.getByText("Products Q4")).toBeInTheDocument();

    // Select first data source
    await user.click(screen.getByTestId("datasource-card-ds1"));

    // Click Next
    await waitFor(() => {
      const nextButton = screen.getByRole("button", { name: /go to next step/i });
      expect(nextButton).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /go to next step/i }));

    // Step 2: Campaign config
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Campaign Config" })).toBeInTheDocument();
    });
  });

  it("requires data source selection before proceeding", async () => {
    render(<GenerateCampaignsPage />);

    // Wait for data sources to load
    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    // Try to click Next without selection - button should be disabled
    const nextButton = screen.getByRole("button", { name: /go to next step/i });
    expect(nextButton).toBeDisabled();
  });

  it("step indicator shows correct states", async () => {
    const user = userEvent.setup();
    render(<GenerateCampaignsPage />);

    // Initially step 1 is current
    const stepIndicator = screen.getByRole("navigation", { name: /wizard progress/i });
    expect(within(stepIndicator).getByRole("button", { name: /step 1.*current/i })).toBeInTheDocument();

    // Complete step 1 and move to step 2
    await waitFor(() => screen.getByTestId("datasource-list"));
    await user.click(screen.getByTestId("datasource-card-ds1"));

    await waitFor(() => {
      const nextButton = screen.getByRole("button", { name: /go to next step/i });
      expect(nextButton).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /go to next step/i }));

    // Step 1 should now be completed
    await waitFor(() => {
      expect(within(stepIndicator).getByRole("button", { name: /step 1.*completed/i })).toBeInTheDocument();
    });

    // Step 2 should be current
    expect(within(stepIndicator).getByRole("button", { name: /step 2.*current/i })).toBeInTheDocument();
  });

  it("shows all 6 steps in the step indicator", async () => {
    render(<GenerateCampaignsPage />);

    const stepIndicator = screen.getByRole("navigation", { name: /wizard progress/i });

    expect(within(stepIndicator).getByText("Data Source")).toBeInTheDocument();
    expect(within(stepIndicator).getByText("Campaign Config")).toBeInTheDocument();
    expect(within(stepIndicator).getByText("Ad Structure")).toBeInTheDocument();
    expect(within(stepIndicator).getByText("Keywords")).toBeInTheDocument();
    expect(within(stepIndicator).getByText("Rules")).toBeInTheDocument();
    expect(within(stepIndicator).getByText("Preview & Generate")).toBeInTheDocument();
  });

  it("preserves data source selection when navigating back", async () => {
    const user = userEvent.setup();
    render(<GenerateCampaignsPage />);

    // Step 1: Select data source
    await waitFor(() => screen.getByTestId("datasource-list"));
    await user.click(screen.getByTestId("datasource-card-ds1"));

    // Verify selection
    expect(screen.getByTestId("datasource-card-ds1")).toHaveAttribute("aria-selected", "true");

    // Go to step 2
    await waitFor(() => {
      const nextButton = screen.getByRole("button", { name: /go to next step/i });
      expect(nextButton).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /go to next step/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Campaign Config" })).toBeInTheDocument();
    });

    // Go back to step 1
    await user.click(screen.getByRole("button", { name: /go to previous step/i }));
    await waitFor(() => screen.getByTestId("datasource-list"));

    // Data source selection should be preserved
    expect(screen.getByTestId("datasource-card-ds1")).toHaveAttribute("aria-selected", "true");
  });

  it("can click on completed steps to navigate back", async () => {
    const user = userEvent.setup();
    render(<GenerateCampaignsPage />);

    // Navigate to step 2
    await waitFor(() => screen.getByTestId("datasource-list"));
    await user.click(screen.getByTestId("datasource-card-ds1"));

    await waitFor(() => {
      const nextButton = screen.getByRole("button", { name: /go to next step/i });
      expect(nextButton).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /go to next step/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Campaign Config" })).toBeInTheDocument();
    });

    // Click on step 1 in the indicator
    const stepIndicator = screen.getByRole("navigation", { name: /wizard progress/i });
    const step1Button = within(stepIndicator).getByRole("button", { name: /step 1.*completed/i });
    await user.click(step1Button);

    // Should navigate back to step 1
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Select Data Source" })).toBeInTheDocument();
    });
  });

  it("displays page header correctly", () => {
    render(<GenerateCampaignsPage />);

    expect(screen.getByRole("heading", { name: "Generate Campaigns" })).toBeInTheDocument();
    expect(
      screen.getByText(/build ad campaigns from your data sources/i)
    ).toBeInTheDocument();
  });

  it("back button is disabled on first step", async () => {
    render(<GenerateCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /go to previous step/i });
    expect(backButton).toBeDisabled();
  });
});
