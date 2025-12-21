import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationPanel } from "../ValidationPanel";
import type { ValidationError } from "../../types";

const createMockErrors = (): ValidationError[] => [
  { column: "price", row: 5, message: "Invalid currency format", severity: "error" },
  { column: "price", row: 15, message: "Invalid currency format", severity: "error" },
  { column: "category", row: 12, message: "Unknown category", severity: "warning" },
];

describe("ValidationPanel", () => {
  let onErrorClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onErrorClick = vi.fn();
  });

  describe("Error display", () => {
    it("displays all validation errors", () => {
      render(<ValidationPanel errors={createMockErrors()} onErrorClick={onErrorClick} />);

      expect(screen.getAllByText(/invalid currency format/i)).toHaveLength(2);
      expect(screen.getByText(/unknown category/i)).toBeInTheDocument();
    });

    it("shows severity badges for each error", () => {
      render(<ValidationPanel errors={createMockErrors()} onErrorClick={onErrorClick} />);

      const errorBadges = screen.getAllByText(/^error$/i);
      const warningBadges = screen.getAllByText(/^warning$/i);

      expect(errorBadges.length).toBe(2);
      expect(warningBadges.length).toBe(1);
    });

    it("shows row number for each error", () => {
      render(<ValidationPanel errors={createMockErrors()} onErrorClick={onErrorClick} />);

      expect(screen.getByText(/row 5/i)).toBeInTheDocument();
      expect(screen.getByText(/row 15/i)).toBeInTheDocument();
      expect(screen.getByText(/row 12/i)).toBeInTheDocument();
    });

    it("shows empty state when no errors", () => {
      render(<ValidationPanel errors={[]} onErrorClick={onErrorClick} />);

      expect(screen.getByText(/no validation issues/i)).toBeInTheDocument();
    });
  });

  describe("Error count per column", () => {
    it("groups errors by column and shows count", () => {
      render(<ValidationPanel errors={createMockErrors()} onErrorClick={onErrorClick} />);

      // Price has 2 errors - there are multiple "price" elements (in column summary and error list)
      const priceColumns = screen.getAllByText("price");
      expect(priceColumns.length).toBeGreaterThan(0);

      // "2 errors" appears in both total summary and column summary
      const twoErrorsElements = screen.getAllByText("2 errors");
      expect(twoErrorsElements.length).toBeGreaterThan(0);

      // Category has 1 warning
      const categoryColumns = screen.getAllByText("category");
      expect(categoryColumns.length).toBeGreaterThan(0);

      // "1 warning" appears in both total summary and column summary
      const oneWarningElements = screen.getAllByText("1 warning");
      expect(oneWarningElements.length).toBeGreaterThan(0);
    });

    it("displays column summary section", () => {
      render(<ValidationPanel errors={createMockErrors()} onErrorClick={onErrorClick} />);

      expect(screen.getByText(/summary by column/i)).toBeInTheDocument();
    });
  });

  describe("Click to filter", () => {
    it("calls onErrorClick when error is clicked", async () => {
      const user = userEvent.setup();
      const errors = createMockErrors();

      render(<ValidationPanel errors={errors} onErrorClick={onErrorClick} />);

      const errorItems = screen.getAllByRole("button", { name: /go to row/i });
      await user.click(errorItems[0]);

      expect(onErrorClick).toHaveBeenCalledWith(errors[0]);
    });
  });

  describe("Fix suggestions", () => {
    it("shows fix suggestions when available", () => {
      const errorsWithSuggestions: ValidationError[] = [
        {
          column: "price",
          row: 5,
          message: "Invalid currency format",
          severity: "error",
          suggestion: "Remove currency symbol",
        },
      ];

      render(
        <ValidationPanel errors={errorsWithSuggestions} onErrorClick={onErrorClick} />
      );

      expect(screen.getByText(/remove currency symbol/i)).toBeInTheDocument();
    });

    it("does not show suggestion section when no suggestion available", () => {
      const errorsWithoutSuggestions: ValidationError[] = [
        {
          column: "price",
          row: 5,
          message: "Invalid currency format",
          severity: "error",
        },
      ];

      render(
        <ValidationPanel errors={errorsWithoutSuggestions} onErrorClick={onErrorClick} />
      );

      expect(screen.queryByText(/suggestion:/i)).not.toBeInTheDocument();
    });
  });

  describe("Total count", () => {
    it("shows total error and warning counts", () => {
      render(<ValidationPanel errors={createMockErrors()} onErrorClick={onErrorClick} />);

      // Total counts are shown in the summary header
      const errorCounts = screen.getAllByText(/2 errors/i);
      const warningCounts = screen.getAllByText(/1 warning/i);
      expect(errorCounts.length).toBeGreaterThan(0);
      expect(warningCounts.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("has accessible button for each error", () => {
      render(<ValidationPanel errors={createMockErrors()} onErrorClick={onErrorClick} />);

      const buttons = screen.getAllByRole("button", { name: /go to row/i });
      expect(buttons.length).toBe(3);
    });

    it("uses semantic list structure", () => {
      render(<ValidationPanel errors={createMockErrors()} onErrorClick={onErrorClick} />);

      expect(screen.getByRole("list")).toBeInTheDocument();
      expect(screen.getAllByRole("listitem").length).toBe(3);
    });
  });
});
