/**
 * GoogleSheetsForm Component Tests
 *
 * Tests for the Google Sheets data source form that handles:
 * - Google account connection state
 * - Spreadsheet selection
 * - Sheet/tab selection
 * - Data preview
 * - Sync frequency configuration
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoogleSheetsForm } from "../GoogleSheetsForm";

// Mock the api module
const mockApiGet = vi.fn();

vi.mock("@/lib/api-client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

// Mock spreadsheet data with modifiedTime for the combobox
const mockSpreadsheets = [
  { id: "sheet1", name: "Budget 2025", modifiedTime: new Date().toISOString() },
  { id: "sheet2", name: "Product Inventory", modifiedTime: new Date().toISOString() },
  { id: "sheet3", name: "Customer Data", modifiedTime: new Date().toISOString() },
];

// Mock sheets (tabs) data
const mockSheets = [
  { sheetId: 0, title: "Sheet1", index: 0 },
  { sheetId: 1, title: "Data", index: 1 },
  { sheetId: 2, title: "Summary", index: 2 },
];

// Mock preview data - matches the API response format
const mockPreviewData = {
  data: [
    { Name: "Alice", Email: "alice@example.com", Age: "30" },
    { Name: "Bob", Email: "bob@example.com", Age: "25" },
    { Name: "Carol", Email: "carol@example.com", Age: "35" },
  ],
  columns: ["Name", "Email", "Age"],
  rowCount: 3,
};

describe("GoogleSheetsForm", () => {
  let onSubmit: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;
  let onConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockApiGet.mockReset();
    onSubmit = vi.fn();
    onCancel = vi.fn();
    onConnect = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("when not connected to Google", () => {
    it("shows Connect Google Account button when not connected", () => {
      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={false}
          onConnect={onConnect}
        />
      );

      expect(screen.getByRole("button", { name: /connect google account/i })).toBeInTheDocument();
    });

    it("calls onConnect when Connect button is clicked", () => {
      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={false}
          onConnect={onConnect}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /connect google account/i }));
      expect(onConnect).toHaveBeenCalled();
    });

    it("does not show spreadsheet picker when not connected", () => {
      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={false}
          onConnect={onConnect}
        />
      );

      // Spreadsheet picker should not be visible
      expect(screen.queryByText("Spreadsheet")).not.toBeInTheDocument();
    });

    it("shows message explaining connection is required", () => {
      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={false}
          onConnect={onConnect}
        />
      );

      // Use getAllByText since both the heading and paragraph contain the text
      const elements = screen.getAllByText(/connect.*google account/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe("when connected to Google", () => {
    it("shows spreadsheet picker when connected", async () => {
      // Returns { spreadsheets: [...] }
      mockApiGet.mockResolvedValueOnce({ spreadsheets: mockSpreadsheets });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      // Wait for the spreadsheet label to appear (custom combobox)
      await waitFor(() => {
        expect(screen.getByText("Spreadsheet")).toBeInTheDocument();
      });
    });

    it("loads spreadsheets on mount when connected", async () => {
      mockApiGet.mockResolvedValueOnce({ spreadsheets: mockSpreadsheets });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith("/api/v1/google/spreadsheets");
      });
    });

    it("loads sheets after spreadsheet is selected", async () => {
      // First call returns spreadsheets
      mockApiGet
        .mockResolvedValueOnce({ spreadsheets: mockSpreadsheets })
        // Second call returns sheets
        .mockResolvedValueOnce({ sheets: mockSheets });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      // Wait for spreadsheets to load
      await waitFor(() => {
        expect(screen.getByText("Select a spreadsheet")).toBeInTheDocument();
      });

      // Click the spreadsheet combobox to open it
      const spreadsheetCombobox = screen.getByText("Select a spreadsheet").closest("div");
      fireEvent.click(spreadsheetCombobox!);

      // Wait for options to appear and select one
      await waitFor(() => {
        expect(screen.getByRole("option", { name: /Budget 2025/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("option", { name: /Budget 2025/i }));

      // Wait for sheets to load
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith("/api/v1/google/spreadsheets/sheet1/sheets");
      });
    });

    it("shows preview after sheet is selected", async () => {
      // Setup mock responses
      mockApiGet
        .mockResolvedValueOnce({ spreadsheets: mockSpreadsheets })
        .mockResolvedValueOnce({ sheets: mockSheets })
        .mockResolvedValueOnce(mockPreviewData);

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      // Wait for spreadsheets to load
      await waitFor(() => {
        expect(screen.getByText("Select a spreadsheet")).toBeInTheDocument();
      });

      // Select spreadsheet
      const spreadsheetCombobox = screen.getByText("Select a spreadsheet").closest("div");
      fireEvent.click(spreadsheetCombobox!);

      await waitFor(() => {
        expect(screen.getByRole("option", { name: /Budget 2025/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("option", { name: /Budget 2025/i }));

      // Wait for sheets to load and select sheet
      await waitFor(() => {
        expect(screen.getByText("Select a sheet")).toBeInTheDocument();
      });

      const sheetCombobox = screen.getByText("Select a sheet").closest("div");
      fireEvent.click(sheetCombobox!);

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Sheet1" })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("option", { name: "Sheet1" }));

      // Wait for preview heading
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /preview/i })).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("calls onSubmit with correct config when form is submitted", async () => {
      mockApiGet
        .mockResolvedValueOnce({ spreadsheets: mockSpreadsheets })
        .mockResolvedValueOnce({ sheets: mockSheets })
        .mockResolvedValueOnce(mockPreviewData);

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      // Wait for form to be ready
      await waitFor(() => {
        expect(screen.getByLabelText("Data Source Name")).toBeInTheDocument();
      });

      // Fill in the form
      const nameInput = screen.getByLabelText("Data Source Name");
      fireEvent.change(nameInput, { target: { value: "My Data Source" } });

      // Select spreadsheet via combobox
      const spreadsheetCombobox = screen.getByText("Select a spreadsheet").closest("div");
      fireEvent.click(spreadsheetCombobox!);

      await waitFor(() => {
        expect(screen.getByRole("option", { name: /Budget 2025/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("option", { name: /Budget 2025/i }));

      // Wait for sheets to load and select sheet
      await waitFor(() => {
        expect(screen.getByText("Select a sheet")).toBeInTheDocument();
      });

      const sheetCombobox = screen.getByText("Select a sheet").closest("div");
      fireEvent.click(sheetCombobox!);

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Sheet1" })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("option", { name: "Sheet1" }));

      // Select sync frequency
      const frequencySelect = screen.getByLabelText("Sync Frequency");
      fireEvent.change(frequencySelect, { target: { value: "24h" } });

      // Submit the form
      await waitFor(() => {
        const submitButton = screen.getByRole("button", { name: /create/i });
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /create/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          "My Data Source",
          expect.objectContaining({
            spreadsheetId: "sheet1",
            spreadsheetName: "Budget 2025",
            sheetName: "Sheet1",
            syncFrequency: "24h",
          })
        );
      });
    });

    it("disables submit button when required fields are empty", async () => {
      mockApiGet.mockResolvedValueOnce({ spreadsheets: mockSpreadsheets });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Spreadsheet")).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", { name: /create|save|add/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("sync frequency selector", () => {
    it("shows sync frequency options", async () => {
      mockApiGet.mockResolvedValueOnce({ spreadsheets: mockSpreadsheets });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/sync frequency/i)).toBeInTheDocument();
      });

      const frequencySelect = screen.getByLabelText(/sync frequency/i);
      expect(frequencySelect).toBeInTheDocument();
    });

    it("defaults to manual sync", async () => {
      mockApiGet.mockResolvedValueOnce({ spreadsheets: mockSpreadsheets });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/sync frequency/i)).toBeInTheDocument();
      });

      const frequencySelect = screen.getByLabelText(/sync frequency/i) as HTMLSelectElement;
      expect(frequencySelect.value).toBe("manual");
    });
  });

  describe("header row selector", () => {
    it("shows header row input with default value of 1", async () => {
      mockApiGet.mockResolvedValueOnce({ spreadsheets: mockSpreadsheets });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/header row/i)).toBeInTheDocument();
      });

      const headerRowInput = screen.getByLabelText(/header row/i) as HTMLInputElement;
      expect(headerRowInput.value).toBe("1");
    });
  });

  describe("cancel functionality", () => {
    it("calls onCancel when cancel button is clicked", async () => {
      mockApiGet.mockResolvedValueOnce({ spreadsheets: mockSpreadsheets });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("shows error message when spreadsheet loading fails", async () => {
      mockApiGet.mockRejectedValueOnce(new Error("Failed to load spreadsheets"));

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed|error/i)).toBeInTheDocument();
      });
    });
  });
});
