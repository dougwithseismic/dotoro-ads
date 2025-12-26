import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { HeadersEditor } from "../HeadersEditor";

/**
 * Controlled wrapper for testing HeadersEditor
 * This allows the component to properly re-render when onChange is called
 */
function ControlledHeadersEditor({
  initialValue = {},
  onChangeSpy,
  disabled = false,
}: {
  initialValue?: Record<string, string>;
  onChangeSpy?: (headers: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (headers: Record<string, string>) => {
    setValue(headers);
    onChangeSpy?.(headers);
  };

  return (
    <HeadersEditor value={value} onChange={handleChange} disabled={disabled} />
  );
}

describe("HeadersEditor", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders headers section title", () => {
      render(<HeadersEditor value={{}} onChange={onChange} />);

      expect(screen.getByText("Headers")).toBeInTheDocument();
    });

    it("renders Add Header button", () => {
      render(<HeadersEditor value={{}} onChange={onChange} />);

      expect(screen.getByRole("button", { name: /add.*header/i })).toBeInTheDocument();
    });

    it("renders empty state when no headers", () => {
      render(<HeadersEditor value={{}} onChange={onChange} />);

      // Should not have any input fields
      expect(screen.queryByPlaceholderText(/key/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/value/i)).not.toBeInTheDocument();
    });

    it("renders existing headers", () => {
      render(
        <HeadersEditor
          value={{ "Content-Type": "application/json", "X-Custom": "value" }}
          onChange={onChange}
        />
      );

      // Should have input fields with values
      const keyInputs = screen.getAllByPlaceholderText(/key/i);
      const valueInputs = screen.getAllByPlaceholderText(/value/i);

      expect(keyInputs).toHaveLength(2);
      expect(valueInputs).toHaveLength(2);

      // Check that values are populated
      expect(keyInputs[0]).toHaveValue("Content-Type");
      expect(valueInputs[0]).toHaveValue("application/json");
      expect(keyInputs[1]).toHaveValue("X-Custom");
      expect(valueInputs[1]).toHaveValue("value");
    });

    it("renders remove button for each header", () => {
      render(
        <HeadersEditor
          value={{ "X-Header-1": "value1", "X-Header-2": "value2" }}
          onChange={onChange}
        />
      );

      const removeButtons = screen.getAllByRole("button", { name: /remove.*header/i });
      expect(removeButtons).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Add Header Tests
  // ==========================================================================

  describe("Add Header", () => {
    it("adds new header row on button click", async () => {
      const user = userEvent.setup();
      render(<ControlledHeadersEditor onChangeSpy={onChange} />);

      const addButton = screen.getByRole("button", { name: /add.*header/i });
      await user.click(addButton);

      // Should now have input fields
      expect(screen.getByPlaceholderText(/key/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/value/i)).toBeInTheDocument();
    });

    it("calls onChange with new empty header", async () => {
      const user = userEvent.setup();
      render(<HeadersEditor value={{}} onChange={onChange} />);

      const addButton = screen.getByRole("button", { name: /add.*header/i });
      await user.click(addButton);

      expect(onChange).toHaveBeenCalledWith({ "": "" });
    });

    it("adds header to existing headers", async () => {
      const user = userEvent.setup();
      render(
        <HeadersEditor
          value={{ "X-Existing": "existing-value" }}
          onChange={onChange}
        />
      );

      const addButton = screen.getByRole("button", { name: /add.*header/i });
      await user.click(addButton);

      expect(onChange).toHaveBeenCalledWith({
        "X-Existing": "existing-value",
        "": "",
      });
    });
  });

  // ==========================================================================
  // Remove Header Tests
  // ==========================================================================

  describe("Remove Header", () => {
    it("removes header row on button click", async () => {
      const user = userEvent.setup();
      render(
        <HeadersEditor value={{ "X-Header": "value" }} onChange={onChange} />
      );

      const removeButton = screen.getByRole("button", { name: /remove.*header/i });
      await user.click(removeButton);

      expect(onChange).toHaveBeenCalledWith({});
    });

    it("removes specific header from multiple headers", async () => {
      const user = userEvent.setup();
      render(
        <HeadersEditor
          value={{ "X-Header-1": "value1", "X-Header-2": "value2" }}
          onChange={onChange}
        />
      );

      const removeButtons = screen.getAllByRole("button", { name: /remove.*header/i });
      await user.click(removeButtons[0]); // Remove first header

      expect(onChange).toHaveBeenCalledWith({ "X-Header-2": "value2" });
    });
  });

  // ==========================================================================
  // Update Header Tests
  // ==========================================================================

  describe("Update Header", () => {
    it("updates header key", async () => {
      render(
        <ControlledHeadersEditor
          initialValue={{ "Old-Key": "value" }}
          onChangeSpy={onChange}
        />
      );

      const keyInput = screen.getByPlaceholderText(/key/i);
      // Use fireEvent for consistent behavior without intermediate states
      fireEvent.change(keyInput, { target: { value: "New-Key" } });

      // onChange should be called with the new key
      expect(onChange).toHaveBeenLastCalledWith({ "New-Key": "value" });
    });

    it("updates header value", async () => {
      render(
        <ControlledHeadersEditor
          initialValue={{ "X-Header": "old-value" }}
          onChangeSpy={onChange}
        />
      );

      const valueInput = screen.getByPlaceholderText(/value/i);
      // Use fireEvent for consistent behavior
      fireEvent.change(valueInput, { target: { value: "new-value" } });

      // onChange should be called with the new value
      expect(onChange).toHaveBeenLastCalledWith({ "X-Header": "new-value" });
    });

    it("handles empty key gracefully", async () => {
      const user = userEvent.setup();
      render(
        <HeadersEditor value={{ "X-Header": "value" }} onChange={onChange} />
      );

      const keyInput = screen.getByPlaceholderText(/key/i);
      await user.clear(keyInput);

      // Should call onChange with empty key
      expect(onChange).toHaveBeenLastCalledWith({ "": "value" });
    });

    it("handles duplicate keys by overwriting", async () => {
      render(
        <ControlledHeadersEditor
          initialValue={{ "X-Header-1": "value1", "X-Header-2": "value2" }}
          onChangeSpy={onChange}
        />
      );

      // Change second header key to match first
      const keyInputs = screen.getAllByPlaceholderText(/key/i);
      // Use fireEvent for consistent behavior
      fireEvent.change(keyInputs[1], { target: { value: "X-Header-1" } });

      // The last value wins for duplicate keys
      expect(onChange).toHaveBeenLastCalledWith({
        "X-Header-1": "value2",
      });
    });
  });

  // ==========================================================================
  // Disabled State Tests
  // ==========================================================================

  describe("Disabled State", () => {
    it("disables add button when disabled prop is true", () => {
      render(<HeadersEditor value={{}} onChange={onChange} disabled={true} />);

      const addButton = screen.getByRole("button", { name: /add.*header/i });
      expect(addButton).toBeDisabled();
    });

    it("disables input fields when disabled prop is true", () => {
      render(
        <HeadersEditor
          value={{ "X-Header": "value" }}
          onChange={onChange}
          disabled={true}
        />
      );

      const keyInput = screen.getByPlaceholderText(/key/i);
      const valueInput = screen.getByPlaceholderText(/value/i);

      expect(keyInput).toBeDisabled();
      expect(valueInput).toBeDisabled();
    });

    it("disables remove button when disabled prop is true", () => {
      render(
        <HeadersEditor
          value={{ "X-Header": "value" }}
          onChange={onChange}
          disabled={true}
        />
      );

      const removeButton = screen.getByRole("button", { name: /remove.*header/i });
      expect(removeButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has accessible label for header section", () => {
      render(<HeadersEditor value={{}} onChange={onChange} />);

      expect(screen.getByText("Headers")).toBeInTheDocument();
    });

    it("has accessible label for Add Header button", () => {
      render(<HeadersEditor value={{}} onChange={onChange} />);

      const addButton = screen.getByRole("button", { name: /add.*header/i });
      expect(addButton).toBeInTheDocument();
    });

    it("has accessible labels for remove buttons", () => {
      render(
        <HeadersEditor value={{ "X-Header": "value" }} onChange={onChange} />
      );

      const removeButton = screen.getByRole("button", { name: /remove.*header/i });
      expect(removeButton).toBeInTheDocument();
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(
        <HeadersEditor value={{ "X-Header": "value" }} onChange={onChange} />
      );

      // The first tabbable element is the key input
      const keyInput = screen.getByPlaceholderText(/key/i);
      keyInput.focus();
      expect(keyInput).toHaveFocus();

      // Tab to value input
      await user.tab();
      const valueInput = screen.getByPlaceholderText(/value/i);
      expect(valueInput).toHaveFocus();
    });

    it("has appropriate placeholder text for inputs", () => {
      render(
        <HeadersEditor value={{ "": "" }} onChange={onChange} />
      );

      expect(screen.getByPlaceholderText(/key/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/value/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles special characters in header keys", async () => {
      const user = userEvent.setup();
      render(<ControlledHeadersEditor onChangeSpy={onChange} />);

      const addButton = screen.getByRole("button", { name: /add.*header/i });
      await user.click(addButton);

      const keyInput = screen.getByPlaceholderText(/key/i);
      // Use fireEvent to avoid special character interpretation
      fireEvent.change(keyInput, { target: { value: "X-Special-Header_123" } });

      expect(onChange).toHaveBeenLastCalledWith({ "X-Special-Header_123": "" });
    });

    it("handles special characters in header values", async () => {
      const user = userEvent.setup();
      render(<ControlledHeadersEditor onChangeSpy={onChange} />);

      const addButton = screen.getByRole("button", { name: /add.*header/i });
      await user.click(addButton);

      const valueInput = screen.getByPlaceholderText(/value/i);
      // Use fireEvent to avoid special character interpretation
      fireEvent.change(valueInput, { target: { value: "value with spaces & symbols!" } });

      expect(onChange).toHaveBeenLastCalledWith({ "": "value with spaces & symbols!" });
    });

    it("handles many headers", () => {
      const manyHeaders: Record<string, string> = {};
      for (let i = 0; i < 10; i++) {
        manyHeaders[`X-Header-${i}`] = `value-${i}`;
      }

      render(<HeadersEditor value={manyHeaders} onChange={onChange} />);

      const keyInputs = screen.getAllByPlaceholderText(/key/i);
      expect(keyInputs).toHaveLength(10);
    });

    it("preserves order when adding/removing headers", async () => {
      const user = userEvent.setup();
      render(
        <HeadersEditor
          value={{ "A-Header": "a", "B-Header": "b", "C-Header": "c" }}
          onChange={onChange}
        />
      );

      // Remove middle header
      const removeButtons = screen.getAllByRole("button", { name: /remove.*header/i });
      await user.click(removeButtons[1]); // Remove B-Header

      expect(onChange).toHaveBeenCalledWith({
        "A-Header": "a",
        "C-Header": "c",
      });
    });
  });
});
