import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CampaignHierarchyView } from "../CampaignHierarchyView";
import type { Campaign, AdGroup, Ad, Keyword } from "../../types";

const createMockKeyword = (overrides: Partial<Keyword> = {}): Keyword => ({
  id: "kw-1",
  adGroupId: "ag-1",
  keyword: "test keyword",
  matchType: "broad",
  status: "active",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
  ...overrides,
});

const createMockAd = (overrides: Partial<Ad> = {}): Ad => ({
  id: "ad-1",
  adGroupId: "ag-1",
  orderIndex: 0,
  headline: "Test Ad Headline",
  description: "Test ad description text",
  finalUrl: "https://example.com",
  status: "active",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
  ...overrides,
});

const createMockAdGroup = (overrides: Partial<AdGroup> = {}): AdGroup => ({
  id: "ag-1",
  campaignId: "camp-1",
  name: "Test Ad Group",
  orderIndex: 0,
  status: "active",
  ads: [createMockAd()],
  keywords: [createMockKeyword()],
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
  ...overrides,
});

const createMockCampaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  id: "camp-1",
  campaignSetId: "set-1",
  name: "Test Campaign",
  platform: "google",
  orderIndex: 0,
  status: "active",
  syncStatus: "synced",
  adGroups: [createMockAdGroup()],
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
  ...overrides,
});

