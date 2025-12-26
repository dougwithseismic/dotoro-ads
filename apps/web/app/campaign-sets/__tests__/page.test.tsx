import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CampaignSetsPage from "../page";
import type { CampaignSetListResponse } from "../types";

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
  usePathname: () => "/campaign-sets",
}));

// Mock campaign sets response
const createMockCampaignSetListResponse = (
  overrides: Partial<CampaignSetListResponse> = {}
): CampaignSetListResponse => ({
  data: [
    {
      id: "set-1",
      name: "Holiday Campaign Set",
      description: "Campaign set for holiday season",
      status: "active",
      syncStatus: "synced",
      campaignCount: 10,
      adGroupCount: 25,
      adCount: 75,
      platforms: ["google", "meta"],
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T12:00:00Z",
    },
    {
      id: "set-2",
      name: "Spring Sale Set",
      description: null,
      status: "draft",
      syncStatus: "pending",
      campaignCount: 5,
      adGroupCount: 10,
      adCount: 30,
      platforms: ["google"],
      createdAt: "2024-02-01T10:00:00Z",
      updatedAt: "2024-02-01T10:00:00Z",
    },
  ],
  total: 2,
  page: 1,
  limit: 12,
  totalPages: 1,
  ...overrides,
});

function setupMockFetch(response: CampaignSetListResponse) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(response),
    headers: new Headers({ "content-type": "application/json" }),
  });
}

