import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TemplateCard, type TemplateCardProps } from "../TemplateCard";

const mockTemplate: TemplateCardProps["template"] = {
  id: "tpl-123",
  name: "Holiday Sale Campaign",
  platform: "reddit",
  structure: {
    objective: "CONVERSIONS",
    budget: {
      type: "daily",
      amount: 50,
      currency: "USD",
    },
  },
  variableCount: 3,
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-20T14:45:00Z",
};

describe("TemplateCard", () => {
  it("displays template name", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);
    expect(screen.getByText("Holiday Sale Campaign")).toBeInTheDocument();
  });

  it("displays platform badge with correct label", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);
    expect(screen.getByText("Reddit")).toBeInTheDocument();
  });

  it("displays Google platform correctly", () => {
    const googleTemplate = { ...mockTemplate, platform: "google" as const };
    render(<TemplateCard template={googleTemplate} onDelete={vi.fn()} />);
    expect(screen.getByText("Google")).toBeInTheDocument();
  });

  it("displays Facebook platform correctly", () => {
    const facebookTemplate = { ...mockTemplate, platform: "facebook" as const };
    render(<TemplateCard template={facebookTemplate} onDelete={vi.fn()} />);
    expect(screen.getByText("Facebook")).toBeInTheDocument();
  });

  it("displays formatted creation date", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);
    // The date should be formatted as "Jan 15, 2024" or similar
    expect(screen.getByText(/jan.*15.*2024/i)).toBeInTheDocument();
  });

  it("displays objective when present", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);
    expect(screen.getByText(/objective.*conversions/i)).toBeInTheDocument();
  });

  it("displays budget information when present", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);
    expect(screen.getByText(/daily.*budget.*usd.*50/i)).toBeInTheDocument();
  });

  it("handles missing objective gracefully", () => {
    const templateWithoutObjective = {
      ...mockTemplate,
      structure: { budget: mockTemplate.structure?.budget },
    };
    render(<TemplateCard template={templateWithoutObjective} onDelete={vi.fn()} />);
    expect(screen.queryByText(/objective/i)).not.toBeInTheDocument();
  });

  it("handles missing budget gracefully", () => {
    const templateWithoutBudget = {
      ...mockTemplate,
      structure: { objective: "AWARENESS" },
    };
    render(<TemplateCard template={templateWithoutBudget} onDelete={vi.fn()} />);
    expect(screen.queryByText(/budget/i)).not.toBeInTheDocument();
  });

  it("handles null structure gracefully", () => {
    const templateWithNullStructure = {
      ...mockTemplate,
      structure: null,
    };
    render(<TemplateCard template={templateWithNullStructure} onDelete={vi.fn()} />);
    expect(screen.getByText("Holiday Sale Campaign")).toBeInTheDocument();
  });

  it("renders edit link with correct href", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);
    const editLink = screen.getByRole("link", { name: /edit/i });
    expect(editLink).toHaveAttribute("href", "/templates/tpl-123/edit");
  });

  it("shows delete confirmation when delete button is clicked", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls onDelete when delete is confirmed", () => {
    const onDelete = vi.fn();
    render(<TemplateCard template={mockTemplate} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(onDelete).toHaveBeenCalledWith("tpl-123");
  });

  it("hides confirmation when cancel is clicked", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("button", { name: /confirm/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("renders as an article element for semantic HTML", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("displays variable count when present", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);
    expect(screen.getByText(/3 variables/i)).toBeInTheDocument();
  });

  it("displays singular variable when count is 1", () => {
    const templateWithOneVar = { ...mockTemplate, variableCount: 1 };
    render(<TemplateCard template={templateWithOneVar} onDelete={vi.fn()} />);
    expect(screen.getByText(/1 variable$/i)).toBeInTheDocument();
  });

  it("hides variable count when not present", () => {
    const templateWithoutVars = { ...mockTemplate, variableCount: undefined };
    render(<TemplateCard template={templateWithoutVars} onDelete={vi.fn()} />);
    expect(screen.queryByText(/variable/i)).not.toBeInTheDocument();
  });

  it("renders duplicate button", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} onDuplicate={vi.fn()} />);
    expect(screen.getByRole("button", { name: /duplicate/i })).toBeInTheDocument();
  });

  it("calls onDuplicate when duplicate button is clicked", () => {
    const onDuplicate = vi.fn();
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} onDuplicate={onDuplicate} />);

    fireEvent.click(screen.getByRole("button", { name: /duplicate/i }));

    expect(onDuplicate).toHaveBeenCalledWith("tpl-123");
  });

  it("hides duplicate button when onDuplicate is not provided", () => {
    render(<TemplateCard template={mockTemplate} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /duplicate/i })).not.toBeInTheDocument();
  });
});
