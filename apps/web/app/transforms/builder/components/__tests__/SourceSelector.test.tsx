import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SourceSelector } from "../SourceSelector";
import type { DataSource } from "../../../types";

describe("SourceSelector", () => {
  const mockDataSources: DataSource[] = [
    {
      id: "ds-1",
      name: "Product Feed",
      type: "csv",
      rowCount: 2847,
      status: "ready",
      columns: ["sku", "brand", "price", "category"],
    },
    {
      id: "ds-2",
      name: "Customer Data",
      type: "csv",
      rowCount: 1500,
      status: "ready",
      columns: ["email", "name", "signup_date"],
    },
  ];
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("displays loading state", () => {
    render(
      <SourceSelector
        dataSources={[]}
        selectedId={null}
        onChange={onChange}
        loading={true}
      />
    );

    expect(screen.getByText(/loading data sources/i)).toBeInTheDocument();
  });

  it("displays error state", () => {
    render(
      <SourceSelector
        dataSources={[]}
        selectedId={null}
        onChange={onChange}
        error="Failed to load"
      />
    );

    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("displays data sources in dropdown", () => {
    render(
      <SourceSelector
        dataSources={mockDataSources}
        selectedId={null}
        onChange={onChange}
      />
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    // Options should include data sources with row counts
    expect(screen.getByText(/product feed.*2,847 rows/i)).toBeInTheDocument();
    expect(screen.getByText(/customer data.*1,500 rows/i)).toBeInTheDocument();
  });

  it("calls onChange when data source is selected", async () => {
    const user = userEvent.setup();
    render(
      <SourceSelector
        dataSources={mockDataSources}
        selectedId={null}
        onChange={onChange}
      />
    );

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "ds-1");

    expect(onChange).toHaveBeenCalledWith("ds-1");
  });

  it("shows schema preview when data source is selected", () => {
    render(
      <SourceSelector
        dataSources={mockDataSources}
        selectedId="ds-1"
        onChange={onChange}
      />
    );

    // Should show schema preview section
    expect(screen.getByText(/schema preview/i)).toBeInTheDocument();
    expect(screen.getByText("csv")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();

    // Should show columns
    expect(screen.getByText("sku")).toBeInTheDocument();
    expect(screen.getByText("brand")).toBeInTheDocument();
    expect(screen.getByText("price")).toBeInTheDocument();
  });

  it("displays selected data source value", () => {
    render(
      <SourceSelector
        dataSources={mockDataSources}
        selectedId="ds-2"
        onChange={onChange}
      />
    );

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("ds-2");
  });
});
