import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TargetInputs } from "../TargetInputs";
import type { BiddingConfig } from "../../../types";

describe("TargetInputs", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("Target CPA Strategy", () => {
    it("shows target CPA input for target_cpa strategy", () => {
      render(
        <TargetInputs
          strategy="target_cpa"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByLabelText(/target cpa/i)).toBeInTheDocument();
    });

    it("shows target CPA input for cost_cap strategy", () => {
      render(
        <TargetInputs
          strategy="cost_cap"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByLabelText(/target cpa/i)).toBeInTheDocument();
    });

    it("calls onChange when target CPA is entered", async () => {
      const user = userEvent.setup();

      render(
        <TargetInputs
          strategy="target_cpa"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      const input = screen.getByLabelText(/target cpa/i);
      await user.type(input, "25");

      expect(onChange).toHaveBeenCalled();
    });

    it("displays current target CPA value", () => {
      render(
        <TargetInputs
          strategy="target_cpa"
          value={{ targetCpa: "30" }}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    });
  });

  describe("Target ROAS Strategy", () => {
    it("shows target ROAS input for target_roas strategy", () => {
      render(
        <TargetInputs
          strategy="target_roas"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByLabelText(/target roas/i)).toBeInTheDocument();
    });

    it("shows target ROAS input for minimum_roas strategy", () => {
      render(
        <TargetInputs
          strategy="minimum_roas"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByLabelText(/target roas/i)).toBeInTheDocument();
    });

    it("displays ROAS as percentage", () => {
      render(
        <TargetInputs
          strategy="target_roas"
          value={{ targetRoas: "4.0" }}
          onChange={onChange}
          currency="USD"
        />
      );

      // 4.0 = 400% return - multiple elements contain "400%", so we use getAllByText
      const elements = screen.getAllByText(/400%/);
      // Should have at least the dynamic preview element
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Manual CPC Strategy", () => {
    it("shows max CPC input for manual_cpc strategy", () => {
      render(
        <TargetInputs
          strategy="manual_cpc"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByLabelText(/max cpc/i)).toBeInTheDocument();
    });

    it("shows max CPC input for enhanced_cpc strategy", () => {
      render(
        <TargetInputs
          strategy="enhanced_cpc"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByLabelText(/max cpc/i)).toBeInTheDocument();
    });

    it("shows max CPC input for bid_cap strategy", () => {
      render(
        <TargetInputs
          strategy="bid_cap"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByLabelText(/max.*bid/i)).toBeInTheDocument();
    });
  });

  describe("Reddit Strategies", () => {
    it("shows max CPM for reddit_cpm strategy", () => {
      render(
        <TargetInputs
          strategy="reddit_cpm"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByLabelText(/max cpm/i)).toBeInTheDocument();
    });

    it("shows max CPC for reddit_cpc strategy", () => {
      render(
        <TargetInputs
          strategy="reddit_cpc"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByLabelText(/max cpc/i)).toBeInTheDocument();
    });

    it("shows max CPV for reddit_cpv strategy", () => {
      render(
        <TargetInputs
          strategy="reddit_cpv"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByLabelText(/max cpv/i)).toBeInTheDocument();
    });
  });

  describe("Automatic Strategies", () => {
    it("shows no inputs for maximize_clicks strategy", () => {
      render(
        <TargetInputs
          strategy="maximize_clicks"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText(/automatic/i)).toBeInTheDocument();
    });

    it("shows no inputs for lowest_cost strategy", () => {
      render(
        <TargetInputs
          strategy="lowest_cost"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("Currency Display", () => {
    it("shows USD symbol for USD currency", () => {
      render(
        <TargetInputs
          strategy="target_cpa"
          value={{}}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByText("$")).toBeInTheDocument();
    });

    it("shows EUR for EUR currency", () => {
      render(
        <TargetInputs
          strategy="target_cpa"
          value={{}}
          onChange={onChange}
          currency="EUR"
        />
      );

      // Euro symbol is the actual unicode character
      expect(screen.getByText("\u20AC")).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("disables all inputs when disabled prop is true", () => {
      render(
        <TargetInputs
          strategy="target_cpa"
          value={{}}
          onChange={onChange}
          currency="USD"
          disabled
        />
      );

      expect(screen.getByLabelText(/target cpa/i)).toBeDisabled();
    });
  });

  describe("Variable Support", () => {
    it("supports variable patterns in input", () => {
      render(
        <TargetInputs
          strategy="target_cpa"
          value={{ targetCpa: "{target_cpa}" }}
          onChange={onChange}
          currency="USD"
        />
      );

      expect(screen.getByDisplayValue("{target_cpa}")).toBeInTheDocument();
    });
  });
});
