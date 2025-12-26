import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemographicTargeting } from "../DemographicTargeting";
import type { DemographicTarget } from "@repo/core";

describe("DemographicTargeting", () => {
  const defaultProps = {
    demographics: undefined as DemographicTarget | undefined,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all demographic fields", () => {
    render(<DemographicTargeting {...defaultProps} />);

    expect(screen.getByText("Age Range")).toBeInTheDocument();
    expect(screen.getByText("Gender")).toBeInTheDocument();
    expect(screen.getByText("Languages")).toBeInTheDocument();
  });

  it("renders age inputs with placeholders", () => {
    render(<DemographicTargeting {...defaultProps} />);

    expect(screen.getByPlaceholderText("Min")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Max")).toBeInTheDocument();
  });

  it("renders age presets", () => {
    render(<DemographicTargeting {...defaultProps} />);

    expect(screen.getByRole("button", { name: "18-24" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "25-34" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "35-44" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "65+" })).toBeInTheDocument();
  });

  it("applies age preset when clicked", () => {
    const onChange = vi.fn();
    render(<DemographicTargeting demographics={undefined} onChange={onChange} />);

    const preset = screen.getByRole("button", { name: "25-34" });
    fireEvent.click(preset);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ageMin: 25,
        ageMax: 34,
      })
    );
  });

  it("updates age min when typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DemographicTargeting demographics={undefined} onChange={onChange} />);

    const minInput = screen.getByTestId("age-min");
    await user.type(minInput, "25");

    expect(onChange).toHaveBeenCalled();
  });

  it("updates age max when typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DemographicTargeting demographics={undefined} onChange={onChange} />);

    const maxInput = screen.getByTestId("age-max");
    await user.type(maxInput, "65");

    expect(onChange).toHaveBeenCalled();
  });

  it("displays current age values", () => {
    const demographics: DemographicTarget = {
      ageMin: 25,
      ageMax: 54,
    };

    render(
      <DemographicTargeting demographics={demographics} onChange={vi.fn()} />
    );

    expect(screen.getByTestId("age-min")).toHaveValue(25);
    expect(screen.getByTestId("age-max")).toHaveValue(54);
  });

  it("renders gender options", () => {
    render(<DemographicTargeting {...defaultProps} />);

    expect(screen.getByTestId("gender-male")).toBeInTheDocument();
    expect(screen.getByTestId("gender-female")).toBeInTheDocument();
    expect(screen.getByTestId("gender-other")).toBeInTheDocument();
  });

  it("toggles gender when clicked", () => {
    const onChange = vi.fn();
    render(<DemographicTargeting demographics={undefined} onChange={onChange} />);

    const maleButton = screen.getByTestId("gender-male");
    fireEvent.click(maleButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        genders: ["male"],
      })
    );
  });

  it("displays selected genders", () => {
    const demographics: DemographicTarget = {
      genders: ["male", "female"],
    };

    render(
      <DemographicTargeting demographics={demographics} onChange={vi.fn()} />
    );

    // Both should have active styling (checked state)
    const maleButton = screen.getByTestId("gender-male");
    const femaleButton = screen.getByTestId("gender-female");

    // Check if they contain the checkmark SVG
    expect(maleButton.querySelector("svg")).toBeInTheDocument();
    expect(femaleButton.querySelector("svg")).toBeInTheDocument();
  });

  it("deselects gender when clicked again", () => {
    const onChange = vi.fn();
    const demographics: DemographicTarget = {
      genders: ["male", "female"],
    };

    render(
      <DemographicTargeting demographics={demographics} onChange={onChange} />
    );

    const maleButton = screen.getByTestId("gender-male");
    fireEvent.click(maleButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        genders: ["female"],
      })
    );
  });

  it("renders language options", () => {
    render(<DemographicTargeting {...defaultProps} />);

    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spanish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "French" })).toBeInTheDocument();
  });

  it("toggles language when clicked", () => {
    const onChange = vi.fn();
    render(<DemographicTargeting demographics={undefined} onChange={onChange} />);

    const englishButton = screen.getByRole("button", { name: "English" });
    fireEvent.click(englishButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        languages: ["en"],
      })
    );
  });

  it("shows selected language count", () => {
    const demographics: DemographicTarget = {
      languages: ["en", "es", "fr"],
    };

    render(
      <DemographicTargeting demographics={demographics} onChange={vi.fn()} />
    );

    expect(screen.getByText("3 languages selected")).toBeInTheDocument();
  });

  it("clears demographics when all fields are empty", () => {
    const onChange = vi.fn();
    const demographics: DemographicTarget = {
      genders: ["male"],
    };

    render(
      <DemographicTargeting demographics={demographics} onChange={onChange} />
    );

    // Deselect the only gender
    const maleButton = screen.getByTestId("gender-male");
    fireEvent.click(maleButton);

    // Should call with undefined when empty
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
