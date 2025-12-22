import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SyncHistoryModal } from "../SyncHistoryModal";
import type { SyncHistoryEntry } from "../../types";

const mockHistory: SyncHistoryEntry[] = [
  {
    id: "sync-1",
    timestamp: new Date("2024-01-15T10:30:00Z"),
    status: "success",
    campaignsSynced: 5,
  },
  {
    id: "sync-2",
    timestamp: new Date("2024-01-14T08:00:00Z"),
    status: "failed",
    errorMessage: "API rate limit exceeded",
  },
  {
    id: "sync-3",
    timestamp: new Date("2024-01-13T12:00:00Z"),
    status: "success",
    campaignsSynced: 3,
  },
];

describe("SyncHistoryModal", () => {
  it("renders when open is true", () => {
    render(
      <SyncHistoryModal
        isOpen={true}
        accountName="My Account"
        history={mockHistory}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <SyncHistoryModal
        isOpen={false}
        accountName="My Account"
        history={mockHistory}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays account name in title", () => {
    render(
      <SyncHistoryModal
        isOpen={true}
        accountName="My Reddit Account"
        history={mockHistory}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/My Reddit Account/)).toBeInTheDocument();
  });

  it("displays all sync entries", () => {
    render(
      <SyncHistoryModal
        isOpen={true}
        accountName="My Account"
        history={mockHistory}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/5 campaigns synced/i)).toBeInTheDocument();
    expect(screen.getByText(/3 campaigns synced/i)).toBeInTheDocument();
  });

  it("displays error message for failed syncs", () => {
    render(
      <SyncHistoryModal
        isOpen={true}
        accountName="My Account"
        history={mockHistory}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/API rate limit exceeded/i)).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const handleClose = vi.fn();
    render(
      <SyncHistoryModal
        isOpen={true}
        accountName="My Account"
        history={mockHistory}
        onClose={handleClose}
      />
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no history", () => {
    render(
      <SyncHistoryModal
        isOpen={true}
        accountName="My Account"
        history={[]}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/no sync history/i)).toBeInTheDocument();
  });

  it("displays success and failed status indicators", () => {
    render(
      <SyncHistoryModal
        isOpen={true}
        accountName="My Account"
        history={mockHistory}
        onClose={vi.fn()}
      />
    );

    expect(screen.getAllByText(/success/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/failed/i).length).toBeGreaterThan(0);
  });

  it("calls onClose when Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(
      <SyncHistoryModal
        isOpen={true}
        accountName="My Account"
        history={mockHistory}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking overlay", () => {
    const handleClose = vi.fn();
    render(
      <SyncHistoryModal
        isOpen={true}
        accountName="My Account"
        history={mockHistory}
        onClose={handleClose}
      />
    );

    // Click on the overlay (the backdrop behind the modal)
    const overlay = screen.getByRole("dialog").parentElement;
    fireEvent.click(overlay!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