describe("CampaignHierarchyView", () => {
  describe("Campaign level rendering", () => {
    it("renders campaign name", () => {
      const campaigns = [createMockCampaign({ name: "Summer Sale Campaign" })];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      expect(screen.getByText("Summer Sale Campaign")).toBeInTheDocument();
    });

    it("renders multiple campaigns", () => {
      const campaigns = [
        createMockCampaign({ id: "camp-1", name: "Campaign One" }),
        createMockCampaign({ id: "camp-2", name: "Campaign Two" }),
        createMockCampaign({ id: "camp-3", name: "Campaign Three" }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      expect(screen.getByText("Campaign One")).toBeInTheDocument();
      expect(screen.getByText("Campaign Two")).toBeInTheDocument();
      expect(screen.getByText("Campaign Three")).toBeInTheDocument();
    });

    it("displays campaign status", () => {
      const campaigns = [createMockCampaign({ status: "active" })];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("displays platform badge", () => {
      const campaigns = [createMockCampaign({ platform: "google" })];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      expect(screen.getByText("Google")).toBeInTheDocument();
    });
  });

  describe("Expansion behavior", () => {
    it("campaigns are collapsed by default", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [createMockAdGroup({ name: "Hidden Ad Group" })],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      expect(screen.queryByText("Hidden Ad Group")).not.toBeInTheDocument();
    });

    it("expands campaign on click to show ad groups", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [createMockAdGroup({ name: "Visible Ad Group" })],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      const campaignRow = screen.getByText("Test Campaign").closest("button");
      fireEvent.click(campaignRow!);

      expect(screen.getByText("Visible Ad Group")).toBeInTheDocument();
    });

    it("collapses campaign on second click", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [createMockAdGroup({ name: "Toggled Ad Group" })],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      const campaignRow = screen.getByText("Test Campaign").closest("button");
      fireEvent.click(campaignRow!);
      expect(screen.getByText("Toggled Ad Group")).toBeInTheDocument();

      fireEvent.click(campaignRow!);
      expect(screen.queryByText("Toggled Ad Group")).not.toBeInTheDocument();
    });

    it("expands ad group to show ads and keywords", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [
            createMockAdGroup({
              name: "Parent Ad Group",
              ads: [createMockAd({ headline: "Child Ad Headline" })],
              keywords: [createMockKeyword({ keyword: "child keyword" })],
            }),
          ],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      // Expand campaign first
      fireEvent.click(screen.getByText("Test Campaign").closest("button")!);

      // Ad group content should be hidden initially
      expect(screen.queryByText("Child Ad Headline")).not.toBeInTheDocument();

      // Expand ad group
      fireEvent.click(screen.getByText("Parent Ad Group").closest("button")!);

      // Now ads and keywords should be visible
      expect(screen.getByText("Child Ad Headline")).toBeInTheDocument();
      expect(screen.getByText("child keyword")).toBeInTheDocument();
    });
  });

  describe("Ad Group rendering", () => {
    it("shows ad group count in campaign row", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [
            createMockAdGroup({ id: "ag-1" }),
            createMockAdGroup({ id: "ag-2" }),
          ],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      expect(screen.getByText(/2 ad groups/i)).toBeInTheDocument();
    });

    it("shows singular ad group text for single ad group", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [createMockAdGroup()],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      expect(screen.getByText(/1 ad group/i)).toBeInTheDocument();
    });

    it("shows ad count in ad group row when expanded", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [
            createMockAdGroup({
              ads: [createMockAd({ id: "ad-1" }), createMockAd({ id: "ad-2" })],
            }),
          ],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      fireEvent.click(screen.getByText("Test Campaign").closest("button")!);

      expect(screen.getByText(/2 ads/i)).toBeInTheDocument();
    });
  });

  describe("Ad rendering", () => {
    it("displays ad headline when expanded", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [
            createMockAdGroup({
              ads: [createMockAd({ headline: "Special Offer Headline" })],
            }),
          ],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      fireEvent.click(screen.getByText("Test Campaign").closest("button")!);
      fireEvent.click(screen.getByText("Test Ad Group").closest("button")!);

      expect(screen.getByText("Special Offer Headline")).toBeInTheDocument();
    });

    it("displays ad description when expanded", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [
            createMockAdGroup({
              ads: [
                createMockAd({ description: "Detailed product description" }),
              ],
            }),
          ],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      fireEvent.click(screen.getByText("Test Campaign").closest("button")!);
      fireEvent.click(screen.getByText("Test Ad Group").closest("button")!);

      expect(
        screen.getByText("Detailed product description")
      ).toBeInTheDocument();
    });
  });

  describe("Keyword rendering", () => {
    it("displays keywords when ad group is expanded", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [
            createMockAdGroup({
              keywords: [
                createMockKeyword({ id: "kw-1", keyword: "premium shoes" }),
                createMockKeyword({ id: "kw-2", keyword: "discount footwear" }),
              ],
            }),
          ],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      fireEvent.click(screen.getByText("Test Campaign").closest("button")!);
      fireEvent.click(screen.getByText("Test Ad Group").closest("button")!);

      expect(screen.getByText("premium shoes")).toBeInTheDocument();
      expect(screen.getByText("discount footwear")).toBeInTheDocument();
    });

    it("displays keyword match type", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [
            createMockAdGroup({
              keywords: [
                createMockKeyword({ keyword: "exact match", matchType: "exact" }),
              ],
            }),
          ],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      fireEvent.click(screen.getByText("Test Campaign").closest("button")!);
      fireEvent.click(screen.getByText("Test Ad Group").closest("button")!);

      expect(screen.getByText("[exact]")).toBeInTheDocument();
    });
  });

  describe("Empty states", () => {
    it("shows message when no campaigns", () => {
      render(<CampaignHierarchyView campaigns={[]} />);

      expect(
        screen.getByText(/no campaigns in this set/i)
      ).toBeInTheDocument();
    });

    it("shows message when campaign has no ad groups", () => {
      const campaigns = [createMockCampaign({ adGroups: [] })];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      fireEvent.click(screen.getByText("Test Campaign").closest("button")!);

      expect(screen.getByText(/no ad groups/i)).toBeInTheDocument();
    });

    it("shows message when ad group has no ads", () => {
      const campaigns = [
        createMockCampaign({
          adGroups: [createMockAdGroup({ ads: [], keywords: [] })],
        }),
      ];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      fireEvent.click(screen.getByText("Test Campaign").closest("button")!);
      fireEvent.click(screen.getByText("Test Ad Group").closest("button")!);

      expect(screen.getByText(/no ads or keywords/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("campaign toggles have aria-expanded attribute", () => {
      const campaigns = [createMockCampaign()];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      const toggle = screen.getByText("Test Campaign").closest("button");
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(toggle!);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("uses tree role for hierarchy", () => {
      const campaigns = [createMockCampaign()];
      render(<CampaignHierarchyView campaigns={campaigns} />);

      expect(screen.getByRole("tree")).toBeInTheDocument();
    });
  });
});
