import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DataSourceSelector } from "../DataSourceSelector";
import type { DataSource } from "../../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockDataSources: DataSource[] = [
  {
    id: "ds1",
    name: "Products Q4",
    type: "csv",
    rowCount: 1500,
    createdAt: "2024-01-01",
  },
  {
    id: "ds2",
    name: "By Brand",
    type: "transform",
    rowCount: 45,
    createdAt: "2024-01-02",
  },
  {
    id: "ds3",
    name: "External API",
    type: "api",
    rowCount: 3200,
    createdAt: "2024-01-03",
  },
  {
    id: "ds4",
    name: "Unknown Source",
    type: "csv",
    // No rowCount to test undefined case
    createdAt: "2024-01-04",
  },
];

describe("DataSourceSelector", () => {
  let onSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockReset();
    onSelect = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton initially", () => {
    // Mock fetch that never resolves
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<DataSourceSelector selectedId={null} onSelect={onSelect} />);

    expect(screen.getByTestId("datasource-loading")).toBeInTheDocument();
    // Should show 3 skeleton cards
    const skeletonCards = screen.getByTestId("datasource-loading").children;
    expect(skeletonCards.length).toBe(3);
  });

  it("renders data sources after fetch", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockDataSources }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<DataSourceSelector selectedId={null} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    expect(screen.getByText("Products Q4")).toBeInTheDocument();
    expect(screen.getByText("By Brand")).toBeInTheDocument();
    expect(screen.getByText("External API")).toBeInTheDocument();
  });

  it("displays type badges correctly", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockDataSources }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<DataSourceSelector selectedId={null} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    // Check type badges are present (csv appears twice)
    const csvBadges = screen.getAllByText("csv");
    expect(csvBadges.length).toBe(2);
    expect(screen.getByText("transform")).toBeInTheDocument();
    expect(screen.getByText("api")).toBeInTheDocument();
  });

  it("displays row counts correctly", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockDataSources }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<DataSourceSelector selectedId={null} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    // Products Q4: 1500 rows -> "1.5k rows"
    expect(screen.getByText("1.5k rows")).toBeInTheDocument();
    // By Brand: 45 rows
    expect(screen.getByText("45 rows")).toBeInTheDocument();
    // External API: 3200 rows -> "3.2k rows"
    expect(screen.getByText("3.2k rows")).toBeInTheDocument();
    // Unknown Source: undefined rowCount
    expect(screen.getByText("Unknown rows")).toBeInTheDocument();
  });

  it("formats single row correctly", async () => {
    const singleRowDataSource: DataSource[] = [
      {
        id: "ds-single",
        name: "Single Row",
        type: "csv",
        rowCount: 1,
        createdAt: "2024-01-01",
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: singleRowDataSource }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<DataSourceSelector selectedId={null} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    expect(screen.getByText("1 row")).toBeInTheDocument();
  });

  it("highlights selected data source", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockDataSources }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<DataSourceSelector selectedId="ds1" onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    const selectedCard = screen.getByTestId("datasource-card-ds1");
    expect(selectedCard).toHaveAttribute("aria-selected", "true");

    const unselectedCard = screen.getByTestId("datasource-card-ds2");
    expect(unselectedCard).toHaveAttribute("aria-selected", "false");
  });

  it("clicking data source calls onSelect", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockDataSources }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<DataSourceSelector selectedId={null} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("datasource-card-ds2"));
    expect(onSelect).toHaveBeenCalledWith("ds2");
  });

  it("shows empty state when no data sources", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<DataSourceSelector selectedId={null} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("datasource-empty")).toBeInTheDocument();
    });

    expect(screen.getByText(/no data sources found/i)).toBeInTheDocument();
    expect(screen.getByText(/upload a data source/i)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/data-sources");
  });

  it("shows error state with retry on fetch failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<DataSourceSelector selectedId={null} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("datasource-error")).toBeInTheDocument();
    });

    expect(screen.getByText(/api request failed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("retry button refetches data", async () => {
    // First call fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<DataSourceSelector selectedId={null} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("datasource-error")).toBeInTheDocument();
    });

    // Setup success response for retry
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockDataSources }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByTestId("datasource-list")).toBeInTheDocument();
    });

    expect(screen.getByText("Products Q4")).toBeInTheDocument();
  });
});
