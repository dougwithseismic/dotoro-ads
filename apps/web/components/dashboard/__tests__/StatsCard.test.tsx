import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatsCard } from "../StatsCard";

describe("StatsCard", () => {
  it("displays the title and value", () => {
    render(<StatsCard title="Active Campaigns" value={42} />);

    expect(screen.getByText("Active Campaigns")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("formats large numbers with locale formatting", () => {
    render(<StatsCard title="Total Rows" value={1234567} />);

    expect(screen.getByText("1,234,567")).toBeInTheDocument();
  });

  it("displays zero value correctly", () => {
    render(<StatsCard title="Pending Syncs" value={0} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    render(
      <StatsCard
        title="Uploads"
        value={10}
        icon={<span data-testid="custom-icon">icon</span>}
      />
    );

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("displays positive trend with correct indicator", () => {
    render(
      <StatsCard
        title="Campaigns"
        value={50}
        trend={{ value: 12, isPositive: true }}
      />
    );

    const trend = screen.getByTestId("trend-indicator");
    expect(trend).toHaveTextContent("+12%");
    expect(trend).toHaveAttribute("data-trend", "positive");
  });

  it("displays negative trend with correct indicator", () => {
    render(
      <StatsCard
        title="Syncs"
        value={30}
        trend={{ value: 5, isPositive: false }}
      />
    );

    const trend = screen.getByTestId("trend-indicator");
    expect(trend).toHaveTextContent("-5%");
    expect(trend).toHaveAttribute("data-trend", "negative");
  });

  it("does not render trend when not provided", () => {
    render(<StatsCard title="Uploads" value={25} />);

    expect(screen.queryByTestId("trend-indicator")).not.toBeInTheDocument();
  });

  it("applies warning style when warning prop is true", () => {
    render(<StatsCard title="Pending Syncs" value={5} warning={true} />);

    const card = screen.getByTestId("stats-card");
    expect(card).toHaveAttribute("data-warning", "true");
  });

  it("does not apply warning style when warning prop is false", () => {
    render(<StatsCard title="Pending Syncs" value={0} warning={false} />);

    const card = screen.getByTestId("stats-card");
    expect(card).toHaveAttribute("data-warning", "false");
  });
});
