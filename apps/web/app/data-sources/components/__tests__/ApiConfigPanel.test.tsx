import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiConfigPanel } from "../ApiConfigPanel";
import type { ApiFetchConfig } from "../../types";

/**
 * Creates a mock API config with sensible defaults
 */
function createMockApiConfig(overrides?: Partial<ApiFetchConfig>): ApiFetchConfig {
  return {
    url: "https://api.example.com/products",
    method: "GET",
    syncFrequency: "24h",
    authType: "bearer",
    authCredentials: "test-token",
    headers: { "X-API-Key": "test-key" },
    lastSyncAt: "2024-01-20T10:00:00Z",
    lastSyncStatus: "success",
    ...overrides,
  };
}

describe("ApiConfigPanel", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Read-only mode (default)", () => {
    it("renders API configuration title", () => {
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      expect(screen.getByText("API Configuration")).toBeInTheDocument();
    });

    it("displays endpoint URL", () => {
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      expect(screen.getByText("https://api.example.com/products")).toBeInTheDocument();
    });

    it("displays HTTP method badge", () => {
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      expect(screen.getByText("GET")).toBeInTheDocument();
    });

    it("displays sync frequency", () => {
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      expect(screen.getByText("Every 24 hours")).toBeInTheDocument();
    });

    it("displays authentication type", () => {
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      expect(screen.getByText("Bearer Token")).toBeInTheDocument();
    });

    it("shows Edit button when dataSourceId is provided", () => {
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });

    it("does not show Edit button when dataSourceId is not provided", () => {
      render(<ApiConfigPanel config={createMockApiConfig()} />);

      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  describe("Edit mode toggle", () => {
    it("switches to edit mode when Edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      // In edit mode, should see input fields
      expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument();
    });

    it("shows Save Changes and Cancel buttons in edit mode", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("hides Edit button while in edit mode", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    });

    it("returns to read-only mode when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Should be back in read-only mode
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/endpoint url/i)).not.toBeInTheDocument();
    });
  });

  describe("Edit form inputs", () => {
    it("renders endpoint URL input with current value", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const urlInput = screen.getByLabelText(/endpoint url/i);
      expect(urlInput).toHaveValue("https://api.example.com/products");
    });

    it("renders HTTP method selector with current value", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const methodSelect = screen.getByLabelText(/http method/i);
      expect(methodSelect).toHaveValue("GET");
    });

    it("renders authentication type selector with current value", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const authSelect = screen.getByLabelText(/authentication type/i);
      expect(authSelect).toHaveValue("bearer");
    });

    it("renders sync frequency selector with current value", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const syncSelect = screen.getByLabelText(/sync frequency/i);
      expect(syncSelect).toHaveValue("24h");
    });

    it("allows editing the endpoint URL", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const urlInput = screen.getByLabelText(/endpoint url/i);
      await user.clear(urlInput);
      await user.type(urlInput, "https://new-api.example.com/data");

      expect(urlInput).toHaveValue("https://new-api.example.com/data");
    });

    it("allows changing HTTP method", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const methodSelect = screen.getByLabelText(/http method/i);
      await user.selectOptions(methodSelect, "POST");

      expect(methodSelect).toHaveValue("POST");
    });

    it("allows changing authentication type", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const authSelect = screen.getByLabelText(/authentication type/i);
      await user.selectOptions(authSelect, "api-key");

      expect(authSelect).toHaveValue("api-key");
    });

    it("allows changing sync frequency", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const syncSelect = screen.getByLabelText(/sync frequency/i);
      await user.selectOptions(syncSelect, "1h");

      expect(syncSelect).toHaveValue("1h");
    });

    it("shows auth credentials field when auth type is bearer", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig({ authType: "bearer" })} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      expect(screen.getByLabelText(/bearer token/i)).toBeInTheDocument();
    });

    it("shows auth credentials field when auth type is api-key", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig({ authType: "api-key" })} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    });

    it("hides auth credentials field when auth type is none", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig({ authType: "none" })} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      expect(screen.queryByLabelText(/bearer token/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument();
    });
  });

  describe("Headers editing", () => {
    it("displays existing headers", async () => {
      const user = userEvent.setup();
      render(
        <ApiConfigPanel
          config={createMockApiConfig({ headers: { "X-API-Key": "test-key", "Content-Type": "application/json" } })}
          dataSourceId="1"
        />
      );

      await user.click(screen.getByRole("button", { name: /edit/i }));

      expect(screen.getByDisplayValue("X-API-Key")).toBeInTheDocument();
      expect(screen.getByDisplayValue("test-key")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Content-Type")).toBeInTheDocument();
      expect(screen.getByDisplayValue("application/json")).toBeInTheDocument();
    });

    it("allows adding a new header", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig({ headers: {} })} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /add header/i }));

      // Should have key and value inputs for the new header
      const headerKeyInputs = screen.getAllByPlaceholderText(/header name/i);
      expect(headerKeyInputs.length).toBeGreaterThan(0);
    });

    it("allows removing a header", async () => {
      const user = userEvent.setup();
      render(
        <ApiConfigPanel
          config={createMockApiConfig({ headers: { "X-API-Key": "test-key" } })}
          dataSourceId="1"
        />
      );

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const removeButton = screen.getByRole("button", { name: /remove header/i });
      await user.click(removeButton);

      expect(screen.queryByDisplayValue("X-API-Key")).not.toBeInTheDocument();
    });
  });

  describe("Cancel functionality", () => {
    it("reverts URL changes when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const urlInput = screen.getByLabelText(/endpoint url/i);
      await user.clear(urlInput);
      await user.type(urlInput, "https://modified.example.com");

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Original URL should be displayed
      expect(screen.getByText("https://api.example.com/products")).toBeInTheDocument();
    });

    it("reverts method changes when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const methodSelect = screen.getByLabelText(/http method/i);
      await user.selectOptions(methodSelect, "POST");

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Original method should be displayed
      expect(screen.getByText("GET")).toBeInTheDocument();
    });
  });

  describe("Save functionality", () => {
    it("calls PATCH API with updated config on save", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="test-id-123" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const urlInput = screen.getByLabelText(/endpoint url/i);
      await user.clear(urlInput);
      await user.type(urlInput, "https://new-api.example.com/data");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/data-sources/test-id-123"),
          expect.objectContaining({
            method: "PATCH",
            body: expect.stringContaining("https://new-api.example.com/data"),
          })
        );
      });
    });

    it("shows loading state while saving", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });

    it("disables Cancel button while saving", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

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

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

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

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const urlInput = screen.getByLabelText(/endpoint url/i);
      await user.clear(urlInput);
      await user.type(urlInput, "https://new-api.example.com/data");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText("https://new-api.example.com/data")).toBeInTheDocument();
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
        <ApiConfigPanel
          config={createMockApiConfig()}
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

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

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

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        // Should still be in edit mode
        expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument();
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

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

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

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

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

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form validation", () => {
    it("disables Save button when URL is empty", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const urlInput = screen.getByLabelText(/endpoint url/i);
      await user.clear(urlInput);

      expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    });

    it("shows validation error for invalid URL", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const urlInput = screen.getByLabelText(/endpoint url/i);
      await user.clear(urlInput);
      await user.type(urlInput, "not-a-valid-url");

      // Blur to trigger validation
      await user.tab();

      expect(screen.getByText(/valid url/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper form labels", async () => {
      const user = userEvent.setup();
      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));

      // All form fields should have associated labels
      expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/http method/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/authentication type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sync frequency/i)).toBeInTheDocument();
    });

    it("uses proper aria attributes for error state", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Failed" }),
      });

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

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

      render(<ApiConfigPanel config={createMockApiConfig()} dataSourceId="1" />);

      await user.click(screen.getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      const saveButton = screen.getByRole("button", { name: /saving/i });
      expect(saveButton).toHaveAttribute("aria-busy", "true");
    });
  });
});
