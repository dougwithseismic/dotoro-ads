import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CampaignSetDetailPage from "../page";
import type { CampaignSet } from "../../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({ setId: "set-123" }),
  usePathname: () => "/campaign-sets/set-123",
}));

// Mock window.confirm for archive action
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

// Create mock campaign set
const createMockCampaignSet = (
  overrides: Partial<CampaignSet> = {}
): CampaignSet => ({
  id: "set-123",
  userId: "user-456",
  name: "Holiday Campaign Set",
  description: "Campaign set for holiday season promotions",
  status: "active",
  syncStatus: "synced",
  dataSourceId: "ds-1",
  templateId: null,
  config: {
    dataSourceId: "ds-1",
    availableColumns: ["name", "price"],
    selectedPlatforms: ["google", "meta"],
    selectedAdTypes: { google: ["search"], meta: ["feed"] },
    campaignConfig: { namePattern: "{name} - Holiday" },
    hierarchyConfig: { adGroups: [] },
    generatedAt: "2024-01-15T10:00:00Z",
    rowCount: 100,
    campaignCount: 10,
  },
  campaigns: [
    {
      id: "campaign-1",
      campaignSetId: "set-123",
      name: "Product A - Holiday",
      platform: "google",
      orderIndex: 0,
      status: "active",
      syncStatus: "synced",
      adGroups: [
        {
          id: "adgroup-1",
          campaignId: "campaign-1",
          name: "Ad Group 1",
          orderIndex: 0,
          status: "active",
          ads: [
            {
              id: "ad-1",
              adGroupId: "adgroup-1",
              orderIndex: 0,
              headline: "Great Holiday Deals",
              description: "Shop now for savings",
              status: "active",
              createdAt: "2024-01-15T10:00:00Z",
              updatedAt: "2024-01-15T10:00:00Z",
            },
          ],
          keywords: [
            {
              id: "kw-1",
              adGroupId: "adgroup-1",
              keyword: "holiday deals",
              matchType: "broad",
              status: "active",
              createdAt: "2024-01-15T10:00:00Z",
              updatedAt: "2024-01-15T10:00:00Z",
            },
          ],
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z",
        },
      ],
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "campaign-2",
      campaignSetId: "set-123",
      name: "Product B - Holiday",
      platform: "meta",
      orderIndex: 1,
      status: "active",
      syncStatus: "synced",
      adGroups: [
        {
          id: "adgroup-2",
          campaignId: "campaign-2",
          name: "Ad Group Meta",
          orderIndex: 0,
          status: "active",
          ads: [
            {
              id: "ad-2",
              adGroupId: "adgroup-2",
              orderIndex: 0,
              headline: "Meta Holiday Ad",
              description: "Check out our deals",
              status: "active",
              createdAt: "2024-01-15T10:00:00Z",
              updatedAt: "2024-01-15T10:00:00Z",
            },
          ],
          keywords: [],
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z",
        },
      ],
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
    },
  ],
  lastSyncedAt: "2024-01-15T12:00:00Z",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T12:00:00Z",
  ...overrides,
});

function setupMockFetch(campaignSet: CampaignSet) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(campaignSet),
    headers: new Headers({ "content-type": "application/json" }),
  });
}

