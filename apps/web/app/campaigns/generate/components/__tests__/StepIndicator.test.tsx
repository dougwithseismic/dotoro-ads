import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StepIndicator } from "../StepIndicator";

describe("StepIndicator", () => {
  const mockOnStepClick = vi.fn();

  beforeEach(() => {
    mockOnStepClick.mockClear();
  });

  it("renders all 6 steps", () => {
    render(
      <StepIndicator currentStep="data-source" onStepClick={mockOnStepClick} />
    );

    expect(screen.getByText("Data Source")).toBeInTheDocument();
    expect(screen.getByText("Campaign Config")).toBeInTheDocument();
    expect(screen.getByText("Ad Structure")).toBeInTheDocument();
    expect(screen.getByText("Keywords")).toBeInTheDocument();
    expect(screen.getByText("Rules")).toBeInTheDocument();
    expect(screen.getByText("Preview & Generate")).toBeInTheDocument();
  });

  it("highlights the current step", () => {
    render(
      <StepIndicator currentStep="campaign-config" onStepClick={mockOnStepClick} />
    );

    const currentStep = screen.getByRole("button", {
      name: /step 2.*campaign config.*current/i,
    });
    expect(currentStep).toHaveAttribute("aria-current", "step");
  });

  it("marks earlier steps as completed", () => {
    render(
      <StepIndicator currentStep="hierarchy" onStepClick={mockOnStepClick} />
    );

    // Steps 1 and 2 should be completed
    expect(
      screen.getByRole("button", { name: /step 1.*data source.*completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 2.*campaign config.*completed/i })
    ).toBeInTheDocument();

    // Step 3 should be current
    expect(
      screen.getByRole("button", { name: /step 3.*ad structure.*current/i })
    ).toBeInTheDocument();
  });

  it("completed steps are clickable", () => {
    render(
      <StepIndicator currentStep="hierarchy" onStepClick={mockOnStepClick} />
    );

    const completedStep = screen.getByRole("button", {
      name: /step 1.*data source.*completed/i,
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
      name: /step 2.*campaign config/i,
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
      name: /step 1.*data source.*completed/i,
    });
    fireEvent.click(completedStep);

    expect(mockOnStepClick).toHaveBeenCalledTimes(1);
    expect(mockOnStepClick).toHaveBeenCalledWith("data-source");
  });

  it("clicking upcoming step does not call onStepClick", () => {
    render(
      <StepIndicator currentStep="data-source" onStepClick={mockOnStepClick} />
    );

    const upcomingStep = screen.getByRole("button", {
      name: /step 5.*rules/i,
    });
    fireEvent.click(upcomingStep);

    expect(mockOnStepClick).not.toHaveBeenCalled();
  });

  it("clicking current step does not call onStepClick", () => {
    render(
      <StepIndicator currentStep="campaign-config" onStepClick={mockOnStepClick} />
    );

    const currentStep = screen.getByRole("button", {
      name: /step 2.*campaign config.*current/i,
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

    // Check various step labels
    expect(
      screen.getByRole("button", { name: /step 1.*data source.*completed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 2.*campaign config.*current/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 3.*ad structure/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 4.*keywords/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 5.*rules/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /step 6.*preview.*generate/i })
    ).toBeInTheDocument();
  });

  it("supports keyboard navigation on completed steps", () => {
    render(
      <StepIndicator currentStep="hierarchy" onStepClick={mockOnStepClick} />
    );

    const completedStep = screen.getByRole("button", {
      name: /step 1.*data source.*completed/i,
    });

    // Test Enter key
    fireEvent.keyDown(completedStep, { key: "Enter" });
    expect(mockOnStepClick).toHaveBeenCalledWith("data-source");

    mockOnStepClick.mockClear();

    // Test Space key
    fireEvent.keyDown(completedStep, { key: " " });
    expect(mockOnStepClick).toHaveBeenCalledWith("data-source");
  });

  it("keyboard navigation does not work on upcoming steps", () => {
    render(
      <StepIndicator currentStep="data-source" onStepClick={mockOnStepClick} />
    );

    const upcomingStep = screen.getByRole("button", {
      name: /step 5.*rules/i,
    });

    fireEvent.keyDown(upcomingStep, { key: "Enter" });
    fireEvent.keyDown(upcomingStep, { key: " " });

    expect(mockOnStepClick).not.toHaveBeenCalled();
  });
});
