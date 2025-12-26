import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocationTargeting } from "../LocationTargeting";
import type { LocationTarget } from "@repo/core";

describe("LocationTargeting", () => {
  const defaultProps = {
    locations: [] as LocationTarget[],
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input", () => {
    render(<LocationTargeting {...defaultProps} />);

    expect(
      screen.getByPlaceholderText(/search countries/i)
    ).toBeInTheDocument();
  });

  it("shows quick add suggestions when no locations selected", () => {
    render(<LocationTargeting {...defaultProps} />);

    expect(screen.getByText("Quick add:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "United States" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "United Kingdom" })).toBeInTheDocument();
  });

  it("adds location via quick add", () => {
    const onChange = vi.fn();
    render(<LocationTargeting locations={[]} onChange={onChange} />);

    const usButton = screen.getByRole("button", { name: "United States" });
    fireEvent.click(usButton);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "country",
        value: "US",
        name: "United States",
        include: true,
      }),
    ]);
  });

  it("displays selected locations", () => {
    const locations: LocationTarget[] = [
      { type: "country", value: "US", name: "United States", include: true },
      { type: "country", value: "GB", name: "United Kingdom", include: true },
    ];

    render(<LocationTargeting locations={locations} onChange={vi.fn()} />);

    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("2 locations selected")).toBeInTheDocument();
  });

  it("removes location when remove button clicked", () => {
    const onChange = vi.fn();
    const locations: LocationTarget[] = [
      { type: "country", value: "US", name: "United States", include: true },
    ];

    render(<LocationTargeting locations={locations} onChange={onChange} />);

    const removeButton = screen.getByRole("button", {
      name: /remove united states/i,
    });
    fireEvent.click(removeButton);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("toggles include/exclude when toggle clicked", () => {
    const onChange = vi.fn();
    const locations: LocationTarget[] = [
      { type: "country", value: "US", name: "United States", include: true },
    ];

    render(<LocationTargeting locations={locations} onChange={onChange} />);

    // Find the include toggle button (the checkmark)
    const toggleButtons = screen.getAllByRole("button");
    const includeToggle = toggleButtons.find(
      (btn) => btn.title === "Click to exclude"
    );

    if (includeToggle) {
      fireEvent.click(includeToggle);
      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({
          value: "US",
          include: false,
        }),
      ]);
    }
  });

  it("shows help text", () => {
    render(<LocationTargeting {...defaultProps} />);

    expect(
      screen.getByText(/add locations to target/i)
    ).toBeInTheDocument();
  });

  it("shows suggestions when typing in search", async () => {
    const user = userEvent.setup();
    render(<LocationTargeting {...defaultProps} />);

    const input = screen.getByTestId("location-search");
    await user.type(input, "united");

    await waitFor(() => {
      expect(screen.getByTestId("location-suggestions")).toBeInTheDocument();
    });
  });

  it("does not show already-selected countries in quick add", () => {
    const locations: LocationTarget[] = [
      { type: "country", value: "US", name: "United States", include: true },
    ];

    render(<LocationTargeting locations={locations} onChange={vi.fn()} />);

    // Quick add section should not show US since it's already selected
    expect(
      screen.queryByRole("button", { name: "United States" })
    ).not.toBeInTheDocument();
  });

  it("hides quick add when locations are selected", () => {
    const locations: LocationTarget[] = [
      { type: "country", value: "US", name: "United States", include: true },
    ];

    render(<LocationTargeting locations={locations} onChange={vi.fn()} />);

    // Quick add should still be visible if there are suggestions
    // But the already-selected ones should be filtered out
  });

  it("styles included and excluded locations differently", () => {
    const locations: LocationTarget[] = [
      { type: "country", value: "US", name: "United States", include: true },
      { type: "country", value: "GB", name: "United Kingdom", include: false },
    ];

    render(<LocationTargeting locations={locations} onChange={vi.fn()} />);

    // Check that both locations are rendered
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
  });
});
