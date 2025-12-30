import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FallbackAdForm } from "../FallbackAdForm";

describe("FallbackAdForm", () => {
  const defaultProps = {
    value: {},
    onChange: vi.fn(),
  };

  it("renders all required fields", () => {
    render(<FallbackAdForm {...defaultProps} />);

    expect(screen.getByText("Headline")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Final URL")).toBeInTheDocument();
  });

  it("renders optional fields", () => {
    render(<FallbackAdForm {...defaultProps} />);

    expect(screen.getByText("Display URL")).toBeInTheDocument();
    expect(screen.getByText("Call to Action")).toBeInTheDocument();
  });

  it("shows current values in form fields", () => {
    const value = {
      headline: "Test Headline",
      description: "Test Description",
      finalUrl: "https://example.com",
    };

    render(<FallbackAdForm {...defaultProps} value={value} />);

    expect(screen.getByDisplayValue("Test Headline")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Description")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com")).toBeInTheDocument();
  });

  it("calls onChange when field value changes", () => {
    const onChange = vi.fn();
    render(<FallbackAdForm {...defaultProps} onChange={onChange} />);

    const headlineInput = screen.getByPlaceholderText(/enter a static headline/i);
    fireEvent.change(headlineInput, { target: { value: "New Headline" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headline: "New Headline" })
    );
  });

  it("shows character count for fields", () => {
    const value = {
      headline: "Test",
    };

    render(<FallbackAdForm {...defaultProps} value={value} platform="reddit" />);

    // Reddit headline max is 300
    expect(screen.getByText("4/300")).toBeInTheDocument();
  });

  it("shows error when character limit is exceeded", () => {
    const value = {
      headline: "A".repeat(301), // Exceeds Reddit's 300 char limit
    };

    render(<FallbackAdForm {...defaultProps} value={value} platform="reddit" />);

    expect(screen.getByText("301/300")).toBeInTheDocument();
  });

  it("shows error when variables are detected", () => {
    const value = {
      headline: "Buy {product_name} now!",
    };

    render(<FallbackAdForm {...defaultProps} value={value} />);

    expect(
      screen.getByText(/variables like {name} are not allowed/i)
    ).toBeInTheDocument();
  });

  it("shows error for invalid URL", () => {
    const value = {
      headline: "Test",
      description: "Test",
      finalUrl: "not-a-valid-url",
    };

    render(<FallbackAdForm {...defaultProps} value={value} />);

    expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();
  });

  it("uses Google character limits when platform is google", () => {
    render(<FallbackAdForm {...defaultProps} platform="google" />);

    // Google headline max is 30
    const headlineInput = screen.getByPlaceholderText(/enter a static headline/i);
    expect(headlineInput).toBeInTheDocument();

    // Check that the counter shows /30 instead of /300
    expect(screen.getByText("0/30")).toBeInTheDocument();
  });

  it("disables all fields when disabled prop is true", () => {
    render(<FallbackAdForm {...defaultProps} disabled={true} />);

    const headlineInput = screen.getByPlaceholderText(/enter a static headline/i);
    expect(headlineInput).toBeDisabled();
  });
});
