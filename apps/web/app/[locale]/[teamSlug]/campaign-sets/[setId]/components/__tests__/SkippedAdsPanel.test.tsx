import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkippedAdsPanel, type SkippedAdRecord } from "../SkippedAdsPanel";

const mockSkippedAds: SkippedAdRecord[] = [
  {
    adId: "ad-12345678-abcd",
    adGroupId: "adgroup-1",
    campaignId: "campaign-1",
    reason: "headline exceeds 100 character limit",
    fields: ["headline"],
    overflow: { headline: 50 },
    originalAd: {
      headline: "A".repeat(150),
      description: "Test description",
    },
    skippedAt: "2024-01-15T10:30:00Z",
  },
  {
    adId: "ad-87654321-dcba",
    adGroupId: "adgroup-2",
    campaignId: "campaign-1",
    reason: "headline and description exceed limits",
    fields: ["headline", "description"],
    overflow: { headline: 20, description: 100 },
    originalAd: {
      headline: "Test headline",
      description: "B".repeat(600),
    },
    skippedAt: "2024-01-15T10:31:00Z",
  },
];

describe("SkippedAdsPanel", () => {
  it("renders nothing when skippedAds is empty", () => {
    const { container } = render(<SkippedAdsPanel skippedAds={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("renders header with count of skipped ads", () => {
    render(<SkippedAdsPanel skippedAds={mockSkippedAds} />);

    expect(screen.getByText("2 ads skipped")).toBeInTheDocument();
  });

  it("uses singular form when only one ad is skipped", () => {
    render(<SkippedAdsPanel skippedAds={[mockSkippedAds[0]]} />);

    expect(screen.getByText("1 ad skipped")).toBeInTheDocument();
  });

  it("is collapsed by default", () => {
    render(<SkippedAdsPanel skippedAds={mockSkippedAds} />);

    // Description should not be visible when collapsed
    expect(
      screen.queryByText(/following ads were skipped/i)
    ).not.toBeInTheDocument();
  });

  it("expands when header is clicked", () => {
    render(<SkippedAdsPanel skippedAds={mockSkippedAds} />);

    const header = screen.getByRole("button", { name: /2 ads skipped/i });
    fireEvent.click(header);

    expect(
      screen.getByText(/following ads were skipped/i)
    ).toBeInTheDocument();
  });

  it("shows ad IDs when expanded", () => {
    render(<SkippedAdsPanel skippedAds={mockSkippedAds} defaultCollapsed={false} />);

    expect(screen.getByText(/ad-12345/i)).toBeInTheDocument();
    expect(screen.getByText(/ad-87654/i)).toBeInTheDocument();
  });

  it("shows field names for each skipped ad", () => {
    render(<SkippedAdsPanel skippedAds={mockSkippedAds} defaultCollapsed={false} />);

    expect(screen.getByText(/Fields: headline$/i)).toBeInTheDocument();
    expect(screen.getByText(/Fields: headline, description/i)).toBeInTheDocument();
  });

  it("expands ad details when ad item is clicked", () => {
    render(<SkippedAdsPanel skippedAds={mockSkippedAds} defaultCollapsed={false} />);

    // Click on first ad
    const adButton = screen.getAllByRole("button")[1]; // First is header
    fireEvent.click(adButton);

    expect(screen.getByText("headline exceeds 100 character limit")).toBeInTheDocument();
  });

  it("shows overflow information in expanded details", () => {
    render(<SkippedAdsPanel skippedAds={mockSkippedAds} defaultCollapsed={false} />);

    // Expand first ad
    const adButton = screen.getAllByRole("button")[1];
    fireEvent.click(adButton);

    expect(screen.getByText(/headline: \+50 chars/)).toBeInTheDocument();
  });

  it("shows original ad content in expanded details", () => {
    render(<SkippedAdsPanel skippedAds={mockSkippedAds} defaultCollapsed={false} />);

    // Expand first ad
    const adButton = screen.getAllByRole("button")[1];
    fireEvent.click(adButton);

    expect(screen.getByText("Original headline:")).toBeInTheDocument();
    expect(screen.getByText("A".repeat(150))).toBeInTheDocument();
  });
});
