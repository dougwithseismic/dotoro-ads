import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PreviewCampaignCard } from "../PreviewCampaignCard";
import type { PreviewCampaign } from "../../types";

const mockCampaign: PreviewCampaign = {
  name: "Summer Sale - Electronics",
  platform: "reddit",
  objective: "CONVERSIONS",
  budget: { type: "daily", amount: 50, currency: "USD" },
  adGroups: [
    {
      name: "Premium Products",
      ads: [
        { headline: "Shop Premium Electronics", description: "Best deals on top brands", callToAction: "Shop Now" },
        { headline: "Limited Time Offer", description: "Save 20% today", callToAction: null },
      ],
    },
    {
      name: "Budget Products",
      ads: [
        { headline: "Affordable Tech", description: "Quality without the price tag" },
      ],
    },
  ],
  sourceRowId: "row_1",
  groups: ["Premium", "Featured"],
  tags: ["electronics", "sale"],
};

describe("PreviewCampaignCard", () => {
  it("renders campaign name and platform badge", () => {
    render(<PreviewCampaignCard campaign={mockCampaign} />);

    expect(screen.getByText("Summer Sale - Electronics")).toBeInTheDocument();
    expect(screen.getByText("reddit")).toBeInTheDocument();
  });

  it("shows objective when present", () => {
    render(<PreviewCampaignCard campaign={mockCampaign} />);

    expect(screen.getByText("CONVERSIONS")).toBeInTheDocument();
  });

  it("shows budget when present", () => {
    render(<PreviewCampaignCard campaign={mockCampaign} />);

    expect(screen.getByText("USD 50.00/daily")).toBeInTheDocument();
  });

  it("shows ad group count", () => {
    render(<PreviewCampaignCard campaign={mockCampaign} />);

    expect(screen.getByTestId("adgroup-count")).toHaveTextContent("2 ad groups");
  });

  it("shows ad count", () => {
    render(<PreviewCampaignCard campaign={mockCampaign} />);

    expect(screen.getByTestId("ad-count")).toHaveTextContent("3 ads");
  });

  it("does not show body when collapsed", () => {
    render(<PreviewCampaignCard campaign={mockCampaign} isExpanded={false} />);

    expect(screen.queryByTestId("preview-card-body-row_1")).not.toBeInTheDocument();
  });

  it("shows body when expanded", () => {
    render(<PreviewCampaignCard campaign={mockCampaign} isExpanded={true} />);

    expect(screen.getByTestId("preview-card-body-row_1")).toBeInTheDocument();
  });

  it("calls onToggleExpand when header is clicked", () => {
    const onToggleExpand = vi.fn();
    render(<PreviewCampaignCard campaign={mockCampaign} onToggleExpand={onToggleExpand} />);

    fireEvent.click(screen.getByTestId("preview-card-header-row_1"));

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it("shows ad details when expanded", () => {
    render(<PreviewCampaignCard campaign={mockCampaign} isExpanded={true} />);

    // Ad group titles
    expect(screen.getByText("Premium Products")).toBeInTheDocument();
    expect(screen.getByText("Budget Products")).toBeInTheDocument();

    // Ad headlines and descriptions
    expect(screen.getByText("Shop Premium Electronics")).toBeInTheDocument();
    expect(screen.getByText("Best deals on top brands")).toBeInTheDocument();
    expect(screen.getByText("Limited Time Offer")).toBeInTheDocument();
    expect(screen.getByText("Save 20% today")).toBeInTheDocument();
    expect(screen.getByText("Affordable Tech")).toBeInTheDocument();
    expect(screen.getByText("Quality without the price tag")).toBeInTheDocument();
  });

  it("shows call to action when present", () => {
    render(<PreviewCampaignCard campaign={mockCampaign} isExpanded={true} />);

    expect(screen.getByText("CTA: Shop Now")).toBeInTheDocument();
  });

  it("shows tags and groups when expanded and present", () => {
    render(<PreviewCampaignCard campaign={mockCampaign} isExpanded={true} />);

    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByText("electronics")).toBeInTheDocument();
    expect(screen.getByText("sale")).toBeInTheDocument();
  });

  it("handles campaign without budget", () => {
    const campaignNoBudget: PreviewCampaign = {
      ...mockCampaign,
      budget: undefined,
    };
    render(<PreviewCampaignCard campaign={campaignNoBudget} />);

    expect(screen.queryByText(/USD/)).not.toBeInTheDocument();
  });

  it("handles campaign without objective", () => {
    const campaignNoObjective: PreviewCampaign = {
      ...mockCampaign,
      objective: undefined,
    };
    render(<PreviewCampaignCard campaign={campaignNoObjective} />);

    expect(screen.queryByText("CONVERSIONS")).not.toBeInTheDocument();
  });

  it("handles campaign without tags and groups", () => {
    const campaignNoTagsGroups: PreviewCampaign = {
      ...mockCampaign,
      tags: undefined,
      groups: undefined,
    };
    render(<PreviewCampaignCard campaign={campaignNoTagsGroups} isExpanded={true} />);

    expect(screen.queryByText("Premium")).not.toBeInTheDocument();
    expect(screen.queryByText("electronics")).not.toBeInTheDocument();
  });

  it("sets aria-expanded correctly", () => {
    const { rerender } = render(<PreviewCampaignCard campaign={mockCampaign} isExpanded={false} />);

    expect(screen.getByTestId("preview-card-header-row_1")).toHaveAttribute("aria-expanded", "false");

    rerender(<PreviewCampaignCard campaign={mockCampaign} isExpanded={true} />);

    expect(screen.getByTestId("preview-card-header-row_1")).toHaveAttribute("aria-expanded", "true");
  });

  it("handles singular ad group count", () => {
    const singleAdGroupCampaign: PreviewCampaign = {
      ...mockCampaign,
      adGroups: [mockCampaign.adGroups[0]!],
    };
    render(<PreviewCampaignCard campaign={singleAdGroupCampaign} />);

    expect(screen.getByTestId("adgroup-count")).toHaveTextContent("1 ad group");
  });

  it("handles singular ad count", () => {
    const singleAdCampaign: PreviewCampaign = {
      ...mockCampaign,
      adGroups: [
        {
          name: "Single Ad Group",
          ads: [{ headline: "Only Ad", description: "Single ad description" }],
        },
      ],
    };
    render(<PreviewCampaignCard campaign={singleAdCampaign} />);

    expect(screen.getByTestId("ad-count")).toHaveTextContent("1 ad");
  });

  it("handles different platforms", () => {
    const googleCampaign: PreviewCampaign = { ...mockCampaign, platform: "google" };
    const facebookCampaign: PreviewCampaign = { ...mockCampaign, platform: "facebook" };

    const { rerender } = render(<PreviewCampaignCard campaign={googleCampaign} />);
    expect(screen.getByText("google")).toBeInTheDocument();

    rerender(<PreviewCampaignCard campaign={facebookCampaign} />);
    expect(screen.getByText("facebook")).toBeInTheDocument();
  });
});
