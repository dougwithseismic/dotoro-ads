import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CampaignFilters } from "../CampaignFilters";

describe("CampaignFilters", () => {
  const mockOnChange = vi.fn();

  const defaultTemplates = [
    { id: "t1", name: "Template A" },
    { id: "t2", name: "Template B" },
  ];

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders all filter controls", () => {
    render(
      <CampaignFilters
        filters={{}}
        templates={defaultTemplates}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Template")).toBeInTheDocument();
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByLabelText("End Date")).toBeInTheDocument();
  });

  it("calls onChange when status filter changes", () => {
    render(
      <CampaignFilters
        filters={{}}
        templates={defaultTemplates}
        onChange={mockOnChange}
      />
    );

    const statusSelect = screen.getByLabelText("Status");
    fireEvent.change(statusSelect, { target: { value: "synced" } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: ["synced"] })
    );
  });

  it("calls onChange when template filter changes", () => {
    render(
      <CampaignFilters
        filters={{}}
        templates={defaultTemplates}
        onChange={mockOnChange}
      />
    );

    const templateSelect = screen.getByLabelText("Template");
    fireEvent.change(templateSelect, { target: { value: "t1" } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: "t1" })
    );
  });

  it("calls onChange when date range changes", () => {
    render(
      <CampaignFilters
        filters={{}}
        templates={defaultTemplates}
        onChange={mockOnChange}
      />
    );

    const startDate = screen.getByLabelText("Start Date");
    fireEvent.change(startDate, { target: { value: "2024-01-01" } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRange: expect.objectContaining({
          start: expect.any(Date),
        }),
      })
    );
  });

  it("displays template options correctly", () => {
    render(
      <CampaignFilters
        filters={{}}
        templates={defaultTemplates}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByRole("option", { name: "All Templates" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Template A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Template B" })).toBeInTheDocument();
  });

  it("displays status options correctly", () => {
    render(
      <CampaignFilters
        filters={{}}
        templates={defaultTemplates}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByRole("option", { name: "All Statuses" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Draft" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pending Sync" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Synced" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sync Error" })).toBeInTheDocument();
  });

  it("shows clear button when filters are active", () => {
    render(
      <CampaignFilters
        filters={{ status: ["synced"] }}
        templates={defaultTemplates}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("clears all filters when clear button is clicked", () => {
    render(
      <CampaignFilters
        filters={{ status: ["synced"], templateId: "t1" }}
        templates={defaultTemplates}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));

    expect(mockOnChange).toHaveBeenCalledWith({});
  });

  it("reflects current filter values in inputs", () => {
    render(
      <CampaignFilters
        filters={{ status: ["synced"], templateId: "t1" }}
        templates={defaultTemplates}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText("Status")).toHaveValue("synced");
    expect(screen.getByLabelText("Template")).toHaveValue("t1");
  });
});
