import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TargetingConfig } from "../TargetingConfig";
import type { TargetingConfig as TargetingConfigType } from "@repo/core";

describe("TargetingConfig", () => {
  const defaultProps = {
    config: null,
    selectedPlatforms: ["google" as const],
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with empty config", () => {
    render(<TargetingConfig {...defaultProps} />);

    expect(screen.getByText("Targeting Configuration")).toBeInTheDocument();
    expect(
      screen.getByText("No targeting configured - ads will reach everyone")
    ).toBeInTheDocument();
  });

  it("displays targeting sections", () => {
    render(<TargetingConfig {...defaultProps} />);

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Demographics")).toBeInTheDocument();
    expect(screen.getByText("Devices")).toBeInTheDocument();
  });

  it("expands location section by default", () => {
    render(<TargetingConfig {...defaultProps} />);

    // Location section should be expanded
    const locationButton = screen.getByRole("button", {
      name: /location/i,
    });
    expect(locationButton).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles section expansion on click", () => {
    render(<TargetingConfig {...defaultProps} />);

    const demographicsButton = screen.getByRole("button", {
      name: /demographics/i,
    });

    expect(demographicsButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(demographicsButton);
    expect(demographicsButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(demographicsButton);
    expect(demographicsButton).toHaveAttribute("aria-expanded", "false");
  });

  it("shows active targeting count when configured", () => {
    const config: TargetingConfigType = {
      locations: [
        { type: "country", value: "US", name: "United States", include: true },
      ],
      demographics: {
        ageMin: 18,
        ageMax: 65,
      },
    };

    render(
      <TargetingConfig
        {...defaultProps}
        config={config}
      />
    );

    expect(
      screen.getByText("2 targeting options configured")
    ).toBeInTheDocument();
  });

  it("shows location count in section subtitle", () => {
    const config: TargetingConfigType = {
      locations: [
        { type: "country", value: "US", name: "United States", include: true },
        { type: "country", value: "GB", name: "United Kingdom", include: true },
      ],
    };

    render(
      <TargetingConfig
        {...defaultProps}
        config={config}
      />
    );

    expect(screen.getByText("2 locations")).toBeInTheDocument();
  });

  it("shows clear button when targeting is configured", () => {
    const config: TargetingConfigType = {
      locations: [
        { type: "country", value: "US", name: "United States", include: true },
      ],
    };

    render(
      <TargetingConfig
        {...defaultProps}
        config={config}
      />
    );

    expect(
      screen.getByRole("button", { name: /clear all targeting/i })
    ).toBeInTheDocument();
  });

  it("calls onChange with null when clearing targeting", () => {
    const onChange = vi.fn();
    const config: TargetingConfigType = {
      locations: [
        { type: "country", value: "US", name: "United States", include: true },
      ],
    };

    render(
      <TargetingConfig
        config={config}
        selectedPlatforms={["google"]}
        onChange={onChange}
      />
    );

    const clearButton = screen.getByRole("button", {
      name: /clear all targeting/i,
    });
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("does not show clear button when no targeting configured", () => {
    render(<TargetingConfig {...defaultProps} />);

    expect(
      screen.queryByRole("button", { name: /clear all targeting/i })
    ).not.toBeInTheDocument();
  });
});
