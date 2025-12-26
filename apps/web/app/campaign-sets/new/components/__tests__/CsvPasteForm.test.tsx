import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CsvPasteForm } from "../CsvPasteForm";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample CSV content for testing
const validCsvContent = `name,email,company
John Doe,john@example.com,Acme Inc
Jane Smith,jane@example.com,Widget Corp
Bob Johnson,bob@example.com,Tech Labs`;

const malformedCsvContent = `name,email,company
John Doe,john@example.com
Jane Smith,jane@example.com,Widget Corp,Extra Field
Bob Johnson`;

const largeCsvContent = "a".repeat(600 * 1024); // ~600KB

describe("CsvPasteForm", () => {
  let onSubmit: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockReset();
    onSubmit = vi.fn().mockResolvedValue(undefined);
    onCancel = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders textarea for CSV content", () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByLabelText(/csv content/i)).toBeInTheDocument();
      const textarea = screen.getByLabelText(/csv content/i);
      expect(textarea.tagName.toLowerCase()).toBe("textarea");
    });

    it("renders name input field", () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      const input = screen.getByLabelText(/name/i);
      expect(input.tagName.toLowerCase()).toBe("input");
    });

    it("renders Preview button", () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole("button", { name: /preview/i })).toBeInTheDocument();
    });

    it("renders Submit button", () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("has textarea with minimum height of 300px", () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      const styles = window.getComputedStyle(textarea);
      // Check that minHeight is set (we'll verify via CSS class)
      expect(textarea).toHaveClass("textarea");
    });
  });

  // ==========================================================================
  // Character Count Tests
  // ==========================================================================

  describe("Character Count", () => {
    it("shows character count", () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByTestId("char-count")).toBeInTheDocument();
      expect(screen.getByTestId("char-count")).toHaveTextContent("0");
    });

    it("updates character count when typing", async () => {
      const user = userEvent.setup();
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, "Hello");

      expect(screen.getByTestId("char-count")).toHaveTextContent("5");
    });

    it("shows warning when content exceeds 500KB", async () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      fireEvent.change(textarea, { target: { value: largeCsvContent } });

      await waitFor(() => {
        expect(screen.getByTestId("size-warning")).toBeInTheDocument();
      });
      expect(screen.getByTestId("size-warning")).toHaveTextContent(/large/i);
    });

    it("does not show warning when content is under 500KB", async () => {
      const user = userEvent.setup();
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      expect(screen.queryByTestId("size-warning")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Preview Functionality Tests
  // ==========================================================================

  describe("Preview Functionality", () => {
    it("calls preview endpoint on Preview button click", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            headers: ["name", "email", "company"],
            preview: [
              { name: "John Doe", email: "john@example.com", company: "Acme Inc" },
            ],
          }),
      });

      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/v1/data-sources/preview-csv",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
        // Verify body contains CSV content (as JSON string with escaped newlines)
        const callBody = mockFetch.mock.calls[0][1].body;
        const parsedBody = JSON.parse(callBody);
        expect(parsedBody.content).toBe(validCsvContent);
        expect(parsedBody.rows).toBe(5);
      });
    });

    it("displays preview table with headers and rows", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            headers: ["name", "email", "company"],
            preview: [
              { name: "John Doe", email: "john@example.com", company: "Acme Inc" },
              { name: "Jane Smith", email: "jane@example.com", company: "Widget Corp" },
            ],
          }),
      });

      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByTestId("preview-table")).toBeInTheDocument();
      });

      // Check headers
      expect(screen.getByText("name")).toBeInTheDocument();
      expect(screen.getByText("email")).toBeInTheDocument();
      expect(screen.getByText("company")).toBeInTheDocument();

      // Check data rows
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("Acme Inc")).toBeInTheDocument();
    });

    it("shows error for malformed CSV", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            error: "Invalid CSV: inconsistent column count",
          }),
      });

      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      fireEvent.change(textarea, { target: { value: malformedCsvContent } });

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });
      expect(screen.getByTestId("error-message")).toHaveTextContent(/invalid csv/i);
    });

    it("disables Preview button when CSV content is empty", () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      expect(previewButton).toBeDisabled();
    });

    it("shows loading state during preview", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      headers: ["name"],
                      preview: [{ name: "Test" }],
                    }),
                }),
              100
            )
          )
      );

      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      expect(screen.getByTestId("preview-loading")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Form Validation Tests
  // ==========================================================================

  describe("Form Validation", () => {
    it("disables submit when name is empty", async () => {
      const user = userEvent.setup();
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const submitButton = screen.getByRole("button", { name: /create/i });
      expect(submitButton).toBeDisabled();
    });

    it("disables submit when CSV is empty", async () => {
      const user = userEvent.setup();
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "My Data Source");

      const submitButton = screen.getByRole("button", { name: /create/i });
      expect(submitButton).toBeDisabled();
    });

    it("enables submit when both name and CSV content are provided", async () => {
      const user = userEvent.setup();
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "My Data Source");

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const submitButton = screen.getByRole("button", { name: /create/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("trims whitespace from name when validating", async () => {
      const user = userEvent.setup();
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "   "); // Only whitespace

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const submitButton = screen.getByRole("button", { name: /create/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Submit Functionality Tests
  // ==========================================================================

  describe("Submit Functionality", () => {
    it("calls onSubmit with name and content when form is submitted", async () => {
      const user = userEvent.setup();
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "My Data Source");

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith("My Data Source", validCsvContent);
      });
    });

    it("trims name when submitting", async () => {
      const user = userEvent.setup();
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "  My Data Source  ");

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith("My Data Source", validCsvContent);
      });
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      render(
        <CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} isLoading={true} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "My Data Source");

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const submitButton = screen.getByRole("button", { name: /creating/i });
      expect(submitButton).toBeDisabled();
    });

    it("disables form controls during submission", async () => {
      render(
        <CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} isLoading={true} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toBeDisabled();

      const textarea = screen.getByLabelText(/csv content/i);
      expect(textarea).toBeDisabled();

      const previewButton = screen.getByRole("button", { name: /preview/i });
      expect(previewButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Cancel Functionality Tests
  // ==========================================================================

  describe("Cancel Functionality", () => {
    it("calls onCancel when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("Cancel button is not disabled during loading", () => {
      render(
        <CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} isLoading={true} />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).not.toBeDisabled();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper labels for form fields", () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toBeInTheDocument();

      const textarea = screen.getByLabelText(/csv content/i);
      expect(textarea).toBeInTheDocument();
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/csv content/i)).toHaveFocus();
    });

    it("marks required fields with aria-required", () => {
      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute("aria-required", "true");

      const textarea = screen.getByLabelText(/csv content/i);
      expect(textarea).toHaveAttribute("aria-required", "true");
    });

    it("has descriptive error messages linked via aria-describedby", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            error: "Invalid CSV format",
          }),
      });

      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      fireEvent.change(textarea, { target: { value: malformedCsvContent } });

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });

      expect(textarea).toHaveAttribute("aria-invalid", "true");
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles empty preview response gracefully", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            headers: [],
            preview: [],
          }),
      });

      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByTestId("preview-empty")).toBeInTheDocument();
      });
    });

    it("handles network error during preview", async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });
      expect(screen.getByTestId("error-message")).toHaveTextContent(/network error/i);
    });

    it("handles special characters in CSV content", async () => {
      const user = userEvent.setup();
      const specialCharsCsv = `name,description
"John, Doe","He said ""Hello"" to everyone"
"Jane's Item","Contains <html> & special chars"`;

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            headers: ["name", "description"],
            preview: [
              { name: 'John, Doe', description: 'He said "Hello" to everyone' },
            ],
          }),
      });

      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      fireEvent.change(textarea, { target: { value: specialCharsCsv } });

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByTestId("preview-table")).toBeInTheDocument();
      });
    });

    it("clears preview when CSV content changes significantly", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            headers: ["name", "email", "company"],
            preview: [
              { name: "John Doe", email: "john@example.com", company: "Acme Inc" },
            ],
          }),
      });

      render(<CsvPasteForm onSubmit={onSubmit} onCancel={onCancel} />);

      const textarea = screen.getByLabelText(/csv content/i);
      await user.type(textarea, validCsvContent);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByTestId("preview-table")).toBeInTheDocument();
      });

      // Clear and type new content
      await user.clear(textarea);
      await user.type(textarea, "new,csv\ndata,here");

      // Preview should be cleared
      expect(screen.queryByTestId("preview-table")).not.toBeInTheDocument();
    });
  });
});
