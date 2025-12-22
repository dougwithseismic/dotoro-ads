import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BatchActions } from "../BatchActions";

describe("BatchActions", () => {
  const mockOnSync = vi.fn();
  const mockOnSyncAllPending = vi.fn();
  const mockOnPause = vi.fn();
  const mockOnResume = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnClearSelection = vi.fn();

  beforeEach(() => {
    mockOnSync.mockClear();
    mockOnSyncAllPending.mockClear();
    mockOnPause.mockClear();
    mockOnResume.mockClear();
    mockOnDelete.mockClear();
    mockOnClearSelection.mockClear();
  });

  it("displays selected count correctly", () => {
    render(
      <BatchActions
        selectedCount={5}
        pendingCount={3}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(screen.getByText("5 selected")).toBeInTheDocument();
  });

  it("renders sync and more buttons when items selected", () => {
    render(
      <BatchActions
        selectedCount={2}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(screen.getByRole("button", { name: /sync selected/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /more actions/i })).toBeInTheDocument();
  });

  it("calls onSync when sync button is clicked", () => {
    render(
      <BatchActions
        selectedCount={3}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /sync selected/i }));
    expect(mockOnSync).toHaveBeenCalledTimes(1);
  });

  it("calls onClearSelection when clear button is clicked", () => {
    render(
      <BatchActions
        selectedCount={3}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
  });

  it("disables sync button when syncing is in progress", () => {
    render(
      <BatchActions
        selectedCount={3}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
        isSyncing
      />
    );

    expect(screen.getByRole("button", { name: /syncing/i })).toBeDisabled();
  });

  it("shows syncing text when syncing is in progress", () => {
    render(
      <BatchActions
        selectedCount={3}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
        isSyncing
      />
    );

    expect(screen.getByRole("button", { name: /syncing/i })).toBeInTheDocument();
  });

  it("displays singular text for single selection", () => {
    render(
      <BatchActions
        selectedCount={1}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("returns null when no items are selected and no pending", () => {
    const { container } = render(
      <BatchActions
        selectedCount={0}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows sync all pending button when pending count > 0 and nothing selected", () => {
    render(
      <BatchActions
        selectedCount={0}
        pendingCount={5}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(screen.getByText("5 campaigns pending sync")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync all pending/i })).toBeInTheDocument();
  });

  it("calls onSyncAllPending when sync all pending button is clicked", () => {
    render(
      <BatchActions
        selectedCount={0}
        pendingCount={3}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /sync all pending/i }));
    expect(mockOnSyncAllPending).toHaveBeenCalledTimes(1);
  });

  it("opens dropdown menu when more button is clicked", () => {
    render(
      <BatchActions
        selectedCount={2}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));

    expect(screen.getByRole("menuitem", { name: /pause selected/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /resume selected/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /delete selected/i })).toBeInTheDocument();
  });

  it("calls onPause when pause option is clicked", () => {
    render(
      <BatchActions
        selectedCount={2}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /pause selected/i }));

    expect(mockOnPause).toHaveBeenCalledTimes(1);
  });

  it("calls onResume when resume option is clicked", () => {
    render(
      <BatchActions
        selectedCount={2}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /resume selected/i }));

    expect(mockOnResume).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete when delete option is clicked", () => {
    render(
      <BatchActions
        selectedCount={2}
        pendingCount={0}
        onSync={mockOnSync}
        onSyncAllPending={mockOnSyncAllPending}
        onPause={mockOnPause}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete selected/i }));

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });
});
