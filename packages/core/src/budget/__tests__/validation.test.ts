import { describe, it, expect } from "vitest";
import {
  validateBudgetConfig,
  validateBiddingConfig,
  validateScheduleConfig,
} from "../validation.js";
import type { BudgetConfig, BiddingConfig, ScheduleConfig } from "../types.js";

describe("validateBudgetConfig", () => {
  it("validates valid daily budget", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "100",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("validates valid lifetime budget", () => {
    const config: BudgetConfig = {
      type: "lifetime",
      amountPattern: "5000",
      currency: "EUR",
    };
    const result = validateBudgetConfig(config, "facebook");
    expect(result.valid).toBe(true);
  });

  it("validates variable pattern in amount", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "{daily_budget}",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(true);
  });

  it("fails when budget type is invalid", () => {
    const config: BudgetConfig = {
      type: "invalid" as any,
      amountPattern: "100",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid budget type: invalid");
  });

  it("fails when amount is empty", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Budget amount is required");
  });

  it("fails when amount is not a number or variable", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "abc",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Budget amount must be a number or a variable pattern (e.g., {budget})"
    );
  });

  it("fails when amount is negative", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "-50",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Budget amount cannot be negative");
  });

  it("fails when currency is missing", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "100",
      currency: "",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Currency is required");
  });

  it("fails when currency is not 3 characters", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "100",
      currency: "US",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Currency must be a 3-letter code (e.g., USD)"
    );
  });

  it("warns about accelerated pacing", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "100",
      currency: "USD",
      pacing: "accelerated",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Accelerated pacing may exhaust your budget early in the day"
    );
  });

  it("fails when shared budget has no ID or name", () => {
    const config: BudgetConfig = {
      type: "shared",
      amountPattern: "1000",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Shared budget requires either an existing budget ID or a name for a new budget"
    );
  });

  it("validates shared budget with ID", () => {
    const config: BudgetConfig = {
      type: "shared",
      amountPattern: "1000",
      currency: "USD",
      sharedBudgetId: "budget-123",
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(true);
  });

  it("validates caps with valid values", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "100",
      currency: "USD",
      caps: {
        dailyCap: "150",
        weeklyCap: "700",
        monthlyCap: "3000",
      },
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(true);
  });

  it("warns when daily budget is below platform minimum for Reddit", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "3",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "reddit");
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "reddit typically requires a minimum daily budget of $5. Your budget of $3 may be too low."
    );
  });

  it("does not warn when daily budget meets platform minimum", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "10",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "reddit");
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("does not warn for lifetime budget type", () => {
    const config: BudgetConfig = {
      type: "lifetime",
      amountPattern: "3",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "reddit");
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("does not warn for variable budget patterns", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "{low_budget}",
      currency: "USD",
    };
    const result = validateBudgetConfig(config, "reddit");
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("fails when caps have invalid values", () => {
    const config: BudgetConfig = {
      type: "daily",
      amountPattern: "100",
      currency: "USD",
      caps: {
        dailyCap: "-50",
      },
    };
    const result = validateBudgetConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "dailyCap must be a positive number or variable pattern"
    );
  });
});

