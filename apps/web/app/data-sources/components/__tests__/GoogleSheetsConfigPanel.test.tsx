import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoogleSheetsConfigPanel } from "../GoogleSheetsConfigPanel";
import type { GoogleSheetsConfig } from "../../types";

/**
 * Creates a mock Google Sheets config with sensible defaults
 */
function createMockSheetsConfig(overrides?: Partial<GoogleSheetsConfig>): GoogleSheetsConfig {
  return {
    spreadsheetId: "1abc123xyz",
    spreadsheetName: "Product Inventory",
    sheetName: "Sheet1",
    syncFrequency: "6h",
    headerRow: 1,
    lastSyncAt: "2024-01-20T12:00:00Z",
    lastSyncStatus: "success",
    ...overrides,
  };
}

describe("GoogleSheetsConfigPanel", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Read-only mode (default)", () => {
    it("renders Google Sheets configuration title", () => {
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      expect(screen.getByText("Google Sheets Configuration")).toBeInTheDocument();
    });

    it("displays spreadsheet name", () => {
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      expect(screen.getByText("Product Inventory")).toBeInTheDocument();
    });

    it("displays sheet name", () => {
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      expect(screen.getByText("Sheet1")).toBeInTheDocument();
    });

    it("displays header row number", () => {
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      expect(screen.getByText("Row 1")).toBeInTheDocument();
    });

    it("displays sync frequency", () => {
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      expect(screen.getByText("Every 6 hours")).toBeInTheDocument();
    });

    it("displays spreadsheet ID", () => {
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      expect(screen.getByText("1abc123xyz")).toBeInTheDocument();
    });

    it("shows Edit button when dataSourceId is provided", () => {
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });

    it("does not show Edit button when dataSourceId is not provided", () => {
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} />);

      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  describe("Edit mode toggle", () => {
    it("switches to edit mode when Edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      // In edit mode, should see input/select fields
      expect(screen.getByLabelText(/sheet name/i)).toBeInTheDocument();
    });

    it("shows Save Changes and Cancel buttons in edit mode", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("hides Edit button while in edit mode", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    });

    it("returns to read-only mode when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Should be back in read-only mode
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/sheet name/i)).not.toBeInTheDocument();
    });
  });

  describe("Edit form inputs", () => {
    it("renders sheet name input with current value", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const sheetInput = screen.getByLabelText(/sheet name/i);
      expect(sheetInput).toHaveValue("Sheet1");
    });

    it("renders header row input with current value", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const headerRowInput = screen.getByLabelText(/header row/i);
      expect(headerRowInput).toHaveValue(1);
    });

    it("renders sync frequency selector with current value", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const syncSelect = screen.getByLabelText(/sync frequency/i);
      expect(syncSelect).toHaveValue("6h");
    });

    it("shows spreadsheet name as read-only in edit mode", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      // Spreadsheet should be displayed as read-only (not editable without re-connecting)
      expect(screen.getByText("Product Inventory")).toBeInTheDocument();
    });

    it("allows editing the sheet name", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const sheetInput = screen.getByLabelText(/sheet name/i);
      await user.clear(sheetInput);
      await user.type(sheetInput, "Products");

      expect(sheetInput).toHaveValue("Products");
    });

    it("allows editing the header row", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const headerRowInput = screen.getByLabelText(/header row/i);
      await user.clear(headerRowInput);
      await user.type(headerRowInput, "2");

      expect(headerRowInput).toHaveValue(2);
    });

    it("allows changing sync frequency", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const syncSelect = screen.getByLabelText(/sync frequency/i);
      await user.selectOptions(syncSelect, "24h");

      expect(syncSelect).toHaveValue("24h");
    });
  });

  describe("Cancel functionality", () => {
    it("reverts sheet name changes when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const sheetInput = screen.getByLabelText(/sheet name/i);
      await user.clear(sheetInput);
      await user.type(sheetInput, "Modified Sheet");

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Original sheet name should be displayed
      expect(screen.getByText("Sheet1")).toBeInTheDocument();
    });

    it("reverts header row changes when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const headerRowInput = screen.getByLabelText(/header row/i);
      await user.clear(headerRowInput);
      await user.type(headerRowInput, "5");

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Original header row should be displayed
      expect(screen.getByText("Row 1")).toBeInTheDocument();
    });

    it("reverts sync frequency changes when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const syncSelect = screen.getByLabelText(/sync frequency/i);
      await user.selectOptions(syncSelect, "1h");

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Original frequency should be displayed
      expect(screen.getByText("Every 6 hours")).toBeInTheDocument();
    });
  });

  describe("Save functionality", () => {
    it("calls PATCH API with updated config on save", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="test-id-123" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const sheetInput = screen.getByLabelText(/sheet name/i);
      await user.clear(sheetInput);
      await user.type(sheetInput, "Products");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/data-sources/test-id-123"),
          expect.objectContaining({
            method: "PATCH",
            body: expect.stringContaining("Products"),
          })
        );
      });
    });

    it("shows loading state while saving", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });

    it("disables Cancel button while saving", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    });

    it("returns to read-only mode on successful save", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      });
    });

    it("updates displayed config after successful save", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const sheetInput = screen.getByLabelText(/sheet name/i);
      await user.clear(sheetInput);
      await user.type(sheetInput, "Products");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText("Products")).toBeInTheDocument();
      });
    });

    it("calls onConfigUpdate callback after successful save", async () => {
      const user = userEvent.setup();
      const onConfigUpdate = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <GoogleSheetsConfigPanel
          config={createMockSheetsConfig()}
          dataSourceId="1"
          onConfigUpdate={onConfigUpdate}
        />
      );

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(onConfigUpdate).toHaveBeenCalled();
      });
    });
  });

  describe("Error handling", () => {
    it("displays error message when save fails", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "Failed to update" }),
      });

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/failed to update/i)).toBeInTheDocument();
      });
    });

    it("remains in edit mode when save fails", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Failed" }),
      });

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        // Should still be in edit mode
        expect(screen.getByLabelText(/sheet name/i)).toBeInTheDocument();
      });
    });

    it("allows retry after error", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "Failed" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Try again
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      });
    });

    it("clears error when Cancel is clicked", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Failed to update" }),
      });

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("handles network errors gracefully", async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form validation", () => {
    it("disables Save button when sheet name is empty", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const sheetInput = screen.getByLabelText(/sheet name/i);
      await user.clear(sheetInput);

      expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    });

    it("disables Save button when header row is invalid", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const headerRowInput = screen.getByLabelText(/header row/i);
      await user.clear(headerRowInput);
      await user.type(headerRowInput, "0");

      expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    });

    it("shows validation error for invalid header row", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const headerRowInput = screen.getByLabelText(/header row/i);
      // Clear and leave empty (which results in 0)
      await user.clear(headerRowInput);

      // Blur to trigger validation
      await user.tab();

      expect(screen.getByText(/positive number/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper form labels", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      // All form fields should have associated labels
      expect(screen.getByLabelText(/sheet name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/header row/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sync frequency/i)).toBeInTheDocument();
    });

    it("uses proper aria attributes for error state", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Failed" }),
      });

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        const errorElement = screen.getByRole("alert");
        expect(errorElement).toHaveAttribute("aria-live", "polite");
      });
    });

    it("indicates loading state with aria-busy", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      const saveButton = screen.getByRole("button", { name: /saving/i });
      expect(saveButton).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("Last sync status display", () => {
    it("displays last sync success status", () => {
      render(
        <GoogleSheetsConfigPanel
          config={createMockSheetsConfig({ lastSyncStatus: "success" })}
          dataSourceId="1"
        />
      );

      expect(screen.getByText("success")).toBeInTheDocument();
    });

    it("displays last sync error status", () => {
      render(
        <GoogleSheetsConfigPanel
          config={createMockSheetsConfig({ lastSyncStatus: "error", lastSyncError: "Connection failed" })}
          dataSourceId="1"
        />
      );

      expect(screen.getByText("error")).toBeInTheDocument();
      expect(screen.getByText("Connection failed")).toBeInTheDocument();
    });

    it("displays syncing status", () => {
      render(
        <GoogleSheetsConfigPanel
          config={createMockSheetsConfig({ lastSyncStatus: "syncing" })}
          dataSourceId="1"
        />
      );

      expect(screen.getByText("syncing")).toBeInTheDocument();
    });
  });

  describe("Defensive handling of undefined config values", () => {
    /**
     * These tests verify that the component handles undefined/missing config values gracefully.
     * This addresses a TypeError that occurred when config.sheetName was undefined and
     * .trim() was called on it during form validation (isFormValid).
     */

    it("does not crash when sheetName is undefined", () => {
      // Cast to bypass TypeScript - simulates runtime data where sheetName might be missing
      const configWithUndefinedSheetName = {
        spreadsheetId: "1abc123xyz",
        spreadsheetName: "Product Inventory",
        sheetName: undefined,
        syncFrequency: "6h",
        headerRow: 1,
      } as unknown as GoogleSheetsConfig;

      // Should render without throwing
      expect(() => {
        render(<GoogleSheetsConfigPanel config={configWithUndefinedSheetName} dataSourceId="1" />);
      }).not.toThrow();
    });

    it("does not crash when syncFrequency is undefined", () => {
      // Cast to bypass TypeScript - simulates runtime data where syncFrequency might be missing
      const configWithUndefinedSyncFrequency = {
        spreadsheetId: "1abc123xyz",
        spreadsheetName: "Product Inventory",
        sheetName: "Sheet1",
        syncFrequency: undefined,
        headerRow: 1,
      } as unknown as GoogleSheetsConfig;

      // Should render without throwing
      expect(() => {
        render(<GoogleSheetsConfigPanel config={configWithUndefinedSyncFrequency} dataSourceId="1" />);
      }).not.toThrow();
    });

    it("does not crash when both sheetName and syncFrequency are undefined", () => {
      const configWithUndefinedValues = {
        spreadsheetId: "1abc123xyz",
        spreadsheetName: "Product Inventory",
        sheetName: undefined,
        syncFrequency: undefined,
        headerRow: undefined,
      } as unknown as GoogleSheetsConfig;

      expect(() => {
        render(<GoogleSheetsConfigPanel config={configWithUndefinedValues} dataSourceId="1" />);
      }).not.toThrow();
    });

    it("initializes form state with empty string when sheetName is undefined", async () => {
      const user = userEvent.setup();
      const configWithUndefinedSheetName = {
        spreadsheetId: "1abc123xyz",
        spreadsheetName: "Product Inventory",
        sheetName: undefined,
        syncFrequency: "6h",
        headerRow: 1,
      } as unknown as GoogleSheetsConfig;

      render(<GoogleSheetsConfigPanel config={configWithUndefinedSheetName} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const sheetInput = screen.getByLabelText(/sheet name/i);
      // Should have empty string (fallback), not "undefined"
      expect(sheetInput).toHaveValue("");
    });

    it("initializes form state with 'manual' when syncFrequency is undefined", async () => {
      const user = userEvent.setup();
      const configWithUndefinedSyncFrequency = {
        spreadsheetId: "1abc123xyz",
        spreadsheetName: "Product Inventory",
        sheetName: "Sheet1",
        syncFrequency: undefined,
        headerRow: 1,
      } as unknown as GoogleSheetsConfig;

      render(<GoogleSheetsConfigPanel config={configWithUndefinedSyncFrequency} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const syncSelect = screen.getByLabelText(/sync frequency/i);
      // Should default to "manual" when undefined
      expect(syncSelect).toHaveValue("manual");
    });

    it("initializes form state with 1 when headerRow is undefined", async () => {
      const user = userEvent.setup();
      const configWithUndefinedHeaderRow = {
        spreadsheetId: "1abc123xyz",
        spreadsheetName: "Product Inventory",
        sheetName: "Sheet1",
        syncFrequency: "6h",
        headerRow: undefined,
      } as unknown as GoogleSheetsConfig;

      render(<GoogleSheetsConfigPanel config={configWithUndefinedHeaderRow} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const headerRowInput = screen.getByLabelText(/header row/i);
      // Should default to 1 when undefined
      expect(headerRowInput).toHaveValue(1);
    });

    it("correctly validates isFormValid as false when sheetName defaults to empty string", async () => {
      const user = userEvent.setup();
      const configWithUndefinedSheetName = {
        spreadsheetId: "1abc123xyz",
        spreadsheetName: "Product Inventory",
        sheetName: undefined,
        syncFrequency: "6h",
        headerRow: 1,
      } as unknown as GoogleSheetsConfig;

      render(<GoogleSheetsConfigPanel config={configWithUndefinedSheetName} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      // Save button should be disabled since sheetName is empty after fallback
      expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    });

    it("re-initializes form state correctly on cancel when config has undefined values", async () => {
      const user = userEvent.setup();
      const configWithUndefinedValues = {
        spreadsheetId: "1abc123xyz",
        spreadsheetName: "Product Inventory",
        sheetName: undefined,
        syncFrequency: undefined,
        headerRow: undefined,
      } as unknown as GoogleSheetsConfig;

      render(<GoogleSheetsConfigPanel config={configWithUndefinedValues} dataSourceId="1" />);

      // Enter edit mode
      await user.click(screen.getByRole("button", { name: /edit/i }));

      // Modify some values
      const sheetInput = screen.getByLabelText(/sheet name/i);
      await user.type(sheetInput, "NewSheet");

      // Cancel - should reset to fallback values
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Re-enter edit mode
      await user.click(screen.getByRole("button", { name: /edit/i }));

      // Should still have fallback values (empty string for sheetName)
      const sheetInputAfterCancel = screen.getByLabelText(/sheet name/i);
      expect(sheetInputAfterCancel).toHaveValue("");
    });

    it("handles whitespace-only sheetName as invalid", async () => {
      const user = userEvent.setup();
      render(<GoogleSheetsConfigPanel config={createMockSheetsConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const sheetInput = screen.getByLabelText(/sheet name/i);
      await user.clear(sheetInput);
      await user.type(sheetInput, "   "); // Whitespace only

      // Save button should be disabled since whitespace-only is invalid (after .trim())
      expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    });
  });
});
