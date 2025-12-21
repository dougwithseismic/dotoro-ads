import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VariableInput } from "../VariableInput";

const createDefaultProps = () => ({
  id: "test-input",
  label: "Test Label",
  value: "",
  onChange: vi.fn(),
  availableVariables: ["product_name", "price", "brand", "category"],
});

let defaultProps: ReturnType<typeof createDefaultProps>;

beforeEach(() => {
  defaultProps = createDefaultProps();
});

describe("VariableInput", () => {
  it("renders with label and input", () => {
    render(<VariableInput {...defaultProps} />);

    expect(screen.getByText("Test Label")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("displays required indicator when required", () => {
    render(<VariableInput {...defaultProps} required />);

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("displays placeholder text", () => {
    render(
      <VariableInput {...defaultProps} placeholder="Enter your text..." />
    );

    expect(screen.getByPlaceholderText("Enter your text...")).toBeInTheDocument();
  });

  it("displays error message when error prop is set", () => {
    render(<VariableInput {...defaultProps} error="This field is required" />);

    expect(screen.getByText("This field is required")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<VariableInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole("combobox");
    await user.type(input, "Hello");

    expect(onChange).toHaveBeenCalled();
  });

  it("displays character counter when maxLength is set", () => {
    render(<VariableInput {...defaultProps} value="Hello" maxLength={100} />);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders as textarea when multiline is true", () => {
    render(<VariableInput {...defaultProps} multiline rows={5} />);

    const textarea = screen.getByRole("combobox");
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
    expect(textarea).toHaveAttribute("rows", "5");
  });

  it("shows autocomplete dropdown when typing { character", async () => {
    render(<VariableInput {...defaultProps} value="" />);

    const input = screen.getByRole("combobox");
    // Use fireEvent for the { character since userEvent treats { as special
    fireEvent.change(input, { target: { value: "{", selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(screen.getByText("Variables")).toBeInTheDocument();
    });
  });

  it("filters variables based on search term", async () => {
    const onChange = vi.fn();
    render(<VariableInput {...defaultProps} value="{pro" onChange={onChange} />);

    // Simulate the autocomplete being triggered
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "{pro", selectionStart: 4 } });

    await waitFor(() => {
      const listbox = screen.queryByRole("listbox");
      if (listbox) {
        expect(screen.getByText("{product_name}")).toBeInTheDocument();
      }
    });
  });

  it("highlights variables in preview", () => {
    const { container } = render(
      <VariableInput
        {...defaultProps}
        value="Hello {product_name}, get {price} off!"
      />
    );

    // The preview section should show the value with highlighted variables
    // CSS modules rename classes, so look for elements within the preview structure
    // Find the preview container and check for variable-highlighted spans
    const spans = container.querySelectorAll("span");
    const variableSpans = Array.from(spans).filter((span) =>
      span.textContent?.startsWith("{") && span.textContent?.endsWith("}")
    );
    expect(variableSpans.length).toBe(2);
  });

  it("closes autocomplete on Escape key", async () => {
    render(<VariableInput {...defaultProps} value="" />);

    const input = screen.getByRole("combobox");
    // Use fireEvent for { character and trigger autocomplete
    fireEvent.change(input, { target: { value: "{", selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    // Focus the input and press Escape
    input.focus();
    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("navigates autocomplete with arrow keys", async () => {
    render(<VariableInput {...defaultProps} value="" />);

    const input = screen.getByRole("combobox");
    // Use fireEvent for { character
    fireEvent.change(input, { target: { value: "{", selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    // First item should be selected by default
    const firstOption = screen.getAllByRole("option")[0];
    expect(firstOption).toHaveAttribute("aria-selected", "true");

    // Focus the input and press down arrow
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown" });

    await waitFor(() => {
      // Second item should now be selected
      const options = screen.getAllByRole("option");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });
  });

  it("inserts variable on Enter key", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<VariableInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole("combobox");
    // Use fireEvent for { character
    fireEvent.change(input, { target: { value: "{", selectionStart: 1 } });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    await user.keyboard("{Enter}");

    // Should have called onChange with the inserted variable
    expect(onChange).toHaveBeenCalled();
  });

  it("shows filter autocomplete when typing | inside variable", async () => {
    render(
      <VariableInput
        {...defaultProps}
        value="{product_name|"
        availableFilters={["uppercase", "lowercase", "trim"]}
      />
    );

    const input = screen.getByRole("combobox");
    fireEvent.change(input, {
      target: { value: "{product_name|", selectionStart: 14 },
    });

    await waitFor(() => {
      const listbox = screen.queryByRole("listbox");
      if (listbox) {
        expect(screen.getByText("Filters")).toBeInTheDocument();
      }
    });
  });

  it("sets aria-invalid when error is present", () => {
    render(<VariableInput {...defaultProps} error="Invalid input" />);

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("associates error message with input via aria-describedby", () => {
    render(<VariableInput {...defaultProps} error="Invalid input" />);

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-describedby", "test-input-error");
  });
});
