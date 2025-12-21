import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ValidationBadge } from "../ValidationBadge";

describe("ValidationBadge", () => {
  it("displays valid status with default message", () => {
    const { container } = render(<ValidationBadge status="valid" />);

    expect(screen.getByText("Valid")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "valid");
  });

  it("displays invalid status with default message", () => {
    const { container } = render(<ValidationBadge status="invalid" />);

    expect(screen.getByText("Invalid")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "invalid");
  });

  it("displays warning status with default message", () => {
    const { container } = render(<ValidationBadge status="warning" />);

    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "warning");
  });

  it("displays pending status with default message", () => {
    const { container } = render(<ValidationBadge status="pending" />);

    expect(screen.getByText("Validating...")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "pending");
  });

  it("displays custom message when provided", () => {
    render(<ValidationBadge status="valid" message="All fields valid" />);

    expect(screen.getByText("All fields valid")).toBeInTheDocument();
  });

  it("shows only icon when compact mode is enabled", () => {
    const { container } = render(
      <ValidationBadge status="valid" message="Custom message" compact />
    );

    // The message should not be visible in compact mode
    expect(screen.queryByText("Custom message")).not.toBeInTheDocument();
    expect(screen.queryByText("Valid")).not.toBeInTheDocument();

    // But the badge should still have the correct status
    expect(container.firstChild).toHaveAttribute("data-status", "valid");
  });

  it("has proper accessibility attributes", () => {
    render(<ValidationBadge status="invalid" message="3 errors found" />);

    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("aria-label", "3 errors found");
  });

  it("uses default message for aria-label when no custom message", () => {
    render(<ValidationBadge status="valid" />);

    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("aria-label", "Valid");
  });

  it("renders SVG icon for each status", () => {
    const { container: validContainer } = render(
      <ValidationBadge status="valid" />
    );
    expect(validContainer.querySelector("svg")).toBeInTheDocument();

    const { container: invalidContainer } = render(
      <ValidationBadge status="invalid" />
    );
    expect(invalidContainer.querySelector("svg")).toBeInTheDocument();

    const { container: warningContainer } = render(
      <ValidationBadge status="warning" />
    );
    expect(warningContainer.querySelector("svg")).toBeInTheDocument();

    const { container: pendingContainer } = render(
      <ValidationBadge status="pending" />
    );
    expect(pendingContainer.querySelector("svg")).toBeInTheDocument();
  });
});
