import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDataSourceColumns } from "../useDataSourceColumns";

describe("useDataSourceColumns", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns empty columns when no data source id is provided", () => {
    const { result } = renderHook(() => useDataSourceColumns(undefined));

    expect(result.current.columns).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty columns when data source id is empty string", () => {
    const { result } = renderHook(() => useDataSourceColumns(""));

    expect(result.current.columns).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches columns from first data row when data source id is provided", async () => {
    const mockRowData = {
      data: [
        {
          id: "row-1",
          dataSourceId: "ds-123",
          rowData: {
            brand: "Nike",
            category: "Shoes",
            price: 99.99,
            sku: "ABC123",
          },
          rowIndex: 0,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      total: 100,
      page: 1,
      limit: 1,
      totalPages: 100,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRowData,
    });

    const { result } = renderHook(() => useDataSourceColumns("ds-123"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.columns).toEqual(["brand", "category", "price", "sku"]);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/data-sources/ds-123/rows?limit=1"),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("returns empty columns when no rows exist", async () => {
    const mockRowData = {
      data: [],
      total: 0,
      page: 1,
      limit: 1,
      totalPages: 0,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRowData,
    });

    const { result } = renderHook(() => useDataSourceColumns("ds-empty"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.columns).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("handles API error gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useDataSourceColumns("ds-error"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.columns).toEqual([]);
    expect(result.current.error).toBe("Failed to fetch data source columns");
  });

  it("handles network error gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useDataSourceColumns("ds-network-error"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.columns).toEqual([]);
    expect(result.current.error).toBe("Network error");
  });

  it("refetches when data source id changes", async () => {
    const mockRowData1 = {
      data: [
        {
          id: "row-1",
          dataSourceId: "ds-1",
          rowData: { field1: "a", field2: "b" },
          rowIndex: 0,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 1,
      totalPages: 1,
    };

    const mockRowData2 = {
      data: [
        {
          id: "row-2",
          dataSourceId: "ds-2",
          rowData: { columnA: "x", columnB: "y", columnC: "z" },
          rowIndex: 0,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 1,
      totalPages: 1,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRowData1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRowData2,
      });

    const { result, rerender } = renderHook(
      ({ id }) => useDataSourceColumns(id),
      { initialProps: { id: "ds-1" } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.columns).toEqual(["field1", "field2"]);

    rerender({ id: "ds-2" });

    await waitFor(() => {
      expect(result.current.columns).toEqual(["columnA", "columnB", "columnC"]);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("clears columns when data source id becomes undefined", async () => {
    const mockRowData = {
      data: [
        {
          id: "row-1",
          dataSourceId: "ds-1",
          rowData: { field1: "a" },
          rowIndex: 0,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 1,
      totalPages: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRowData,
    });

    const { result, rerender } = renderHook(
      ({ id }) => useDataSourceColumns(id),
      { initialProps: { id: "ds-1" as string | undefined } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.columns).toEqual(["field1"]);

    rerender({ id: undefined });

    expect(result.current.columns).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("aborts in-flight request when unmounted", async () => {
    let abortSignal: AbortSignal | undefined;

    mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
      abortSignal = options?.signal;
      return new Promise((resolve) => {
        // Never resolve - simulates a slow request
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              data: [{ id: "row-1", dataSourceId: "ds-1", rowData: { field1: "a" }, rowIndex: 0, createdAt: "" }],
              total: 1,
              page: 1,
              limit: 1,
              totalPages: 1,
            }),
          });
        }, 10000);
      });
    });

    const { unmount } = renderHook(() => useDataSourceColumns("ds-1"));

    // Wait for fetch to be called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Unmount the hook
    unmount();

    // Verify the abort signal was triggered
    expect(abortSignal?.aborted).toBe(true);
  });

  it("aborts previous request when dataSourceId changes", async () => {
    const abortSignals: AbortSignal[] = [];

    mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
      if (options?.signal) {
        abortSignals.push(options.signal);
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              data: [{ id: "row-1", dataSourceId: "ds-1", rowData: { field1: "a" }, rowIndex: 0, createdAt: "" }],
              total: 1,
              page: 1,
              limit: 1,
              totalPages: 1,
            }),
          });
        }, 100);
      });
    });

    const { rerender } = renderHook(
      ({ id }) => useDataSourceColumns(id),
      { initialProps: { id: "ds-1" } }
    );

    // Wait for first fetch to be called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Change the dataSourceId before first request completes
    rerender({ id: "ds-2" });

    // Wait for second fetch to be called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // First request should have been aborted
    expect(abortSignals[0]?.aborted).toBe(true);
    // Second request should still be active
    expect(abortSignals[1]?.aborted).toBe(false);
  });

  it("does not update state after abort", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
      return new Promise((resolve, reject) => {
        const signal = options?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            const abortError = new Error("Aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        }
        // Slow response that will be aborted
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              data: [{ id: "row-1", dataSourceId: "ds-abort", rowData: { shouldNotAppear: "value" }, rowIndex: 0, createdAt: "" }],
              total: 1,
              page: 1,
              limit: 1,
              totalPages: 1,
            }),
          });
        }, 5000);
      });
    });

    const { result, unmount } = renderHook(() => useDataSourceColumns("ds-abort"));

    // Wait for fetch to be called and loading to be true
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Unmount immediately (which should abort)
    unmount();

    // Give time for any erroneous state updates
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should not have any errors about updating unmounted component
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
