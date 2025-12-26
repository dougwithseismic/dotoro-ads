import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Navigation } from "../Navigation";

// Mock usePathname to test active state
vi.mock("next/navigation", async () => {
  return {
    usePathname: vi.fn(() => "/"),
  };
});

import { usePathname } from "next/navigation";

describe("Navigation", () => {
  const mockUsePathname = usePathname as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
  });

  it("renders all navigation links", () => {
    render(<Navigation />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /data sources/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /transforms/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /templates/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /rules/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /campaign sets/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /accounts/i })).toBeInTheDocument();
  });

  it("renders links with correct hrefs", () => {
    render(<Navigation />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /data sources/i })).toHaveAttribute("href", "/data-sources");
    expect(screen.getByRole("link", { name: /transforms/i })).toHaveAttribute("href", "/transforms");
    expect(screen.getByRole("link", { name: /templates/i })).toHaveAttribute("href", "/templates");
    expect(screen.getByRole("link", { name: /rules/i })).toHaveAttribute("href", "/rules");
    expect(screen.getByRole("link", { name: /campaign sets/i })).toHaveAttribute("href", "/campaign-sets");
    expect(screen.getByRole("link", { name: /accounts/i })).toHaveAttribute("href", "/accounts");
  });

  it("marks current route as active", () => {
    mockUsePathname.mockReturnValue("/templates");
    render(<Navigation />);

    const templatesLink = screen.getByRole("link", { name: /templates/i });
    expect(templatesLink).toHaveAttribute("aria-current", "page");
  });

  it("does not mark non-current routes as active", () => {
    mockUsePathname.mockReturnValue("/templates");
    render(<Navigation />);

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).not.toHaveAttribute("aria-current", "page");
  });

  it("renders navigation as nav element with proper accessibility", () => {
    render(<Navigation />);

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveAttribute("aria-label", "Main navigation");
  });

  it("renders icons for each navigation item", () => {
    const { container } = render(<Navigation />);

    // Each nav item should have an SVG icon (7 items total: dashboard, data sources, transforms, templates, rules, campaigns, accounts)
    const svgIcons = container.querySelectorAll("svg");
    expect(svgIcons.length).toBeGreaterThanOrEqual(7);
  });
});
