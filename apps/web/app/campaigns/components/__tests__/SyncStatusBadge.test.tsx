import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SyncStatusBadge } from "../SyncStatusBadge";

describe("SyncStatusBadge", () => {
  it("displays draft status with default message", () => {
    const { container } = render(<SyncStatusBadge status="draft" />);

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "draft");
  });

  it("displays pending_sync status with default message", () => {
    const { container } = render(<SyncStatusBadge status="pending_sync" />);

    expect(screen.getByText("Pending Sync")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "pending_sync");
  });

  it("displays synced status with default message", () => {
    const { container } = render(<SyncStatusBadge status="synced" />);

    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "synced");
  });

  it("displays sync_error status with default message", () => {
    const { container } = render(<SyncStatusBadge status="sync_error" />);

    expect(screen.getByText("Sync Error")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "sync_error");
  });

  it("displays custom message when provided", () => {
    render(<SyncStatusBadge status="synced" message="Last synced 5m ago" />);

    expect(screen.getByText("Last synced 5m ago")).toBeInTheDocument();
  });

  it("shows only icon when compact mode is enabled", () => {
    const { container } = render(
      <SyncStatusBadge status="synced" message="Custom message" compact />
    );

    expect(screen.queryByText("Custom message")).not.toBeInTheDocument();
    expect(screen.queryByText("Synced")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "synced");
  });

  it("has proper accessibility attributes", () => {
    render(<SyncStatusBadge status="sync_error" message="Failed to sync" />);

    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("aria-label", "Failed to sync");
  });

  it("uses default message for aria-label when no custom message", () => {
    render(<SyncStatusBadge status="synced" />);

    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("aria-label", "Synced");
  });

  it("renders SVG icon for each status", () => {
    const statuses = ["draft", "pending_sync", "synced", "sync_error"] as const;

    statuses.forEach((status) => {
      const { container, unmount } = render(<SyncStatusBadge status={status} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
      unmount();
    });
  });
});
