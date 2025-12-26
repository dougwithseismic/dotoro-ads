import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SyncStatusIndicator } from "../SyncStatusIndicator";
import type { CampaignSetSyncStatus } from "../../types";

describe("SyncStatusIndicator", () => {
  beforeEach(() => {
    // Mock the current time for consistent relative time testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Sync status rendering", () => {
    const syncStatuses: CampaignSetSyncStatus[] = [
      "pending",
      "syncing",
      "synced",
      "failed",
      "conflict",
    ];

    it.each(syncStatuses)(
      "renders %s sync status with correct data attribute",
      (syncStatus) => {
        const { container } = render(
          <SyncStatusIndicator syncStatus={syncStatus} />
        );

        const indicator = container.firstChild as HTMLElement;
        expect(indicator).toHaveAttribute("data-sync-status", syncStatus);
      }
    );

    it("displays Never Synced for pending status", () => {
      render(<SyncStatusIndicator syncStatus="pending" />);
      expect(screen.getByText("Never Synced")).toBeInTheDocument();
    });

    it("displays Syncing... for syncing status", () => {
      render(<SyncStatusIndicator syncStatus="syncing" />);
      expect(screen.getByText("Syncing...")).toBeInTheDocument();
    });

    it("displays Synced for synced status without lastSyncedAt", () => {
      render(<SyncStatusIndicator syncStatus="synced" />);
      expect(screen.getByText("Synced")).toBeInTheDocument();
    });

    it("displays Sync Failed for failed status", () => {
      render(<SyncStatusIndicator syncStatus="failed" />);
      expect(screen.getByText("Sync Failed")).toBeInTheDocument();
    });

    it("displays Sync Conflict for conflict status", () => {
      render(<SyncStatusIndicator syncStatus="conflict" />);
      expect(screen.getByText("Sync Conflict")).toBeInTheDocument();
    });
  });

  describe("Last synced time display", () => {
    it("shows relative time when lastSyncedAt is provided and status is synced", () => {
      const fiveMinutesAgo = new Date("2024-01-15T11:55:00Z").toISOString();
      render(
        <SyncStatusIndicator syncStatus="synced" lastSyncedAt={fiveMinutesAgo} />
      );

      expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
    });

    it("shows relative time for hours ago", () => {
      const twoHoursAgo = new Date("2024-01-15T10:00:00Z").toISOString();
      render(
        <SyncStatusIndicator syncStatus="synced" lastSyncedAt={twoHoursAgo} />
      );

      expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
    });

    it("shows relative time for days ago", () => {
      const threeDaysAgo = new Date("2024-01-12T12:00:00Z").toISOString();
      render(
        <SyncStatusIndicator syncStatus="synced" lastSyncedAt={threeDaysAgo} />
      );

      expect(screen.getByText(/3 days ago/i)).toBeInTheDocument();
    });

    it("shows just now for very recent syncs", () => {
      const justNow = new Date("2024-01-15T11:59:30Z").toISOString();
      render(
        <SyncStatusIndicator syncStatus="synced" lastSyncedAt={justNow} />
      );

      expect(screen.getByText(/just now/i)).toBeInTheDocument();
    });

    it("ignores lastSyncedAt when status is not synced", () => {
      const fiveMinutesAgo = new Date("2024-01-15T11:55:00Z").toISOString();
      render(
        <SyncStatusIndicator syncStatus="pending" lastSyncedAt={fiveMinutesAgo} />
      );

      expect(screen.queryByText(/5 minutes ago/i)).not.toBeInTheDocument();
      expect(screen.getByText("Never Synced")).toBeInTheDocument();
    });
  });

  describe("Icon rendering", () => {
    it("renders icon for each sync status", () => {
      const syncStatuses: CampaignSetSyncStatus[] = [
        "pending",
        "syncing",
        "synced",
        "failed",
        "conflict",
      ];

      syncStatuses.forEach((syncStatus) => {
        const { container, unmount } = render(
          <SyncStatusIndicator syncStatus={syncStatus} />
        );
        expect(container.querySelector("svg")).toBeInTheDocument();
        unmount();
      });
    });

    it("applies spinner animation for syncing status", () => {
      const { container } = render(
        <SyncStatusIndicator syncStatus="syncing" />
      );

      const svg = container.querySelector("svg");
      expect(svg?.classList.toString()).toContain("spinner");
    });
  });

  describe("Accessibility", () => {
    it("has role=status for screen readers", () => {
      render(<SyncStatusIndicator syncStatus="synced" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("has appropriate aria-label for synced status with time", () => {
      const fiveMinutesAgo = new Date("2024-01-15T11:55:00Z").toISOString();
      render(
        <SyncStatusIndicator syncStatus="synced" lastSyncedAt={fiveMinutesAgo} />
      );

      const indicator = screen.getByRole("status");
      expect(indicator.getAttribute("aria-label")).toContain("Synced");
    });

    it("has appropriate aria-label for failed status", () => {
      render(<SyncStatusIndicator syncStatus="failed" />);

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("aria-label", "Sync Failed");
    });
  });

  describe("Compact mode", () => {
    it("hides text label when compact is true", () => {
      render(<SyncStatusIndicator syncStatus="synced" compact />);

      // Should only show icon, not text
      expect(screen.queryByText("Synced")).not.toBeInTheDocument();
    });

    it("shows icon even in compact mode", () => {
      const { container } = render(
        <SyncStatusIndicator syncStatus="synced" compact />
      );

      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("applies compact data attribute", () => {
      const { container } = render(
        <SyncStatusIndicator syncStatus="synced" compact />
      );

      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveAttribute("data-compact", "true");
    });
  });
});
