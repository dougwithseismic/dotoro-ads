import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CampaignsTable } from "../CampaignsTable";
import type { GeneratedCampaign } from "../../types";

describe("CampaignsTable", () => {
  const mockOnSelectionChange = vi.fn();
  const mockOnSync = vi.fn();
  const mockOnPause = vi.fn();
  const mockOnResume = vi.fn();
  const mockOnViewDiff = vi.fn();
  const mockOnDelete = vi.fn();

  const mockCampaigns: GeneratedCampaign[] = [
    {
      id: "c1",
      templateId: "t1",
      templateName: "Summer Sale Template",
      dataRowId: "d1",
      name: "Summer Sale - Product A",
      platform: "reddit",
      status: "synced",
      paused: false,
      adCount: 12,
      adGroups: [
        { id: "ag1", name: "Interest Targeting", adCount: 6 },
        { id: "ag2", name: "Retargeting", adCount: 6 },
      ],
      platformId: "ext-123",
      lastSyncedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-10T09:00:00Z"),
    },
    {
      id: "c2",
      templateId: "t1",
      templateName: "Summer Sale Template",
      dataRowId: "d2",
      name: "Summer Sale - Product B",
      platform: "google",
      status: "pending_sync",
      paused: false,
      adCount: 8,
      createdAt: new Date("2024-01-11T09:00:00Z"),
    },
    {
      id: "c3",
      templateId: "t2",
      templateName: "Winter Campaign",
      dataRowId: "d3",
      name: "Winter Campaign - Region X",
      platform: "facebook",
      status: "sync_error",
      paused: false,
      adCount: 15,
      errorMessage: "API rate limit exceeded",
      createdAt: new Date("2024-01-12T09:00:00Z"),
    },
    {
      id: "c4",
      templateId: "t2",
      templateName: "Winter Campaign",
      dataRowId: "d4",
      name: "Draft Campaign",
      platform: "reddit",
      status: "draft",
      paused: false,
      adCount: 5,
      createdAt: new Date("2024-01-13T09:00:00Z"),
    },
  ];

  beforeEach(() => {
    mockOnSelectionChange.mockClear();
    mockOnSync.mockClear();
    mockOnPause.mockClear();
    mockOnResume.mockClear();
    mockOnViewDiff.mockClear();
    mockOnDelete.mockClear();
  });

  it("renders table headers correctly", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /platform/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /template/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /ad count/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /last synced/i })).toBeInTheDocument();
  });

  it("renders campaign rows correctly", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText("Summer Sale - Product A")).toBeInTheDocument();
    expect(screen.getByText("Summer Sale - Product B")).toBeInTheDocument();
    expect(screen.getByText("Winter Campaign - Region X")).toBeInTheDocument();
    expect(screen.getByText("Draft Campaign")).toBeInTheDocument();
  });

  it("displays platform badges", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getAllByText("Reddit")).toHaveLength(2);
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("Facebook")).toBeInTheDocument();
  });

  it("displays ad counts", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("displays status badges for each campaign", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getByText("Pending Sync")).toBeInTheDocument();
    expect(screen.getByText("Sync Error")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("calls onSelectionChange when row checkbox is clicked", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    // First checkbox is "select all", second is first row
    fireEvent.click(checkboxes[1]);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(["c1"]);
  });

  it("calls onSelectionChange with empty array when deselecting", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={["c1"]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });

  it("selects all campaigns when header checkbox is clicked", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const selectAllCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(selectAllCheckbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(["c1", "c2", "c3", "c4"]);
  });

  it("deselects all when header checkbox is clicked with all selected", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={["c1", "c2", "c3", "c4"]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const selectAllCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(selectAllCheckbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });

  it("shows indeterminate state when some items are selected", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={["c1", "c2"]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const selectAllCheckbox = screen.getAllByRole("checkbox")[0] as HTMLInputElement;
    expect(selectAllCheckbox.indeterminate).toBe(true);
  });

  it("marks row checkbox as checked when selected", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={["c1"]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes[1].checked).toBe(true);
    expect(checkboxes[2].checked).toBe(false);
  });

  it("renders view link for each campaign", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const viewLinks = screen.getAllByRole("link", { name: /view/i });
    expect(viewLinks).toHaveLength(4);
    expect(viewLinks[0]).toHaveAttribute("href", "/campaigns/c1");
  });

  it("renders empty state when no campaigns", () => {
    render(
      <CampaignsTable
        campaigns={[]}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText(/no campaigns found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to templates/i })).toHaveAttribute("href", "/templates");
  });

  it("shows expand button for campaigns with ad groups", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Only the first campaign has ad groups in our mock data
    const expandButtons = screen.getAllByRole("button", { name: /expand/i });
    expect(expandButtons.length).toBeGreaterThan(0);
  });

  it("expands ad groups when expand button is clicked", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const expandButton = screen.getByRole("button", { name: /expand ad groups/i });
    fireEvent.click(expandButton);

    expect(screen.getByText("Interest Targeting")).toBeInTheDocument();
    expect(screen.getByText("Retargeting")).toBeInTheDocument();
    // Both ad groups have 6 ads each
    expect(screen.getAllByText("6 ads")).toHaveLength(2);
  });

  it("shows never synced for campaigns without lastSyncedAt", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const neverSyncedElements = screen.getAllByText(/never synced/i);
    expect(neverSyncedElements.length).toBeGreaterThan(0);
  });

  it("renders actions menu for each campaign", () => {
    render(
      <CampaignsTable
        campaigns={mockCampaigns}
        selectedIds={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const actionButtons = screen.getAllByRole("button", { name: /campaign actions/i });
    expect(actionButtons).toHaveLength(4);
  });
});
