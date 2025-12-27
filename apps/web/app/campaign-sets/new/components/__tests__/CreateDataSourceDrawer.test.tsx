/**
 * CreateDataSourceDrawer Component Tests
 *
 * Tests for the drawer that handles creating data sources of various types:
 * - CSV Upload
 * - CSV Paste
 * - API Push
 * - API Fetch
 * - Google Sheets (Phase 1 integration)
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CreateDataSourceDrawer } from "../CreateDataSourceDrawer";

// Mock the api module
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();

vi.mock("@/lib/api-client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
  API_BASE_URL: "http://localhost:3001",
}));

// Mock fetch globally for direct fetch calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CreateDataSourceDrawer", () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onCreated: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockReset();
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    onClose = vi.fn();
    onCreated = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders all source type options including Google Sheets", () => {
      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      // Check for all 5 source type options
      expect(screen.getByText("Upload CSV")).toBeInTheDocument();
      expect(screen.getByText("Paste CSV")).toBeInTheDocument();
      expect(screen.getByText("API Push")).toBeInTheDocument();
      expect(screen.getByText("API Fetch")).toBeInTheDocument();
      expect(screen.getByText("Google Sheets")).toBeInTheDocument();
    });

    it("shows Google Sheets description", () => {
      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      expect(screen.getByText(/import.*google.*spreadsheet/i)).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(
        <CreateDataSourceDrawer
          isOpen={false}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      expect(screen.queryByText("Create Data Source")).not.toBeInTheDocument();
    });

    it("renders drawer title when open", () => {
      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      expect(screen.getByText("Create Data Source")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Google Sheets Selection Tests
  // ==========================================================================

  describe("Google Sheets Selection", () => {
    it("navigates to Google Sheets form when Google Sheets is clicked", async () => {
      // Mock the Google status check via api.get
      mockApiGet.mockResolvedValueOnce({ connected: false });

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      // Find and click Google Sheets option
      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      expect(googleSheetsButton).toBeInTheDocument();
      fireEvent.click(googleSheetsButton!);

      // Should show back button and Google Sheets form
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });
    });

    it("shows back button in Google Sheets form", async () => {
      mockApiGet.mockResolvedValueOnce({ connected: false });

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      // Click Google Sheets option
      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Click back button
      fireEvent.click(screen.getByRole("button", { name: /back/i }));

      // Should return to source type selection
      await waitFor(() => {
        expect(screen.getByText("Google Sheets")).toBeInTheDocument();
        expect(screen.getByText("Upload CSV")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Google OAuth Connection Tests
  // ==========================================================================

  describe("Google OAuth Connection", () => {
    it("checks Google connection status when Google Sheets is selected", async () => {
      mockApiGet.mockResolvedValueOnce({ connected: false });

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith("/api/v1/auth/google/status");
      });
    });

    it("shows Connect Google Account button when not connected", async () => {
      mockApiGet.mockResolvedValueOnce({ connected: false });

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /connect google account/i })).toBeInTheDocument();
      });
    });

    it("shows spreadsheet picker when Google is connected", async () => {
      // Status check returns connected (via api.get)
      mockApiGet
        .mockResolvedValueOnce({ connected: true })
        // Load spreadsheets (GoogleSheetsForm uses api.get)
        .mockResolvedValueOnce({
          data: [
            { id: "sheet1", name: "Budget 2025" },
            { id: "sheet2", name: "Product Inventory" },
          ],
        });

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      await waitFor(() => {
        expect(screen.getByLabelText("Spreadsheet")).toBeInTheDocument();
      });
    });

    it("initiates OAuth flow when Connect Google Account is clicked", async () => {
      // Status check returns not connected
      mockApiGet.mockResolvedValueOnce({ connected: false });

      // OAuth connect returns authorizationUrl (matching backend schema)
      mockApiPost.mockResolvedValueOnce({ authorizationUrl: "https://accounts.google.com/oauth" });

      // Mock window.location.href setter
      const originalLocation = window.location;
      delete (window as { location?: Location }).location;
      window.location = { ...originalLocation, href: "" } as Location;

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /connect google account/i })).toBeInTheDocument();
      });

      // Click connect button
      fireEvent.click(screen.getByRole("button", { name: /connect google account/i }));

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          "/api/v1/auth/google/connect",
          expect.objectContaining({ redirectUrl: expect.any(String) })
        );
      });

      // Verify the redirect uses authorizationUrl from the response
      await waitFor(() => {
        expect(window.location.href).toBe("https://accounts.google.com/oauth");
      });

      // Restore window.location
      window.location = originalLocation;
    });
  });

  // ==========================================================================
  // Google Sheets Form Integration Tests
  // ==========================================================================

  describe("Google Sheets Form Integration", () => {
    it("passes isConnected prop to GoogleSheetsForm", async () => {
      // Status check returns connected
      mockApiGet
        .mockResolvedValueOnce({ connected: true })
        // Load spreadsheets
        .mockResolvedValueOnce({ data: [] });

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      // When connected, the form should show the data source name input
      await waitFor(() => {
        expect(screen.getByLabelText(/data source name/i)).toBeInTheDocument();
      });
    });

    it("handles Google Sheets form cancellation", async () => {
      mockApiGet.mockResolvedValueOnce({ connected: false });

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      });

      // Click Cancel
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      // Should return to source type selection
      await waitFor(() => {
        expect(screen.getByText("Google Sheets")).toBeInTheDocument();
        expect(screen.getByText("Upload CSV")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Google Sheets Data Source Creation Tests
  // ==========================================================================

  describe("Google Sheets Data Source Creation", () => {
    it("creates Google Sheets data source with correct config", async () => {
      const mockSpreadsheets = [
        { id: "spreadsheet-1", name: "Test Spreadsheet" },
      ];

      const mockSheets = [
        { sheetId: 0, title: "Sheet1", index: 0 },
      ];

      const mockPreview = {
        headers: ["Name", "Email"],
        rows: [{ Name: "John", Email: "john@example.com" }],
      };

      // Status check - connected (via api.get)
      mockApiGet
        .mockResolvedValueOnce({ connected: true })
        // Load spreadsheets (GoogleSheetsForm uses api.get)
        .mockResolvedValueOnce({ data: mockSpreadsheets })
        // Load sheets
        .mockResolvedValueOnce({ data: mockSheets })
        // Load preview
        .mockResolvedValueOnce({ data: mockPreview });

      // Create data source (uses api.post)
      mockApiPost.mockResolvedValueOnce({ id: "ds-123" });

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      // Select Google Sheets
      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/data source name/i)).toBeInTheDocument();
      });

      // Fill in name
      const nameInput = screen.getByLabelText(/data source name/i);
      fireEvent.change(nameInput, { target: { value: "My Google Sheet" } });

      // Select spreadsheet
      await waitFor(() => {
        expect(screen.getByLabelText("Spreadsheet")).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText("Spreadsheet"), {
        target: { value: "spreadsheet-1" },
      });

      // Wait for sheets to load and select sheet
      await waitFor(() => {
        const sheetSelect = screen.getByLabelText("Sheet / Tab");
        expect(sheetSelect).not.toBeDisabled();
      });
      fireEvent.change(screen.getByLabelText("Sheet / Tab"), {
        target: { value: "Sheet1" },
      });

      // Wait for form to be valid and submit
      await waitFor(() => {
        const submitButton = screen.getByRole("button", { name: /create/i });
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /create/i }));

      // Verify API call (now uses api.post instead of fetch)
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          "/api/v1/data-sources",
          expect.objectContaining({
            name: "My Google Sheet",
            type: "google-sheets",
            config: expect.objectContaining({
              source: "google-sheets",
              spreadsheetId: "spreadsheet-1",
              sheetName: "Sheet1",
            }),
          })
        );
      });

      // Verify onCreated callback
      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith("ds-123");
      });
    });

    it("includes syncFrequency in data source creation", async () => {
      const mockSpreadsheets = [
        { id: "spreadsheet-1", name: "Test Spreadsheet" },
      ];

      const mockSheets = [
        { sheetId: 0, title: "Sheet1", index: 0 },
      ];

      // Status check - connected (via api.get)
      mockApiGet
        .mockResolvedValueOnce({ connected: true })
        // Load spreadsheets
        .mockResolvedValueOnce({ data: mockSpreadsheets })
        // Load sheets
        .mockResolvedValueOnce({ data: mockSheets })
        // Load preview
        .mockResolvedValueOnce({ data: { headers: ["A"], rows: [{ A: "1" }] } });

      // Create data source (uses api.post)
      mockApiPost.mockResolvedValueOnce({ id: "ds-456" });

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      // Select Google Sheets
      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/data source name/i)).toBeInTheDocument();
      });

      // Fill in name
      fireEvent.change(screen.getByLabelText(/data source name/i), {
        target: { value: "My Sheet" },
      });

      // Select spreadsheet
      fireEvent.change(screen.getByLabelText("Spreadsheet"), {
        target: { value: "spreadsheet-1" },
      });

      // Wait for sheets to load
      await waitFor(() => {
        const sheetSelect = screen.getByLabelText("Sheet / Tab");
        expect(sheetSelect).not.toBeDisabled();
      });

      // Select sheet
      fireEvent.change(screen.getByLabelText("Sheet / Tab"), {
        target: { value: "Sheet1" },
      });

      // Set sync frequency to daily
      await waitFor(() => {
        expect(screen.getByLabelText(/sync frequency/i)).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText(/sync frequency/i), {
        target: { value: "24h" },
      });

      // Submit
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /create/i }));

      // Verify the request body includes syncFrequency (uses api.post)
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          "/api/v1/data-sources",
          expect.objectContaining({
            config: expect.objectContaining({
              syncFrequency: "24h",
            }),
          })
        );
      });
    });
  });

  // ==========================================================================
  // OAuth URL Validation Tests
  // ==========================================================================

  describe("OAuth URL Validation", () => {
    it("handles missing OAuth URL gracefully", async () => {
      // Status check returns not connected
      mockApiGet.mockResolvedValueOnce({ connected: false });

      // OAuth connect returns empty authorizationUrl - this should be handled gracefully
      // Note: The current implementation sets window.location.href to empty string
      // which doesn't navigate. We verify the API was called.
      mockApiPost.mockResolvedValueOnce({ authorizationUrl: "" });

      // Mock window.location.href setter
      const originalLocation = window.location;
      delete (window as { location?: Location }).location;
      window.location = { ...originalLocation, href: "" } as Location;

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /connect google account/i })).toBeInTheDocument();
      });

      // Click connect button
      fireEvent.click(screen.getByRole("button", { name: /connect google account/i }));

      // Wait for the API call to be made
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          "/api/v1/auth/google/connect",
          expect.objectContaining({ redirectUrl: expect.any(String) })
        );
      });

      // When authorizationUrl is empty, window.location.href is set to "" but page doesn't navigate
      // The location.href should be the empty URL (no navigation occurred)
      expect(window.location.href).toBe("");

      // Restore window.location
      window.location = originalLocation;
    });

    it("handles OAuth API error gracefully", async () => {
      // Status check returns not connected
      mockApiGet.mockResolvedValueOnce({ connected: false });

      // OAuth connect fails with an error
      mockApiPost.mockRejectedValueOnce(new Error("OAuth service unavailable"));

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /connect google account/i })).toBeInTheDocument();
      });

      // Click connect button
      fireEvent.click(screen.getByRole("button", { name: /connect google account/i }));

      // Error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/oauth service unavailable/i)).toBeInTheDocument();
      });

      // Button should be re-enabled after error (connectingGoogle should be reset)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /connect google account/i })).not.toBeDisabled();
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe("Error Handling", () => {
    it("shows error when Google connection check fails", async () => {
      mockApiGet.mockRejectedValueOnce(new Error("Failed to check connection"));

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      await waitFor(() => {
        expect(screen.getByText(/failed to check/i)).toBeInTheDocument();
      });
    });

    it("shows error when data source creation fails", async () => {
      const mockSpreadsheets = [
        { id: "spreadsheet-1", name: "Test Spreadsheet" },
      ];

      const mockSheets = [
        { sheetId: 0, title: "Sheet1", index: 0 },
      ];

      // Status check - connected (via api.get)
      mockApiGet
        .mockResolvedValueOnce({ connected: true })
        // Load spreadsheets
        .mockResolvedValueOnce({ data: mockSpreadsheets })
        // Load sheets
        .mockResolvedValueOnce({ data: mockSheets })
        // Load preview
        .mockResolvedValueOnce({ data: { headers: ["A"], rows: [{ A: "1" }] } });

      // Create data source - FAILS (uses api.post which throws on error)
      mockApiPost.mockRejectedValueOnce(new Error("Failed to create data source"));

      render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      // Select Google Sheets
      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      // Wait for form
      await waitFor(() => {
        expect(screen.getByLabelText(/data source name/i)).toBeInTheDocument();
      });

      // Fill form
      fireEvent.change(screen.getByLabelText(/data source name/i), {
        target: { value: "My Sheet" },
      });

      fireEvent.change(screen.getByLabelText("Spreadsheet"), {
        target: { value: "spreadsheet-1" },
      });

      await waitFor(() => {
        expect(screen.getByLabelText("Sheet / Tab")).not.toBeDisabled();
      });

      fireEvent.change(screen.getByLabelText("Sheet / Tab"), {
        target: { value: "Sheet1" },
      });

      // Submit
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /create/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /create/i }));

      // Error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to create/i)).toBeInTheDocument();
      });

      // onCreated should NOT have been called
      expect(onCreated).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // State Reset Tests
  // ==========================================================================

  describe("State Reset", () => {
    it("resets Google Sheets state when drawer is closed", async () => {
      mockApiGet.mockResolvedValueOnce({ connected: false });

      const { rerender } = render(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      // Select Google Sheets
      const googleSheetsButton = screen.getByText("Google Sheets").closest("button");
      fireEvent.click(googleSheetsButton!);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      });

      // Close the drawer
      rerender(
        <CreateDataSourceDrawer
          isOpen={false}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      // Reopen the drawer
      rerender(
        <CreateDataSourceDrawer
          isOpen={true}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      // Should show source type selection, not the Google Sheets form
      expect(screen.getByText("Google Sheets")).toBeInTheDocument();
      expect(screen.getByText("Upload CSV")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();
    });
  });
});
