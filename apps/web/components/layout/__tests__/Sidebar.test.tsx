import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "../Sidebar";

describe("Sidebar", () => {
  it("renders sidebar with navigation", () => {
    render(<Sidebar />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders logo/brand area", () => {
    render(<Sidebar />);

    expect(screen.getByText(/dotoro/i)).toBeInTheDocument();
  });

  it("renders collapse toggle button", () => {
    render(<Sidebar />);

    const toggleButton = screen.getByRole("button", { name: /toggle sidebar/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it("toggles collapsed state when toggle button clicked", () => {
    render(<Sidebar />);

    const toggleButton = screen.getByRole("button", { name: /toggle sidebar/i });
    const sidebar = screen.getByTestId("sidebar");

    // Initially expanded
    expect(sidebar).not.toHaveAttribute("data-collapsed", "true");

    // Click to collapse
    fireEvent.click(toggleButton);
    expect(sidebar).toHaveAttribute("data-collapsed", "true");

    // Click to expand
    fireEvent.click(toggleButton);
    expect(sidebar).not.toHaveAttribute("data-collapsed", "true");
  });

  it("has proper accessibility attributes", () => {
    render(<Sidebar />);

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toHaveAttribute("aria-label", "Sidebar");
  });

  it("accepts external collapsed state via props", () => {
    const onCollapsedChange = vi.fn();
    render(<Sidebar collapsed={true} onCollapsedChange={onCollapsedChange} />);

    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-collapsed", "true");
  });

  it("calls onCollapsedChange when toggled", () => {
    const onCollapsedChange = vi.fn();
    render(<Sidebar collapsed={false} onCollapsedChange={onCollapsedChange} />);

    const toggleButton = screen.getByRole("button", { name: /toggle sidebar/i });
    fireEvent.click(toggleButton);

    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });
});
