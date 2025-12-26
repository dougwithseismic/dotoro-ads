import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StepIndicator } from "../StepIndicator";

describe("StepIndicator", () => {
  const mockOnStepClick = vi.fn();

  beforeEach(() => {
    mockOnStepClick.mockClear();
  });

  it("renders all 9 steps", () => {
    render(
      <StepIndicator currentStep="data-source" onStepClick={mockOnStepClick} />
    );

    expect(screen.getByText("Campaign Set")).toBeInTheDocument();
    expect(screen.getByText("Data Source")).toBeInTheDocument();
    expect(screen.getByText("Rules")).toBeInTheDocument();
    expect(screen.getByText("Campaign Config")).toBeInTheDocument();
    expect(screen.getByText("Platforms")).toBeInTheDocument();
    expect(screen.getByText("Ad Types")).toBeInTheDocument();
    expect(screen.getByText("Ad Structure")).toBeInTheDocument();
    expect(screen.getByText("Targeting")).toBeInTheDocument();
    expect(screen.getByText("Preview & Create")).toBeInTheDocument();
  });

  it("highlights the current step", () => {
    render(
      <StepIndicator currentStep="campaign-config" onStepClick={mockOnStepClick} />
    );

    const currentStep = screen.getByRole("button", {
      name: /step 4.*campaign config.*current/i,
    });
    expect(currentStep).toHaveAttribute("aria-current", "step");
  });

  it("marks earlier steps as completed", () => {
    render(
      <StepIndicator currentStep="hierarchy" onStepClick={mockOnStepClick} />
    );

    // Steps 1-6 should be completed (campaign-set-name, data-source, rules, campaign-config, platform, ad-type)
    expect(
      screen.getByRole("button", { name: /step 1.*campaign set.*completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 2.*data source.*completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 3.*rules.*completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 4.*campaign config.*completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 5.*platforms.*completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 6.*ad types.*completed/i })
    ).toBeInTheDocument();

    // Step 7 should be current (hierarchy/ad structure)
    expect(
      screen.getByRole("button", { name: /step 7.*ad structure.*current/i })
    ).toBeInTheDocument();
  });

  it("completed steps are clickable", () => {
    render(
      <StepIndicator currentStep="hierarchy" onStepClick={mockOnStepClick} />
    );

    const completedStep = screen.getByRole("button", {
      name: /step 1.*campaign set.*completed/i,
    });

    // Should not be disabled
    expect(completedStep).not.toHaveAttribute("aria-disabled", "true");
    expect(completedStep).toHaveAttribute("tabindex", "0");
  });

  it("upcoming steps are not clickable", () => {
    render(
      <StepIndicator currentStep="data-source" onStepClick={mockOnStepClick} />
    );

    const upcomingStep = screen.getByRole("button", {
      name: /step 3.*rules/i,
    });

    // Should be disabled
    expect(upcomingStep).toHaveAttribute("aria-disabled", "true");
    expect(upcomingStep).toHaveAttribute("tabindex", "-1");
  });

  it("clicking completed step calls onStepClick", () => {
    render(
      <StepIndicator currentStep="hierarchy" onStepClick={mockOnStepClick} />
    );

    const completedStep = screen.getByRole("button", {
      name: /step 1.*campaign set.*completed/i,
    });
    fireEvent.click(completedStep);

    expect(mockOnStepClick).toHaveBeenCalledTimes(1);
    expect(mockOnStepClick).toHaveBeenCalledWith("campaign-set-name");
  });

  it("clicking upcoming step does not call onStepClick", () => {
    render(
      <StepIndicator currentStep="data-source" onStepClick={mockOnStepClick} />
    );

    const upcomingStep = screen.getByRole("button", {
      name: /step 5.*platforms/i,
    });
    fireEvent.click(upcomingStep);

    expect(mockOnStepClick).not.toHaveBeenCalled();
  });

  it("clicking current step does not call onStepClick", () => {
    render(
      <StepIndicator currentStep="campaign-config" onStepClick={mockOnStepClick} />
    );

    const currentStep = screen.getByRole("button", {
      name: /step 4.*campaign config.*current/i,
    });
    fireEvent.click(currentStep);

    expect(mockOnStepClick).not.toHaveBeenCalled();
  });

  it("has proper ARIA navigation role", () => {
    render(
      <StepIndicator currentStep="data-source" onStepClick={mockOnStepClick} />
    );

    const nav = screen.getByRole("navigation", { name: /wizard progress/i });
    expect(nav).toBeInTheDocument();
  });

  it("each step has proper aria-label", () => {
    render(
      <StepIndicator currentStep="campaign-config" onStepClick={mockOnStepClick} />
    );

    // Check various step labels - order: campaign-set-name, data-source, rules, campaign-config, platform, ad-type, hierarchy, targeting, preview
    expect(
      screen.getByRole("button", { name: /step 1.*campaign set.*completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 2.*data source.*completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 3.*rules.*completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 4.*campaign config.*current/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 5.*platforms/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 6.*ad types/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 7.*ad structure/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 8.*targeting/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 9.*preview.*create/i })
    ).toBeInTheDocument();
  });

  it("supports keyboard navigation on completed steps", () => {
    render(
      <StepIndicator currentStep="hierarchy" onStepClick={mockOnStepClick} />
    );

    const completedStep = screen.getByRole("button", {
      name: /step 1.*campaign set.*completed/i,
    });

    // Test Enter key
    fireEvent.keyDown(completedStep, { key: "Enter" });
    expect(mockOnStepClick).toHaveBeenCalledWith("campaign-set-name");

    mockOnStepClick.mockClear();

    // Test Space key
    fireEvent.keyDown(completedStep, { key: " " });
    expect(mockOnStepClick).toHaveBeenCalledWith("campaign-set-name");
  });

  it("keyboard navigation does not work on upcoming steps", () => {
    render(
      <StepIndicator currentStep="data-source" onStepClick={mockOnStepClick} />
    );

    const upcomingStep = screen.getByRole("button", {
      name: /step 5.*platforms/i,
    });

    fireEvent.keyDown(upcomingStep, { key: "Enter" });
    fireEvent.keyDown(upcomingStep, { key: " " });

    expect(mockOnStepClick).not.toHaveBeenCalled();
  });
});
