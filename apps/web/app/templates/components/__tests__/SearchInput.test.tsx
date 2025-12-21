import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SearchInput } from "../SearchInput";

describe("SearchInput", () => {
  it("renders search input with placeholder", () => {
    render(<SearchInput value="" onChange={vi.fn()} onClear={vi.fn()} />);

    const input = screen.getByRole("searchbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Search templates...");
  });

  it("displays current value", () => {
    render(
      <SearchInput value="test query" onChange={vi.fn()} onClear={vi.fn()} />
    );

    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue("test query");
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} onClear={vi.fn()} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "new search" } });

    expect(onChange).toHaveBeenCalledWith("new search");
  });

  it("shows clear button when value is present", () => {
    render(
      <SearchInput value="has value" onChange={vi.fn()} onClear={vi.fn()} />
    );

    expect(
      screen.getByRole("button", { name: /clear search/i })
    ).toBeInTheDocument();
  });

  it("hides clear button when value is empty", () => {
    render(<SearchInput value="" onChange={vi.fn()} onClear={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: /clear search/i })
    ).not.toBeInTheDocument();
  });

  it("calls onClear when clear button is clicked", () => {
    const onClear = vi.fn();
    render(<SearchInput value="test" onChange={vi.fn()} onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));

    expect(onClear).toHaveBeenCalled();
  });

  it("has accessible label", () => {
    render(<SearchInput value="" onChange={vi.fn()} onClear={vi.fn()} />);

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAccessibleName("Search templates");
  });
});
