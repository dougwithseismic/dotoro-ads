import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CurrencySelector } from "../CurrencySelector";

describe("CurrencySelector", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("Rendering", () => {
    it("renders a select element", () => {
      render(<CurrencySelector value="USD" onChange={onChange} />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders with label when provided", () => {
      render(<CurrencySelector value="USD" onChange={onChange} label="Currency" />);
      expect(screen.getByText("Currency")).toBeInTheDocument();
    });

    it("displays the current value", () => {
      render(<CurrencySelector value="EUR" onChange={onChange} />);
      // The select shows the option text, but value is "EUR"
      expect(screen.getByRole("combobox")).toHaveValue("EUR");
    });

    it("renders all currency options", () => {
      render(<CurrencySelector value="USD" onChange={onChange} />);
      const select = screen.getByRole("combobox");
      expect(select).toContainElement(screen.getByRole("option", { name: /USD/i }));
      expect(select).toContainElement(screen.getByRole("option", { name: /EUR/i }));
      expect(select).toContainElement(screen.getByRole("option", { name: /GBP/i }));
    });
  });

  describe("Interactions", () => {
    it("calls onChange when currency is selected", async () => {
      const user = userEvent.setup();

      render(<CurrencySelector value="USD" onChange={onChange} />);

      await user.selectOptions(screen.getByRole("combobox"), "EUR");

      expect(onChange).toHaveBeenCalledWith("EUR");
    });
  });

  describe("Disabled State", () => {
    it("disables select when disabled prop is true", () => {
      render(<CurrencySelector value="USD" onChange={onChange} disabled />);
      expect(screen.getByRole("combobox")).toBeDisabled();
    });

    it("does not call onChange when disabled", async () => {
      const user = userEvent.setup();

      render(<CurrencySelector value="USD" onChange={onChange} disabled />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "EUR").catch(() => {
        // Expected to fail because disabled
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has accessible label", () => {
      render(<CurrencySelector value="USD" onChange={onChange} label="Currency" />);
      expect(screen.getByLabelText("Currency")).toBeInTheDocument();
    });
  });
});
