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
          json: () => Promise.resolve(createMockDataSource()),
        })
        .mockResolvedValueOnce({
          ok: true,
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
      });

      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it("displays not found message for 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });
    });

    it("allows retry after error", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockDataSource()),
        });

      const user = userEvent.setup();
      render(<DataSourceDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /try again/i });
      await user.click(retryButton);

      await waitFor(() => {
        const nameElements = screen.getAllByText("Product Catalog");
        expect(nameElements.length).toBeGreaterThan(0);
      });
    });
  });
});
