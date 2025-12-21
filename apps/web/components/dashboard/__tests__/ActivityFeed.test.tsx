import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ActivityFeed } from "../ActivityFeed";
import type { ActivityItem } from "../types";

describe("ActivityFeed", () => {
  const mockActivities: ActivityItem[] = [
    {
      id: "1",
      type: "upload",
      title: "Uploaded product catalog",
      timestamp: new Date("2024-01-15T10:30:00Z"),
    },
    {
      id: "2",
      type: "template_created",
      title: "Created new ad template",
      timestamp: new Date("2024-01-15T09:15:00Z"),
    },
    {
      id: "3",
      type: "campaign_synced",
      title: "Synced with Reddit Ads",
      timestamp: new Date("2024-01-14T16:45:00Z"),
    },
    {
      id: "4",
      type: "rule_created",
      title: "Created pricing rule",
      timestamp: new Date("2024-01-14T14:20:00Z"),
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders activity items with their titles", () => {
    render(<ActivityFeed activities={mockActivities} />);

    expect(screen.getByText("Uploaded product catalog")).toBeInTheDocument();
    expect(screen.getByText("Created new ad template")).toBeInTheDocument();
    expect(screen.getByText("Synced with Reddit Ads")).toBeInTheDocument();
    expect(screen.getByText("Created pricing rule")).toBeInTheDocument();
  });

  it("displays empty state when no activities", () => {
    render(<ActivityFeed activities={[]} />);

    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
  });

  it("renders correct icon for each activity type", () => {
    render(<ActivityFeed activities={mockActivities} />);

    const uploadIcon = screen.getByTestId("activity-icon-upload");
    const templateIcon = screen.getByTestId("activity-icon-template_created");
    const syncIcon = screen.getByTestId("activity-icon-campaign_synced");
    const ruleIcon = screen.getByTestId("activity-icon-rule_created");

    expect(uploadIcon).toBeInTheDocument();
    expect(templateIcon).toBeInTheDocument();
    expect(syncIcon).toBeInTheDocument();
    expect(ruleIcon).toBeInTheDocument();
  });

  it("displays relative timestamps", () => {
    render(<ActivityFeed activities={mockActivities} />);

    // First activity is 1.5 hours ago (10:30 -> 12:00), should show "1 hour ago"
    // Second is 2.75 hours ago (09:15 -> 12:00), should show "2 hours ago"
    expect(screen.getByText("1 hour ago")).toBeInTheDocument();
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
  });

  it("respects maxItems limit", () => {
    render(<ActivityFeed activities={mockActivities} maxItems={2} />);

    expect(screen.getByText("Uploaded product catalog")).toBeInTheDocument();
    expect(screen.getByText("Created new ad template")).toBeInTheDocument();
    expect(
      screen.queryByText("Synced with Reddit Ads")
    ).not.toBeInTheDocument();
  });

  it("applies correct data-type attribute for styling", () => {
    render(<ActivityFeed activities={[mockActivities[0]!]} />);

    const item = screen.getByTestId("activity-item-1");
    expect(item).toHaveAttribute("data-type", "upload");
  });

  it("renders View all link when viewAllHref is provided", () => {
    render(
      <ActivityFeed activities={mockActivities} viewAllHref="/activity" />
    );

    const viewAllLink = screen.getByRole("link", { name: /view all/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute("href", "/activity");
  });

  it("does not render View all link when viewAllHref is not provided", () => {
    render(<ActivityFeed activities={mockActivities} />);

    expect(
      screen.queryByRole("link", { name: /view all/i })
    ).not.toBeInTheDocument();
  });
});
