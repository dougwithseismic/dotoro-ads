import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TemplateGrid } from "../TemplateGrid";
import type { CampaignTemplate } from "../TemplateCard";

const mockTemplates: CampaignTemplate[] = [
  {
    id: "tpl-1",
    name: "Template One",
    platform: "reddit",
    structure: { objective: "CONVERSIONS" },
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-20T14:45:00Z",
  },
  {
    id: "tpl-2",
    name: "Template Two",
    platform: "google",
    structure: null,
    createdAt: "2024-02-10T08:00:00Z",
    updatedAt: "2024-02-12T09:15:00Z",
  },
  {
    id: "tpl-3",
    name: "Template Three",
    platform: "facebook",
    structure: { objective: "AWARENESS" },
    createdAt: "2024-03-01T12:00:00Z",
    updatedAt: "2024-03-05T16:30:00Z",
  },
];

describe("TemplateGrid", () => {
  it("renders all templates as cards", () => {
    render(<TemplateGrid templates={mockTemplates} onDelete={vi.fn()} />);

    expect(screen.getByText("Template One")).toBeInTheDocument();
    expect(screen.getByText("Template Two")).toBeInTheDocument();
    expect(screen.getByText("Template Three")).toBeInTheDocument();
  });

  it("renders correct number of article elements", () => {
    render(<TemplateGrid templates={mockTemplates} onDelete={vi.fn()} />);

    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(3);
  });

  it("passes onDelete to each TemplateCard", () => {
    const onDelete = vi.fn();
    render(<TemplateGrid templates={mockTemplates} onDelete={onDelete} />);

    // Each card should have a delete button
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(deleteButtons).toHaveLength(3);
  });

  it("passes onDuplicate to each TemplateCard when provided", () => {
    const onDuplicate = vi.fn();
    render(
      <TemplateGrid
        templates={mockTemplates}
        onDelete={vi.fn()}
        onDuplicate={onDuplicate}
      />
    );

    // Each card should have a duplicate button
    const duplicateButtons = screen.getAllByRole("button", {
      name: /duplicate/i,
    });
    expect(duplicateButtons).toHaveLength(3);
  });

  it("hides duplicate buttons when onDuplicate is not provided", () => {
    render(<TemplateGrid templates={mockTemplates} onDelete={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: /duplicate/i })
    ).not.toBeInTheDocument();
  });

  it("renders empty state when templates array is empty", () => {
    render(<TemplateGrid templates={[]} onDelete={vi.fn()} />);

    expect(screen.getByText(/no templates/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create.*first.*template/i })).toBeInTheDocument();
  });

  it("renders grid container", () => {
    const { container } = render(
      <TemplateGrid templates={mockTemplates} onDelete={vi.fn()} />
    );

    // Grid should have multiple article children
    const grid = container.firstChild;
    expect(grid?.childNodes.length).toBe(3);
  });

  it("empty state links to template editor", () => {
    render(<TemplateGrid templates={[]} onDelete={vi.fn()} />);

    const createLink = screen.getByRole("link", { name: /create.*first.*template/i });
    expect(createLink).toHaveAttribute("href", "/templates/editor");
  });
});
