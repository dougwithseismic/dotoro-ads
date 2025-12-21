import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BatchActions } from "../BatchActions";

describe("BatchActions", () => {
  const mockOnSync = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnClearSelection = vi.fn();

  beforeEach(() => {
    mockOnSync.mockClear();
    mockOnDelete.mockClear();
    mockOnClearSelection.mockClear();
  });

  it("displays selected count correctly", () => {
    render(
      <BatchActions
        selectedCount={5}
        onSync={mockOnSync}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(screen.getByText("5 selected")).toBeInTheDocument();
  });

  it("renders sync and delete buttons", () => {
    render(
      <BatchActions
        selectedCount={2}
        onSync={mockOnSync}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(screen.getByRole("button", { name: /sync selected/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete selected/i })).toBeInTheDocument();
  });

  it("calls onSync when sync button is clicked", () => {
    render(
      <BatchActions
        selectedCount={3}
        onSync={mockOnSync}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /sync selected/i }));
    expect(mockOnSync).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete when delete button is clicked", () => {
    render(
      <BatchActions
        selectedCount={3}
        onSync={mockOnSync}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /delete selected/i }));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it("calls onClearSelection when clear button is clicked", () => {
    render(
      <BatchActions
        selectedCount={3}
        onSync={mockOnSync}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
  });

  it("disables buttons when syncing is in progress", () => {
    render(
      <BatchActions
        selectedCount={3}
        onSync={mockOnSync}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
        isSyncing
      />
    );

    expect(screen.getByRole("button", { name: /syncing/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /delete selected/i })).toBeDisabled();
  });

  it("shows syncing text when syncing is in progress", () => {
    render(
      <BatchActions
        selectedCount={3}
        onSync={mockOnSync}
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
        onSync={mockOnSync}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("returns null when no items are selected", () => {
    const { container } = render(
      <BatchActions
        selectedCount={0}
        onSync={mockOnSync}
        onDelete={mockOnDelete}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
