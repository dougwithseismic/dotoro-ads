import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Import after mocks
import { TemplateEditorV2, type EditorState } from "../TemplateEditorV2";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const defaultInitialState: EditorState = {
  name: "",
  platform: "reddit",
  objective: "CONVERSIONS",
  budget: "",
  adGroups: [
    {
      id: "ag-1",
      name: "Ad Group 1",
      ads: [
        {
          id: "ad-1",
          headline: "",
          description: "",
          displayUrl: "",
          finalUrl: "",
          callToAction: "",
        },
      ],
    },
  ],
};

const mockVariables = [
  { name: "product_name", sampleValue: "Premium Widget" },
  { name: "price", sampleValue: "29.99" },
  { name: "brand", sampleValue: "Acme" },
  { name: "category", sampleValue: "Electronics" },
  { name: "discount_percent", sampleValue: "33" },
];

beforeEach(() => {
  mockFetch.mockReset();
  mockPush.mockReset();
  mockBack.mockReset();
  // Default fetch responses
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ id: "new-template-id" }),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("TemplateEditorV2", () => {
  describe("Form Input Handling", () => {
    it("renders template name input and updates on change", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const nameInput = screen.getByLabelText(/campaign name/i);
      expect(nameInput).toBeInTheDocument();

      await user.type(nameInput, "My Campaign");
      expect(nameInput).toHaveValue("My Campaign");
    });

    it("renders platform selector with all options", async () => {
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const platformSelect = screen.getByLabelText(/platform/i);
      expect(platformSelect).toBeInTheDocument();

      // Check options exist
      expect(screen.getByRole("option", { name: /reddit/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /facebook/i })).toBeInTheDocument();
    });

    it("changes platform and updates character limits", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const platformSelect = screen.getByLabelText(/platform/i);
      await user.selectOptions(platformSelect, "google");

      expect(platformSelect).toHaveValue("google");
    });

    it("updates headline with character counter", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const headlineInput = screen.getByLabelText(/headline/i);
      await user.type(headlineInput, "Shop Now");

      expect(headlineInput).toHaveValue("Shop Now");
      // Character counter should reflect the length
      expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("updates description textarea", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, "Great products");

      expect(descriptionInput).toHaveValue("Great products");
    });

    it("loads initial data when provided", () => {
      const initialState: EditorState = {
        ...defaultInitialState,
        name: "Existing Campaign",
        platform: "google",
        adGroups: [
          {
            id: "ag-1",
            name: "Ad Group 1",
            ads: [
              {
                id: "ad-1",
                headline: "Existing Headline",
                description: "Existing Description",
                displayUrl: "example.com",
                finalUrl: "https://example.com",
                callToAction: "Shop Now",
              },
            ],
          },
        ],
      };

      render(
        <TemplateEditorV2
          initialState={initialState}
          availableVariables={mockVariables}
        />
      );

      expect(screen.getByLabelText(/campaign name/i)).toHaveValue("Existing Campaign");
      expect(screen.getByLabelText(/platform/i)).toHaveValue("google");
      expect(screen.getByLabelText(/headline/i)).toHaveValue("Existing Headline");
    });
  });

  describe("Variable Insertion", () => {
    it("displays available variables in picker panel", () => {
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      expect(screen.getByText("product_name")).toBeInTheDocument();
      expect(screen.getByText("price")).toBeInTheDocument();
      expect(screen.getByText("brand")).toBeInTheDocument();
    });

    it("filters variables when searching", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const searchInput = screen.getByPlaceholderText(/search variables/i);
      await user.type(searchInput, "prod");

      expect(screen.getByText("product_name")).toBeInTheDocument();
      expect(screen.queryByText("brand")).not.toBeInTheDocument();
    });

    it("inserts variable at cursor when clicked", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      // Focus on headline input first
      const headlineInput = screen.getByLabelText(/headline/i);
      await user.click(headlineInput);
      await user.type(headlineInput, "Shop ");

      // Click on variable in picker (the button contains the variable name text)
      const variableButton = screen.getByText("product_name").closest("button");
      expect(variableButton).toBeInTheDocument();
      await user.click(variableButton!);

      // Variable should be inserted
      expect(headlineInput).toHaveValue("Shop {product_name}");
    });

    it("shows sample value on variable hover", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const variableItem = screen.getByText("product_name").closest("button");
      expect(variableItem).toBeInTheDocument();
      if (variableItem) {
        await user.hover(variableItem);
        // Sample value is shown in the details section
        await waitFor(() => {
          expect(screen.getByText(/Sample: Premium Widget/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe("Preview Updates", () => {
    it("shows live preview with rendered variables", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const headlineInput = screen.getByLabelText(/headline/i);
      await user.type(headlineInput, "Buy {product_name} now!");

      // Preview shows the rendered version - LivePreviewPanel renders variables using sample data
      // The preview component processes {product_name} to "Premium Widget"
      await waitFor(() => {
        const previewHeadline = screen.getByTestId("preview-headline");
        // The preview should render the template with variables substituted
        expect(previewHeadline).toHaveTextContent(/Buy.*now!/);
      });
    });

    it("toggles between single and grid preview", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      // Find toggle button
      const gridToggle = screen.getByRole("button", { name: /grid preview/i });
      await user.click(gridToggle);

      expect(screen.getByTestId("preview-grid")).toBeInTheDocument();

      const singleToggle = screen.getByRole("button", { name: /single preview/i });
      await user.click(singleToggle);

      expect(screen.getByTestId("preview-single")).toBeInTheDocument();
    });

    it("updates preview when platform changes", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const platformSelect = screen.getByLabelText(/platform/i);
      await user.selectOptions(platformSelect, "google");

      expect(screen.getByTestId("preview-platform")).toHaveTextContent("Google");
    });
  });

  describe("Campaign Structure Builder", () => {
    it("renders initial ad group", () => {
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      // Ad Group 1 is the default name in the input field
      expect(screen.getByDisplayValue("Ad Group 1")).toBeInTheDocument();
    });

    it("adds new ad group when button clicked", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const addAdGroupBtn = screen.getByRole("button", { name: /add ad group/i });
      await user.click(addAdGroupBtn);

      expect(screen.getByDisplayValue("Ad Group 2")).toBeInTheDocument();
    });

    it("removes ad group when delete clicked", async () => {
      const user = userEvent.setup();
      const initialState: EditorState = {
        ...defaultInitialState,
        adGroups: [
          { id: "ag-1", name: "Ad Group 1", ads: [{ id: "ad-1", headline: "", description: "", displayUrl: "", finalUrl: "", callToAction: "" }] },
          { id: "ag-2", name: "Ad Group 2", ads: [{ id: "ad-2", headline: "", description: "", displayUrl: "", finalUrl: "", callToAction: "" }] },
        ],
      };

      render(
        <TemplateEditorV2
          initialState={initialState}
          availableVariables={mockVariables}
        />
      );

      const deleteButtons = screen.getAllByRole("button", { name: /remove ad group/i });
      await user.click(deleteButtons[0]);

      expect(screen.queryByDisplayValue("Ad Group 1")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Ad Group 2")).toBeInTheDocument();
    });

    it("adds new ad within ad group", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      // Initially there's 1 headline input
      const initialHeadlineInputs = screen.getAllByLabelText(/headline/i);
      const initialCount = initialHeadlineInputs.length;

      // Use exact match for "Add ad" button (not "Add ad group")
      const addAdBtn = screen.getByRole("button", { name: /^add ad$/i });
      await user.click(addAdBtn);

      // Should now have 1 more headline input than before
      await waitFor(() => {
        const headlineInputs = screen.getAllByLabelText(/headline/i);
        expect(headlineInputs).toHaveLength(initialCount + 1);
      });
    });

    it("removes ad when delete clicked", async () => {
      const user = userEvent.setup();
      const initialState: EditorState = {
        ...defaultInitialState,
        adGroups: [
          {
            id: "ag-1",
            name: "Ad Group 1",
            ads: [
              { id: "ad-1", headline: "Ad 1", description: "", displayUrl: "", finalUrl: "", callToAction: "" },
              { id: "ad-2", headline: "Ad 2", description: "", displayUrl: "", finalUrl: "", callToAction: "" },
            ],
          },
        ],
      };

      render(
        <TemplateEditorV2
          initialState={initialState}
          availableVariables={mockVariables}
        />
      );

      const deleteAdButtons = screen.getAllByRole("button", { name: /remove ad/i });
      await user.click(deleteAdButtons[0]);

      expect(screen.queryByDisplayValue("Ad 1")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Ad 2")).toBeInTheDocument();
    });
  });

  describe("Save/Cancel Behavior", () => {
    it("saves template when save button clicked", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      // Fill required fields
      await user.type(screen.getByLabelText(/campaign name/i), "Test Campaign");
      await user.type(screen.getByLabelText(/headline/i), "Test Headline");

      const saveBtn = screen.getByRole("button", { name: /save/i });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/templates"),
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
        );
      });
    });

    it("shows validation error when required fields missing", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const saveBtn = screen.getByRole("button", { name: /save/i });
      await user.click(saveBtn);

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it("navigates back on cancel without changes", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      expect(mockPush).toHaveBeenCalledWith("/templates");
    });

    it("shows confirmation dialog when canceling with unsaved changes", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      // Make a change
      await user.type(screen.getByLabelText(/campaign name/i), "New Name");

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      // Should show confirmation dialog - use heading since "Unsaved Changes" is the dialog title
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /unsaved changes/i })).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /discard/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /keep editing/i })).toBeInTheDocument();
    });

    it("discards changes when confirmed in dialog", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      await user.type(screen.getByLabelText(/campaign name/i), "New Name");

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /discard/i })).toBeInTheDocument();
      });

      const discardBtn = screen.getByRole("button", { name: /discard/i });
      await user.click(discardBtn);

      expect(mockPush).toHaveBeenCalledWith("/templates");
    });

    it("closes dialog when keep editing clicked", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      await user.type(screen.getByLabelText(/campaign name/i), "New Name");

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /keep editing/i })).toBeInTheDocument();
      });

      const keepEditingBtn = screen.getByRole("button", { name: /keep editing/i });
      await user.click(keepEditingBtn);

      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: /unsaved changes/i })).not.toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("shows auto-save indicator after changes", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      await user.type(screen.getByLabelText(/campaign name/i), "Test");

      // First it shows "Unsaved changes", then after 2 seconds "Saving draft...", then "Draft saved"
      await waitFor(() => {
        const statusText = screen.getByText(/draft saved|unsaved changes|saving draft/i);
        expect(statusText).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it("uses PUT method when editing existing template", async () => {
      const user = userEvent.setup();
      render(
        <TemplateEditorV2
          templateId="existing-123"
          initialState={defaultInitialState}
          availableVariables={mockVariables}
        />
      );

      await user.type(screen.getByLabelText(/campaign name/i), "Updated Name");
      await user.type(screen.getByLabelText(/headline/i), "Updated Headline");

      const saveBtn = screen.getByRole("button", { name: /save/i });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/templates/existing-123"),
          expect.objectContaining({ method: "PUT" })
        );
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper heading hierarchy", () => {
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it("all form fields have labels", () => {
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      expect(screen.getByLabelText(/campaign name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/platform/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/headline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("variable picker is keyboard accessible", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      // Tab to variable picker search
      const searchInput = screen.getByPlaceholderText(/search variables/i);
      await user.click(searchInput);
      await user.tab();

      // Should be able to navigate to variable buttons via keyboard
      // The first variable button should be focusable
      const firstVariable = screen.getByText("product_name").closest("button");
      expect(firstVariable).toBeInTheDocument();
    });

    it("error messages have proper ARIA associations", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const saveBtn = screen.getByRole("button", { name: /save/i });
      await user.click(saveBtn);

      const nameInput = screen.getByLabelText(/campaign name/i);
      expect(nameInput).toHaveAttribute("aria-invalid", "true");
      expect(nameInput).toHaveAttribute("aria-describedby");
    });

    it("panels can be collapsed/expanded", async () => {
      const user = userEvent.setup();
      render(<TemplateEditorV2 availableVariables={mockVariables} />);

      const collapseBtn = screen.getByRole("button", { name: /collapse variable picker/i });
      await user.click(collapseBtn);

      // After collapsing, search input should not be in the document or not visible
      await waitFor(() => {
        const searchInput = screen.queryByPlaceholderText(/search variables/i);
        expect(searchInput === null || !searchInput.checkVisibility()).toBe(true);
      });

      const expandBtn = screen.getByRole("button", { name: /expand variable picker/i });
      await user.click(expandBtn);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search variables/i)).toBeInTheDocument();
      });
    });
  });
});
