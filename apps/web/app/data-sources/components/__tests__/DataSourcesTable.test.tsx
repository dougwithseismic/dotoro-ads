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
});
