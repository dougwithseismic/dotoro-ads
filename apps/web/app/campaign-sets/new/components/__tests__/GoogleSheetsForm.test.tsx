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

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock spreadsheet data
const mockSpreadsheets = [
  { id: "sheet1", name: "Budget 2025" },
  { id: "sheet2", name: "Product Inventory" },
  { id: "sheet3", name: "Customer Data" },
];

// Mock sheets (tabs) data
const mockSheets = [
  { sheetId: 0, title: "Sheet1", index: 0 },
  { sheetId: 1, title: "Data", index: 1 },
  { sheetId: 2, title: "Summary", index: 2 },
];

// Mock preview data
const mockPreviewData = {
  headers: ["Name", "Email", "Age"],
  rows: [
    { Name: "Alice", Email: "alice@example.com", Age: "30" },
    { Name: "Bob", Email: "bob@example.com", Age: "25" },
    { Name: "Carol", Email: "carol@example.com", Age: "35" },
  ],
};

describe("GoogleSheetsForm", () => {
  let onSubmit: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;
  let onConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockReset();
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

    it("disables form inputs when not connected", () => {
      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={false}
          onConnect={onConnect}
        />
      );

      // Spreadsheet picker should be disabled
      const spreadsheetInput = screen.queryByLabelText(/spreadsheet/i);
      if (spreadsheetInput) {
        expect(spreadsheetInput).toBeDisabled();
      }
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSpreadsheets }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/spreadsheet/i)).toBeInTheDocument();
      });
    });

    it("loads spreadsheets on mount when connected", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSpreadsheets }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/google/spreadsheets"),
          expect.any(Object)
        );
      });
    });

    it("loads sheets after spreadsheet is selected", async () => {
      // First call returns spreadsheets
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSpreadsheets }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      // Second call returns sheets
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSheets }),
        headers: new Headers({ "content-type": "application/json" }),
      });

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
        expect(screen.getByLabelText(/spreadsheet/i)).toBeInTheDocument();
      });

      // Select a spreadsheet
      const spreadsheetSelect = screen.getByLabelText(/spreadsheet/i);
      fireEvent.change(spreadsheetSelect, { target: { value: "sheet1" } });

      // Wait for sheets to load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/google/spreadsheets/sheet1/sheets"),
          expect.any(Object)
        );
      });
    });

    it("shows preview after sheet is selected", async () => {
      // Setup mock responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockSpreadsheets }),
          headers: new Headers({ "content-type": "application/json" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockSheets }),
          headers: new Headers({ "content-type": "application/json" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockPreviewData }),
          headers: new Headers({ "content-type": "application/json" }),
        });

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
        expect(screen.getByLabelText("Spreadsheet")).toBeInTheDocument();
      });

      // Select spreadsheet
      fireEvent.change(screen.getByLabelText("Spreadsheet"), { target: { value: "sheet1" } });

      // Wait for sheets to load - the Sheet / Tab dropdown should become enabled
      await waitFor(() => {
        const sheetSelect = screen.getByLabelText("Sheet / Tab");
        expect(sheetSelect).not.toBeDisabled();
      });

      // Select sheet
      fireEvent.change(screen.getByLabelText("Sheet / Tab"), { target: { value: "Sheet1" } });

      // Wait for preview heading
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /preview/i })).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("calls onSubmit with correct config when form is submitted", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockSpreadsheets }),
          headers: new Headers({ "content-type": "application/json" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockSheets }),
          headers: new Headers({ "content-type": "application/json" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockPreviewData }),
          headers: new Headers({ "content-type": "application/json" }),
        });

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
        expect(screen.getByLabelText("Spreadsheet")).toBeInTheDocument();
      });

      // Fill in the form
      const nameInput = screen.getByLabelText("Data Source Name");
      fireEvent.change(nameInput, { target: { value: "My Data Source" } });

      fireEvent.change(screen.getByLabelText("Spreadsheet"), { target: { value: "sheet1" } });

      // Wait for sheets to load
      await waitFor(() => {
        const sheetSelect = screen.getByLabelText("Sheet / Tab");
        expect(sheetSelect).not.toBeDisabled();
      });

      fireEvent.change(screen.getByLabelText("Sheet / Tab"), { target: { value: "Sheet1" } });

      // Select sync frequency
      const frequencySelect = screen.getByLabelText("Sync Frequency");
      fireEvent.change(frequencySelect, { target: { value: "24h" } });

      // Submit the form
      const submitButton = screen.getByRole("button", { name: /create/i });
      fireEvent.click(submitButton);

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSpreadsheets }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      render(
        <GoogleSheetsForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          isConnected={true}
          onConnect={onConnect}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/spreadsheet/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", { name: /create|save|add/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("sync frequency selector", () => {
    it("shows sync frequency options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSpreadsheets }),
        headers: new Headers({ "content-type": "application/json" }),
      });

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSpreadsheets }),
        headers: new Headers({ "content-type": "application/json" }),
      });

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSpreadsheets }),
        headers: new Headers({ "content-type": "application/json" }),
      });

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockSpreadsheets }),
        headers: new Headers({ "content-type": "application/json" }),
      });

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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "Server error" }),
      });

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
