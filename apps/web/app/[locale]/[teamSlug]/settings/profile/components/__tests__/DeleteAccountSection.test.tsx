import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteAccountSection } from "../DeleteAccountSection";

describe("DeleteAccountSection", () => {
  const defaultProps = {
    onDeleteClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render danger zone section", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    const section = screen.getByTestId("delete-account-section");
    expect(section).toBeInTheDocument();
    // CSS module class names are hashed, just verify the section renders
    expect(section.className).toBeTruthy();
  });

  it("should display section title", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  it("should display warning message about permanent deletion", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    expect(
      screen.getByText(/permanently delete your account/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("should display delete account button", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    const button = screen.getByRole("button", { name: /delete account/i });
    expect(button).toBeInTheDocument();
  });

  it("should render delete button with proper type", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    const button = screen.getByRole("button", { name: /delete account/i });
    // Button should be a button element with type="button"
    expect(button).toHaveAttribute("type", "button");
  });

  it("should call onDeleteClick when button is clicked", () => {
    const handleDeleteClick = vi.fn();
    render(<DeleteAccountSection onDeleteClick={handleDeleteClick} />);

    const button = screen.getByRole("button", { name: /delete account/i });
    fireEvent.click(button);

    expect(handleDeleteClick).toHaveBeenCalledTimes(1);
  });

  it("should have proper accessibility attributes", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    const section = screen.getByTestId("delete-account-section");
    // Section should be a semantic section element
    expect(section.tagName.toLowerCase()).toBe("section");
    // Section should have aria-labelledby pointing to the title
    expect(section).toHaveAttribute("aria-labelledby", "danger-zone-title");

    const button = screen.getByRole("button", { name: /delete account/i });
    // Button should be accessible
    expect(button).toBeEnabled();
  });

  it("should display warning icon", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    // Check for warning icon by testid
    const warningIcon = screen.getByTestId("warning-icon");
    expect(warningIcon).toBeInTheDocument();
    // Icon should be hidden from screen readers
    expect(warningIcon).toHaveAttribute("aria-hidden", "true");
  });
});
