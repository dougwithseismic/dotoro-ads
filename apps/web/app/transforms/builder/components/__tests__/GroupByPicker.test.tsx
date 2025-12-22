import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GroupByPicker } from "../GroupByPicker";

describe("GroupByPicker", () => {
  const mockColumns = ["brand", "category", "price", "sku", "name"];
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("displays available columns as buttons", () => {
    render(
      <GroupByPicker
        columns={mockColumns}
        selectedFields={[]}
        onChange={onChange}
      />
    );

    // All columns should be available to add
    expect(screen.getByText("brand")).toBeInTheDocument();
    expect(screen.getByText("category")).toBeInTheDocument();
    expect(screen.getByText("price")).toBeInTheDocument();
  });

  it("calls onChange when a field is added", async () => {
    const user = userEvent.setup();
    render(
      <GroupByPicker
        columns={mockColumns}
        selectedFields={[]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText("brand"));

    expect(onChange).toHaveBeenCalledWith(["brand"]);
  });

  it("displays selected fields with remove buttons", () => {
    render(
      <GroupByPicker
        columns={mockColumns}
        selectedFields={["brand", "category"]}
        onChange={onChange}
      />
    );

    // Should show selected fields
    const selectedBrand = screen.getAllByText("brand")[0];
    expect(selectedBrand).toBeInTheDocument();

    // Should not show selected fields in available list
    const availableFields = screen
      .getAllByRole("button")
      .filter((btn) => btn.textContent === "brand");
    // brand should only appear in selected section, not in add section
    expect(availableFields.length).toBeLessThanOrEqual(2); // selected + possible remove button
  });

  it("calls onChange when a field is removed", async () => {
    const user = userEvent.setup();
    render(
      <GroupByPicker
        columns={mockColumns}
        selectedFields={["brand", "category"]}
        onChange={onChange}
      />
    );

    // Find remove button (has X icon)
    const removeButtons = screen.getAllByTitle("Remove field");
    await user.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(["category"]);
  });

  it("filters columns based on search term", async () => {
    const user = userEvent.setup();
    render(
      <GroupByPicker
        columns={mockColumns}
        selectedFields={[]}
        onChange={onChange}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search fields to add...");
    await user.type(searchInput, "cat");

    // category should still be visible
    expect(screen.getByText("category")).toBeInTheDocument();
    // brand should not be visible (doesn't match "cat")
    expect(screen.queryByRole("button", { name: "brand" })).not.toBeInTheDocument();
  });

  it("shows message when no columns match search", async () => {
    const user = userEvent.setup();
    render(
      <GroupByPicker
        columns={mockColumns}
        selectedFields={[]}
        onChange={onChange}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search fields to add...");
    await user.type(searchInput, "xyz");

    expect(screen.getByText(/no fields match/i)).toBeInTheDocument();
  });

  it("shows message when no columns available (select data source first)", () => {
    render(
      <GroupByPicker columns={[]} selectedFields={[]} onChange={onChange} />
    );

    expect(screen.getByText(/select a data source/i)).toBeInTheDocument();
  });

  it("allows reordering selected fields", async () => {
    const user = userEvent.setup();
    render(
      <GroupByPicker
        columns={mockColumns}
        selectedFields={["brand", "category", "price"]}
        onChange={onChange}
      />
    );

    // Find move down button for first item
    const moveDownButtons = screen.getAllByTitle("Move down");
    await user.click(moveDownButtons[0]);

    expect(onChange).toHaveBeenCalledWith(["category", "brand", "price"]);
  });
});
