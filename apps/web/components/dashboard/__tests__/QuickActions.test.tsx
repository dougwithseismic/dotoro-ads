import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QuickActions } from "../QuickActions";
import type { QuickAction } from "../types";

describe("QuickActions", () => {
  const defaultActions: QuickAction[] = [
    {
      id: "upload",
      label: "Upload Data",
      href: "/upload",
      description: "Import your product catalog",
    },
    {
      id: "template",
      label: "Create Template",
      href: "/templates/editor",
      description: "Design a new ad template",
    },
    {
      id: "campaigns",
      label: "View Campaigns",
      href: "/campaigns",
      description: "Manage your active campaigns",
    },
  ];

  it("renders all quick action buttons", () => {
    render(<QuickActions actions={defaultActions} />);

    expect(
      screen.getByRole("link", { name: /upload data/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create template/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view campaigns/i })
    ).toBeInTheDocument();
  });

  it("renders correct href for each action", () => {
    render(<QuickActions actions={defaultActions} />);

    expect(screen.getByRole("link", { name: /upload data/i })).toHaveAttribute(
      "href",
      "/upload"
    );
    expect(
      screen.getByRole("link", { name: /create template/i })
    ).toHaveAttribute("href", "/templates/editor");
    expect(
      screen.getByRole("link", { name: /view campaigns/i })
    ).toHaveAttribute("href", "/campaigns");
  });

  it("displays descriptions when provided", () => {
    render(<QuickActions actions={defaultActions} />);

    expect(screen.getByText("Import your product catalog")).toBeInTheDocument();
    expect(screen.getByText("Design a new ad template")).toBeInTheDocument();
    expect(
      screen.getByText("Manage your active campaigns")
    ).toBeInTheDocument();
  });

  it("renders custom icons when provided", () => {
    const actionsWithIcons: QuickAction[] = [
      {
        id: "test",
        label: "Test Action",
        href: "/test",
        icon: <span data-testid="custom-icon">icon</span>,
      },
    ];

    render(<QuickActions actions={actionsWithIcons} />);

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("handles empty actions array", () => {
    const { container } = render(<QuickActions actions={[]} />);

    const grid = container.querySelector("[data-testid='quick-actions-grid']");
    expect(grid?.children.length).toBe(0);
  });
});
