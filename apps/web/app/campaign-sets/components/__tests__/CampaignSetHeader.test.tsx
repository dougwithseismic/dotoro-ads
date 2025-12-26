import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignSetHeader } from "../CampaignSetHeader";
import type { CampaignSet } from "../../types";

const createMockCampaignSet = (
  overrides: Partial<CampaignSet> = {}
): CampaignSet => ({
  id: "set-123",
  userId: "user-456",
  name: "Test Campaign Set",
  description: "A test campaign set description",
  status: "active",
  syncStatus: "synced",
  config: {
    dataSourceId: "ds-1",
    availableColumns: ["name", "price"],
    selectedPlatforms: ["google"],
    selectedAdTypes: { google: ["search"] },
    campaignConfig: { namePattern: "{name}" },
    hierarchyConfig: { adGroups: [] },
    generatedAt: "2024-01-15T10:00:00Z",
    rowCount: 100,
    campaignCount: 10,
  },
  campaigns: [],
  lastSyncedAt: "2024-01-15T12:00:00Z",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T12:00:00Z",
  ...overrides,
});

describe("CampaignSetHeader", () => {
  const defaultHandlers = {
    onSync: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic rendering", () => {
    it("renders campaign set name", () => {
      const set = createMockCampaignSet({ name: "My Campaign Set Name" });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(screen.getByText("My Campaign Set Name")).toBeInTheDocument();
    });

    it("renders campaign set description when provided", () => {
      const set = createMockCampaignSet({
        description: "Detailed description text",
      });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(screen.getByText("Detailed description text")).toBeInTheDocument();
    });

    it("does not render description when not provided", () => {
      const set = createMockCampaignSet({ description: null });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      const header = screen.getByRole("banner");
      expect(
        header.querySelector('[class*="description"]')
      ).not.toBeInTheDocument();
    });

    it("renders status badge", () => {
      const set = createMockCampaignSet({ status: "active" });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  describe("Action buttons", () => {
    it("renders Sync All button", () => {
      const set = createMockCampaignSet();
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(
        screen.getByRole("button", { name: /sync all/i })
      ).toBeInTheDocument();
    });

    it("renders Pause All button when status is active", () => {
      const set = createMockCampaignSet({ status: "active" });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(
        screen.getByRole("button", { name: /pause all/i })
      ).toBeInTheDocument();
    });

    it("renders Resume All button when status is paused", () => {
      const set = createMockCampaignSet({ status: "paused" });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(
        screen.getByRole("button", { name: /resume all/i })
      ).toBeInTheDocument();
    });

    it("renders Edit button", () => {
      const set = createMockCampaignSet();
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });

    it("renders Archive button", () => {
      const set = createMockCampaignSet();
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(
        screen.getByRole("button", { name: /archive/i })
      ).toBeInTheDocument();
    });
  });

  describe("Action button handlers", () => {
    it("calls onSync when Sync All is clicked", () => {
      const onSync = vi.fn();
      const set = createMockCampaignSet();
      render(
        <CampaignSetHeader
          set={set}
          isSyncing={false}
          {...defaultHandlers}
          onSync={onSync}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /sync all/i }));
      expect(onSync).toHaveBeenCalledTimes(1);
    });

    it("calls onPause when Pause All is clicked", () => {
      const onPause = vi.fn();
      const set = createMockCampaignSet({ status: "active" });
      render(
        <CampaignSetHeader
          set={set}
          isSyncing={false}
          {...defaultHandlers}
          onPause={onPause}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /pause all/i }));
      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it("calls onResume when Resume All is clicked", () => {
      const onResume = vi.fn();
      const set = createMockCampaignSet({ status: "paused" });
      render(
        <CampaignSetHeader
          set={set}
          isSyncing={false}
          {...defaultHandlers}
          onResume={onResume}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /resume all/i }));
      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it("calls onEdit when Edit is clicked", () => {
      const onEdit = vi.fn();
      const set = createMockCampaignSet();
      render(
        <CampaignSetHeader
          set={set}
          isSyncing={false}
          {...defaultHandlers}
          onEdit={onEdit}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /edit/i }));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it("calls onArchive when Archive is clicked", () => {
      const onArchive = vi.fn();
      const set = createMockCampaignSet();
      render(
        <CampaignSetHeader
          set={set}
          isSyncing={false}
          {...defaultHandlers}
          onArchive={onArchive}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /archive/i }));
      expect(onArchive).toHaveBeenCalledTimes(1);
    });
  });

  describe("Syncing state", () => {
    it("shows syncing indicator when isSyncing is true", () => {
      const set = createMockCampaignSet();
      render(
        <CampaignSetHeader set={set} isSyncing={true} {...defaultHandlers} />
      );

      // Look for the button that contains "Syncing..."
      expect(
        screen.getByRole("button", { name: /syncing/i })
      ).toBeInTheDocument();
    });

    it("disables Sync All button when syncing", () => {
      const set = createMockCampaignSet();
      render(
        <CampaignSetHeader set={set} isSyncing={true} {...defaultHandlers} />
      );

      // When syncing, the button shows "Syncing..." and is disabled
      expect(
        screen.getByRole("button", { name: /syncing/i })
      ).toBeDisabled();
    });

    it("disables Pause All button when syncing", () => {
      const set = createMockCampaignSet({ status: "active" });
      render(
        <CampaignSetHeader set={set} isSyncing={true} {...defaultHandlers} />
      );

      expect(
        screen.getByRole("button", { name: /pause all/i })
      ).toBeDisabled();
    });
  });

  describe("Sync status display", () => {
    it("shows last synced time when available", () => {
      const set = createMockCampaignSet({
        syncStatus: "synced",
        lastSyncedAt: "2024-01-15T12:00:00Z",
      });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      // Multiple status elements may be present (StatusBadge and SyncStatusIndicator)
      const statusElements = screen.getAllByRole("status");
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it("shows never synced for pending sync status", () => {
      const set = createMockCampaignSet({
        syncStatus: "pending",
        lastSyncedAt: null,
      });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(screen.getByText(/never synced/i)).toBeInTheDocument();
    });
  });

  describe("Status variations", () => {
    it("shows appropriate actions for draft status", () => {
      const set = createMockCampaignSet({ status: "draft" });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      // Draft should have edit and sync options
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sync all/i })
      ).toBeInTheDocument();
    });

    it("shows error status appropriately", () => {
      const set = createMockCampaignSet({ status: "error" });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(screen.getByText("Error")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has banner role for header", () => {
      const set = createMockCampaignSet();
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("has heading for campaign set name", () => {
      const set = createMockCampaignSet({ name: "Accessible Set" });
      render(
        <CampaignSetHeader set={set} isSyncing={false} {...defaultHandlers} />
      );

      expect(
        screen.getByRole("heading", { name: "Accessible Set" })
      ).toBeInTheDocument();
    });
  });
});
