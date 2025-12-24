import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BiddingStrategySelector } from "../BiddingStrategySelector";
import type { BiddingStrategy } from "../../../types";

describe("BiddingStrategySelector", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("Google Platform", () => {
    it("renders Google bidding strategies", () => {
      render(
        <BiddingStrategySelector
          platform="google"
          value="maximize_clicks"
          onChange={onChange}
        />
      );

      expect(screen.getByText(/Maximize Clicks/i)).toBeInTheDocument();
      expect(screen.getByText(/Maximize Conversions/i)).toBeInTheDocument();
      expect(screen.getByText(/Target CPA/i)).toBeInTheDocument();
      expect(screen.getByText(/Target ROAS/i)).toBeInTheDocument();
    });

    it("shows strategy descriptions", () => {
      render(
        <BiddingStrategySelector
          platform="google"
          value="maximize_clicks"
          onChange={onChange}
        />
      );

      expect(screen.getByText(/as many clicks as possible/i)).toBeInTheDocument();
    });

    it("marks selected strategy as checked", () => {
      render(
        <BiddingStrategySelector
          platform="google"
          value="target_cpa"
          onChange={onChange}
        />
      );

      const targetCpaOption = screen.getByTestId("strategy-target_cpa");
      expect(targetCpaOption).toHaveAttribute("aria-checked", "true");
    });

    it("shows requirements for target_cpa strategy", () => {
      render(
        <BiddingStrategySelector
          platform="google"
          value="maximize_clicks"
          onChange={onChange}
        />
      );

      // Target CPA requires 30+ conversions
      expect(screen.getByText(/30\+ conversions/i)).toBeInTheDocument();
    });
  });

  describe("Reddit Platform", () => {
    it("renders Reddit bidding strategies", () => {
      render(
        <BiddingStrategySelector
          platform="reddit"
          value="reddit_cpm"
          onChange={onChange}
        />
      );

      expect(screen.getByText(/CPM.*1,000 Impressions/i)).toBeInTheDocument();
      expect(screen.getByText(/CPC.*Cost per Click/i)).toBeInTheDocument();
      expect(screen.getByText(/CPV.*Cost per View/i)).toBeInTheDocument();
    });
  });

  describe("Facebook Platform", () => {
    it("renders Facebook bidding strategies", () => {
      render(
        <BiddingStrategySelector
          platform="facebook"
          value="lowest_cost"
          onChange={onChange}
        />
      );

      expect(screen.getByText(/Lowest Cost/i)).toBeInTheDocument();
      expect(screen.getByText(/Cost Cap/i)).toBeInTheDocument();
      expect(screen.getByText(/Bid Cap/i)).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onChange when strategy is selected", async () => {
      const user = userEvent.setup();

      render(
        <BiddingStrategySelector
          platform="google"
          value="maximize_clicks"
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("strategy-target_cpa"));

      expect(onChange).toHaveBeenCalledWith("target_cpa");
    });

    it("does not call onChange when already selected strategy is clicked", async () => {
      const user = userEvent.setup();

      render(
        <BiddingStrategySelector
          platform="google"
          value="maximize_clicks"
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("strategy-maximize_clicks"));

      expect(onChange).not.toHaveBeenCalled();
    });

    it("supports keyboard selection", async () => {
      const user = userEvent.setup();

      render(
        <BiddingStrategySelector
          platform="google"
          value="maximize_clicks"
          onChange={onChange}
        />
      );

      const targetRoasOption = screen.getByTestId("strategy-target_roas");
      targetRoasOption.focus();

      await user.keyboard("{Enter}");

      expect(onChange).toHaveBeenCalledWith("target_roas");
    });
  });

  describe("Recommended Strategies", () => {
    it("shows recommended badge for suggested strategy", () => {
      render(
        <BiddingStrategySelector
          platform="google"
          value="maximize_clicks"
          onChange={onChange}
          recommendedStrategy="maximize_conversions"
        />
      );

      // Should show recommended on the suggested strategy
      const maximizeConversions = screen.getByTestId("strategy-maximize_conversions");
      expect(maximizeConversions.textContent).toMatch(/recommended/i);
    });
  });

  describe("Disabled State", () => {
    it("disables all options when disabled prop is true", () => {
      render(
        <BiddingStrategySelector
          platform="google"
          value="maximize_clicks"
          onChange={onChange}
          disabled
        />
      );

      const options = screen.getAllByRole("radio");
      options.forEach((option) => {
        expect(option).toBeDisabled();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper radiogroup role", () => {
      render(
        <BiddingStrategySelector
          platform="google"
          value="maximize_clicks"
          onChange={onChange}
        />
      );

      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    });

    it("has accessible labels for each strategy", () => {
      render(
        <BiddingStrategySelector
          platform="google"
          value="maximize_clicks"
          onChange={onChange}
        />
      );

      expect(screen.getByRole("radio", { name: /maximize clicks/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /maximize conversions/i })).toBeInTheDocument();
    });
  });
});
