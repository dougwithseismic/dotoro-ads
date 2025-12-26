import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataSourcesTable } from "../DataSourcesTable";
import type { DataSource } from "../../types";

const createMockDataSources = (): DataSource[] => [
  {
    id: "1",
    name: "Products CSV",
    type: "csv",
    rowCount: 1500,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    status: "ready",
  },
  {
    id: "2",
    name: "API Feed",
    type: "api",
    rowCount: 500,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-18"),
    status: "processing",
    syncStatus: "syncing",
    lastSyncedAt: new Date("2024-01-17T10:30:00"),
    syncFrequency: "hourly",
  },
  {
    id: "3",
    name: "Error Source",
    type: "csv",
    rowCount: 0,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-05"),
    status: "error",
    errorMessage: "Invalid CSV format",
  },
];

const createMockDataSourcesWithSyncInfo = (): DataSource[] => [
  {
    id: "1",
    name: "Products CSV",
    type: "csv",
    rowCount: 1500,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    status: "ready",
    // CSV sources don't have sync info
  },
  {
    id: "2",
    name: "API Feed",
    type: "api",
    rowCount: 500,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-18"),
    status: "ready",
    syncStatus: "synced",
    lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    syncFrequency: "hourly",
  },
  {
    id: "3",
    name: "Google Sheet Data",
    type: "google-sheets",
    rowCount: 200,
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-19"),
    status: "ready",
    syncStatus: "error",
    lastSyncedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    syncFrequency: "daily",
  },
  {
    id: "4",
    name: "New API Source",
    type: "api",
    rowCount: 0,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
    status: "ready",
    syncStatus: "synced",
    // No lastSyncedAt - never synced
    syncFrequency: "manual",
  },
];

const createMockVirtualDataSource = (): DataSource => ({
  id: "4",
  name: "Products by Brand (Output)",
  type: "manual",
  rowCount: 43,
  createdAt: new Date("2024-01-22"),
  updatedAt: new Date("2024-01-22"),
  status: "ready",
  config: {
    isVirtual: true,
    transformName: "Products by Brand",
    sourceDataSourceId: "1",
  },
});

