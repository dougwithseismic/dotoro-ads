import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiDataSourceForm } from "../ApiDataSourceForm";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ApiDataSourceForm", () => {
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
    it("renders all required form fields", () => {
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Name field
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();

      // URL field
      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();

      // Method select
      expect(screen.getByLabelText(/method/i)).toBeInTheDocument();

      // Auth Type select
      expect(screen.getByLabelText(/auth.*type/i)).toBeInTheDocument();

      // Data Path field
      expect(screen.getByLabelText(/data.*path/i)).toBeInTheDocument();

      // Array Handling select
      expect(screen.getByLabelText(/array.*handling/i)).toBeInTheDocument();

      // Sync Frequency select
      expect(screen.getByLabelText(/sync.*frequency/i)).toBeInTheDocument();
    });

    it("shows body field only for POST method", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Body field should not be visible initially (GET is default)
      expect(screen.queryByLabelText(/request.*body/i)).not.toBeInTheDocument();

      // Change method to POST
      const methodSelect = screen.getByLabelText(/method/i);
      await user.selectOptions(methodSelect, "POST");

      // Body field should now be visible
      expect(screen.getByLabelText(/request.*body/i)).toBeInTheDocument();
    });

    it("hides body field for GET method", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Change to POST first
      const methodSelect = screen.getByLabelText(/method/i);
      await user.selectOptions(methodSelect, "POST");

      // Body should be visible
      expect(screen.getByLabelText(/request.*body/i)).toBeInTheDocument();

      // Change back to GET
      await user.selectOptions(methodSelect, "GET");

      // Body should be hidden
      expect(screen.queryByLabelText(/request.*body/i)).not.toBeInTheDocument();
    });

    it("shows auth value field based on auth type", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Auth value field should not be visible initially (none is default)
      expect(screen.queryByLabelText(/api.*key.*value|token|credentials/i)).not.toBeInTheDocument();

      // Change auth type to bearer
      const authTypeSelect = screen.getByLabelText(/auth.*type/i);
      await user.selectOptions(authTypeSelect, "bearer");

      // Auth value field should now be visible
      expect(screen.getByLabelText(/bearer.*token/i)).toBeInTheDocument();
    });

    it("shows appropriate auth value label for api-key auth type", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      const authTypeSelect = screen.getByLabelText(/auth.*type/i);
      await user.selectOptions(authTypeSelect, "api-key");

      expect(screen.getByLabelText(/api.*key/i)).toBeInTheDocument();
    });

    it("shows appropriate auth value label for basic auth type", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      const authTypeSelect = screen.getByLabelText(/auth.*type/i);
      await user.selectOptions(authTypeSelect, "basic");

      expect(screen.getByLabelText(/credentials/i)).toBeInTheDocument();
    });

    it("renders headers editor component", () => {
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText("Headers")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add.*header/i })).toBeInTheDocument();
    });

    it("renders Test Connection button", () => {
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole("button", { name: /test.*connection/i })).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("renders Submit button", () => {
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Test Connection Tests
  // ==========================================================================

  describe("Test Connection", () => {
    it("calls test-connection endpoint", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            columns: ["id", "name", "email"],
            preview: [
              { id: "1", name: "John", email: "john@test.com" },
            ],
            rowCount: 1,
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), "Test API Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      // Click test connection
      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/v1/data-sources/api-fetch/test-connection",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
      });

      // Verify request body
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.url).toBe("https://api.example.com/data");
      expect(callBody.method).toBe("GET");
    });

    it("shows preview on success", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            columns: ["id", "name", "email"],
            preview: [
              { id: "1", name: "John Doe", email: "john@test.com" },
              { id: "2", name: "Jane Smith", email: "jane@test.com" },
            ],
            rowCount: 2,
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test API Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByTestId("preview-table")).toBeInTheDocument();
      });

      // Check headers
      expect(screen.getByText("id")).toBeInTheDocument();
      expect(screen.getByText("name")).toBeInTheDocument();
      expect(screen.getByText("email")).toBeInTheDocument();

      // Check data
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("jane@test.com")).toBeInTheDocument();
    });

    it("shows detected columns count on success", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            columns: ["id", "name", "email", "company"],
            preview: [{ id: "1", name: "John", email: "john@test.com", company: "Acme" }],
            rowCount: 1,
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test API Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/4.*columns/i)).toBeInTheDocument();
      });
    });

    it("shows error on failure", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: "Failed to connect: Connection refused",
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test API Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });
      expect(screen.getByTestId("error-message")).toHaveTextContent(/connection refused/i);
    });

    it("validates URL before testing", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test API Source");
      await user.type(screen.getByLabelText(/url/i), "not-a-valid-url");

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      // Should show validation error, not call API
      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });
      expect(screen.getByTestId("error-message")).toHaveTextContent(/valid.*url/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("disables test button when URL is empty", () => {
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      expect(testButton).toBeDisabled();
    });

    it("shows loading state during test", async () => {
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
                      success: true,
                      columns: ["id"],
                      preview: [{ id: "1" }],
                      rowCount: 1,
                    }),
                }),
              100
            )
          )
      );

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test API Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      expect(screen.getByTestId("test-loading")).toBeInTheDocument();
    });

    it("includes headers in test connection request", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            columns: ["id"],
            preview: [{ id: "1" }],
            rowCount: 1,
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Use fireEvent for faster input
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test API Source" } });
      fireEvent.change(screen.getByLabelText(/url/i), { target: { value: "https://api.example.com/data" } });

      // Add a header
      const addHeaderButton = screen.getByRole("button", { name: /add.*header/i });
      await user.click(addHeaderButton);

      // Wait for the header row to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/key/i)).toBeInTheDocument();
      });

      // Fill in header using fireEvent.change - each event triggers state update
      const keyInput = screen.getByPlaceholderText(/key/i);
      fireEvent.change(keyInput, { target: { value: "X-Custom-Header" } });

      // Wait for re-render and get the updated value input
      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText(/value/i);
        expect(inputs.length).toBeGreaterThan(0);
      });

      const valueInput = screen.getByPlaceholderText(/value/i);
      fireEvent.change(valueInput, { target: { value: "custom-value" } });

      // Trigger test connection
      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Verify headers were sent
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.headers).toBeDefined();
    });

    it("includes auth config in test connection request", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            columns: ["id"],
            preview: [{ id: "1" }],
            rowCount: 1,
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test API Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      // Set auth type
      const authTypeSelect = screen.getByLabelText(/auth.*type/i);
      await user.selectOptions(authTypeSelect, "bearer");
      await user.type(screen.getByLabelText(/bearer.*token/i), "my-secret-token");

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.auth).toEqual({ type: "bearer", value: "my-secret-token" });
      });
    });

    it("includes body for POST method in test connection", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            columns: ["id"],
            preview: [{ id: "1" }],
            rowCount: 1,
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Use fireEvent for faster input
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test API Source" } });
      fireEvent.change(screen.getByLabelText(/url/i), { target: { value: "https://api.example.com/data" } });

      // Change to POST
      const methodSelect = screen.getByLabelText(/method/i);
      await user.selectOptions(methodSelect, "POST");

      // Wait for body textarea to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/request.*body/i)).toBeInTheDocument();
      });

      // Add body using fireEvent to avoid special character issues
      const bodyTextarea = screen.getByLabelText(/request.*body/i);
      fireEvent.change(bodyTextarea, { target: { value: '{"query": "test"}' } });

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.method).toBe("POST");
        expect(callBody.body).toBe('{"query": "test"}');
      });
    });

    it("includes data path in test connection request", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            columns: ["id"],
            preview: [{ id: "1" }],
            rowCount: 1,
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test API Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");
      await user.type(screen.getByLabelText(/data.*path/i), "$.response.data");

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.dataPath).toBe("$.response.data");
      });
    });
  });

  // ==========================================================================
  // Form Validation Tests
  // ==========================================================================

  describe("Form Validation", () => {
    it("requires name and URL", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      const submitButton = screen.getByRole("button", { name: /create/i });
      expect(submitButton).toBeDisabled();

      // Add name only
      await user.type(screen.getByLabelText(/name/i), "Test Source");
      expect(submitButton).toBeDisabled();

      // Add URL
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");
      expect(submitButton).not.toBeDisabled();
    });

    it("validates URL format", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test Source" } });
      fireEvent.change(screen.getByLabelText(/url/i), { target: { value: "invalid-url" } });

      // The submit button should be disabled when URL is invalid
      const submitButton = screen.getByRole("button", { name: /create/i });
      expect(submitButton).toBeDisabled();

      // Clicking test connection should show validation error
      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        const errorMessage = screen.getByTestId("error-message");
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent(/url/i);
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("validates JSON body for POST", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test Source" } });
      fireEvent.change(screen.getByLabelText(/url/i), { target: { value: "https://api.example.com/data" } });

      // Change to POST
      const methodSelect = screen.getByLabelText(/method/i);
      await user.selectOptions(methodSelect, "POST");

      // Wait for body textarea to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/request.*body/i)).toBeInTheDocument();
      });

      // Add invalid JSON body using fireEvent
      const bodyTextarea = screen.getByLabelText(/request.*body/i);
      fireEvent.change(bodyTextarea, { target: { value: "{ invalid json }" } });

      // Submit button is disabled because body is invalid
      const submitButton = screen.getByRole("button", { name: /create/i });
      expect(submitButton).toBeDisabled();

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("allows empty body for POST", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      // Change to POST
      const methodSelect = screen.getByLabelText(/method/i);
      await user.selectOptions(methodSelect, "POST");

      // Leave body empty
      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it("requires auth value when auth type is not none", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test Source" } });
      fireEvent.change(screen.getByLabelText(/url/i), { target: { value: "https://api.example.com/data" } });

      // Set auth type but leave value empty
      const authTypeSelect = screen.getByLabelText(/auth.*type/i);
      await user.selectOptions(authTypeSelect, "bearer");

      // Wait for auth value field to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/bearer.*token/i)).toBeInTheDocument();
      });

      // Submit button should be disabled because auth value is empty
      const submitButton = screen.getByRole("button", { name: /create/i });
      expect(submitButton).toBeDisabled();

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("trims whitespace from name when validating", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "   ");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      const submitButton = screen.getByRole("button", { name: /create/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Headers Editor Tests
  // ==========================================================================

  describe("Headers Editor", () => {
    it("adds new header row", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      const addButton = screen.getByRole("button", { name: /add.*header/i });
      await user.click(addButton);

      // Wait for input fields to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/key/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/value/i)).toBeInTheDocument();
      });
    });

    it("removes header row", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Add a header
      const addButton = screen.getByRole("button", { name: /add.*header/i });
      await user.click(addButton);

      // Wait for header row to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/key/i)).toBeInTheDocument();
      });

      // Fill in the header
      const keyInput = screen.getByPlaceholderText(/key/i);
      await user.type(keyInput, "X-Custom");

      // Remove the header
      const removeButton = screen.getByRole("button", { name: /remove.*header/i });
      await user.click(removeButton);

      // Should no longer have the input fields
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/key/i)).not.toBeInTheDocument();
      });
    });

    it("renders headers editor and allows interaction", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Verify headers editor is rendered
      expect(screen.getByText("Headers")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add.*header/i })).toBeInTheDocument();

      // Add a header
      const addButton = screen.getByRole("button", { name: /add.*header/i });
      await user.click(addButton);

      // Wait for header row to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/key/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/value/i)).toBeInTheDocument();
      });

      // Verify remove button appears
      expect(screen.getByRole("button", { name: /remove.*header/i })).toBeInTheDocument();
    });

  });

  // ==========================================================================
  // Submit Tests
  // ==========================================================================

  describe("Submit", () => {
    it("calls onSubmit with form data", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "My API Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          "My API Source",
          expect.objectContaining({
            url: "https://api.example.com/data",
            method: "GET",
            syncFrequency: "manual",
          })
        );
      });
    });

    it("includes flatten config in submission", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "My API Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      // Set array handling
      const arrayHandlingSelect = screen.getByLabelText(/array.*handling/i);
      await user.selectOptions(arrayHandlingSelect, "expand");

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          "My API Source",
          expect.objectContaining({
            flatten: { arrayHandling: "expand" },
          })
        );
      });
    });

    it("includes basic form fields in submission", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Fill basic fields using fireEvent for consistency
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Complete API Source" } });
      fireEvent.change(screen.getByLabelText(/url/i), { target: { value: "https://api.example.com/data" } });

      fireEvent.change(screen.getByLabelText(/data.*path/i), { target: { value: "$.data.items" } });

      const arrayHandlingSelect = screen.getByLabelText(/array.*handling/i);
      await user.selectOptions(arrayHandlingSelect, "join");

      const syncFrequencySelect = screen.getByLabelText(/sync.*frequency/i);
      await user.selectOptions(syncFrequencySelect, "6h");

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          "Complete API Source",
          expect.objectContaining({
            url: "https://api.example.com/data",
            method: "GET",
            dataPath: "$.data.items",
            flatten: { arrayHandling: "join" },
            syncFrequency: "6h",
          })
        );
      });
    });

    it("trims name when submitting", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "  My API Source  ");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          "My API Source",
          expect.anything()
        );
      });
    });

    it("shows loading state during submission", () => {
      render(
        <ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} isLoading={true} />
      );

      const submitButton = screen.getByRole("button", { name: /creating/i });
      expect(submitButton).toBeDisabled();
    });

    it("disables form controls during submission", () => {
      render(
        <ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} isLoading={true} />
      );

      expect(screen.getByLabelText(/name/i)).toBeDisabled();
      expect(screen.getByLabelText(/url/i)).toBeDisabled();
      expect(screen.getByLabelText(/method/i)).toBeDisabled();
    });
  });

  // ==========================================================================
  // Cancel Tests
  // ==========================================================================

  describe("Cancel", () => {
    it("calls onCancel when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("Cancel button is not disabled during loading", () => {
      render(
        <ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} isLoading={true} />
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
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/method/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/auth.*type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sync.*frequency/i)).toBeInTheDocument();
    });

    it("marks required fields appropriately", () => {
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute("aria-required", "true");

      const urlInput = screen.getByLabelText(/url/i);
      expect(urlInput).toHaveAttribute("aria-required", "true");
    });

    it("has descriptive error messages linked via aria-describedby", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test Source" } });
      fireEvent.change(screen.getByLabelText(/url/i), { target: { value: "invalid-url" } });

      // Click test connection to trigger validation error
      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        const errorMessage = screen.getByTestId("error-message");
        expect(errorMessage).toHaveAttribute("role", "alert");
      });
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/url/i)).toHaveFocus();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles network error during test connection", async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });
      expect(screen.getByTestId("error-message")).toHaveTextContent(/network error/i);
    });

    it("clears preview when URL changes", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            columns: ["id"],
            preview: [{ id: "1" }],
            rowCount: 1,
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByTestId("preview-table")).toBeInTheDocument();
      });

      // Change URL
      const urlInput = screen.getByLabelText(/url/i);
      await user.clear(urlInput);
      await user.type(urlInput, "https://api.example.com/other");

      // Preview should be cleared
      expect(screen.queryByTestId("preview-table")).not.toBeInTheDocument();
    });

    it("handles empty response from API", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            columns: [],
            preview: [],
            rowCount: 0,
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test Source");
      await user.type(screen.getByLabelText(/url/i), "https://api.example.com/data");

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByTestId("preview-empty")).toBeInTheDocument();
      });
    });

    it("allows special characters in URL", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            columns: ["id"],
            preview: [{ id: "1" }],
            rowCount: 1,
          }),
      });

      render(<ApiDataSourceForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/name/i), "Test Source");
      await user.type(
        screen.getByLabelText(/url/i),
        "https://api.example.com/data?param=value&other=123"
      );

      const testButton = screen.getByRole("button", { name: /test.*connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });
});
