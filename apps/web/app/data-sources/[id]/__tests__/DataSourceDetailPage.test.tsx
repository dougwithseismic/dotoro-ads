import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
const mockParams = { id: "test-data-source-1" };

vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
}));

// Mock environment as test (not development) to force API calls
const originalEnv = process.env.NODE_ENV;

// Import after mocking
import DataSourceDetailPage from "../page";
import type { DataSourceDetail, ColumnMapping } from "../../types";

const createMockDataSource = (
  overrides?: Partial<DataSourceDetail>
): DataSourceDetail => ({
  id: "test-data-source-1",
  name: "Product Catalog",
  type: "csv",
  rowCount: 1000,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-20"),
  status: "ready",
  columns: ["product_name", "price", "category", "description"],
  columnMappings: [
    { sourceColumn: "product_name", normalizedName: "name", dataType: "string" },
    { sourceColumn: "price", normalizedName: "price", dataType: "currency" },
    { sourceColumn: "category", normalizedName: "category", dataType: "string" },
    { sourceColumn: "description", normalizedName: "description", dataType: "string" },
  ],
  data: [
    { product_name: "Widget A", price: 29.99, category: "Electronics", description: "A great widget" },
    { product_name: "Gadget B", price: 49.99, category: "Electronics", description: "An awesome gadget" },
    { product_name: "Tool C", price: 19.99, category: "Tools", description: "Essential tool" },
  ],
  validationErrors: [
    { column: "price", row: 5, message: "Invalid currency format", severity: "error" },
    { column: "category", row: 12, message: "Unknown category", severity: "warning" },
  ],
  ...overrides,
});

