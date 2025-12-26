import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetBiddingConfig, BudgetBiddingConfigValue } from "../BudgetBiddingConfig";
import type { DataSourceColumn, Platform } from "../../types";

const mockColumns: DataSourceColumn[] = [
  { name: "brand_name", type: "string", sampleValues: ["Nike", "Adidas", "Puma"] },
  { name: "budget", type: "number", sampleValues: ["100", "250", "500"] },
  { name: "region", type: "string", sampleValues: ["US", "EU", "APAC"] },
];

const defaultValue: BudgetBiddingConfigValue = {
  budget: {
    type: "daily",
    amountPattern: "",
    currency: "USD",
    pacing: "standard",
  },
  bidding: {},
  schedule: {},
};

const defaultPlatform: Platform = "google";

describe("BudgetBiddingConfig", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  // ==========================================================================
  // Section Expansion/Collapse Tests
  // ==========================================================================

  describe("Section Expansion/Collapse", () => {
    it("renders budget section expanded by default", () => {
      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      // Budget section should show content immediately
      expect(screen.getByText("Budget")).toBeInTheDocument();
      expect(screen.getByText("Budget Amount")).toBeInTheDocument();
    });

    it("renders bidding section collapsed by default", () => {
      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      expect(screen.getByText("Bidding Strategy")).toBeInTheDocument();
      // Strategy selector should not be visible initially (no strategy options visible)
      expect(screen.queryByTestId("strategy-maximize_clicks")).not.toBeInTheDocument();
    });

    it("renders schedule section collapsed by default", () => {
      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      expect(screen.getByText("Schedule")).toBeInTheDocument();
      // Date picker should not be visible initially
      expect(screen.queryByLabelText(/start date/i)).not.toBeInTheDocument();
    });

    it("expands bidding section when header is clicked", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const biddingHeader = screen.getByText("Bidding Strategy").closest("button");
      await user.click(biddingHeader!);

      await waitFor(() => {
        // Should now show bidding content (strategy options visible)
        expect(screen.getByTestId("strategy-maximize_clicks")).toBeInTheDocument();
      });
    });

    it("expands schedule section when header is clicked", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const scheduleHeader = screen.getByText("Schedule").closest("button");
      await user.click(scheduleHeader!);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });
    });

    it("collapses bidding section when header is clicked again", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const biddingHeader = screen.getByText("Bidding Strategy").closest("button");

      // Expand
      await user.click(biddingHeader!);
      await waitFor(() => {
        expect(screen.getByTestId("strategy-maximize_clicks")).toBeInTheDocument();
      });

      // Collapse
      await user.click(biddingHeader!);
      await waitFor(() => {
        expect(screen.queryByTestId("strategy-maximize_clicks")).not.toBeInTheDocument();
      });
    });

    it("toggles advanced budget options when clicked", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const advancedToggle = screen.getByText("Advanced Budget Options");

      // Initially, pacing should not be visible
      expect(screen.queryByText(/pacing strategy/i)).not.toBeInTheDocument();

      await user.click(advancedToggle);

      await waitFor(() => {
        // Now pacing options should be visible
        expect(screen.getByText(/pacing strategy/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // State Propagation Tests
  // ==========================================================================

  describe("State Propagation", () => {
    it("propagates budget type changes to parent", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const lifetimeOption = screen.getByTestId("budget-type-lifetime");
      await user.click(lifetimeOption);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: expect.objectContaining({
            type: "lifetime",
          }),
        })
      );
    });

    it("propagates budget amount changes to parent", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const amountInput = screen.getByPlaceholderText(/100 or {budget}/i);
      await user.type(amountInput, "500");

      // onChange is called for each keystroke
      expect(onChange).toHaveBeenCalled();
      // After typing "500", the calls would be "5", "50", "500"
      // The last call should have the full value
      const calls = onChange.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(3);
      // Check that there was a call that included "5"
      const hasCorrectCall = calls.some(
        (call) => call[0].budget.amountPattern?.includes("5")
      );
      expect(hasCorrectCall).toBe(true);
    });

    it("propagates currency changes to parent", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const currencySelector = screen.getByTestId("currency-selector");
      await user.selectOptions(currencySelector, "EUR");

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: expect.objectContaining({
            currency: "EUR",
          }),
        })
      );
    });

    it("propagates bidding strategy changes to parent", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      // Expand bidding section
      const biddingHeader = screen.getByText("Bidding Strategy").closest("button");
      await user.click(biddingHeader!);

      await waitFor(() => {
        expect(screen.getByTestId("strategy-maximize_clicks")).toBeInTheDocument();
      });

      // Select a different strategy
      const targetCpaOption = screen.getByTestId("strategy-target_cpa");
      await user.click(targetCpaOption);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          bidding: expect.objectContaining({
            strategy: "target_cpa",
          }),
        })
      );
    });

    it("propagates schedule changes to parent", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      // Expand schedule section
      const scheduleHeader = screen.getByText("Schedule").closest("button");
      await user.click(scheduleHeader!);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });

      // Enter a start date
      const startDateInput = screen.getByLabelText(/start date/i);
      await user.clear(startDateInput);
      await user.type(startDateInput, "2025-01-15");

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.schedule.startDate).toBe("2025-01-15");
    });
  });

  // ==========================================================================
  // Handler Callback Integration Tests
  // ==========================================================================

  describe("Handler Callback Integration", () => {
    it("preserves existing budget values when changing type", async () => {
      const user = userEvent.setup();
      const valueWithAmount: BudgetBiddingConfigValue = {
        ...defaultValue,
        budget: {
          ...defaultValue.budget,
          amountPattern: "500",
          currency: "EUR",
        },
      };

      render(
        <BudgetBiddingConfig
          value={valueWithAmount}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const lifetimeOption = screen.getByTestId("budget-type-lifetime");
      await user.click(lifetimeOption);

      const call = onChange.mock.calls[0][0];
      expect(call.budget.type).toBe("lifetime");
      expect(call.budget.amountPattern).toBe("500");
      expect(call.budget.currency).toBe("EUR");
    });

    it("preserves bidding values when changing budget settings", async () => {
      const user = userEvent.setup();
      const valueWithBidding: BudgetBiddingConfigValue = {
        ...defaultValue,
        bidding: {
          strategy: "target_cpa",
          targetCpa: "25",
        },
      };

      render(
        <BudgetBiddingConfig
          value={valueWithBidding}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const lifetimeOption = screen.getByTestId("budget-type-lifetime");
      await user.click(lifetimeOption);

      const call = onChange.mock.calls[0][0];
      expect(call.bidding.strategy).toBe("target_cpa");
      expect(call.bidding.targetCpa).toBe("25");
    });

    it("preserves schedule values when changing budget settings", async () => {
      const user = userEvent.setup();
      const valueWithSchedule: BudgetBiddingConfigValue = {
        ...defaultValue,
        schedule: {
          startDate: "2025-01-01",
          timezone: "America/New_York",
        },
      };

      render(
        <BudgetBiddingConfig
          value={valueWithSchedule}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const lifetimeOption = screen.getByTestId("budget-type-lifetime");
      await user.click(lifetimeOption);

      const call = onChange.mock.calls[0][0];
      expect(call.schedule.startDate).toBe("2025-01-01");
      expect(call.schedule.timezone).toBe("America/New_York");
    });

    it("handles shared budget type selection", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const sharedOption = screen.getByTestId("budget-type-shared");
      await user.click(sharedOption);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          budget: expect.objectContaining({
            type: "shared",
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Default Values and Initialization Tests
  // ==========================================================================

  describe("Default Values and Initialization", () => {
    it("uses USD as default currency", () => {
      const minimalValue: BudgetBiddingConfigValue = {
        budget: {},
        bidding: {},
        schedule: {},
      };

      render(
        <BudgetBiddingConfig
          value={minimalValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const currencySelector = screen.getByTestId("currency-selector") as HTMLSelectElement;
      expect(currencySelector.value).toBe("USD");
    });

    it("uses daily as default budget type", () => {
      const minimalValue: BudgetBiddingConfigValue = {
        budget: {},
        bidding: {},
        schedule: {},
      };

      render(
        <BudgetBiddingConfig
          value={minimalValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const dailyOption = screen.getByTestId("budget-type-daily");
      expect(dailyOption).toHaveAttribute("aria-checked", "true");
    });

    it("displays section status indicators", () => {
      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      // Bidding should show "Default" status
      expect(screen.getByText("Default")).toBeInTheDocument();

      // Schedule should show "Starts Immediately" status
      expect(screen.getByText("Starts Immediately")).toBeInTheDocument();
    });

    it("shows Configured status for bidding when strategy is set", () => {
      const valueWithBidding: BudgetBiddingConfigValue = {
        ...defaultValue,
        bidding: {
          strategy: "maximize_conversions",
        },
      };

      render(
        <BudgetBiddingConfig
          value={valueWithBidding}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      expect(screen.getByText("Configured")).toBeInTheDocument();
    });

    it("shows Configured status for schedule when start date is set", () => {
      const valueWithSchedule: BudgetBiddingConfigValue = {
        ...defaultValue,
        schedule: {
          startDate: "2025-01-15",
        },
      };

      render(
        <BudgetBiddingConfig
          value={valueWithSchedule}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const statusElements = screen.getAllByText("Configured");
      expect(statusElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Platform-specific Behavior Tests
  // ==========================================================================

  describe("Platform-specific Behavior", () => {
    it("passes platform to bidding strategy selector", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform="facebook"
          columns={mockColumns}
        />
      );

      // Expand bidding section
      const biddingHeader = screen.getByText("Bidding Strategy").closest("button");
      await user.click(biddingHeader!);

      await waitFor(() => {
        // Facebook platform should have cost_cap strategy available
        expect(screen.getByTestId("strategy-cost_cap")).toBeInTheDocument();
      });
    });

    it("shows Reddit-specific strategies when platform is reddit", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform="reddit"
          columns={mockColumns}
        />
      );

      // Expand bidding section
      const biddingHeader = screen.getByText("Bidding Strategy").closest("button");
      await user.click(biddingHeader!);

      await waitFor(() => {
        // Reddit should have reddit_cpc strategy
        expect(screen.getByTestId("strategy-reddit_cpc")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Disabled State Tests
  // ==========================================================================

  describe("Disabled State", () => {
    it("disables all inputs when disabled prop is true", () => {
      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
          disabled
        />
      );

      // Budget type options should be disabled
      expect(screen.getByTestId("budget-type-daily")).toBeDisabled();
      expect(screen.getByTestId("budget-type-lifetime")).toBeDisabled();
      expect(screen.getByTestId("budget-type-shared")).toBeDisabled();

      // Amount input should be disabled
      const amountInput = screen.getByPlaceholderText(/100 or {budget}/i);
      expect(amountInput).toBeDisabled();

      // Currency selector should be disabled
      const currencySelector = screen.getByTestId("currency-selector");
      expect(currencySelector).toBeDisabled();
    });

    it("does not trigger onChange when disabled", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
          disabled
        />
      );

      const lifetimeOption = screen.getByTestId("budget-type-lifetime");
      await user.click(lifetimeOption);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Variable Autocomplete Integration Tests
  // ==========================================================================

  describe("Variable Autocomplete Integration", () => {
    it("shows variable autocomplete in budget amount input", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const amountInput = screen.getByPlaceholderText(/100 or {budget}/i);
      // Use double braces to escape the special character in userEvent
      await user.type(amountInput, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      // Should show available columns
      expect(screen.getByText("budget")).toBeInTheDocument();
      expect(screen.getByText("brand_name")).toBeInTheDocument();
    });

    it("inserts selected variable into budget amount", async () => {
      const user = userEvent.setup();

      render(
        <BudgetBiddingConfig
          value={defaultValue}
          onChange={onChange}
          platform={defaultPlatform}
          columns={mockColumns}
        />
      );

      const amountInput = screen.getByPlaceholderText(/100 or {budget}/i);
      // Use double braces to escape the special character in userEvent
      await user.type(amountInput, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      await user.click(screen.getByText("budget"));

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.budget.amountPattern).toBe("{budget}");
    });
  });
});
