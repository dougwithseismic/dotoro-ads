import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CampaignRowActions } from "../CampaignRowActions";
import type { GeneratedCampaign } from "../../types";

describe("CampaignRowActions", () => {
  const mockOnSync = vi.fn();
  const mockOnPause = vi.fn();
  const mockOnResume = vi.fn();
  const mockOnViewDiff = vi.fn();
  const mockOnDelete = vi.fn();

  const baseCampaign: GeneratedCampaign = {
    id: "c1",
    templateId: "t1",
    templateName: "Test Template",
    dataRowId: "d1",
    name: "Test Campaign",
    platform: "reddit",
    status: "draft",
    paused: false,
    adCount: 10,
    createdAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    mockOnSync.mockClear();
    mockOnPause.mockClear();
    mockOnResume.mockClear();
    mockOnViewDiff.mockClear();
    mockOnDelete.mockClear();
  });

  it("renders view link with correct href", () => {
    render(
      <CampaignRowActions
        campaign={baseCampaign}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    const viewLink = screen.getByRole("link", { name: /view/i });
    expect(viewLink).toHaveAttribute("href", "/campaigns/c1");
  });

  it("renders action menu button", () => {
    render(
      <CampaignRowActions
        campaign={baseCampaign}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByRole("button", { name: /campaign actions/i })).toBeInTheDocument();
  });

  it("opens dropdown menu when button is clicked", () => {
    render(
      <CampaignRowActions
        campaign={baseCampaign}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));

    expect(screen.getByRole("menuitem", { name: /sync now/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /delete/i })).toBeInTheDocument();
  });

  it("shows sync option for draft campaigns", () => {
    render(
      <CampaignRowActions
        campaign={{ ...baseCampaign, status: "draft" }}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));

    expect(screen.getByRole("menuitem", { name: /sync now/i })).toBeInTheDocument();
  });

  it("shows sync option for pending_sync campaigns", () => {
    render(
      <CampaignRowActions
        campaign={{ ...baseCampaign, status: "pending_sync" }}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));

    expect(screen.getByRole("menuitem", { name: /sync now/i })).toBeInTheDocument();
  });

  it("shows sync option for sync_error campaigns", () => {
    render(
      <CampaignRowActions
        campaign={{ ...baseCampaign, status: "sync_error" }}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));

    expect(screen.getByRole("menuitem", { name: /sync now/i })).toBeInTheDocument();
  });

  it("shows pause option for synced and not paused campaigns", () => {
    render(
      <CampaignRowActions
        campaign={{ ...baseCampaign, status: "synced", paused: false }}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));

    expect(screen.getByRole("menuitem", { name: /pause/i })).toBeInTheDocument();
  });

  it("shows resume option for synced and paused campaigns", () => {
    render(
      <CampaignRowActions
        campaign={{ ...baseCampaign, status: "synced", paused: true }}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));

    expect(screen.getByRole("menuitem", { name: /resume/i })).toBeInTheDocument();
  });

  it("shows view diff option for non-draft campaigns", () => {
    render(
      <CampaignRowActions
        campaign={{ ...baseCampaign, status: "synced" }}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));

    expect(screen.getByRole("menuitem", { name: /view diff/i })).toBeInTheDocument();
  });

  it("calls onSync when sync option is clicked", () => {
    render(
      <CampaignRowActions
        campaign={baseCampaign}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /sync now/i }));

    expect(mockOnSync).toHaveBeenCalledWith("c1");
  });

  it("calls onPause when pause option is clicked", () => {
    render(
      <CampaignRowActions
        campaign={{ ...baseCampaign, status: "synced", paused: false }}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /pause/i }));

    expect(mockOnPause).toHaveBeenCalledWith("c1");
  });

  it("calls onResume when resume option is clicked", () => {
    render(
      <CampaignRowActions
        campaign={{ ...baseCampaign, status: "synced", paused: true }}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /resume/i }));

    expect(mockOnResume).toHaveBeenCalledWith("c1");
  });

  it("calls onViewDiff when view diff option is clicked", () => {
    render(
      <CampaignRowActions
        campaign={{ ...baseCampaign, status: "synced" }}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /view diff/i }));

    expect(mockOnViewDiff).toHaveBeenCalledWith("c1");
  });

  it("calls onDelete when delete option is clicked", () => {
    render(
      <CampaignRowActions
        campaign={baseCampaign}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));

    expect(mockOnDelete).toHaveBeenCalledWith("c1");
  });

  it("shows syncing text when isSyncing is true", () => {
    render(
      <CampaignRowActions
        campaign={baseCampaign}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
        isSyncing
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));

    expect(screen.getByRole("menuitem", { name: /syncing/i })).toBeInTheDocument();
  });

  it("disables sync button when isSyncing is true", () => {
    render(
      <CampaignRowActions
        campaign={baseCampaign}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
        isSyncing
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));

    expect(screen.getByRole("menuitem", { name: /syncing/i })).toBeDisabled();
  });

  it("closes menu when action is performed", () => {
    render(
      <CampaignRowActions
        campaign={baseCampaign}
        onSync={mockOnSync}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onViewDiff={mockOnViewDiff}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /campaign actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /sync now/i }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