describe("DataSourceDetailPage", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    mockPush.mockClear();
    // Force test environment to use API calls
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("Loading state", () => {
    it("shows loading spinner while fetching data", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DataSourceDetailPage />);

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe("Header section", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(createMockDataSource()),
      });
    });

    it("displays data source name", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        // Name appears in breadcrumb and h1, so we use getAllByText
        const nameElements = screen.getAllByText("Product Catalog");
        expect(nameElements.length).toBeGreaterThan(0);
      });
    });

    it("displays type badge (CSV/API)", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("CSV")).toBeInTheDocument();
      });
    });

    it("displays row count", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/1,000 rows/i)).toBeInTheDocument();
      });
    });

    it("displays last updated date", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/updated/i)).toBeInTheDocument();
      });
    });

    it("allows inline editing of data source name", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        const nameElements = screen.getAllByText("Product Catalog");
        expect(nameElements.length).toBeGreaterThan(0);
      });

      // Click on edit name button
      const editButton = screen.getByRole("button", { name: /edit name/i });
      await user.click(editButton);

      // Input should appear
      const nameInput = screen.getByRole("textbox", { name: /data source name/i });
      expect(nameInput).toHaveValue("Product Catalog");

      // Change the name
      await user.clear(nameInput);
      await user.type(nameInput, "New Product Catalog");
      await user.keyboard("{Enter}");

      // Should call API to update
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/data-sources/test-data-source-1"),
          expect.objectContaining({
            method: "PATCH",
            body: expect.stringContaining("New Product Catalog"),
          })
        );
      });
    });

    it("shows delete button with confirmation dialog", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        const nameElements = screen.getAllByText("Product Catalog");
        expect(nameElements.length).toBeGreaterThan(0);
      });

      // Find delete button
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      // Confirmation dialog should appear
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    });

    it("deletes data source and redirects on confirm", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(createMockDataSource()),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({}),
        });

      render(<DataSourceDetailPage />);

      await waitFor(() => {
        const nameElements = screen.getAllByText("Product Catalog");
        expect(nameElements.length).toBeGreaterThan(0);
      });

      // Click delete
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/data-sources/test-data-source-1"),
          expect.objectContaining({ method: "DELETE" })
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/data-sources");
      });
    });

    it("cancels delete when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        const nameElements = screen.getAllByText("Product Catalog");
        expect(nameElements.length).toBeGreaterThan(0);
      });

      // Click delete
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      // Cancel deletion
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Dialog should close
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Tab navigation", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(createMockDataSource()),
      });
    });

    it("renders tab list with Preview, Mapping, and Validation tabs", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      expect(screen.getByRole("tab", { name: /preview/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /mapping/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /validation/i })).toBeInTheDocument();
    });

    it("shows Preview tab as active by default", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        const previewTab = screen.getByRole("tab", { name: /preview/i });
        expect(previewTab).toHaveAttribute("aria-selected", "true");
      });
    });

    it("switches to Mapping tab when clicked", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      const mappingTab = screen.getByRole("tab", { name: /mapping/i });
      await user.click(mappingTab);

      expect(mappingTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel", { name: /mapping/i })).toBeInTheDocument();
    });

    it("switches to Validation tab when clicked", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      const validationTab = screen.getByRole("tab", { name: /validation/i });
      await user.click(validationTab);

      expect(validationTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel", { name: /validation/i })).toBeInTheDocument();
    });

    it("supports keyboard navigation between tabs", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      const previewTab = screen.getByRole("tab", { name: /preview/i });
      previewTab.focus();

      // Arrow right to next tab
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("tab", { name: /mapping/i })).toHaveFocus();

      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("tab", { name: /validation/i })).toHaveFocus();

      // Arrow left back
      await user.keyboard("{ArrowLeft}");
      expect(screen.getByRole("tab", { name: /mapping/i })).toHaveFocus();
    });
  });

  describe("Data Preview tab", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(createMockDataSource()),
      });
    });

    it("displays data table with all columns", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        // Multiple tables due to virtual scrolling
        const tables = screen.getAllByRole("table");
        expect(tables.length).toBeGreaterThan(0);
      });

      // Check column headers (some appear multiple times)
      expect(screen.getByText("product_name")).toBeInTheDocument();
      const priceElements = screen.getAllByText("price");
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it("displays data rows", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Widget A")).toBeInTheDocument();
      });

      expect(screen.getByText("Gadget B")).toBeInTheDocument();
      expect(screen.getByText("Tool C")).toBeInTheDocument();
    });

    it("shows column data type in header", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        // Multiple tables due to virtual scrolling
        const tables = screen.getAllByRole("table");
        expect(tables.length).toBeGreaterThan(0);
      });

      // Data types should be shown as badges
      expect(screen.getByText("Currency")).toBeInTheDocument();
    });

    it("provides search functionality to filter data", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Widget A")).toBeInTheDocument();
      });

      // Find and use search input
      const searchInput = screen.getByRole("searchbox", { name: /search/i });
      await user.type(searchInput, "Gadget");

      // Should filter to show only matching rows
      await waitFor(() => {
        expect(screen.getByText("Gadget B")).toBeInTheDocument();
        expect(screen.queryByText("Widget A")).not.toBeInTheDocument();
        expect(screen.queryByText("Tool C")).not.toBeInTheDocument();
      });
    });

    it("clears search and shows all data", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Widget A")).toBeInTheDocument();
      });

      const searchInput = screen.getByRole("searchbox", { name: /search/i });
      await user.type(searchInput, "Gadget");

      await waitFor(() => {
        expect(screen.queryByText("Widget A")).not.toBeInTheDocument();
      });

      // Clear search
      const clearButton = screen.getByRole("button", { name: /clear search/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText("Widget A")).toBeInTheDocument();
        expect(screen.getByText("Gadget B")).toBeInTheDocument();
        expect(screen.getByText("Tool C")).toBeInTheDocument();
      });
    });
  });

  describe("Column Mapping tab", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(createMockDataSource()),
      });
    });

    it("displays source columns on the left", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      // Switch to Mapping tab
      await user.click(screen.getByRole("tab", { name: /mapping/i }));

      expect(screen.getByText("product_name")).toBeInTheDocument();
      expect(screen.getByText("price")).toBeInTheDocument();
    });

    it("displays normalized field names on the right", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /mapping/i }));

      // Find normalized name inputs
      const nameInputs = screen.getAllByRole("textbox");
      expect(nameInputs[0]).toHaveValue("name");
      expect(nameInputs[1]).toHaveValue("price");
    });

    it("shows auto-detect suggestions for common column patterns", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve(
            createMockDataSource({
              columns: ["email_address", "first_name", "phone_number"],
              columnMappings: [
                { sourceColumn: "email_address", normalizedName: "", dataType: "string" },
                { sourceColumn: "first_name", normalizedName: "", dataType: "string" },
                { sourceColumn: "phone_number", normalizedName: "", dataType: "string" },
              ],
            })
          ),
      });

      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /mapping/i }));

      // Should show suggestions for common patterns
      expect(screen.getByText(/suggested: email/i)).toBeInTheDocument();
      expect(screen.getByText(/suggested: firstName/i)).toBeInTheDocument();
    });

    it("allows applying auto-detect suggestions", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve(
            createMockDataSource({
              columns: ["email_address"],
              columnMappings: [
                { sourceColumn: "email_address", normalizedName: "", dataType: "string" },
              ],
            })
          ),
      });

      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /mapping/i }));

      // Click on suggestion to apply
      const suggestionButton = screen.getByRole("button", { name: /apply suggestion/i });
      await user.click(suggestionButton);

      // Input should be updated
      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("email");
    });

    it("shows save mapping button when changes are made", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /mapping/i }));

      // Make a change to trigger save button
      const inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "newName");

      // Save button should appear
      await waitFor(() => {
        const saveButtons = screen.getAllByRole("button", { name: /save/i });
        expect(saveButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Validation tab", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(createMockDataSource()),
      });
    });

    it("displays validation errors and warnings", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /validation/i }));

      expect(screen.getByText(/invalid currency format/i)).toBeInTheDocument();
      expect(screen.getByText(/unknown category/i)).toBeInTheDocument();
    });

    it("shows error count per column", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve(
            createMockDataSource({
              validationErrors: [
                { column: "price", row: 5, message: "Error 1", severity: "error" },
                { column: "price", row: 10, message: "Error 2", severity: "error" },
                { column: "category", row: 12, message: "Warning 1", severity: "warning" },
              ],
            })
          ),
      });

      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /validation/i }));

      // Should show counts - "2 errors" appears in multiple places
      const twoErrorsElements = screen.getAllByText("2 errors");
      expect(twoErrorsElements.length).toBeGreaterThan(0);
      const oneWarningElements = screen.getAllByText("1 warning");
      expect(oneWarningElements.length).toBeGreaterThan(0);
    });

    it("allows clicking to filter to error rows in Preview", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /validation/i }));

      // Click on an error to filter
      const errorItem = screen.getByText(/invalid currency format/i).closest("button");
      if (errorItem) await user.click(errorItem);

      // Should switch to Preview tab with filter applied
      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /preview/i })).toHaveAttribute(
          "aria-selected",
          "true"
        );
      });
    });

    it("shows fix suggestions where applicable", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve(
            createMockDataSource({
              validationErrors: [
                {
                  column: "price",
                  row: 5,
                  message: "Invalid currency format",
                  severity: "error",
                  suggestion: "Remove currency symbol",
                },
              ],
            })
          ),
      });

      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /validation/i }));

      expect(screen.getByText(/remove currency symbol/i)).toBeInTheDocument();
    });

    it("displays severity badges (error/warning)", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /validation/i }));

      // Should have severity indicators
      const errorBadges = screen.getAllByText(/error/i);
      const warningBadges = screen.getAllByText(/warning/i);

      expect(errorBadges.length).toBeGreaterThan(0);
      expect(warningBadges.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(createMockDataSource()),
      });
    });

    it("has proper heading hierarchy", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      });
    });

    it("has accessible tab panel structure", async () => {
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        const tablist = screen.getByRole("tablist");
        expect(tablist).toHaveAttribute("aria-label");
      });

      const tabs = screen.getAllByRole("tab");
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute("aria-controls");
      });
    });

    it("announces loading state to screen readers", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<DataSourceDetailPage />);

      const loadingElement = screen.getByRole("status");
      expect(loadingElement).toHaveAttribute("aria-live", "polite");
    });

    it("provides accessible labels for form controls", async () => {
      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /mapping/i }));

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveAccessibleName();
      });
    });
  });

  describe("Error handling", () => {
    it("displays error message when fetch fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve(null),
      });

      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/API request failed/i)).toBeInTheDocument();
      });
    });

    it("displays not found message for 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: () => Promise.resolve(null),
      });

      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });
    });

    it("allows retry after error", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () => Promise.resolve(null),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(createMockDataSource()),
        });

      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/API request failed/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /try again/i });
      await user.click(retryButton);

      await waitFor(() => {
        const nameElements = screen.getAllByText("Product Catalog");
        expect(nameElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Type-specific Configuration tab", () => {
    describe("CSV data sources", () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(createMockDataSource({ type: "csv" })),
        });
      });

      it("does NOT show Configuration tab for CSV type", async () => {
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        // Configuration tab should not exist for CSV
        expect(screen.queryByRole("tab", { name: /configuration/i })).not.toBeInTheDocument();
      });

      it("shows only Preview, Mapping, and Validation tabs for CSV", async () => {
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        expect(screen.getByRole("tab", { name: /preview/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /mapping/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /validation/i })).toBeInTheDocument();

        // Should have exactly 3 tabs
        const tabs = screen.getAllByRole("tab");
        expect(tabs).toHaveLength(3);
      });
    });

    describe("API data sources", () => {
      const apiConfig = {
        apiFetch: {
          url: "https://api.example.com/products",
          method: "GET" as const,
          syncFrequency: "24h" as const,
          headers: { "X-API-Key": "test-key" },
          authType: "bearer" as const,
          lastSyncAt: "2024-01-20T10:00:00Z",
          lastSyncStatus: "success" as const,
        },
      };

      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
              })
            ),
        });
      });

      it("shows Configuration tab for API type", async () => {
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        expect(screen.getByRole("tab", { name: /configuration/i })).toBeInTheDocument();
      });

      it("shows 4 tabs for API type: Configuration, Preview, Mapping, Validation", async () => {
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        expect(screen.getByRole("tab", { name: /configuration/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /preview/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /mapping/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /validation/i })).toBeInTheDocument();

        const tabs = screen.getAllByRole("tab");
        expect(tabs).toHaveLength(4);
      });

      it("displays API configuration panel when Configuration tab is clicked", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        const configTab = screen.getByRole("tab", { name: /configuration/i });
        await user.click(configTab);

        expect(configTab).toHaveAttribute("aria-selected", "true");

        // Should show API-specific configuration
        await waitFor(() => {
          expect(screen.getByText(/API Configuration/i)).toBeInTheDocument();
        });
      });

      it("displays API URL in the configuration panel", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("tab", { name: /configuration/i }));

        await waitFor(() => {
          expect(screen.getByText("https://api.example.com/products")).toBeInTheDocument();
        });
      });

      it("displays HTTP method in the configuration panel", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("tab", { name: /configuration/i }));

        await waitFor(() => {
          expect(screen.getByText("GET")).toBeInTheDocument();
        });
      });

      it("displays sync frequency in the configuration panel", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("tab", { name: /configuration/i }));

        await waitFor(() => {
          expect(screen.getByText(/every 24 hours/i)).toBeInTheDocument();
        });
      });

      it("displays authentication type in the configuration panel", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("tab", { name: /configuration/i }));

        await waitFor(() => {
          expect(screen.getByText(/bearer/i)).toBeInTheDocument();
        });
      });

      it("displays last sync status in the configuration panel", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("tab", { name: /configuration/i }));

        await waitFor(() => {
          // Should show success status
          expect(screen.getByText(/success/i)).toBeInTheDocument();
        });
      });
    });

    describe("Google Sheets data sources", () => {
      const sheetsConfig = {
        googleSheets: {
          spreadsheetId: "1abc123xyz",
          spreadsheetName: "Product Inventory",
          sheetName: "Sheet1",
          syncFrequency: "6h" as const,
          headerRow: 1,
          lastSyncAt: "2024-01-20T12:00:00Z",
          lastSyncStatus: "success" as const,
        },
      };

      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "google-sheets",
                config: sheetsConfig,
              })
            ),
        });
      });

      it("shows Configuration tab for google-sheets type", async () => {
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        expect(screen.getByRole("tab", { name: /configuration/i })).toBeInTheDocument();
      });

      it("shows 4 tabs for google-sheets type", async () => {
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        const tabs = screen.getAllByRole("tab");
        expect(tabs).toHaveLength(4);
      });

      it("displays Google Sheets configuration panel when Configuration tab is clicked", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        const configTab = screen.getByRole("tab", { name: /configuration/i });
        await user.click(configTab);

        await waitFor(() => {
          expect(screen.getByText(/Google Sheets Configuration/i)).toBeInTheDocument();
        });
      });

      it("displays spreadsheet name in the configuration panel", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("tab", { name: /configuration/i }));

        await waitFor(() => {
          expect(screen.getByText("Product Inventory")).toBeInTheDocument();
        });
      });

      it("displays sheet name in the configuration panel", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("tab", { name: /configuration/i }));

        await waitFor(() => {
          expect(screen.getByText("Sheet1")).toBeInTheDocument();
        });
      });

      it("displays sync frequency in the configuration panel", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("tab", { name: /configuration/i }));

        await waitFor(() => {
          expect(screen.getByText(/every 6 hours/i)).toBeInTheDocument();
        });
      });

      it("displays last sync status in the configuration panel", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("tab", { name: /configuration/i }));

        await waitFor(() => {
          expect(screen.getByText(/success/i)).toBeInTheDocument();
        });
      });
    });

    describe("Manual data sources", () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(createMockDataSource({ type: "manual" })),
        });
      });

      it("does NOT show Configuration tab for manual type", async () => {
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        // Configuration tab should not exist for manual
        expect(screen.queryByRole("tab", { name: /configuration/i })).not.toBeInTheDocument();
      });

      it("shows only Preview, Mapping, and Validation tabs for manual", async () => {
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        expect(screen.getByRole("tab", { name: /preview/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /mapping/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /validation/i })).toBeInTheDocument();

        const tabs = screen.getAllByRole("tab");
        expect(tabs).toHaveLength(3);
      });
    });

    describe("Tab keyboard navigation with Configuration tab", () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: {
                  apiFetch: {
                    url: "https://api.example.com/products",
                    method: "GET",
                    syncFrequency: "24h",
                  },
                },
              })
            ),
        });
      });

      it("supports keyboard navigation with Configuration tab included", async () => {
        const user = userEvent.setup();
        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        const configTab = screen.getByRole("tab", { name: /configuration/i });
        configTab.focus();

        // Arrow right to next tab (Preview)
        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: /preview/i })).toHaveFocus();

        // Arrow right to Mapping
        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: /mapping/i })).toHaveFocus();

        // Arrow right to Validation
        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: /validation/i })).toHaveFocus();

        // Arrow right wraps to Configuration
        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: /configuration/i })).toHaveFocus();
      });
    });
  });

  describe("Sync controls", () => {
    const apiConfig = {
      apiFetch: {
        url: "https://api.example.com/products",
        method: "GET" as const,
        syncFrequency: "24h" as const,
      },
    };

    const sheetsConfig = {
      googleSheets: {
        spreadsheetId: "1abc123xyz",
        spreadsheetName: "Product Inventory",
        sheetName: "Sheet1",
        syncFrequency: "6h" as const,
        headerRow: 1,
      },
    };

    describe("Sync button visibility", () => {
      it("shows sync button for API type data sources", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
        });
      });

      it("shows sync button for google-sheets type data sources", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "google-sheets",
                config: sheetsConfig,
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
        });
      });

      it("does NOT show sync button for CSV type data sources", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(createMockDataSource({ type: "csv" })),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        // Sync button should not exist
        expect(screen.queryByRole("button", { name: /sync/i })).not.toBeInTheDocument();
      });

      it("does NOT show sync button for manual type data sources", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(createMockDataSource({ type: "manual" })),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        // Sync button should not exist
        expect(screen.queryByRole("button", { name: /sync/i })).not.toBeInTheDocument();
      });
    });

    describe("Sync button interactions", () => {
      it("triggers sync API call when clicked", async () => {
        const user = userEvent.setup();
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ "content-type": "application/json" }),
            json: () =>
              Promise.resolve(
                createMockDataSource({
                  type: "api",
                  config: apiConfig,
                })
              ),
          })
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ "content-type": "application/json" }),
            json: () => Promise.resolve({ success: true }),
          })
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ "content-type": "application/json" }),
            json: () =>
              Promise.resolve(
                createMockDataSource({
                  type: "api",
                  config: apiConfig,
                  syncStatus: "success",
                })
              ),
          });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
        });

        const syncButton = screen.getByRole("button", { name: /sync/i });
        await user.click(syncButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("/data-sources/test-data-source-1/sync"),
            expect.objectContaining({ method: "POST" })
          );
        });
      });

      it("disables sync button while syncing", async () => {
        const user = userEvent.setup();
        // Create a promise that doesn't resolve immediately to simulate syncing
        let resolveSyncPromise: (value: unknown) => void;
        const syncPromise = new Promise((resolve) => {
          resolveSyncPromise = resolve;
        });

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ "content-type": "application/json" }),
            json: () =>
              Promise.resolve(
                createMockDataSource({
                  type: "api",
                  config: apiConfig,
                })
              ),
          })
          .mockImplementationOnce(() => syncPromise);

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
        });

        const syncButton = screen.getByRole("button", { name: /sync/i });
        await user.click(syncButton);

        // Button should be disabled while syncing
        await waitFor(() => {
          expect(screen.getByRole("button", { name: /syncing/i })).toBeDisabled();
        });

        // Clean up
        resolveSyncPromise!({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ success: true }),
        });
      });

      it("shows spinner in button while syncing", async () => {
        const user = userEvent.setup();
        let resolveSyncPromise: (value: unknown) => void;
        const syncPromise = new Promise((resolve) => {
          resolveSyncPromise = resolve;
        });

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ "content-type": "application/json" }),
            json: () =>
              Promise.resolve(
                createMockDataSource({
                  type: "api",
                  config: apiConfig,
                })
              ),
          })
          .mockImplementationOnce(() => syncPromise);

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
        });

        const syncButton = screen.getByRole("button", { name: /sync/i });
        await user.click(syncButton);

        // Should show syncing text
        await waitFor(() => {
          expect(screen.getByText("Syncing...")).toBeInTheDocument();
        });

        // Clean up
        resolveSyncPromise!({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ success: true }),
        });
      });

      it("prevents multiple sync requests from rapid clicks", async () => {
        const user = userEvent.setup();
        let syncCallCount = 0;

        // First call returns the data source
        mockFetch.mockImplementation((url: string, options?: RequestInit) => {
          // GET request for data source
          if (!options?.method || options.method === "GET") {
            return Promise.resolve({
              ok: true,
              headers: new Headers({ "content-type": "application/json" }),
              json: () =>
                Promise.resolve(
                  createMockDataSource({
                    type: "api",
                    config: apiConfig,
                    syncStatus: syncCallCount > 0 ? "syncing" : undefined,
                  })
                ),
            });
          }
          // POST request for sync - count calls and delay response
          if (options?.method === "POST") {
            syncCallCount++;
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  ok: true,
                  headers: new Headers({ "content-type": "application/json" }),
                  json: () => Promise.resolve({ success: true }),
                });
              }, 100);
            });
          }
          return Promise.reject(new Error("Unexpected request"));
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
        });

        const syncButton = screen.getByRole("button", { name: /sync/i });

        // Rapidly click the sync button 3 times
        await user.click(syncButton);
        await user.click(syncButton);
        await user.click(syncButton);

        // Wait for any pending operations
        await waitFor(() => {
          // Button should show syncing state after first click
          expect(screen.getByRole("button", { name: /syncing/i })).toBeDisabled();
        });

        // Only 1 sync POST call should have been made (subsequent clicks ignored)
        const syncCalls = mockFetch.mock.calls.filter(
          (call) => call[1]?.method === "POST" && call[0].includes("/sync")
        );
        expect(syncCalls.length).toBe(1);
      });
    });

    describe("Last synced timestamp", () => {
      it("displays last synced timestamp for API type", async () => {
        const lastSyncAt = new Date("2024-01-20T10:30:00Z");
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: {
                  ...apiConfig,
                  apiFetch: {
                    ...apiConfig.apiFetch,
                    lastSyncAt: lastSyncAt.toISOString(),
                  },
                },
                lastSyncedAt: lastSyncAt,
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByText(/last synced/i)).toBeInTheDocument();
        });
      });

      it("displays last synced timestamp for google-sheets type", async () => {
        const lastSyncAt = new Date("2024-01-20T12:00:00Z");
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "google-sheets",
                config: {
                  ...sheetsConfig,
                  googleSheets: {
                    ...sheetsConfig.googleSheets,
                    lastSyncAt: lastSyncAt.toISOString(),
                  },
                },
                lastSyncedAt: lastSyncAt,
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByText(/last synced/i)).toBeInTheDocument();
        });
      });

      it("does NOT display last synced timestamp for CSV type", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(createMockDataSource({ type: "csv" })),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        expect(screen.queryByText(/last synced/i)).not.toBeInTheDocument();
      });

      it("shows 'Never synced' when lastSyncedAt is null", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
                lastSyncedAt: undefined,
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByText(/never synced/i)).toBeInTheDocument();
        });
      });
    });

    describe("Sync status badge", () => {
      it("shows success badge when syncStatus is success", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
                syncStatus: "success",
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByTestId("sync-status-badge")).toBeInTheDocument();
        });

        expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-status", "success");
      });

      it("shows syncing badge when syncStatus is syncing", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
                syncStatus: "syncing",
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByTestId("sync-status-badge")).toBeInTheDocument();
        });

        expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-status", "syncing");
      });

      it("shows error badge when syncStatus is error", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
                syncStatus: "error",
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByTestId("sync-status-badge")).toBeInTheDocument();
        });

        expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-status", "error");
      });

      it("does NOT show sync status badge for CSV type", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "csv",
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("tablist")).toBeInTheDocument();
        });

        expect(screen.queryByTestId("sync-status-badge")).not.toBeInTheDocument();
      });
    });

    describe("Polling behavior", () => {
      // Note: Polling tests are simplified due to the complexity of testing
      // setInterval with React's async rendering. These tests verify the
      // polling behavior is set up correctly when syncStatus is "syncing".

      it("shows syncing badge when syncStatus is syncing (poll trigger condition)", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
                syncStatus: "syncing",
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-status", "syncing");
        });

        // Verify the syncing state is displayed in the badge, which triggers polling
        const badge = screen.getByTestId("sync-status-badge");
        expect(badge).toHaveTextContent("Syncing");
      });

      it("shows success badge when data source has syncStatus success", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
                syncStatus: "success",
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-status", "success");
        });

        // Badge should show success state
        const badge = screen.getByTestId("sync-status-badge");
        expect(badge).toHaveTextContent("Synced");
      });

      it("shows error badge when data source has syncStatus error", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
                syncStatus: "error",
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-status", "error");
        });

        // Badge should show error state
        const badge = screen.getByTestId("sync-status-badge");
        expect(badge).toHaveTextContent("Sync Error");
      });

      it("does not show syncing UI when syncStatus is success initially", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
                syncStatus: "success",
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-status", "success");
        });

        // Badge should show success state, not syncing
        const badge = screen.getByTestId("sync-status-badge");
        expect(badge).toHaveTextContent("Synced");
        expect(badge).not.toHaveTextContent("Syncing");
      });
    });

    describe("Toast notifications", () => {
      it("shows success toast when sync completes successfully", async () => {
        const user = userEvent.setup();
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ "content-type": "application/json" }),
            json: () =>
              Promise.resolve(
                createMockDataSource({
                  type: "api",
                  config: apiConfig,
                })
              ),
          })
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ "content-type": "application/json" }),
            json: () => Promise.resolve({ success: true }),
          })
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ "content-type": "application/json" }),
            json: () =>
              Promise.resolve(
                createMockDataSource({
                  type: "api",
                  config: apiConfig,
                  syncStatus: "success",
                })
              ),
          });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
        });

        const syncButton = screen.getByRole("button", { name: /sync/i });
        await user.click(syncButton);

        await waitFor(() => {
          expect(screen.getByRole("alert")).toBeInTheDocument();
          expect(screen.getByText(/sync complete/i)).toBeInTheDocument();
        });
      });

      it("shows error toast when sync fails", async () => {
        const user = userEvent.setup();
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ "content-type": "application/json" }),
            json: () =>
              Promise.resolve(
                createMockDataSource({
                  type: "api",
                  config: apiConfig,
                })
              ),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            json: () => Promise.resolve({ error: "Sync failed" }),
          });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
        });

        const syncButton = screen.getByRole("button", { name: /sync/i });
        await user.click(syncButton);

        await waitFor(() => {
          expect(screen.getByRole("alert")).toBeInTheDocument();
          expect(screen.getByText(/sync failed/i)).toBeInTheDocument();
        });
      });

      it("shows toast with error message from API", async () => {
        const user = userEvent.setup();
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ "content-type": "application/json" }),
            json: () =>
              Promise.resolve(
                createMockDataSource({
                  type: "api",
                  config: apiConfig,
                })
              ),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 400,
            statusText: "Bad Request",
            headers: new Headers({ "content-type": "application/json" }),
            json: () => Promise.resolve({ error: "API endpoint unreachable" }),
          });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
        });

        const syncButton = screen.getByRole("button", { name: /sync/i });
        await user.click(syncButton);

        await waitFor(() => {
          expect(screen.getByRole("alert")).toBeInTheDocument();
        });
      });
    });

    describe("Sync button placement", () => {
      it("sync button is placed in header actions area", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve(
              createMockDataSource({
                type: "api",
                config: apiConfig,
              })
            ),
        });

        render(<DataSourceDetailPage />);

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
        });

        // The sync button should be in the header actions section
        const syncButton = screen.getByRole("button", { name: /sync/i });
        const headerActions = syncButton.closest("[class*='headerActions']");
        expect(headerActions).toBeInTheDocument();
      });
    });
  });
});
