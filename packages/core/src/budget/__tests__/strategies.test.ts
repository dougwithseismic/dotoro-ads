import { describe, it, expect } from "vitest";
import {
  BIDDING_STRATEGIES,
  getBiddingStrategies,
  getBiddingStrategy,
  isValidStrategyForPlatform,
  getStrategiesRequiringTargetCpa,
  getStrategiesRequiringTargetRoas,
  getStrategiesSupportingAdjustments,
} from "../strategies.js";
import type { Platform } from "../../ad-types/types.js";

describe("BIDDING_STRATEGIES", () => {
  it("contains strategies for all platforms", () => {
    expect(BIDDING_STRATEGIES.google).toBeDefined();
    expect(BIDDING_STRATEGIES.reddit).toBeDefined();
    expect(BIDDING_STRATEGIES.facebook).toBeDefined();
  });

  it("Google has expected strategies", () => {
    const googleIds = BIDDING_STRATEGIES.google.map((s) => s.id);
    expect(googleIds).toContain("maximize_clicks");
    expect(googleIds).toContain("maximize_conversions");
    expect(googleIds).toContain("target_cpa");
    expect(googleIds).toContain("target_roas");
    expect(googleIds).toContain("manual_cpc");
  });

  it("Reddit has expected strategies", () => {
    const redditIds = BIDDING_STRATEGIES.reddit.map((s) => s.id);
    expect(redditIds).toContain("reddit_cpm");
    expect(redditIds).toContain("reddit_cpc");
    expect(redditIds).toContain("reddit_cpv");
  });

  it("Facebook has expected strategies", () => {
    const facebookIds = BIDDING_STRATEGIES.facebook.map((s) => s.id);
    expect(facebookIds).toContain("lowest_cost");
    expect(facebookIds).toContain("cost_cap");
    expect(facebookIds).toContain("bid_cap");
    expect(facebookIds).toContain("minimum_roas");
  });

  it("all strategies have required properties", () => {
    for (const platform of Object.keys(BIDDING_STRATEGIES) as Platform[]) {
      for (const strategy of BIDDING_STRATEGIES[platform]) {
        expect(strategy.id).toBeTruthy();
        expect(strategy.name).toBeTruthy();
        expect(strategy.description).toBeTruthy();
        expect(strategy.platform).toBe(platform);
      }
    }
  });
});

describe("getBiddingStrategies", () => {
  it("returns strategies for Google", () => {
    const strategies = getBiddingStrategies("google");
    expect(strategies.length).toBeGreaterThan(0);
    expect(strategies.every((s) => s.platform === "google")).toBe(true);
  });

  it("returns strategies for Reddit", () => {
    const strategies = getBiddingStrategies("reddit");
    expect(strategies.length).toBe(3);
    expect(strategies.every((s) => s.platform === "reddit")).toBe(true);
  });

  it("returns strategies for Facebook", () => {
    const strategies = getBiddingStrategies("facebook");
    expect(strategies.length).toBeGreaterThan(0);
    expect(strategies.every((s) => s.platform === "facebook")).toBe(true);
  });
});

describe("getBiddingStrategy", () => {
  it("returns correct strategy for Google", () => {
    const strategy = getBiddingStrategy("google", "maximize_clicks");
    expect(strategy).toBeDefined();
    expect(strategy?.id).toBe("maximize_clicks");
    expect(strategy?.platform).toBe("google");
  });

  it("returns correct strategy for Reddit", () => {
    const strategy = getBiddingStrategy("reddit", "reddit_cpc");
    expect(strategy).toBeDefined();
    expect(strategy?.id).toBe("reddit_cpc");
    expect(strategy?.requiresMaxBid).toBe(true);
  });

  it("returns undefined for non-existent strategy", () => {
    const strategy = getBiddingStrategy("google", "non_existent" as any);
    expect(strategy).toBeUndefined();
  });

  it("returns undefined for wrong platform", () => {
    const strategy = getBiddingStrategy("reddit", "maximize_clicks");
    expect(strategy).toBeUndefined();
  });
});

describe("isValidStrategyForPlatform", () => {
  it("returns true for valid Google strategies", () => {
    expect(isValidStrategyForPlatform("google", "maximize_clicks")).toBe(true);
    expect(isValidStrategyForPlatform("google", "target_cpa")).toBe(true);
  });

  it("returns true for valid Reddit strategies", () => {
    expect(isValidStrategyForPlatform("reddit", "reddit_cpm")).toBe(true);
    expect(isValidStrategyForPlatform("reddit", "reddit_cpc")).toBe(true);
  });

  it("returns false for invalid strategies", () => {
    expect(isValidStrategyForPlatform("google", "reddit_cpm")).toBe(false);
    expect(isValidStrategyForPlatform("reddit", "target_cpa")).toBe(false);
  });
});

describe("getStrategiesRequiringTargetCpa", () => {
  it("returns strategies requiring target CPA for Google", () => {
    const strategies = getStrategiesRequiringTargetCpa("google");
    expect(strategies.some((s) => s.id === "target_cpa")).toBe(true);
    expect(strategies.every((s) => s.requiresTargetCpa)).toBe(true);
  });

  it("returns strategies requiring target CPA for Facebook", () => {
    const strategies = getStrategiesRequiringTargetCpa("facebook");
    expect(strategies.some((s) => s.id === "cost_cap")).toBe(true);
  });

  it("returns empty array for Reddit (no CPA strategies)", () => {
    const strategies = getStrategiesRequiringTargetCpa("reddit");
    expect(strategies.length).toBe(0);
  });
});

describe("getStrategiesRequiringTargetRoas", () => {
  it("returns strategies requiring target ROAS for Google", () => {
    const strategies = getStrategiesRequiringTargetRoas("google");
    expect(strategies.some((s) => s.id === "target_roas")).toBe(true);
    expect(strategies.every((s) => s.requiresTargetRoas)).toBe(true);
  });

  it("returns strategies requiring target ROAS for Facebook", () => {
    const strategies = getStrategiesRequiringTargetRoas("facebook");
    expect(strategies.some((s) => s.id === "minimum_roas")).toBe(true);
  });
});

describe("getStrategiesSupportingAdjustments", () => {
  it("returns strategies supporting adjustments for Google", () => {
    const strategies = getStrategiesSupportingAdjustments("google");
    expect(strategies.length).toBeGreaterThan(0);
    expect(strategies.every((s) => s.supportsAdjustments)).toBe(true);
  });

  it("returns empty array for Facebook (no adjustment support)", () => {
    const strategies = getStrategiesSupportingAdjustments("facebook");
    expect(strategies.length).toBe(0);
  });
});
