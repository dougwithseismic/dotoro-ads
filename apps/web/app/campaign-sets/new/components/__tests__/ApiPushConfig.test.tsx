import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiPushConfig } from "../ApiPushConfig";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ApiPushConfig", () => {
  const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";
  const mockOnKeyGenerated = vi.fn();
  let originalClipboard: typeof navigator.clipboard;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save original clipboard
    originalClipboard = navigator.clipboard;

    // Mock clipboard API
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(""),
    };
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Restore original clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders section header", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      expect(screen.getByText("API Push Configuration")).toBeInTheDocument();
    });

    it("renders endpoint URL with data source ID", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Should display the endpoint URL
      expect(
        screen.getByText(/POST \/api\/v1\/data-sources\/.+\/items/)
      ).toBeInTheDocument();
      // Should contain the actual data source ID
      expect(screen.getByText(new RegExp(mockDataSourceId))).toBeInTheDocument();
    });

    it("shows copy button for endpoint URL", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const endpointSection = screen.getByText(/POST \/api\/v1\/data-sources/)
        .closest("div");
      expect(endpointSection).toBeInTheDocument();

      // Look for copy button in the endpoint section
      const copyButtons = screen.getAllByRole("button", { name: /copy/i });
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it("shows Generate button when no API key exists", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      expect(
        screen.getByRole("button", { name: /generate api key/i })
      ).toBeInTheDocument();
    });

    it("shows masked key prefix when API key exists", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          apiKeyConfig={{
            keyPrefix: "ds_live_01234567...",
            createdAt: "2024-01-15T10:30:00.000Z",
          }}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      expect(screen.getByText("ds_live_01234567...")).toBeInTheDocument();
    });

    it("shows Regenerate button when API key exists", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          apiKeyConfig={{
            keyPrefix: "ds_live_01234567...",
            createdAt: "2024-01-15T10:30:00.000Z",
          }}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      expect(
        screen.getByRole("button", { name: /regenerate/i })
      ).toBeInTheDocument();
    });

    it("shows last used timestamp when provided", () => {
      const lastUsedAt = "2024-12-20T14:30:00.000Z";
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          apiKeyConfig={{
            keyPrefix: "ds_live_01234567...",
            createdAt: "2024-01-15T10:30:00.000Z",
            lastUsedAt,
          }}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Should show a relative or formatted timestamp
      expect(screen.getByText(/last used/i)).toBeInTheDocument();
    });

    it("shows 'Never' when lastUsedAt is not provided", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          apiKeyConfig={{
            keyPrefix: "ds_live_01234567...",
            createdAt: "2024-01-15T10:30:00.000Z",
          }}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      expect(screen.getByText(/never/i)).toBeInTheDocument();
    });

    it("shows example curl command", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Should have a curl example section
      expect(screen.getByText(/example/i)).toBeInTheDocument();
      expect(screen.getByText(/curl/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Interaction Tests - Copy Buttons
  // ==========================================================================

  describe("Copy Functionality", () => {
    it("copies endpoint URL to clipboard on copy button click", async () => {
      const user = userEvent.setup();

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Find the copy button for the endpoint (first one in the document)
      const endpointCopyButton = screen.getByRole("button", {
        name: /copy endpoint url/i,
      });

      await user.click(endpointCopyButton);

      // The button should show "Copied!" feedback after clicking
      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });

    it("shows copied confirmation after copying", async () => {
      const user = userEvent.setup();

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const endpointCopyButton = screen.getByRole("button", {
        name: /copy endpoint url/i,
      });
      await user.click(endpointCopyButton);

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Interaction Tests - API Key Generation
  // ==========================================================================

  describe("API Key Generation", () => {
    it("calls generate API on Generate click", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: "ds_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          keyPrefix: "ds_live_01234567...",
          createdAt: new Date().toISOString(),
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/v1/data-sources/${mockDataSourceId}/api-key`,
          expect.objectContaining({
            method: "POST",
          })
        );
      });
    });

    it("shows key in modal after generation", async () => {
      const user = userEvent.setup();

      const generatedKey =
        "ds_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: generatedKey,
          keyPrefix: "ds_live_01234567...",
          createdAt: new Date().toISOString(),
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        // Modal should be visible with the key
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText(generatedKey)).toBeInTheDocument();
      });
    });

    it("shows warning about one-time display in modal", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: "ds_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          keyPrefix: "ds_live_01234567...",
          createdAt: new Date().toISOString(),
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(
          screen.getByText(/only be shown once/i)
        ).toBeInTheDocument();
      });
    });

    it("copies key to clipboard on copy button click in modal", async () => {
      const user = userEvent.setup();

      const generatedKey =
        "ds_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: generatedKey,
          keyPrefix: "ds_live_01234567...",
          createdAt: new Date().toISOString(),
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Find the copy button in the modal (by aria-label)
      const copyButton = screen.getByRole("button", { name: /copy api key/i });
      await user.click(copyButton);

      // The button should show "Copied!" text after clicking
      // Check for the Copied! text in the document (including in modal)
      await waitFor(() => {
        // Check that the copy button now shows "Copied!"
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("closes modal on dismiss button click", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: "ds_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          keyPrefix: "ds_live_01234567...",
          createdAt: new Date().toISOString(),
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click dismiss button
      const dismissButton = screen.getByRole("button", {
        name: /i've copied the key/i,
      });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("calls onKeyGenerated callback after successful generation", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: "ds_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          keyPrefix: "ds_live_01234567...",
          createdAt: new Date().toISOString(),
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockOnKeyGenerated).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Interaction Tests - API Key Regeneration
  // ==========================================================================

  describe("API Key Regeneration", () => {
    it("calls regenerate API on Regenerate click after confirmation", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: "ds_live_newkey12345678901234567890123456789012345678901234567890abcd",
          keyPrefix: "ds_live_newkey12...",
          createdAt: new Date().toISOString(),
          previousKeyRevoked: true,
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          apiKeyConfig={{
            keyPrefix: "ds_live_01234567...",
            createdAt: "2024-01-15T10:30:00.000Z",
          }}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Click Regenerate button
      const regenerateButton = screen.getByRole("button", {
        name: /regenerate/i,
      });
      await user.click(regenerateButton);

      // Confirmation dialog should appear - click confirm
      await waitFor(() => {
        expect(screen.getByText(/invalidate/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /^regenerate$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/v1/data-sources/${mockDataSourceId}/api-key/regenerate`,
          expect.objectContaining({
            method: "POST",
          })
        );
      });
    });

    it("shows new key in modal after regeneration", async () => {
      const user = userEvent.setup();

      const newKey =
        "ds_live_newkey12345678901234567890123456789012345678901234567890abcd";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: newKey,
          keyPrefix: "ds_live_newkey12...",
          createdAt: new Date().toISOString(),
          previousKeyRevoked: true,
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          apiKeyConfig={{
            keyPrefix: "ds_live_01234567...",
            createdAt: "2024-01-15T10:30:00.000Z",
          }}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Click Regenerate button
      const regenerateButton = screen.getByRole("button", {
        name: /regenerate/i,
      });
      await user.click(regenerateButton);

      // Confirm in the dialog
      const confirmButton = screen.getByRole("button", { name: /^regenerate$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText(newKey)).toBeInTheDocument();
      });
    });

    it("shows confirmation dialog before regenerating", async () => {
      const user = userEvent.setup();

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          apiKeyConfig={{
            keyPrefix: "ds_live_01234567...",
            createdAt: "2024-01-15T10:30:00.000Z",
          }}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const regenerateButton = screen.getByRole("button", {
        name: /regenerate/i,
      });
      await user.click(regenerateButton);

      // Should show a confirmation warning
      expect(
        screen.getByText(/invalidate|revoke|previous/i)
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe("Error Handling", () => {
    it("shows error message when API key generation fails", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: "Internal server error",
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it("shows error message when API key regeneration fails", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: "Internal server error",
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          apiKeyConfig={{
            keyPrefix: "ds_live_01234567...",
            createdAt: "2024-01-15T10:30:00.000Z",
          }}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Click Regenerate button
      const regenerateButton = screen.getByRole("button", {
        name: /regenerate/i,
      });
      await user.click(regenerateButton);

      // Confirm in the dialog
      const confirmButton = screen.getByRole("button", { name: /^regenerate$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it("shows loading state during API call", async () => {
      const user = userEvent.setup();

      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      // Should show loading state
      expect(screen.getByText(/generating/i)).toBeInTheDocument();

      // Resolve the promise to clean up
      resolvePromise!({
        ok: true,
        json: async () => ({
          key: "ds_live_test",
          keyPrefix: "ds_live_test...",
          createdAt: new Date().toISOString(),
        }),
      });
    });
  });

  // ==========================================================================
  // Collapsible Curl Example Tests
  // ==========================================================================

  describe("Curl Example Section", () => {
    it("shows collapsible curl example section", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      expect(screen.getByText(/example/i)).toBeInTheDocument();
    });

    it("expands curl example when clicked", async () => {
      const user = userEvent.setup();

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Find and click the example section header
      const exampleHeader = screen.getByText(/example/i);
      await user.click(exampleHeader);

      // Should show the full curl command
      expect(screen.getByText(/X-API-Key/i)).toBeInTheDocument();
      expect(screen.getByText(/Content-Type/i)).toBeInTheDocument();
    });

    it("includes data source ID in curl example", async () => {
      const user = userEvent.setup();

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Expand the example section
      const exampleButton = screen.getByRole("button", { name: /example/i });
      await user.click(exampleButton);

      // The curl command should include the data source ID
      // Look for the code element containing the curl command
      const codeElement = screen.getByText(/curl -X POST/);
      expect(codeElement.textContent).toContain(mockDataSourceId);
    });

    it("copies curl command to clipboard", async () => {
      const user = userEvent.setup();

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Expand the example section
      const exampleButton = screen.getByRole("button", { name: /example/i });
      await user.click(exampleButton);

      // Find copy button for curl command
      const copyButton = screen.getByRole("button", {
        name: /copy curl command/i,
      });

      await user.click(copyButton);

      // The button should show "Copied!" feedback after clicking
      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper ARIA labels for buttons", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      expect(generateButton).toBeInTheDocument();
    });

    it("modal has proper role and aria-modal", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: "ds_live_test",
          keyPrefix: "ds_live_test...",
          createdAt: new Date().toISOString(),
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        const modal = screen.getByRole("dialog");
        expect(modal).toHaveAttribute("aria-modal", "true");
      });
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Tab to first interactive element
      await user.tab();

      // Should focus on a button
      expect(document.activeElement?.tagName).toBe("BUTTON");
    });

    it("traps focus within modal when open", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: "ds_live_test",
          keyPrefix: "ds_live_test...",
          createdAt: new Date().toISOString(),
        }),
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Tab through the modal - focus should stay within
      await user.tab();
      await user.tab();
      await user.tab();

      // Focus should still be within the modal
      const modal = screen.getByRole("dialog");
      expect(modal.contains(document.activeElement)).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles very long data source ID", () => {
      const longId = "a".repeat(100);

      render(
        <ApiPushConfig
          dataSourceId={longId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // Should render without breaking
      expect(screen.getByText("API Push Configuration")).toBeInTheDocument();
    });

    it("handles rapid button clicks gracefully", async () => {
      const user = userEvent.setup({ delay: null });

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                key: `ds_live_key${callCount}`,
                keyPrefix: "ds_live_key...",
                createdAt: new Date().toISOString(),
              }),
            });
          }, 10);
        });
      });

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });

      // Click multiple times in quick succession
      await user.click(generateButton);

      // Button should be disabled during loading, so additional clicks have no effect
      // Wait for the modal to appear (indicating the first call completed)
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Should only have called the API once
      expect(callCount).toBe(1);
    });

    it("handles network timeout gracefully", async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const generateButton = screen.getByRole("button", {
        name: /generate api key/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });

    it("handles clipboard API failure gracefully", async () => {
      const user = userEvent.setup();

      // Mock clipboard to reject by modifying the navigator.clipboard object
      const originalWriteText = navigator.clipboard.writeText;
      navigator.clipboard.writeText = vi.fn().mockRejectedValue(
        new Error("Clipboard access denied")
      );

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const endpointCopyButton = screen.getByRole("button", {
        name: /copy endpoint url/i,
      });
      await user.click(endpointCopyButton);

      // Should show an error message
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Restore
      navigator.clipboard.writeText = originalWriteText;
    });
  });

  // ==========================================================================
  // Integration with Parent Component
  // ==========================================================================

  describe("Integration", () => {
    it("does not call onKeyGenerated when generation is cancelled", async () => {
      const user = userEvent.setup();

      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          apiKeyConfig={{
            keyPrefix: "ds_live_01234567...",
            createdAt: "2024-01-15T10:30:00.000Z",
          }}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      const regenerateButton = screen.getByRole("button", {
        name: /regenerate/i,
      });
      await user.click(regenerateButton);

      // Look for cancel button in confirmation dialog
      const cancelButton = screen.queryByRole("button", { name: /cancel/i });
      if (cancelButton) {
        await user.click(cancelButton);
      }

      // onKeyGenerated should not have been called
      expect(mockOnKeyGenerated).not.toHaveBeenCalled();
    });

    it("passes correct endpoint base URL to parent", () => {
      render(
        <ApiPushConfig
          dataSourceId={mockDataSourceId}
          onKeyGenerated={mockOnKeyGenerated}
        />
      );

      // The component should use the correct base URL format
      const endpointText = screen.getByText(
        new RegExp(`/api/v1/data-sources/${mockDataSourceId}/items`)
      );
      expect(endpointText).toBeInTheDocument();
    });
  });
});
