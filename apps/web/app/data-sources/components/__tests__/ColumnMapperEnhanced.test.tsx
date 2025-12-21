import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ColumnMapperEnhanced } from "../ColumnMapperEnhanced";
import type { ColumnMapping } from "../../types";

const createDefaultMappings = (): ColumnMapping[] => [
  { sourceColumn: "product_name", normalizedName: "name", dataType: "string" },
  { sourceColumn: "product_price", normalizedName: "price", dataType: "currency" },
  { sourceColumn: "created_date", normalizedName: "date", dataType: "date" },
];

describe("ColumnMapperEnhanced", () => {
  let mockMappings: ColumnMapping[];
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMappings = createDefaultMappings();
    onChange = vi.fn();
  });

  describe("Basic rendering", () => {
    it("renders all source columns", () => {
      render(<ColumnMapperEnhanced mappings={mockMappings} onChange={onChange} />);

      expect(screen.getByText("product_name")).toBeInTheDocument();
      expect(screen.getByText("product_price")).toBeInTheDocument();
      expect(screen.getByText("created_date")).toBeInTheDocument();
    });

    it("renders input for normalized name", () => {
      render(<ColumnMapperEnhanced mappings={mockMappings} onChange={onChange} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(3);
      expect(inputs[0]).toHaveValue("name");
      expect(inputs[1]).toHaveValue("price");
      expect(inputs[2]).toHaveValue("date");
    });

    it("renders data type select for each mapping", () => {
      render(<ColumnMapperEnhanced mappings={mockMappings} onChange={onChange} />);

      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(3);
    });

    it("displays header labels", () => {
      render(<ColumnMapperEnhanced mappings={mockMappings} onChange={onChange} />);

      expect(screen.getByText("Source Column")).toBeInTheDocument();
      expect(screen.getByText("Mapped Name")).toBeInTheDocument();
      expect(screen.getByText("Data Type")).toBeInTheDocument();
    });
  });

  describe("Auto-detect suggestions", () => {
    it("shows suggestions for common column patterns", () => {
      const mappingsWithEmptyNames: ColumnMapping[] = [
        { sourceColumn: "email_address", normalizedName: "", dataType: "string" },
        { sourceColumn: "first_name", normalizedName: "", dataType: "string" },
        { sourceColumn: "phone_number", normalizedName: "", dataType: "string" },
      ];

      render(
        <ColumnMapperEnhanced mappings={mappingsWithEmptyNames} onChange={onChange} />
      );

      expect(screen.getByText(/suggested: email/i)).toBeInTheDocument();
      expect(screen.getByText(/suggested: firstName/i)).toBeInTheDocument();
    });

    it("allows applying suggestion with button click", async () => {
      const user = userEvent.setup();
      const mappingsWithEmptyNames: ColumnMapping[] = [
        { sourceColumn: "email_address", normalizedName: "", dataType: "string" },
      ];

      render(
        <ColumnMapperEnhanced mappings={mappingsWithEmptyNames} onChange={onChange} />
      );

      const applyButton = screen.getByRole("button", { name: /apply suggestion/i });
      await user.click(applyButton);

      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({ normalizedName: "email" }),
      ]);
    });

    it("does not show suggestion when normalized name is already set", () => {
      const mappingsWithNames: ColumnMapping[] = [
        { sourceColumn: "email_address", normalizedName: "email", dataType: "string" },
      ];

      render(<ColumnMapperEnhanced mappings={mappingsWithNames} onChange={onChange} />);

      expect(screen.queryByText(/suggested:/i)).not.toBeInTheDocument();
    });

    it("suggests appropriate data types based on column name", async () => {
      const user = userEvent.setup();
      const mappingsWithPatterns: ColumnMapping[] = [
        { sourceColumn: "created_at", normalizedName: "", dataType: "string" },
        { sourceColumn: "price_usd", normalizedName: "", dataType: "string" },
        { sourceColumn: "website_url", normalizedName: "", dataType: "string" },
      ];

      render(
        <ColumnMapperEnhanced mappings={mappingsWithPatterns} onChange={onChange} />
      );

      // Should suggest date type for created_at - look for Date suggestion
      // The suggestion shows up as "Suggested: Date" next to the data type select
      const dateSuggestions = screen.getAllByText(/Date/);
      expect(dateSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe("Validation", () => {
    it("shows validation error for duplicate normalized names", () => {
      const duplicateMappings: ColumnMapping[] = [
        { sourceColumn: "col1", normalizedName: "name", dataType: "string" },
        { sourceColumn: "col2", normalizedName: "name", dataType: "string" },
      ];

      render(<ColumnMapperEnhanced mappings={duplicateMappings} onChange={onChange} />);

      expect(screen.getByText(/duplicate/i)).toBeInTheDocument();
    });

    it("shows validation error for empty normalized names", () => {
      const emptyMappings: ColumnMapping[] = [
        { sourceColumn: "col1", normalizedName: "", dataType: "string" },
      ];

      render(<ColumnMapperEnhanced mappings={emptyMappings} onChange={onChange} />);

      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onChange when normalized name is updated", async () => {
      const user = userEvent.setup();
      render(<ColumnMapperEnhanced mappings={mockMappings} onChange={onChange} />);

      const inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);

      expect(onChange).toHaveBeenLastCalledWith([
        { sourceColumn: "product_name", normalizedName: "", dataType: "string" },
        mockMappings[1],
        mockMappings[2],
      ]);
    });

    it("calls onChange when data type is changed", async () => {
      const user = userEvent.setup();
      render(<ColumnMapperEnhanced mappings={mockMappings} onChange={onChange} />);

      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0], "number");

      expect(onChange).toHaveBeenCalledWith([
        { sourceColumn: "product_name", normalizedName: "name", dataType: "number" },
        mockMappings[1],
        mockMappings[2],
      ]);
    });

    it("renders read-only when disabled prop is true", () => {
      render(
        <ColumnMapperEnhanced mappings={mockMappings} onChange={onChange} disabled />
      );

      const inputs = screen.getAllByRole("textbox");
      const selects = screen.getAllByRole("combobox");

      inputs.forEach((input) => expect(input).toBeDisabled());
      selects.forEach((select) => expect(select).toBeDisabled());
    });
  });

  describe("Accessibility", () => {
    it("has accessible labels for input fields", () => {
      render(<ColumnMapperEnhanced mappings={mockMappings} onChange={onChange} />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveAccessibleName();
      });
    });

    it("has accessible labels for select fields", () => {
      render(<ColumnMapperEnhanced mappings={mockMappings} onChange={onChange} />);

      const selects = screen.getAllByRole("combobox");
      selects.forEach((select) => {
        expect(select).toHaveAccessibleName();
      });
    });

    it("marks invalid inputs with aria-invalid", () => {
      const emptyMappings: ColumnMapping[] = [
        { sourceColumn: "col1", normalizedName: "", dataType: "string" },
      ];

      render(<ColumnMapperEnhanced mappings={emptyMappings} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });
});
