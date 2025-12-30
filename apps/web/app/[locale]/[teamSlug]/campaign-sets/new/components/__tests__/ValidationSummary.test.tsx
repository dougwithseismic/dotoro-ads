import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ValidationSummary, type ValidationItem, type ValidationCategory } from "../ValidationSummary";

const mockCharacterLimitErrors: ValidationItem[] = [
  {
    field: "headline",
    message: "Headline exceeds 30 character limit (45/30)",
    step: "hierarchy",
    adGroupIndex: 0,
    adIndex: 0,
    severity: "error",
  },
  {
    field: "description",
    message: "Description exceeds 90 character limit (120/90)",
    step: "hierarchy",
    adGroupIndex: 0,
    adIndex: 0,
    severity: "error",
  },
];

const mockUrlErrors: ValidationItem[] = [
  {
    field: "finalUrl",
    message: "URL must use HTTPS protocol",
    step: "hierarchy",
    adGroupIndex: 0,
    adIndex: 0,
    severity: "error",
  },
];

const mockRequiredFieldErrors: ValidationItem[] = [
  {
    field: "bid_strategy",
    message: "Bid strategy is required",
    step: "platform",
    severity: "error",
  },
];

const mockVariableErrors: ValidationItem[] = [
  {
    field: "headline",
    message: 'Variable "{unknown_column}" not found in data source',
    step: "hierarchy",
    adGroupIndex: 0,
    adIndex: 0,
    severity: "error",
  },
];

const mockWarnings: ValidationItem[] = [
  {
    field: "displayUrl",
    message: "Display URL may be truncated on some devices",
    step: "hierarchy",
    adGroupIndex: 0,
    adIndex: 0,
    severity: "warning",
  },
];

describe("ValidationSummary", () => {
  describe("Basic rendering", () => {
    it("renders nothing when there are no errors or warnings", () => {
      const categories: ValidationCategory = {
        characterLimits: [],
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      const { container } = render(
        <ValidationSummary categories={categories} onNavigate={vi.fn()} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("shows total error count in header", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: mockUrlErrors,
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      expect(screen.getByText(/3 errors?/i)).toBeInTheDocument();
    });

    it("shows total warning count when warnings exist", () => {
      const categories: ValidationCategory = {
        characterLimits: [],
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
        warnings: mockWarnings,
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      expect(screen.getByText(/1 warning/i)).toBeInTheDocument();
    });

    it("displays both error and warning counts", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
        warnings: mockWarnings,
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      expect(screen.getByText(/2 errors?/i)).toBeInTheDocument();
      expect(screen.getByText(/1 warning/i)).toBeInTheDocument();
    });
  });

  describe("Category grouping", () => {
    it("groups errors by Character Limit category", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      // Find the category label specifically
      expect(screen.getByText("Character Limit Errors")).toBeInTheDocument();
      // Count badge should show 2 for 2 errors
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("groups errors by URL Format category", () => {
      const categories: ValidationCategory = {
        characterLimits: [],
        urlFormat: mockUrlErrors,
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      expect(screen.getByText(/url format/i)).toBeInTheDocument();
    });

    it("groups errors by Required Fields category", () => {
      const categories: ValidationCategory = {
        characterLimits: [],
        urlFormat: [],
        requiredFields: mockRequiredFieldErrors,
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      expect(screen.getByText(/required field/i)).toBeInTheDocument();
    });

    it("groups errors by Variable Reference category", () => {
      const categories: ValidationCategory = {
        characterLimits: [],
        urlFormat: [],
        requiredFields: [],
        variableReferences: mockVariableErrors,
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      expect(screen.getByText(/variable reference/i)).toBeInTheDocument();
    });

    it("does not show empty categories", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      expect(screen.queryByText(/url format/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/required field/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/variable reference/i)).not.toBeInTheDocument();
    });
  });

  describe("Expand/Collapse functionality", () => {
    it("categories start expanded by default", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      // Error messages should be visible
      expect(screen.getByText(/Headline exceeds/i)).toBeInTheDocument();
    });

    it("collapses category when header is clicked", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      const categoryHeader = screen.getByRole("button", { name: "Character Limit Errors" });
      fireEvent.click(categoryHeader);

      // Error messages should be hidden
      expect(screen.queryByText(/Headline exceeds/i)).not.toBeInTheDocument();
    });

    it("re-expands category when clicked again", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      const categoryHeader = screen.getByRole("button", { name: "Character Limit Errors" });

      // Collapse
      fireEvent.click(categoryHeader);
      expect(screen.queryByText(/Headline exceeds/i)).not.toBeInTheDocument();

      // Expand
      fireEvent.click(categoryHeader);
      expect(screen.getByText(/Headline exceeds/i)).toBeInTheDocument();
    });
  });

  describe("Click to navigate", () => {
    it("calls onNavigate with correct step when error is clicked", () => {
      const onNavigate = vi.fn();
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={onNavigate} />);

      const errorItem = screen.getByText(/Headline exceeds/i);
      fireEvent.click(errorItem);

      expect(onNavigate).toHaveBeenCalledWith(
        "hierarchy",
        expect.objectContaining({
          field: "headline",
          adGroupIndex: 0,
          adIndex: 0,
        })
      );
    });

    it("passes adGroupIndex and adIndex when available", () => {
      const onNavigate = vi.fn();
      const categories: ValidationCategory = {
        characterLimits: [
          {
            field: "description",
            message: "Description too long",
            step: "hierarchy",
            adGroupIndex: 1,
            adIndex: 2,
            severity: "error",
          },
        ],
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={onNavigate} />);

      const errorItem = screen.getByText(/Description too long/i);
      fireEvent.click(errorItem);

      expect(onNavigate).toHaveBeenCalledWith(
        "hierarchy",
        expect.objectContaining({
          adGroupIndex: 1,
          adIndex: 2,
        })
      );
    });
  });

  describe("Accessibility", () => {
    it("has proper heading structure", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    });

    it("category headers are buttons for keyboard accessibility", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      const categoryHeader = screen.getByRole("button", { name: "Character Limit Errors" });
      expect(categoryHeader).toBeInTheDocument();
    });

    it("error items are buttons for keyboard navigation", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      const errorButton = screen.getByRole("button", { name: /Headline exceeds/i });
      expect(errorButton).toBeInTheDocument();
    });

    it("has aria-expanded attribute on collapsible headers", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      const categoryHeader = screen.getByRole("button", { name: "Character Limit Errors" });
      expect(categoryHeader).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Error vs Warning styling", () => {
    it("renders errors with error styling", () => {
      const categories: ValidationCategory = {
        characterLimits: mockCharacterLimitErrors,
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      const container = screen.getByTestId("validation-summary");
      expect(container).toHaveAttribute("data-has-errors", "true");
    });

    it("renders warnings with warning styling", () => {
      const categories: ValidationCategory = {
        characterLimits: [],
        urlFormat: [],
        requiredFields: [],
        variableReferences: [],
        warnings: mockWarnings,
      };

      render(<ValidationSummary categories={categories} onNavigate={vi.fn()} />);

      const container = screen.getByTestId("validation-summary");
      expect(container).toHaveAttribute("data-has-warnings", "true");
    });
  });
});
