import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetCapsConfig } from "../BudgetCapsConfig";
import type { BudgetCaps } from "../../../types";

describe("BudgetCapsConfig", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("Rendering", () => {
    it("renders collapsed by default", () => {
      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" />);

      expect(screen.getByText(/budget caps/i)).toBeInTheDocument();
      expect(screen.queryByTestId("cap-daily")).not.toBeInTheDocument();
    });

    it("renders expandable section header", () => {
      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" />);

      expect(screen.getByRole("button", { name: /budget caps/i })).toBeInTheDocument();
    });

    it("shows all cap inputs when expanded", async () => {
      const user = userEvent.setup();

      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" />);

      await user.click(screen.getByRole("button", { name: /budget caps/i }));

      expect(screen.getByTestId("cap-daily")).toBeInTheDocument();
      expect(screen.getByTestId("cap-weekly")).toBeInTheDocument();
      expect(screen.getByTestId("cap-monthly")).toBeInTheDocument();
      expect(screen.getByTestId("cap-total")).toBeInTheDocument();
    });
  });

  describe("Expansion State", () => {
    it("starts expanded when defaultExpanded is true", () => {
      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" defaultExpanded />);

      expect(screen.getByTestId("cap-daily")).toBeInTheDocument();
    });

    it("toggles expansion when header is clicked", async () => {
      const user = userEvent.setup();

      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" />);

      const header = screen.getByRole("button", { name: /budget caps/i });

      // Expand
      await user.click(header);
      expect(screen.getByTestId("cap-daily")).toBeInTheDocument();

      // Collapse
      await user.click(header);
      expect(screen.queryByTestId("cap-daily")).not.toBeInTheDocument();
    });
  });

  describe("Cap Values", () => {
    it("displays current cap values", async () => {
      const user = userEvent.setup();
      const caps: BudgetCaps = {
        dailyCap: "100",
        weeklyCap: "500",
        monthlyCap: "2000",
        totalCap: "10000",
      };

      render(<BudgetCapsConfig value={caps} onChange={onChange} currency="USD" defaultExpanded />);

      expect(screen.getByDisplayValue("100")).toBeInTheDocument();
      expect(screen.getByDisplayValue("500")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2000")).toBeInTheDocument();
      expect(screen.getByDisplayValue("10000")).toBeInTheDocument();
    });

    it("calls onChange when daily cap is changed", async () => {
      const user = userEvent.setup();

      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" defaultExpanded />);

      const dailyInput = screen.getByTestId("cap-daily");
      await user.type(dailyInput, "100");

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when weekly cap is changed", async () => {
      const user = userEvent.setup();

      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" defaultExpanded />);

      const weeklyInput = screen.getByTestId("cap-weekly");
      await user.type(weeklyInput, "500");

      expect(onChange).toHaveBeenCalled();
    });

    it("preserves other cap values when one is changed", async () => {
      const user = userEvent.setup();
      const caps: BudgetCaps = {
        dailyCap: "100",
        weeklyCap: "500",
      };

      render(<BudgetCapsConfig value={caps} onChange={onChange} currency="USD" defaultExpanded />);

      const monthlyInput = screen.getByTestId("cap-monthly");
      await user.type(monthlyInput, "2000");

      // Should include both existing and new values
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.dailyCap).toBe("100");
      expect(lastCall.weeklyCap).toBe("500");
    });
  });

  describe("Currency Display", () => {
    it("shows correct currency symbol for USD", async () => {
      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" defaultExpanded />);

      expect(screen.getAllByText("$").length).toBeGreaterThan(0);
    });

    it("shows correct currency for EUR", async () => {
      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="EUR" defaultExpanded />);

      // Euro symbol is the actual unicode character
      expect(screen.getAllByText("\u20AC").length).toBeGreaterThan(0);
    });
  });

  describe("Disabled State", () => {
    it("disables all inputs when disabled prop is true", async () => {
      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" defaultExpanded disabled />);

      expect(screen.getByTestId("cap-daily")).toBeDisabled();
      expect(screen.getByTestId("cap-weekly")).toBeDisabled();
      expect(screen.getByTestId("cap-monthly")).toBeDisabled();
      expect(screen.getByTestId("cap-total")).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("has aria-expanded on toggle button", async () => {
      const user = userEvent.setup();

      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" />);

      const header = screen.getByRole("button", { name: /budget caps/i });
      expect(header).toHaveAttribute("aria-expanded", "false");

      await user.click(header);
      expect(header).toHaveAttribute("aria-expanded", "true");
    });

    it("has accessible labels for inputs", async () => {
      render(<BudgetCapsConfig value={{}} onChange={onChange} currency="USD" defaultExpanded />);

      expect(screen.getByLabelText(/daily cap/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/weekly cap/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/monthly cap/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/total cap/i)).toBeInTheDocument();
    });
  });
});
