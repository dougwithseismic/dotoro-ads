import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NewCampaignSetPage from "../page";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/campaign-sets/new",
}));

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
];

// Mock rules response
const mockRules = [
  {
    id: "r1",
    name: "Exclude Low Stock",
    enabled: true,
    conditions: [{}],
    actions: [{}],
    createdAt: "2024-01-01",
  },
];

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
    return Promise.reject(new Error(`Unhandled URL: ${url}`));
  });
}

describe("Campaign Sets New Page (/campaign-sets/new)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    setupMockFetch();
    // Clear any persisted state
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it("renders the campaign set builder wizard", async () => {
    render(<NewCampaignSetPage />);

    // The page should render the CampaignEditor component with the "Campaign Set Builder" heading
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /campaign set builder/i })
      ).toBeInTheDocument();
    });
  });

  it("displays the campaign set name section first with input field", async () => {
    render(<NewCampaignSetPage />);

    await waitFor(() => {
      // The first section should be expanded and show the name input
      expect(
        screen.getByRole("heading", { name: /name your campaign set/i })
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/e.g., Q4 Holiday Campaign Set/i)
      ).toBeInTheDocument();
    });
  });

  it("displays all accordion sections with their subtitles", async () => {
    render(<NewCampaignSetPage />);

    await waitFor(() => {
      // Find the accordion panel and verify section subtitles (unique identifiers)
      expect(screen.getByText(/select your campaign data/i)).toBeInTheDocument();
      expect(screen.getByText(/filter and transform data/i)).toBeInTheDocument();
      expect(screen.getByText(/configure campaign settings/i)).toBeInTheDocument();
      expect(screen.getByText(/define ad groups and ads/i)).toBeInTheDocument();
      expect(screen.getByText(/select target platforms/i)).toBeInTheDocument();
      expect(screen.getByText(/review and create your campaign set/i)).toBeInTheDocument();
    });
  });

  it("shows the live preview panel", async () => {
    render(<NewCampaignSetPage />);

    await waitFor(() => {
      // The preview panel should be visible
      expect(
        screen.getByRole("heading", { name: /live preview/i })
      ).toBeInTheDocument();
    });
  });

  it("shows the Create Campaign Set button in header", async () => {
    render(<NewCampaignSetPage />);

    await waitFor(() => {
      // The create button should be present but disabled initially
      const createButton = screen.getByRole("button", {
        name: /create campaign set/i,
      });
      expect(createButton).toBeInTheDocument();
      expect(createButton).toBeDisabled();
    });
  });

  it("shows progress tracking in preview panel", async () => {
    render(<NewCampaignSetPage />);

    await waitFor(() => {
      // The preview panel should show progress section
      const previewPanel = screen.getByRole("complementary");
      expect(within(previewPanel).getByText(/progress/i)).toBeInTheDocument();
    });
  });
});