describe("validateBiddingConfig", () => {
  it("validates maximize_clicks strategy", () => {
    const config: BiddingConfig = {
      strategy: "maximize_clicks",
    };
    const result = validateBiddingConfig(config, "google");
    expect(result.valid).toBe(true);
  });

  it("fails when strategy is not valid for platform", () => {
    const config: BiddingConfig = {
      strategy: "reddit_cpm",
    };
    const result = validateBiddingConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("is not available for google");
  });

  it("fails when target CPA is required but missing", () => {
    const config: BiddingConfig = {
      strategy: "target_cpa",
    };
    const result = validateBiddingConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Target CPA is required for Target CPA strategy"
    );
  });

  it("validates target_cpa with CPA value", () => {
    const config: BiddingConfig = {
      strategy: "target_cpa",
      targetCpa: "25.00",
    };
    const result = validateBiddingConfig(config, "google");
    expect(result.valid).toBe(true);
  });

  it("fails when target ROAS is required but missing", () => {
    const config: BiddingConfig = {
      strategy: "target_roas",
    };
    const result = validateBiddingConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Target ROAS is required for Target ROAS strategy"
    );
  });

  it("fails when max bid is required but missing", () => {
    const config: BiddingConfig = {
      strategy: "manual_cpc",
    };
    const result = validateBiddingConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Maximum bid is required for Manual CPC strategy"
    );
  });

  it("validates manual_cpc with max CPC", () => {
    const config: BiddingConfig = {
      strategy: "manual_cpc",
      maxCpc: "2.50",
    };
    const result = validateBiddingConfig(config, "google");
    expect(result.valid).toBe(true);
  });

  it("fails when target CPA is negative", () => {
    const config: BiddingConfig = {
      strategy: "target_cpa",
      targetCpa: "-10",
    };
    const result = validateBiddingConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Target CPA must be positive");
  });

  it("fails when bid adjustment modifier is out of range", () => {
    const config: BiddingConfig = {
      strategy: "maximize_clicks",
      adjustments: [
        { type: "device", target: "mobile", modifier: 15 },
      ],
    };
    const result = validateBiddingConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Bid adjustment modifier must be between 0 and 10 (got 15)"
    );
  });

  it("fails when bid adjustment target is empty", () => {
    const config: BiddingConfig = {
      strategy: "maximize_clicks",
      adjustments: [
        { type: "device", target: "", modifier: 1.2 },
      ],
    };
    const result = validateBiddingConfig(config, "google");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Bid adjustment target is required");
  });

  it("warns when adjustments are not supported", () => {
    const config: BiddingConfig = {
      strategy: "lowest_cost",
      adjustments: [
        { type: "device", target: "mobile", modifier: 1.2 },
      ],
    };
    const result = validateBiddingConfig(config, "facebook");
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Bid adjustments are not supported for Lowest Cost strategy"
    );
  });

  it("validates Reddit CPM strategy", () => {
    const config: BiddingConfig = {
      strategy: "reddit_cpm",
      maxCpm: "5.00",
    };
    const result = validateBiddingConfig(config, "reddit");
    expect(result.valid).toBe(true);
  });

  it("validates Facebook cost_cap strategy", () => {
    const config: BiddingConfig = {
      strategy: "cost_cap",
      targetCpa: "20.00",
    };
    const result = validateBiddingConfig(config, "facebook");
    expect(result.valid).toBe(true);
  });
});

describe("validateScheduleConfig", () => {
  it("validates empty schedule (run indefinitely)", () => {
    const config: ScheduleConfig = {};
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(true);
  });

  it("validates valid date range", () => {
    const config: ScheduleConfig = {
      startDate: "2024-01-15",
      endDate: "2024-02-15",
      timezone: "America/New_York",
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(true);
  });

  it("validates date with variable pattern", () => {
    const config: ScheduleConfig = {
      startDate: "{campaign_start}",
      endDate: "{campaign_end}",
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(true);
  });

  it("fails when end date is before start date", () => {
    const config: ScheduleConfig = {
      startDate: "2024-02-15",
      endDate: "2024-01-15",
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("End date must be after start date");
  });

  it("fails when date format is invalid", () => {
    const config: ScheduleConfig = {
      startDate: "not-a-date",
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid start date format");
  });

  it("validates day parting with valid schedule", () => {
    const config: ScheduleConfig = {
      dayParting: {
        timezone: "America/New_York",
        schedule: {
          monday: [{ start: "09:00", end: "17:00" }],
          tuesday: [{ start: "09:00", end: "17:00" }],
        },
      },
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(true);
  });

  it("fails when day parting has no timezone", () => {
    const config: ScheduleConfig = {
      dayParting: {
        timezone: "",
        schedule: {
          monday: [{ start: "09:00", end: "17:00" }],
        },
      },
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Timezone is required for day parting");
  });

  it("fails when time format is invalid", () => {
    const config: ScheduleConfig = {
      dayParting: {
        timezone: "America/New_York",
        schedule: {
          monday: [{ start: "9:00", end: "17:00" }],
        },
      },
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid start time format in monday schedule"
    );
  });

  it("fails when time is out of range", () => {
    const config: ScheduleConfig = {
      dayParting: {
        timezone: "America/New_York",
        schedule: {
          monday: [{ start: "25:00", end: "17:00" }],
        },
      },
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(false);
  });

  it("warns when end time is before start time", () => {
    const config: ScheduleConfig = {
      dayParting: {
        timezone: "America/New_York",
        schedule: {
          monday: [{ start: "17:00", end: "09:00" }],
        },
      },
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "End time should be after start time in monday schedule"
    );
  });

  it("fails when bid modifier is out of range", () => {
    const config: ScheduleConfig = {
      dayParting: {
        timezone: "America/New_York",
        schedule: {
          monday: [{ start: "09:00", end: "17:00" }],
        },
        bidModifier: 15,
      },
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Day parting bid modifier must be between 0 and 10"
    );
  });

  it("validates bid modifier in valid range", () => {
    const config: ScheduleConfig = {
      dayParting: {
        timezone: "America/New_York",
        schedule: {
          monday: [{ start: "09:00", end: "17:00" }],
        },
        bidModifier: 1.5,
      },
    };
    const result = validateScheduleConfig(config);
    expect(result.valid).toBe(true);
  });
});
