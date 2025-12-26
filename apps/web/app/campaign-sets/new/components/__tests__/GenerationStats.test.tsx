import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GenerationStats } from "../GenerationStats";

describe("GenerationStats", () => {
  const defaultProps = {
    campaignCount: 150,
    adGroupCount: 450,
    adCount: 900,
    rowsProcessed: 150,
    rowsSkipped: 10,
  };

  it("renders all 3 stat cards with correct numbers", () => {
    render(<GenerationStats {...defaultProps} />);

    expect(screen.getByTestId("stat-campaigns")).toBeInTheDocument();
    expect(screen.getByTestId("stat-adgroups")).toBeInTheDocument();
    expect(screen.getByTestId("stat-ads")).toBeInTheDocument();

    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("450")).toBeInTheDocument();
    expect(screen.getByText("900")).toBeInTheDocument();
  });

  it("renders correct labels", () => {
    render(<GenerationStats {...defaultProps} />);

    expect(screen.getByText("Campaigns")).toBeInTheDocument();
    expect(screen.getByText("Ad Groups")).toBeInTheDocument();
    expect(screen.getByText("Ads")).toBeInTheDocument();
  });

  it("shows rows processed and skipped", () => {
    render(<GenerationStats {...defaultProps} />);

    expect(screen.getByTestId("stats-meta")).toBeInTheDocument();
    expect(screen.getByText(/150 rows processed/)).toBeInTheDocument();
    expect(screen.getByText(/, 10 skipped/)).toBeInTheDocument();
  });

  it("hides skipped count when zero", () => {
    render(<GenerationStats {...defaultProps} rowsSkipped={0} />);

    expect(screen.getByText(/150 rows processed/)).toBeInTheDocument();
    expect(screen.queryByText(/skipped/)).not.toBeInTheDocument();
  });

  it("shows data source name when provided", () => {
    render(<GenerationStats {...defaultProps} dataSourceName="Products Q4" />);

    expect(screen.getByText(/Data Source: Products Q4/)).toBeInTheDocument();
  });

  it("formats large numbers with locale formatting", () => {
    render(
      <GenerationStats
        campaignCount={1500}
        adGroupCount={4500}
        adCount={9000}
        rowsProcessed={1500}
        rowsSkipped={100}
      />
    );

    // Should format with commas (locale-specific)
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("4,500")).toBeInTheDocument();
    expect(screen.getByText("9,000")).toBeInTheDocument();
    expect(screen.getByText(/1,500 rows processed/)).toBeInTheDocument();
    expect(screen.getByText(/, 100 skipped/)).toBeInTheDocument();
  });
});
