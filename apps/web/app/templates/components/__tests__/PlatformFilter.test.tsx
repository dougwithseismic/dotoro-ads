import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PlatformFilter, type Platform } from "../PlatformFilter";

const mockCounts = {
  reddit: 5,
  google: 3,
  facebook: 2,
};

describe("PlatformFilter", () => {
  it("renders all platform options", () => {
    render(<PlatformFilter selected={null} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reddit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /facebook/i })).toBeInTheDocument();
  });

  it("highlights 'All' when no platform is selected", () => {
    render(<PlatformFilter selected={null} onChange={vi.fn()} />);

    const allButton = screen.getByRole("button", { name: /all/i });
    expect(allButton).toHaveAttribute("aria-pressed", "true");
  });

  it("highlights selected platform", () => {
    render(<PlatformFilter selected="reddit" onChange={vi.fn()} />);

    const redditButton = screen.getByRole("button", { name: /reddit/i });
    const allButton = screen.getByRole("button", { name: /all/i });

    expect(redditButton).toHaveAttribute("aria-pressed", "true");
    expect(allButton).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with platform when clicked", () => {
    const onChange = vi.fn();
    render(<PlatformFilter selected={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /google/i }));

    expect(onChange).toHaveBeenCalledWith("google");
  });

  it("calls onChange with null when 'All' is clicked", () => {
    const onChange = vi.fn();
    render(<PlatformFilter selected="reddit" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /all/i }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("renders as a group with accessible role", () => {
    render(<PlatformFilter selected={null} onChange={vi.fn()} />);

    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("has accessible label for the filter group", () => {
    render(<PlatformFilter selected={null} onChange={vi.fn()} />);

    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("aria-label", "Filter by platform");
  });

  it("updates selection when different platform is clicked", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PlatformFilter selected="reddit" onChange={onChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: /facebook/i }));
    expect(onChange).toHaveBeenCalledWith("facebook");

    // Simulate parent updating state
    rerender(<PlatformFilter selected="facebook" onChange={onChange} />);

    expect(
      screen.getByRole("button", { name: /facebook/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /reddit/i })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("displays count badges when counts are provided", () => {
    render(
      <PlatformFilter
        selected={null}
        onChange={vi.fn()}
        counts={mockCounts}
      />
    );

    expect(screen.getByText("10")).toBeInTheDocument(); // Total count for "All"
    expect(screen.getByText("5")).toBeInTheDocument(); // Reddit count
    expect(screen.getByText("3")).toBeInTheDocument(); // Google count
    expect(screen.getByText("2")).toBeInTheDocument(); // Facebook count
  });

  it("hides count badges when counts are not provided", () => {
    render(<PlatformFilter selected={null} onChange={vi.fn()} />);

    // No count badges should be visible
    expect(screen.queryByText("10")).not.toBeInTheDocument();
    expect(screen.queryByText("5")).not.toBeInTheDocument();
  });

  it("shows zero counts correctly", () => {
    const zeroCounts = { reddit: 0, google: 5, facebook: 0 };
    render(
      <PlatformFilter
        selected={null}
        onChange={vi.fn()}
        counts={zeroCounts}
      />
    );

    const zeroElements = screen.getAllByText("0");
    expect(zeroElements).toHaveLength(2); // Reddit and Facebook
  });
});
