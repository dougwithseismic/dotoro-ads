import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatsGrid } from "../StatsGrid";
import type { DashboardStats } from "../types";

describe("StatsGrid", () => {
  const defaultStats: DashboardStats = {
    activeCampaigns: 12,
    pendingSyncs: 3,
    recentUploads: 8,
    totalDataRows: 45678,
  };

  it("renders all four stat cards", () => {
    render(<StatsGrid stats={defaultStats} />);

    expect(screen.getByText("Active Campaigns")).toBeInTheDocument();
    expect(screen.getByText("Pending Syncs")).toBeInTheDocument();
    expect(screen.getByText("Recent Uploads")).toBeInTheDocument();
    expect(screen.getByText("Total Data Rows")).toBeInTheDocument();
  });

  it("displays correct values for each stat", () => {
    render(<StatsGrid stats={defaultStats} />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("45,678")).toBeInTheDocument();
  });

  it("handles zero values correctly", () => {
    const zeroStats: DashboardStats = {
      activeCampaigns: 0,
      pendingSyncs: 0,
      recentUploads: 0,
      totalDataRows: 0,
    };

    render(<StatsGrid stats={zeroStats} />);

    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(4);
  });

  it("applies warning state when pending syncs > 0", () => {
    render(<StatsGrid stats={defaultStats} />);

    const pendingSyncsCard = screen
      .getByText("Pending Syncs")
      .closest("[data-testid='stats-card']");
    expect(pendingSyncsCard).toHaveAttribute("data-warning", "true");
  });

  it("does not apply warning state when pending syncs is 0", () => {
    const noSyncsStats: DashboardStats = {
      ...defaultStats,
      pendingSyncs: 0,
    };

    render(<StatsGrid stats={noSyncsStats} />);

    const pendingSyncsCard = screen
      .getByText("Pending Syncs")
      .closest("[data-testid='stats-card']");
    expect(pendingSyncsCard).toHaveAttribute("data-warning", "false");
  });

  it("displays trend indicator for active campaigns when provided", () => {
    const statsWithTrend: DashboardStats = {
      ...defaultStats,
      activeCampaignsTrend: { value: 10, isPositive: true },
    };

    render(<StatsGrid stats={statsWithTrend} />);

    const trendIndicator = screen.getByTestId("trend-indicator");
    expect(trendIndicator).toHaveTextContent("+10%");
    expect(trendIndicator).toHaveAttribute("data-trend", "positive");
  });

  it("displays trend indicator for total data rows when provided", () => {
    const statsWithTrend: DashboardStats = {
      ...defaultStats,
      totalDataRowsTrend: { value: 5, isPositive: false },
    };

    render(<StatsGrid stats={statsWithTrend} />);

    const trendIndicator = screen.getByTestId("trend-indicator");
    expect(trendIndicator).toHaveTextContent("-5%");
    expect(trendIndicator).toHaveAttribute("data-trend", "negative");
  });
});
