import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataPreviewEnhanced } from "../DataPreviewEnhanced";
import type { DataSourceRow, ColumnMapping } from "../../types";

const createMockData = (count: number = 10): DataSourceRow[] =>
  Array.from({ length: count }, (_, i) => ({
    product_name: `Product ${i + 1}`,
    price: String((Math.random() * 100).toFixed(2)),
    category: ["Electronics", "Clothing", "Home", "Sports"][i % 4],
    description: `Description for product ${i + 1}`,
  }));

const mockColumns = ["product_name", "price", "category", "description"];

const mockMappings: ColumnMapping[] = [
  { sourceColumn: "product_name", normalizedName: "name", dataType: "string" },
  { sourceColumn: "price", normalizedName: "price", dataType: "currency" },
  { sourceColumn: "category", normalizedName: "category", dataType: "string" },
  { sourceColumn: "description", normalizedName: "description", dataType: "string" },
];

// Mock ResizeObserver for this test file
beforeEach(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("DataPreviewEnhanced", () => {
  describe("Table rendering", () => {
    it("renders a data table with columns", () => {
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(5)}
          columnMappings={mockMappings}
        />
      );

      // Check that table and column headers are present
      const tables = screen.getAllByRole("table");
      expect(tables.length).toBeGreaterThan(0);
      expect(screen.getByText("product_name")).toBeInTheDocument();
      expect(screen.getAllByText("price").length).toBeGreaterThan(0);
      expect(screen.getAllByText("category").length).toBeGreaterThan(0);
    });

    it("displays data rows in the table", () => {
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(3)}
          columnMappings={mockMappings}
        />
      );

      expect(screen.getByText("Product 1")).toBeInTheDocument();
      expect(screen.getByText("Product 2")).toBeInTheDocument();
      expect(screen.getByText("Product 3")).toBeInTheDocument();
    });

    it("shows column data type badges in headers", () => {
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(3)}
          columnMappings={mockMappings}
        />
      );

      // Price column should show currency type badge
      expect(screen.getByText("Currency")).toBeInTheDocument();

      // Product name should show string type
      const stringBadges = screen.getAllByText("String");
      expect(stringBadges.length).toBeGreaterThan(0);
    });

    it("shows row count", () => {
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(50)}
          columnMappings={mockMappings}
        />
      );

      expect(screen.getByText(/50 rows/i)).toBeInTheDocument();
    });

    it("shows empty state when no data", () => {
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={[]}
          columnMappings={mockMappings}
        />
      );

      expect(screen.getByText(/no data to preview/i)).toBeInTheDocument();
    });
  });

  describe("Search functionality", () => {
    it("renders a search input", () => {
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(10)}
          columnMappings={mockMappings}
        />
      );

      expect(screen.getByRole("searchbox", { name: /search/i })).toBeInTheDocument();
    });

    it("filters data when search term is entered", async () => {
      const user = userEvent.setup();
      const data = [
        { product_name: "Widget A", price: "29.99", category: "Electronics", description: "A great widget" },
        { product_name: "Gadget B", price: "49.99", category: "Electronics", description: "An awesome gadget" },
        { product_name: "Tool C", price: "19.99", category: "Tools", description: "Essential tool" },
      ];

      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={data}
          columnMappings={mockMappings}
        />
      );

      const searchInput = screen.getByRole("searchbox", { name: /search/i });
      await user.type(searchInput, "Gadget");

      await waitFor(() => {
        expect(screen.getByText("Gadget B")).toBeInTheDocument();
        expect(screen.queryByText("Widget A")).not.toBeInTheDocument();
        expect(screen.queryByText("Tool C")).not.toBeInTheDocument();
      });
    });

    it("searches across all columns", async () => {
      const user = userEvent.setup();
      const data = [
        { product_name: "Widget A", price: "29.99", category: "Electronics", description: "A great widget" },
        { product_name: "Gadget B", price: "49.99", category: "Electronics", description: "An awesome gadget" },
        { product_name: "Tool C", price: "19.99", category: "Tools", description: "Essential tool" },
      ];

      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={data}
          columnMappings={mockMappings}
        />
      );

      const searchInput = screen.getByRole("searchbox", { name: /search/i });
      await user.type(searchInput, "Tools");

      await waitFor(() => {
        expect(screen.getByText("Tool C")).toBeInTheDocument();
        expect(screen.queryByText("Widget A")).not.toBeInTheDocument();
      });
    });

    it("shows clear search button when search term exists", async () => {
      const user = userEvent.setup();
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(10)}
          columnMappings={mockMappings}
        />
      );

      const searchInput = screen.getByRole("searchbox", { name: /search/i });
      await user.type(searchInput, "test");

      expect(screen.getByRole("button", { name: /clear search/i })).toBeInTheDocument();
    });

    it("clears search when clear button is clicked", async () => {
      const user = userEvent.setup();
      const data = [
        { product_name: "Widget A", price: "29.99", category: "Electronics", description: "A great widget" },
        { product_name: "Gadget B", price: "49.99", category: "Electronics", description: "An awesome gadget" },
      ];

      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={data}
          columnMappings={mockMappings}
        />
      );

      const searchInput = screen.getByRole("searchbox", { name: /search/i });
      await user.type(searchInput, "Gadget");

      await waitFor(() => {
        expect(screen.queryByText("Widget A")).not.toBeInTheDocument();
      });

      const clearButton = screen.getByRole("button", { name: /clear search/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText("Widget A")).toBeInTheDocument();
        expect(screen.getByText("Gadget B")).toBeInTheDocument();
      });
    });

    it("shows filtered count when search is active", async () => {
      const user = userEvent.setup();
      const data = createMockData(10);

      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={data}
          columnMappings={mockMappings}
        />
      );

      const searchInput = screen.getByRole("searchbox", { name: /search/i });
      await user.type(searchInput, "Product 1");

      await waitFor(() => {
        // Should show "2 of 10 rows" (Product 1 and Product 10)
        expect(screen.getByText(/of 10 rows/i)).toBeInTheDocument();
      });
    });
  });

  describe("Row highlighting", () => {
    it("highlights specified row when highlightRow prop is set", () => {
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(10)}
          columnMappings={mockMappings}
          highlightRow={3}
        />
      );

      // Should show highlight indicator
      expect(screen.getByText(/showing row 3/i)).toBeInTheDocument();
    });

    it("calls onClearHighlight when clear highlight button is clicked", async () => {
      const user = userEvent.setup();
      const onClearHighlight = vi.fn();

      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(10)}
          columnMappings={mockMappings}
          highlightRow={3}
          onClearHighlight={onClearHighlight}
        />
      );

      const clearButton = screen.getByRole("button", { name: /clear highlight/i });
      await user.click(clearButton);

      expect(onClearHighlight).toHaveBeenCalled();
    });

    it("shows highlight indicator when row is highlighted", () => {
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(10)}
          columnMappings={mockMappings}
          highlightRow={5}
        />
      );

      expect(screen.getByText(/showing row 5/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has accessible table structure", () => {
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(5)}
          columnMappings={mockMappings}
        />
      );

      // Multiple tables: one for header, one for virtual scroll body
      const tables = screen.getAllByRole("table");
      expect(tables.length).toBeGreaterThan(0);
    });

    it("search input has accessible label", () => {
      render(
        <DataPreviewEnhanced
          columns={mockColumns}
          data={createMockData(5)}
          columnMappings={mockMappings}
        />
      );

      const searchInput = screen.getByRole("searchbox");
      expect(searchInput).toHaveAccessibleName();
    });
  });
});