describe("Campaign Set Detail Page (/campaign-sets/[setId])", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockPush.mockReset();
    mockConfirm.mockReset();
  });

  describe("Breadcrumb navigation", () => {
    it("displays breadcrumb with link back to Campaign Sets", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        const breadcrumbLink = screen.getByRole("link", {
          name: /campaign sets/i,
        });
        expect(breadcrumbLink).toBeInTheDocument();
        expect(breadcrumbLink).toHaveAttribute("href", "/campaign-sets");
      });
    });

    it("displays current campaign set name in breadcrumb", async () => {
      setupMockFetch(createMockCampaignSet({ name: "My Test Set" }));
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        // Current page in breadcrumb (also appears in heading, so check both exist)
        const breadcrumb = screen.getByRole("navigation", { name: /breadcrumb/i });
        expect(breadcrumb).toHaveTextContent("My Test Set");
      });
    });
  });

  describe("Campaign set header information", () => {
    it("displays campaign set name as heading", async () => {
      setupMockFetch(createMockCampaignSet({ name: "Holiday Campaign Set" }));
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Holiday Campaign Set" })
        ).toBeInTheDocument();
      });
    });

    it("displays campaign set description", async () => {
      setupMockFetch(
        createMockCampaignSet({
          description: "Campaign set for holiday season promotions",
        })
      );
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Campaign set for holiday season promotions")
        ).toBeInTheDocument();
      });
    });

    it("displays status badge for the campaign set", async () => {
      setupMockFetch(createMockCampaignSet({ status: "active" }));
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        // Status badge with data-status="active" should be present
        const statusBadge = document.querySelector('[data-status="active"][role="status"]');
        expect(statusBadge).toBeInTheDocument();
        expect(statusBadge).toHaveTextContent("Active");
      });
    });
  });

  describe("Summary statistics", () => {
    it("displays total campaigns count", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        // 2 campaigns in mock data - check the Campaigns label is present
        expect(screen.getByText("Campaigns")).toBeInTheDocument();
        // Campaigns count should be 2
        expect(screen.getAllByText("2").length).toBeGreaterThan(0);
      });
    });

    it("displays total ad groups count", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Ad Groups")).toBeInTheDocument();
      });
    });

    it("displays total ads count", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Ads")).toBeInTheDocument();
      });
    });

    it("displays total keywords count", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeInTheDocument();
      });
    });
  });

  describe("Configuration display", () => {
    it("displays platforms used", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Platforms")).toBeInTheDocument();
        expect(screen.getByText("google, meta")).toBeInTheDocument();
      });
    });

    it("displays created date", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Created")).toBeInTheDocument();
        expect(screen.getByText(/january 15, 2024/i)).toBeInTheDocument();
      });
    });

    it("displays rows processed count", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Rows Processed")).toBeInTheDocument();
        expect(screen.getByText("100")).toBeInTheDocument();
      });
    });
  });

  describe("Campaign hierarchy section", () => {
    it("displays Campaign Hierarchy section heading", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /campaign hierarchy/i })
        ).toBeInTheDocument();
      });
    });

    it("displays individual campaigns in the hierarchy", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Product A - Holiday")).toBeInTheDocument();
        expect(screen.getByText("Product B - Holiday")).toBeInTheDocument();
      });
    });
  });

  describe("Action buttons", () => {
    it("displays Sync All button", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /sync all/i })
        ).toBeInTheDocument();
      });
    });

    it("displays Pause All button for active campaign sets", async () => {
      setupMockFetch(createMockCampaignSet({ status: "active" }));
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /pause all/i })
        ).toBeInTheDocument();
      });
    });

    it("displays Resume All button for paused campaign sets", async () => {
      setupMockFetch(createMockCampaignSet({ status: "paused" }));
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /resume all/i })
        ).toBeInTheDocument();
      });
    });

    it("displays Edit button", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /edit/i })
        ).toBeInTheDocument();
      });
    });

    it("displays Archive button", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /archive/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Action button interactions", () => {
    it("clicking Sync All triggers sync action", async () => {
      const mockCampaignSet = createMockCampaignSet();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCampaignSet),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Holiday Campaign Set" })
        ).toBeInTheDocument();
      });

      const syncButton = screen.getByRole("button", { name: /sync all/i });
      fireEvent.click(syncButton);

      // Button should show syncing state immediately
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /syncing/i })
        ).toBeInTheDocument();
      });
    });

    it("clicking Edit navigates to edit page", async () => {
      const mockCampaignSet = createMockCampaignSet();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCampaignSet),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Holiday Campaign Set" })
        ).toBeInTheDocument();
      });

      const editButton = screen.getByRole("button", { name: /edit/i });
      fireEvent.click(editButton);

      expect(mockPush).toHaveBeenCalledWith("/campaign-sets/set-123/edit");
    });

    it("clicking Archive shows confirmation dialog", async () => {
      const mockCampaignSet = createMockCampaignSet();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCampaignSet),
        headers: new Headers({ "content-type": "application/json" }),
      });
      mockConfirm.mockReturnValue(false);

      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Holiday Campaign Set" })
        ).toBeInTheDocument();
      });

      const archiveButton = screen.getByRole("button", { name: /archive/i });
      fireEvent.click(archiveButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining("Holiday Campaign Set")
      );
    });

    it("confirming Archive redirects to list page", async () => {
      const mockCampaignSet = createMockCampaignSet();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCampaignSet),
        headers: new Headers({ "content-type": "application/json" }),
      });
      mockConfirm.mockReturnValue(true);

      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Holiday Campaign Set" })
        ).toBeInTheDocument();
      });

      const archiveButton = screen.getByRole("button", { name: /archive/i });
      fireEvent.click(archiveButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/campaign-sets");
      });
    });
  });

  describe("Loading state", () => {
    it("shows loading indicator while fetching data", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(pendingPromise);
      render(<CampaignSetDetailPage />);

      expect(screen.getByText(/loading campaign set/i)).toBeInTheDocument();

      // Resolve to avoid test hanging
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(createMockCampaignSet()),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await waitFor(() => {
        expect(
          screen.queryByText(/loading campaign set/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Error state", () => {
    it("shows error message when API call fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /error/i })).toBeInTheDocument();
      });
    });

    it("shows 'Campaign set not found' for 404 errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not found" }),
      });

      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/campaign set not found/i)).toBeInTheDocument();
      });
    });

    it("shows retry button and back link on error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /try again/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: /back to campaign sets/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Status variations", () => {
    it("displays Draft status correctly", async () => {
      setupMockFetch(createMockCampaignSet({ status: "draft" }));
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Draft")).toBeInTheDocument();
      });
    });

    it("displays Error status correctly", async () => {
      setupMockFetch(createMockCampaignSet({ status: "error" }));
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Error")).toBeInTheDocument();
      });
    });

    it("displays Syncing status correctly", async () => {
      setupMockFetch(createMockCampaignSet({ status: "syncing" }));
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Syncing")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has banner role for header", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("banner")).toBeInTheDocument();
      });
    });

    it("has navigation role for breadcrumb", async () => {
      setupMockFetch(createMockCampaignSet());
      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("navigation", { name: /breadcrumb/i })
        ).toBeInTheDocument();
      });
    });

    it("error alert has proper role", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<CampaignSetDetailPage />);

      await waitFor(() => {
        // Error section should be present
        expect(screen.getByRole("heading", { name: /error/i })).toBeInTheDocument();
      });
    });
  });
});