describe("Campaign Sets List Page (/campaign-sets)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockPush.mockReset();
  });

  describe("Page title and header", () => {
    it("displays 'Campaign Sets' as the page title", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { level: 1, name: "Campaign Sets" })
        ).toBeInTheDocument();
      });
    });

    it("displays subtitle describing the page purpose", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Manage your generated campaign sets")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Create button", () => {
    it("displays 'Create Campaign Set' button", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("link", { name: /create campaign set/i })
        ).toBeInTheDocument();
      });
    });

    it("Create button links to /campaign-sets/new", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        const createLink = screen.getByRole("link", {
          name: /create campaign set/i,
        });
        expect(createLink).toHaveAttribute("href", "/campaign-sets/new");
      });
    });
  });

  describe("Campaign set list display", () => {
    it("displays campaign set names", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(screen.getByText("Holiday Campaign Set")).toBeInTheDocument();
        expect(screen.getByText("Spring Sale Set")).toBeInTheDocument();
      });
    });

    it("displays campaign set descriptions when available", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Campaign set for holiday season")
        ).toBeInTheDocument();
      });
    });

    it("displays status badges for each campaign set", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        // Status badges have role="status"
        const statusBadges = screen.getAllByRole("status");
        expect(statusBadges.length).toBe(2);
        expect(statusBadges[0]).toHaveAttribute("aria-label", "Active");
        expect(statusBadges[1]).toHaveAttribute("aria-label", "Draft");
      });
    });

    it("displays campaign count for each set", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        // Find campaign set cards and verify campaign counts are displayed
        const cards = screen.getAllByRole("article");
        expect(cards.length).toBe(2);
        // Check that "Campaigns" labels exist within cards
        expect(screen.getAllByText("Campaigns").length).toBeGreaterThan(0);
        // Campaign counts should be present (use getAllByText since values might repeat)
        expect(screen.getAllByText("10").length).toBeGreaterThan(0);
        expect(screen.getAllByText("5").length).toBeGreaterThan(0);
      });
    });

    it("displays platforms for each campaign set", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        // Google appears for both sets
        expect(screen.getAllByText("Google").length).toBe(2);
        // Meta appears for only one set
        expect(screen.getByText("Meta")).toBeInTheDocument();
      });
    });

    it("displays created date for each campaign set", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        // Check that dates are displayed (format: "Jan 15, 2024" or similar)
        const dateElements = screen.getAllByText(/2024/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Stats display", () => {
    it("displays total campaign sets count", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(screen.getByText("Total")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });

    it("displays active campaign sets count in stats", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        // Should show Active count - look for stat with data-status="active"
        const statElements = document.querySelectorAll('[data-status="active"]');
        expect(statElements.length).toBeGreaterThan(0);
        // The active stat should contain "1" (one active campaign set in mock)
        const activeStat = Array.from(statElements).find(el =>
          el.textContent?.includes("1") && el.textContent?.includes("Active")
        );
        expect(activeStat).toBeDefined();
      });
    });
  });

  describe("Empty state", () => {
    it("displays empty state when no campaign sets exist", async () => {
      setupMockFetch(
        createMockCampaignSetListResponse({
          data: [],
          total: 0,
          totalPages: 0,
        })
      );
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /no campaign sets yet/i })
        ).toBeInTheDocument();
      });
    });

    it("empty state encourages creating a campaign set", async () => {
      setupMockFetch(
        createMockCampaignSetListResponse({
          data: [],
          total: 0,
          totalPages: 0,
        })
      );
      render(<CampaignSetsPage />);

      await waitFor(() => {
        // Look for the empty state description text
        expect(
          screen.getByText(/create your first campaign set/i)
        ).toBeInTheDocument();
        // Look for CTA button/link to create
        const createLinks = screen.getAllByRole("link", { name: /create campaign set/i });
        expect(createLinks.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Search and filtering", () => {
    it("displays search input for campaign sets", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/search campaign sets/i)
        ).toBeInTheDocument();
      });
    });

    it("displays status filter buttons", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^all$/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /^active$/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /^draft$/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /^paused$/i })
        ).toBeInTheDocument();
      });
    });

    it("filters campaign sets by search term", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(screen.getByText("Holiday Campaign Set")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search campaign sets/i);
      fireEvent.change(searchInput, { target: { value: "Holiday" } });

      await waitFor(() => {
        expect(screen.getByText("Holiday Campaign Set")).toBeInTheDocument();
        expect(
          screen.queryByText("Spring Sale Set")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    it("clicking on a campaign set card navigates to detail page", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(screen.getByText("Holiday Campaign Set")).toBeInTheDocument();
      });

      const card = screen.getByRole("article", {
        name: /holiday campaign set/i,
      });
      fireEvent.click(card);

      expect(mockPush).toHaveBeenCalledWith("/campaign-sets/set-1");
    });
  });

  describe("Loading state", () => {
    it("shows loading indicator while fetching data", async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(pendingPromise);
      render(<CampaignSetsPage />);

      expect(screen.getByText(/loading campaign sets/i)).toBeInTheDocument();

      // Resolve to avoid test hanging
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(createMockCampaignSetListResponse()),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await waitFor(() => {
        expect(
          screen.queryByText(/loading campaign sets/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Error state", () => {
    it("shows error message when API call fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /error/i })).toBeInTheDocument();
      });
    });

    it("shows retry button when error occurs", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /try again/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Pagination", () => {
    it("shows pagination controls when there are multiple pages", async () => {
      setupMockFetch(
        createMockCampaignSetListResponse({
          totalPages: 3,
        })
      );
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /previous/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /next/i })
        ).toBeInTheDocument();
      });
    });

    it("hides pagination when only one page", async () => {
      setupMockFetch(
        createMockCampaignSetListResponse({
          totalPages: 1,
        })
      );
      render(<CampaignSetsPage />);

      await waitFor(() => {
        expect(screen.getByText("Holiday Campaign Set")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("button", { name: /previous/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /next/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("search input has accessible label", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        const searchInput = screen.getByRole("searchbox", {
          name: /search campaign sets/i,
        });
        expect(searchInput).toBeInTheDocument();
      });
    });

    it("campaign set cards are focusable and keyboard accessible", async () => {
      setupMockFetch(createMockCampaignSetListResponse());
      render(<CampaignSetsPage />);

      await waitFor(() => {
        const cards = screen.getAllByRole("article");
        expect(cards[0]).toHaveAttribute("tabIndex", "0");
      });
    });
  });
});
