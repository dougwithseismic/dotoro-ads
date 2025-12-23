import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ValidationMessage } from "../ValidationMessage";

describe("ValidationMessage", () => {
  it("renders the message text", () => {
    render(<ValidationMessage message="Please select a data source" />);

    expect(screen.getByText("Please select a data source")).toBeInTheDocument();
  });

  it("has proper role for accessibility", () => {
    render(<ValidationMessage message="Required field" />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("has aria-live for screen reader announcements", () => {
    render(<ValidationMessage message="Error occurred" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("applies error type styling by default", () => {
    render(<ValidationMessage message="Error message" />);

    const container = screen.getByTestId("validation-message");
    // CSS modules append a hash, so we check if the class name contains the expected substring
    expect(container.className).toMatch(/validationMessageError/);
  });

  it("applies warning type styling", () => {
    render(<ValidationMessage message="Warning message" type="warning" />);

    const container = screen.getByTestId("validation-message");
    expect(container.className).toMatch(/validationMessageWarning/);
  });

  it("applies info type styling", () => {
    render(<ValidationMessage message="Info message" type="info" />);

    const container = screen.getByTestId("validation-message");
    expect(container.className).toMatch(/validationMessageInfo/);
  });

  it("renders with test id for querying", () => {
    render(<ValidationMessage message="Test message" />);

    expect(screen.getByTestId("validation-message")).toBeInTheDocument();
  });
});
