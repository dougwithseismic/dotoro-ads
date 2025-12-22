import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GenerateWizard } from "../GenerateWizard";

describe("GenerateWizard", () => {
  it("renders with initial step 'template'", () => {
    render(<GenerateWizard />);

    // Check that we're on the template step
    expect(screen.getByTestId("step-content")).toHaveTextContent(
      "Step 1 content: Select Template"
    );

    // Check that the first step is marked as current
    expect(
      screen.getByRole("button", { name: /step 1.*current/i })
    ).toBeInTheDocument();
  });

  it("has Back button disabled on first step", () => {
    render(<GenerateWizard />);

    const backButton = screen.getByRole("button", { name: /go to previous step/i });
    expect(backButton).toBeDisabled();
  });

  it("has Next button disabled when no template selected", () => {
    render(<GenerateWizard />);

    const nextButton = screen.getByRole("button", { name: /go to next step/i });
    expect(nextButton).toBeDisabled();
  });

  it("enables Next button when template is selected", () => {
    render(<GenerateWizard />);

    // Initially disabled
    const nextButton = screen.getByRole("button", { name: /go to next step/i });
    expect(nextButton).toBeDisabled();

    // Select a template
    fireEvent.click(screen.getByTestId("select-template"));

    // Now enabled
    expect(nextButton).not.toBeDisabled();
  });

  it("can navigate to next step when selection is made", () => {
    render(<GenerateWizard />);

    // Select a template
    fireEvent.click(screen.getByTestId("select-template"));

    // Click Next
    fireEvent.click(screen.getByRole("button", { name: /go to next step/i }));

    // Should now be on data-source step
    expect(screen.getByTestId("step-content")).toHaveTextContent(
      "Step 2 content: Select Data Source"
    );
  });

  it("can navigate back from later steps", () => {
    render(<GenerateWizard />);

    // Go to step 2
    fireEvent.click(screen.getByTestId("select-template"));
    fireEvent.click(screen.getByRole("button", { name: /go to next step/i }));

    // Verify we're on step 2
    expect(screen.getByTestId("step-content")).toHaveTextContent(
      "Step 2 content: Select Data Source"
    );

    // Back button should be enabled
    const backButton = screen.getByRole("button", { name: /go to previous step/i });
    expect(backButton).not.toBeDisabled();

    // Click back
    fireEvent.click(backButton);

    // Should be back on step 1
    expect(screen.getByTestId("step-content")).toHaveTextContent(
      "Step 1 content: Select Template"
    );
  });

  it("enables Next on rules step without requiring selection", () => {
    render(<GenerateWizard />);

    // Navigate to rules step (step 3)
    fireEvent.click(screen.getByTestId("select-template"));
    fireEvent.click(screen.getByRole("button", { name: /go to next step/i }));
    fireEvent.click(screen.getByTestId("select-data-source"));
    fireEvent.click(screen.getByRole("button", { name: /go to next step/i }));

    // Should be on rules step
    expect(screen.getByTestId("step-content")).toHaveTextContent(
      "Step 3 content: Configure Rules"
    );

    // Next should be enabled (rules are optional)
    const nextButton = screen.getByRole("button", { name: /go to next step/i });
    expect(nextButton).not.toBeDisabled();
  });

  it("shows Generate button on preview step", () => {
    render(<GenerateWizard />);

    // Navigate to preview step (step 4)
    fireEvent.click(screen.getByTestId("select-template"));
    fireEvent.click(screen.getByRole("button", { name: /go to next step/i }));
    fireEvent.click(screen.getByTestId("select-data-source"));
    fireEvent.click(screen.getByRole("button", { name: /go to next step/i }));
    fireEvent.click(screen.getByRole("button", { name: /go to next step/i }));

    // Should be on preview step
    expect(screen.getByTestId("step-content")).toHaveTextContent(
      "Step 4 content: Preview & Generate"
    );

    // Should show "Generate" button instead of "Next"
    expect(
      screen.getByRole("button", { name: /generate campaigns/i })
    ).toBeInTheDocument();
  });
});
