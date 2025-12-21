import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ColumnMapper } from "../ColumnMapper";
import type { ColumnMapping } from "../../types";

const createDefaultMappings = (): ColumnMapping[] => [
  { sourceColumn: "product_name", normalizedName: "name", dataType: "string" },
  { sourceColumn: "product_price", normalizedName: "price", dataType: "currency" },
  { sourceColumn: "created_date", normalizedName: "date", dataType: "date" },
];

describe("ColumnMapper", () => {
  let mockMappings: ColumnMapping[];
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMappings = createDefaultMappings();
    onChange = vi.fn();
  });

  it("renders all source columns", () => {
    render(<ColumnMapper mappings={mockMappings} onChange={onChange} />);

    expect(screen.getByText("product_name")).toBeInTheDocument();
    expect(screen.getByText("product_price")).toBeInTheDocument();
    expect(screen.getByText("created_date")).toBeInTheDocument();
  });

  it("renders input for normalized name", () => {
    render(<ColumnMapper mappings={mockMappings} onChange={onChange} />);

    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(3);
    expect(inputs[0]).toHaveValue("name");
    expect(inputs[1]).toHaveValue("price");
    expect(inputs[2]).toHaveValue("date");
  });

  it("renders data type select for each mapping", () => {
    render(<ColumnMapper mappings={mockMappings} onChange={onChange} />);

    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(3);
  });

  it("calls onChange when normalized name is updated", async () => {
    const user = userEvent.setup();
    render(<ColumnMapper mappings={mockMappings} onChange={onChange} />);

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[0]);

    // After clearing, onChange should be called with empty normalized name
    expect(onChange).toHaveBeenLastCalledWith([
      { sourceColumn: "product_name", normalizedName: "", dataType: "string" },
      mockMappings[1],
      mockMappings[2],
    ]);
  });

  it("calls onChange when data type is changed", async () => {
    const user = userEvent.setup();
    render(<ColumnMapper mappings={mockMappings} onChange={onChange} />);

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "number");

    expect(onChange).toHaveBeenCalledWith([
      { sourceColumn: "product_name", normalizedName: "name", dataType: "number" },
      mockMappings[1],
      mockMappings[2],
    ]);
  });

  it("displays all available data types", async () => {
    const user = userEvent.setup();
    render(<ColumnMapper mappings={mockMappings} onChange={onChange} />);

    const selects = screen.getAllByRole("combobox");

    // Check available options
    const options = within(selects[0]).getAllByRole("option");
    const optionValues = options.map((opt) => opt.getAttribute("value"));

    expect(optionValues).toContain("string");
    expect(optionValues).toContain("number");
    expect(optionValues).toContain("date");
    expect(optionValues).toContain("url");
    expect(optionValues).toContain("currency");
  });

  it("shows validation error for duplicate normalized names", () => {
    const duplicateMappings: ColumnMapping[] = [
      { sourceColumn: "col1", normalizedName: "name", dataType: "string" },
      { sourceColumn: "col2", normalizedName: "name", dataType: "string" },
    ];

    render(<ColumnMapper mappings={duplicateMappings} onChange={onChange} />);

    expect(screen.getByText(/duplicate/i)).toBeInTheDocument();
  });

  it("shows validation error for empty normalized names", () => {
    const emptyMappings: ColumnMapping[] = [
      { sourceColumn: "col1", normalizedName: "", dataType: "string" },
    ];

    render(<ColumnMapper mappings={emptyMappings} onChange={onChange} />);

    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it("renders read-only when disabled prop is true", () => {
    render(<ColumnMapper mappings={mockMappings} onChange={onChange} disabled />);

    const inputs = screen.getAllByRole("textbox");
    const selects = screen.getAllByRole("combobox");

    inputs.forEach((input) => expect(input).toBeDisabled());
    selects.forEach((select) => expect(select).toBeDisabled());
  });

  it("displays source column label in the header", () => {
    render(<ColumnMapper mappings={mockMappings} onChange={onChange} />);

    expect(screen.getByText("Source Column")).toBeInTheDocument();
    expect(screen.getByText("Mapped Name")).toBeInTheDocument();
    expect(screen.getByText("Data Type")).toBeInTheDocument();
  });
});
