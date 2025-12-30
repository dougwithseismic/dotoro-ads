import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FallbackStrategySelector,
  type CampaignSetFallbackStrategy,
} from "../FallbackStrategySelector";

describe("FallbackStrategySelector", () => {
  const defaultProps = {
    value: "skip" as CampaignSetFallbackStrategy,
    onChange: vi.fn(),
  };

  it("renders all strategy options", () => {
    render(<FallbackStrategySelector {...defaultProps} />);

    expect(screen.getByText("Skip")).toBeInTheDocument();
    expect(screen.getByText("Truncate")).toBeInTheDocument();
    expect(screen.getByText("Use Fallback")).toBeInTheDocument();
  });

  it("shows selected strategy as checked", () => {
    render(<FallbackStrategySelector {...defaultProps} value="truncate" />);

    const truncateRadio = screen.getByRole("radio", { name: /truncate/i });
    expect(truncateRadio).toBeChecked();
  });

  it("calls onChange when strategy is selected", () => {
    const onChange = vi.fn();
    render(<FallbackStrategySelector {...defaultProps} onChange={onChange} />);

    const truncateOption = screen.getByRole("radio", { name: /truncate/i });
    fireEvent.click(truncateOption);

    expect(onChange).toHaveBeenCalledWith("truncate");
  });

  it("shows recommended badge for skip strategy", () => {
    render(<FallbackStrategySelector {...defaultProps} />);

    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("disables all options when disabled prop is true", () => {
    render(<FallbackStrategySelector {...defaultProps} disabled={true} />);

    const radios = screen.getAllByRole("radio");
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    render(
      <FallbackStrategySelector {...defaultProps} onChange={onChange} disabled={true} />
    );

    const truncateOption = screen.getByRole("radio", { name: /truncate/i });
    fireEvent.click(truncateOption);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("displays descriptions for each strategy", () => {
    render(<FallbackStrategySelector {...defaultProps} />);

    expect(screen.getByText(/skip ads that exceed character limits/i)).toBeInTheDocument();
    expect(screen.getByText(/automatically shorten text fields/i)).toBeInTheDocument();
    expect(screen.getByText(/replace problematic ads/i)).toBeInTheDocument();
  });
});