describe("DataSourcesTable", () => {
  let mockDataSources: DataSource[];

  beforeEach(() => {
    mockDataSources = createMockDataSources();
  });

  it("renders table with correct column headers", () => {
    render(
      <DataSourcesTable
        dataSources={mockDataSources}
        onRowClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Rows")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Last Updated")).toBeInTheDocument();
  });

  it("renders all data source rows", () => {
    render(
      <DataSourcesTable
        dataSources={mockDataSources}
        onRowClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Products CSV")).toBeInTheDocument();
    expect(screen.getByText("API Feed")).toBeInTheDocument();
    expect(screen.getByText("Error Source")).toBeInTheDocument();
  });

  it("displays row count formatted correctly", () => {
    render(
      <DataSourcesTable
        dataSources={mockDataSources}
        onRowClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
  });

  it("displays correct status for each data source", () => {
    render(
      <DataSourcesTable
        dataSources={mockDataSources}
        onRowClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("calls onRowClick with data source id when row is clicked", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();

    render(
      <DataSourcesTable
        dataSources={mockDataSources}
        onRowClick={onRowClick}
        onDelete={vi.fn()}
      />
    );

    const row = screen.getByText("Products CSV").closest("tr");
    await user.click(row!);

    expect(onRowClick).toHaveBeenCalledWith("1");
  });

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <DataSourcesTable
        dataSources={mockDataSources}
        onRowClick={vi.fn()}
        onDelete={onDelete}
      />
    );

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("prevents row click when delete button is clicked", async () => {
    const onRowClick = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <DataSourcesTable
        dataSources={mockDataSources}
        onRowClick={onRowClick}
        onDelete={onDelete}
      />
    );

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalled();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("displays empty state when no data sources", () => {
    render(
      <DataSourcesTable
        dataSources={[]}
        onRowClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/no data sources/i)).toBeInTheDocument();
  });

  it("formats dates correctly", () => {
    render(
      <DataSourcesTable
        dataSources={mockDataSources}
        onRowClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Check that dates are formatted (Jan 20, 2024 format)
    expect(screen.getByText("Jan 20, 2024")).toBeInTheDocument();
  });

  it("shows type badge for CSV and API sources", () => {
    render(
      <DataSourcesTable
        dataSources={mockDataSources}
        onRowClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // There are 2 CSV sources and 1 API source
    const csvBadges = screen.getAllByText("CSV");
    expect(csvBadges).toHaveLength(2);
    expect(screen.getByText("API")).toBeInTheDocument();
  });

  describe("Sorting", () => {
    it("renders sortable column headers for Name and Last Updated", () => {
      render(
        <DataSourcesTable
          dataSources={mockDataSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
          onSort={vi.fn()}
        />
      );

      const nameHeader = screen.getByRole("columnheader", { name: /name/i });
      const dateHeader = screen.getByRole("columnheader", { name: /last updated/i });

      expect(nameHeader).toHaveAttribute("aria-sort");
      expect(dateHeader).toHaveAttribute("aria-sort");
    });

    it("calls onSort with column name when sortable header is clicked", async () => {
      const onSort = vi.fn();
      const user = userEvent.setup();

      render(
        <DataSourcesTable
          dataSources={mockDataSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
          onSort={onSort}
        />
      );

      const nameHeader = screen.getByRole("columnheader", { name: /name/i });
      await user.click(nameHeader);

      expect(onSort).toHaveBeenCalledWith("name");
    });

    it("displays sort indicator on active sort column", () => {
      render(
        <DataSourcesTable
          dataSources={mockDataSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
          sortColumn="name"
          sortDirection="asc"
          onSort={vi.fn()}
        />
      );

      const nameHeader = screen.getByRole("columnheader", { name: /name/i });
      expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    });

    it("displays descending sort indicator", () => {
      render(
        <DataSourcesTable
          dataSources={mockDataSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
          sortColumn="updatedAt"
          sortDirection="desc"
          onSort={vi.fn()}
        />
      );

      const dateHeader = screen.getByRole("columnheader", { name: /last updated/i });
      expect(dateHeader).toHaveAttribute("aria-sort", "descending");
    });

    it("can sort by Last Updated column", async () => {
      const onSort = vi.fn();
      const user = userEvent.setup();

      render(
        <DataSourcesTable
          dataSources={mockDataSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
          onSort={onSort}
        />
      );

      const dateHeader = screen.getByRole("columnheader", { name: /last updated/i });
      await user.click(dateHeader);

      expect(onSort).toHaveBeenCalledWith("updatedAt");
    });

    it("non-sortable columns do not have sort attributes", () => {
      render(
        <DataSourcesTable
          dataSources={mockDataSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
          onSort={vi.fn()}
        />
      );

      const typeHeader = screen.getByRole("columnheader", { name: /^type$/i });
      expect(typeHeader).not.toHaveAttribute("aria-sort");
    });
  });

  describe("Virtual Data Sources", () => {
    it("displays Virtual badge for virtual data sources", () => {
      const virtualSource = createMockVirtualDataSource();
      render(
        <DataSourcesTable
          dataSources={[virtualSource]}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("Virtual")).toBeInTheDocument();
    });

    it("displays VIRTUAL type badge for virtual data sources", () => {
      const virtualSource = createMockVirtualDataSource();
      render(
        <DataSourcesTable
          dataSources={[virtualSource]}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("VIRTUAL")).toBeInTheDocument();
    });

    it("shows Transform button for non-virtual data sources", () => {
      render(
        <DataSourcesTable
          dataSources={mockDataSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const transformLinks = screen.getAllByRole("link", { name: /create transform/i });
      expect(transformLinks.length).toBe(3); // All 3 non-virtual sources
    });

    it("Transform link has correct href with source ID", () => {
      render(
        <DataSourcesTable
          dataSources={mockDataSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const transformLink = screen.getByRole("link", { name: /create transform from products csv/i });
      expect(transformLink).toHaveAttribute("href", "/transforms/builder?sourceId=1");
    });

    it("shows View Transform link for virtual data sources", () => {
      const virtualSource = createMockVirtualDataSource();
      render(
        <DataSourcesTable
          dataSources={[virtualSource]}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const viewTransformLink = screen.getByRole("link", { name: /view transform/i });
      expect(viewTransformLink).toHaveAttribute("href", "/transforms?outputId=4");
    });

    it("does not show Transform button for virtual data sources", () => {
      const virtualSource = createMockVirtualDataSource();
      render(
        <DataSourcesTable
          dataSources={[virtualSource]}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.queryByRole("link", { name: /create transform from/i })).not.toBeInTheDocument();
    });

    it("prevents row click when Transform link is clicked", async () => {
      const onRowClick = vi.fn();
      const user = userEvent.setup();

      render(
        <DataSourcesTable
          dataSources={mockDataSources}
          onRowClick={onRowClick}
          onDelete={vi.fn()}
        />
      );

      const transformLink = screen.getByRole("link", { name: /create transform from products csv/i });
      await user.click(transformLink);

      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  describe("Sync Status and Last Synced", () => {
    it("displays last synced relative time", () => {
      const mockSources = createMockDataSourcesWithSyncInfo();
      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // API Feed was synced 2 hours ago
      expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
    });

    it("displays sync status badge", () => {
      const mockSources = createMockDataSourcesWithSyncInfo();
      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // Should show synced badge for API Feed
      expect(screen.getAllByText(/synced/i).length).toBeGreaterThan(0);
    });

    it("displays sync frequency", () => {
      const mockSources = createMockDataSourcesWithSyncInfo();
      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText(/hourly/i)).toBeInTheDocument();
      expect(screen.getByText(/daily/i)).toBeInTheDocument();
    });

    it("shows Never for sources that have not synced", () => {
      const mockSources = createMockDataSourcesWithSyncInfo();
      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // New API Source has no lastSyncedAt
      expect(screen.getByText("Never")).toBeInTheDocument();
    });

    it("shows dash for CSV sources without sync frequency", () => {
      const mockSources = createMockDataSourcesWithSyncInfo();
      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // CSV sources should show -- for sync frequency
      const row = screen.getByText("Products CSV").closest("tr");
      // There are multiple -- in the row (last synced, sync status, sync freq)
      const dashes = within(row!).getAllByText("--");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it("renders Last Synced column header", () => {
      render(
        <DataSourcesTable
          dataSources={createMockDataSourcesWithSyncInfo()}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("Last Synced")).toBeInTheDocument();
    });

    it("renders Sync Status column header", () => {
      render(
        <DataSourcesTable
          dataSources={createMockDataSourcesWithSyncInfo()}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("Sync Status")).toBeInTheDocument();
    });

    it("renders Sync Freq column header", () => {
      render(
        <DataSourcesTable
          dataSources={createMockDataSourcesWithSyncInfo()}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("Sync Freq")).toBeInTheDocument();
    });

    it("shows syncing status badge with blue color class", () => {
      const mockSources: DataSource[] = [
        {
          id: "1",
          name: "Syncing Source",
          type: "api",
          rowCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "ready",
          syncStatus: "syncing",
          syncFrequency: "hourly",
        },
      ];

      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const syncingBadge = screen.getByText("Syncing");
      // CSS module classes are hashed, so we check for the presence of a class containing the name
      expect(syncingBadge.className).toMatch(/syncStatus-syncing/);
    });

    it("shows error status badge with red color class", () => {
      const mockSources = createMockDataSourcesWithSyncInfo();
      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // Google Sheet Data has sync error - find the sync status Error badge (not the regular status)
      // The row should have syncStatus: "error"
      const row = screen.getByText("Google Sheet Data").closest("tr");
      const errorBadges = within(row!).getAllByText("Error");
      // Find the one that's a sync status badge
      const syncErrorBadge = errorBadges.find((badge) =>
        badge.className.includes("syncStatusBadge") || badge.className.includes("syncStatus-error")
      );
      expect(syncErrorBadge).toBeTruthy();
    });
  });

  describe("Sync Button Integration", () => {
    it("renders sync button for API sources", () => {
      const mockSources = createMockDataSourcesWithSyncInfo();
      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
          onSync={vi.fn()}
        />
      );

      // Should have sync buttons for API and Google Sheets sources
      const syncButtons = screen.getAllByRole("button", { name: /sync/i });
      expect(syncButtons.length).toBeGreaterThan(0);
    });

    it("does not render sync button for CSV sources", () => {
      const mockSources: DataSource[] = [
        {
          id: "1",
          name: "CSV Only",
          type: "csv",
          rowCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "ready",
        },
      ];

      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
          onSync={vi.fn()}
        />
      );

      // Should not have sync button for CSV
      expect(screen.queryByRole("button", { name: /^sync$/i })).not.toBeInTheDocument();
    });

    it("calls onSync when sync button is clicked", async () => {
      const user = userEvent.setup();
      const onSync = vi.fn().mockResolvedValue(undefined);
      const mockSources: DataSource[] = [
        {
          id: "api-1",
          name: "API Source",
          type: "api",
          rowCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "ready",
          syncStatus: "synced",
          syncFrequency: "hourly",
        },
      ];

      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={vi.fn()}
          onDelete={vi.fn()}
          onSync={onSync}
        />
      );

      const syncButton = screen.getByRole("button", { name: /sync/i });
      await user.click(syncButton);

      expect(onSync).toHaveBeenCalledWith("api-1");
    });

    it("does not trigger row click when sync button is clicked", async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      const onSync = vi.fn().mockResolvedValue(undefined);
      const mockSources: DataSource[] = [
        {
          id: "api-1",
          name: "API Source",
          type: "api",
          rowCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "ready",
          syncStatus: "synced",
          syncFrequency: "hourly",
        },
      ];

      render(
        <DataSourcesTable
          dataSources={mockSources}
          onRowClick={onRowClick}
          onDelete={vi.fn()}
          onSync={onSync}
        />
      );

      const syncButton = screen.getByRole("button", { name: /sync/i });
      await user.click(syncButton);

      expect(onSync).toHaveBeenCalled();
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });
});
