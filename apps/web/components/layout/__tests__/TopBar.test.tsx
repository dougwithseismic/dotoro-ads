import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TopBar } from "../TopBar";

describe("TopBar", () => {
  it("renders top bar with account switcher", () => {
    render(<TopBar />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /account/i })).toBeInTheDocument();
  });

  // Note: Theme toggle is currently disabled (returns null) so we skip testing it
  // See ThemeProvider.tsx - theme is forced to dark mode

  it("shows account dropdown when account button clicked", () => {
    render(<TopBar />);

    const accountButton = screen.getByRole("button", { name: /account/i });
    fireEvent.click(accountButton);

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("renders breadcrumb area", () => {
    render(<TopBar breadcrumbs={[{ label: "Templates", href: "/templates" }]} />);

    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
  });

  it("renders multiple breadcrumbs with separators", () => {
    render(
      <TopBar
        breadcrumbs={[
          { label: "Templates", href: "/templates" },
          { label: "Editor", href: "/templates/editor" },
        ]}
      />
    );

    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Editor")).toBeInTheDocument();
    // Check for separator
    expect(screen.getAllByText("/").length).toBe(1);
  });

  it("renders mobile menu toggle", () => {
    render(<TopBar />);

    const mobileToggle = screen.getByRole("button", { name: /menu/i });
    expect(mobileToggle).toBeInTheDocument();
  });

  it("calls onMobileMenuToggle when mobile menu button clicked", () => {
    const onMobileMenuToggle = vi.fn();
    render(<TopBar onMobileMenuToggle={onMobileMenuToggle} />);

    const mobileToggle = screen.getByRole("button", { name: /menu/i });
    fireEvent.click(mobileToggle);

    expect(onMobileMenuToggle).toHaveBeenCalled();
  });

  it("closes account dropdown when clicking outside", () => {
    render(<TopBar />);

    const accountButton = screen.getByRole("button", { name: /account/i });
    fireEvent.click(accountButton);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Click outside
    fireEvent.click(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
