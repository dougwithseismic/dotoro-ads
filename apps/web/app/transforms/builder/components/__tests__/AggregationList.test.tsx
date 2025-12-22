import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AggregationList } from "../AggregationList";
import type { AggregationConfig } from "../../../types";

describe("AggregationList", () => {
  const mockColumns = ["brand", "category", "price", "sku"];
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("displays empty state when no aggregations", () => {
    render(
      <AggregationList
        aggregations={[]}
        columns={mockColumns}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/no aggregations defined/i)).toBeInTheDocument();
    expect(
      screen.getByText(/add your first aggregation/i)
    ).toBeInTheDocument();
  });

  it("adds a new aggregation when clicking add button", async () => {
    const user = userEvent.setup();
    render(
      <AggregationList
        aggregations={[]}
        columns={mockColumns}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText(/add your first aggregation/i));

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          function: "COUNT",
          outputField: "",
        }),
      ])
    );
  });

  it("displays existing aggregations", () => {
    const aggregations: AggregationConfig[] = [
      { id: "1", function: "COUNT", outputField: "total_count" },
      {
        id: "2",
        function: "SUM",
        sourceField: "price",
        outputField: "total_price",
      },
    ];

    render(
      <AggregationList
        aggregations={aggregations}
        columns={mockColumns}
        onChange={onChange}
      />
    );

    expect(screen.getByDisplayValue("total_count")).toBeInTheDocument();
    expect(screen.getByDisplayValue("total_price")).toBeInTheDocument();
  });

  it("removes an aggregation when clicking remove button", async () => {
    const user = userEvent.setup();
    const aggregations: AggregationConfig[] = [
      { id: "1", function: "COUNT", outputField: "total_count" },
      {
        id: "2",
        function: "SUM",
        sourceField: "price",
        outputField: "total_price",
      },
    ];

    render(
      <AggregationList
        aggregations={aggregations}
        columns={mockColumns}
        onChange={onChange}
      />
    );

    const removeButtons = screen.getAllByTitle("Remove aggregation");
    await user.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith([aggregations[1]]);
  });

  it("updates aggregation function when changed", async () => {
    const user = userEvent.setup();
    const aggregations: AggregationConfig[] = [
      { id: "1", function: "COUNT", outputField: "total_count" },
    ];

    render(
      <AggregationList
        aggregations={aggregations}
        columns={mockColumns}
        onChange={onChange}
      />
    );

    // Get the first combobox (function select)
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "SUM");

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          function: "SUM",
        }),
      ])
    );
  });

  it("updates output field name when typing", async () => {
    const user = userEvent.setup();
    const aggregations: AggregationConfig[] = [
      { id: "1", function: "COUNT", outputField: "" },
    ];

    render(
      <AggregationList
        aggregations={aggregations}
        columns={mockColumns}
        onChange={onChange}
      />
    );

    const outputInput = screen.getByPlaceholderText("e.g., total_count");
    await user.type(outputInput, "x");

    // Should be called during typing - onChange fires for each keystroke
    expect(onChange).toHaveBeenCalled();
    // Verify the aggregation structure is maintained with the new value
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "1",
          function: "COUNT",
          outputField: "x",
        }),
      ])
    );
  });
});
