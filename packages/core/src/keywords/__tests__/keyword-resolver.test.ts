/**
 * Keyword Inheritance Resolver Tests
 *
 * TDD approach: Tests written first for keyword rule inheritance and resolution.
 *
 * The resolver handles:
 * - Campaign-level rules that apply to all ad groups by default
 * - Ad group overrides with replace/extend/merge strategies
 * - Negative keyword cascading from campaign to ad group level
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  KeywordInheritanceResolver,
  type KeywordInheritance,
  type AdGroupOverride,
} from "../keyword-resolver.js";
import type { KeywordRule } from "../types.js";

// Helper to create test rules
function createRule(id: string, overrides: Partial<KeywordRule> = {}): KeywordRule {
  return {
    id,
    name: `Rule ${id}`,
    scope: "campaign",
    coreTermPattern: "{product_name}",
    prefixes: [],
    suffixes: [],
    matchTypes: ["broad"],
    ...overrides,
  };
}

describe("KeywordInheritanceResolver", () => {
  let resolver: KeywordInheritanceResolver;

  beforeEach(() => {
    resolver = new KeywordInheritanceResolver();
  });

  describe("campaign-level rules", () => {
    it("returns campaign rules when no ad group overrides exist", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("campaign-rule-1"),
          createRule("campaign-rule-2"),
        ],
        adGroupOverrides: new Map(),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(2);
      expect(effectiveRules.map((r) => r.id)).toEqual([
        "campaign-rule-1",
        "campaign-rule-2",
      ]);
    });

    it("returns campaign rules for ad groups without specific overrides", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [createRule("campaign-rule-1")],
        adGroupOverrides: new Map([
          [
            "ad-group-2",
            {
              mode: "replace",
              rules: [createRule("override-rule-1")],
            },
          ],
        ]),
      };

      // ad-group-1 has no override, should get campaign rules
      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(1);
      expect(effectiveRules[0]?.id).toBe("campaign-rule-1");
    });

    it("returns empty array when no campaign rules and no overrides", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [],
        adGroupOverrides: new Map(),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(0);
    });
  });

  describe("replace mode", () => {
    it("completely replaces campaign rules with ad group rules", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("campaign-rule-1"),
          createRule("campaign-rule-2"),
        ],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "replace",
              rules: [createRule("override-rule-1", { scope: "ad-group" })],
            },
          ],
        ]),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(1);
      expect(effectiveRules[0]?.id).toBe("override-rule-1");
    });

    it("returns empty array when replace mode with empty rules", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [createRule("campaign-rule-1")],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "replace",
              rules: [],
            },
          ],
        ]),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(0);
    });
  });

  describe("extend mode", () => {
    it("adds ad group rules after campaign rules", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [createRule("campaign-rule-1")],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "extend",
              rules: [createRule("extend-rule-1", { scope: "ad-group" })],
            },
          ],
        ]),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(2);
      expect(effectiveRules[0]?.id).toBe("campaign-rule-1");
      expect(effectiveRules[1]?.id).toBe("extend-rule-1");
    });

    it("preserves order: campaign rules first, then ad group rules", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("campaign-rule-1"),
          createRule("campaign-rule-2"),
        ],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "extend",
              rules: [
                createRule("extend-rule-1", { scope: "ad-group" }),
                createRule("extend-rule-2", { scope: "ad-group" }),
              ],
            },
          ],
        ]),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules.map((r) => r.id)).toEqual([
        "campaign-rule-1",
        "campaign-rule-2",
        "extend-rule-1",
        "extend-rule-2",
      ]);
    });

    it("works with empty campaign rules", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "extend",
              rules: [createRule("extend-rule-1", { scope: "ad-group" })],
            },
          ],
        ]),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(1);
      expect(effectiveRules[0]?.id).toBe("extend-rule-1");
    });
  });

  describe("merge mode", () => {
    it("merges rules by ID, preferring ad group rule properties", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("shared-rule-1", {
            prefixes: ["buy"],
            suffixes: ["online"],
          }),
        ],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "merge",
              rules: [
                createRule("shared-rule-1", {
                  prefixes: ["cheap", "best"],
                  // suffixes not specified - should use campaign's
                  scope: "ad-group",
                }),
              ],
            },
          ],
        ]),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(1);
      // Ad group override takes precedence
      expect(effectiveRules[0]?.prefixes).toEqual(["cheap", "best"]);
      // Campaign value preserved for non-overridden properties is defined by merge logic
    });

    it("adds new rules from ad group that don't exist in campaign", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [createRule("campaign-rule-1")],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "merge",
              rules: [createRule("ad-group-only-rule", { scope: "ad-group" })],
            },
          ],
        ]),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(2);
      expect(effectiveRules.map((r) => r.id)).toContain("campaign-rule-1");
      expect(effectiveRules.map((r) => r.id)).toContain("ad-group-only-rule");
    });

    it("preserves campaign rules that have no ad group counterpart", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("campaign-rule-1"),
          createRule("campaign-rule-2"),
        ],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "merge",
              rules: [
                createRule("campaign-rule-1", {
                  prefixes: ["overridden"],
                  scope: "ad-group",
                }),
              ],
            },
          ],
        ]),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(2);
      const rule1 = effectiveRules.find((r) => r.id === "campaign-rule-1");
      const rule2 = effectiveRules.find((r) => r.id === "campaign-rule-2");
      expect(rule1?.prefixes).toEqual(["overridden"]);
      expect(rule2?.prefixes).toEqual([]); // Original campaign value
    });

    it("deep merges prefixes and suffixes when both have values", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("shared-rule-1", {
            prefixes: ["buy", "cheap"],
            suffixes: ["online", "sale"],
          }),
        ],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "merge",
              rules: [
                createRule("shared-rule-1", {
                  prefixes: ["best", "top"],
                  suffixes: [], // Empty - should use ad group's empty array
                  scope: "ad-group",
                }),
              ],
            },
          ],
        ]),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules).toHaveLength(1);
      // Ad group values replace campaign values
      expect(effectiveRules[0]?.prefixes).toEqual(["best", "top"]);
      expect(effectiveRules[0]?.suffixes).toEqual([]);
    });
  });

  describe("negative keyword cascading", () => {
    it("cascades campaign negative keywords to ad groups", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("campaign-rule-1", {
            negativeKeywords: ["free", "cheap"],
          }),
        ],
        adGroupOverrides: new Map(),
      };

      const result = resolver.resolveWithNegatives(inheritance, "ad-group-1");

      expect(result.negativeKeywords).toEqual(["free", "cheap"]);
    });

    it("combines campaign and ad group negative keywords in extend mode", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("campaign-rule-1", {
            negativeKeywords: ["free"],
          }),
        ],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "extend",
              rules: [
                createRule("ad-group-rule-1", {
                  negativeKeywords: ["cheap", "discount"],
                  scope: "ad-group",
                }),
              ],
            },
          ],
        ]),
      };

      const result = resolver.resolveWithNegatives(inheritance, "ad-group-1");

      // Should combine negatives from both levels
      expect(result.negativeKeywords).toContain("free");
      expect(result.negativeKeywords).toContain("cheap");
      expect(result.negativeKeywords).toContain("discount");
    });

    it("deduplicates negative keywords", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("campaign-rule-1", {
            negativeKeywords: ["free", "cheap"],
          }),
        ],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "extend",
              rules: [
                createRule("ad-group-rule-1", {
                  negativeKeywords: ["cheap", "discount"], // "cheap" is duplicate
                  scope: "ad-group",
                }),
              ],
            },
          ],
        ]),
      };

      const result = resolver.resolveWithNegatives(inheritance, "ad-group-1");

      // Should deduplicate
      const cheapCount = result.negativeKeywords.filter((n) => n === "cheap").length;
      expect(cheapCount).toBe(1);
    });

    it("replaces negative keywords in replace mode", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("campaign-rule-1", {
            negativeKeywords: ["free", "cheap"],
          }),
        ],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "replace",
              rules: [
                createRule("ad-group-rule-1", {
                  negativeKeywords: ["discount"],
                  scope: "ad-group",
                }),
              ],
            },
          ],
        ]),
      };

      const result = resolver.resolveWithNegatives(inheritance, "ad-group-1");

      // Replace mode: only ad group negatives
      expect(result.negativeKeywords).toEqual(["discount"]);
    });

    it("returns empty negatives when no rules have them", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [createRule("campaign-rule-1")],
        adGroupOverrides: new Map(),
      };

      const result = resolver.resolveWithNegatives(inheritance, "ad-group-1");

      expect(result.negativeKeywords).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("handles undefined ad group ID gracefully", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [createRule("campaign-rule-1")],
        adGroupOverrides: new Map(),
      };

      // TypeScript would normally prevent this, but runtime should handle it
      const effectiveRules = resolver.resolve(inheritance, undefined as unknown as string);

      expect(effectiveRules).toEqual(inheritance.campaignRules);
    });

    it("handles empty string ad group ID", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [createRule("campaign-rule-1")],
        adGroupOverrides: new Map([
          [
            "",
            {
              mode: "replace",
              rules: [createRule("empty-id-rule")],
            },
          ],
        ]),
      };

      const effectiveRules = resolver.resolve(inheritance, "");

      expect(effectiveRules).toHaveLength(1);
      expect(effectiveRules[0]?.id).toBe("empty-id-rule");
    });

    it("preserves rule immutability - does not modify original rules", () => {
      const originalRule = createRule("campaign-rule-1", {
        prefixes: ["original"],
      });
      const inheritance: KeywordInheritance = {
        campaignRules: [originalRule],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "merge",
              rules: [
                createRule("campaign-rule-1", {
                  prefixes: ["merged"],
                  scope: "ad-group",
                }),
              ],
            },
          ],
        ]),
      };

      resolver.resolve(inheritance, "ad-group-1");

      // Original rule should not be modified
      expect(originalRule.prefixes).toEqual(["original"]);
    });

    it("handles rules with all match types", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [
          createRule("campaign-rule-1", {
            matchTypes: ["broad", "phrase", "exact"],
          }),
        ],
        adGroupOverrides: new Map(),
      };

      const effectiveRules = resolver.resolve(inheritance, "ad-group-1");

      expect(effectiveRules[0]?.matchTypes).toEqual(["broad", "phrase", "exact"]);
    });
  });

  describe("getAllEffectiveRulesForCampaign", () => {
    it("returns effective rules for all ad groups in a campaign", () => {
      const inheritance: KeywordInheritance = {
        campaignRules: [createRule("campaign-rule-1")],
        adGroupOverrides: new Map([
          [
            "ad-group-1",
            {
              mode: "extend",
              rules: [createRule("ag1-rule", { scope: "ad-group" })],
            },
          ],
          [
            "ad-group-2",
            {
              mode: "replace",
              rules: [createRule("ag2-rule", { scope: "ad-group" })],
            },
          ],
        ]),
      };

      const adGroupIds = ["ad-group-1", "ad-group-2", "ad-group-3"];
      const allRules = resolver.getAllEffectiveRulesForCampaign(inheritance, adGroupIds);

      expect(allRules.size).toBe(3);

      // ad-group-1: extend mode (campaign + ad group rule)
      expect(allRules.get("ad-group-1")?.map((r) => r.id)).toEqual([
        "campaign-rule-1",
        "ag1-rule",
      ]);

      // ad-group-2: replace mode (only ad group rule)
      expect(allRules.get("ad-group-2")?.map((r) => r.id)).toEqual(["ag2-rule"]);

      // ad-group-3: no override (campaign rules only)
      expect(allRules.get("ad-group-3")?.map((r) => r.id)).toEqual([
        "campaign-rule-1",
      ]);
    });
  });

  describe("createInheritanceFromConfig", () => {
    it("creates inheritance structure from flat rule array", () => {
      const rules: KeywordRule[] = [
        createRule("campaign-rule-1", { scope: "campaign" }),
        createRule("campaign-rule-2", { scope: "campaign" }),
        createRule("ag1-rule", { scope: "ad-group" }),
      ];

      const adGroupOverrides: AdGroupOverride[] = [
        {
          adGroupId: "ad-group-1",
          mode: "extend",
          ruleIds: ["ag1-rule"],
        },
      ];

      const inheritance = resolver.createInheritanceFromConfig(rules, adGroupOverrides);

      expect(inheritance.campaignRules).toHaveLength(2);
      expect(inheritance.adGroupOverrides.size).toBe(1);
      expect(inheritance.adGroupOverrides.get("ad-group-1")?.rules).toHaveLength(1);
    });
  });
});
