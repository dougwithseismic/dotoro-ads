/**
 * Keyword Inheritance Resolver
 *
 * Resolves keyword rules with inheritance between campaign and ad group levels.
 *
 * Supports three merge strategies:
 * - replace: Ad group rules completely replace campaign rules
 * - extend: Ad group rules are added after campaign rules
 * - merge: Rules with matching IDs are merged, preferring ad group values
 *
 * Negative keywords cascade from campaign level to all ad groups.
 */

import type { KeywordRule } from "./types.js";

/**
 * Configuration for how an ad group overrides campaign rules
 */
export interface AdGroupRuleOverride {
  /** How to combine ad group rules with campaign rules */
  mode: "replace" | "extend" | "merge";
  /** Rules specific to this ad group */
  rules: KeywordRule[];
}

/**
 * Full inheritance configuration for a campaign
 */
export interface KeywordInheritance {
  /** Rules defined at the campaign level */
  campaignRules: KeywordRule[];
  /** Per-ad-group overrides */
  adGroupOverrides: Map<string, AdGroupRuleOverride>;
}

/**
 * Result of resolving rules with negative keywords
 */
export interface ResolvedKeywordRules {
  /** Effective rules for the ad group */
  rules: KeywordRule[];
  /** All negative keywords (from campaign and ad group) */
  negativeKeywords: string[];
}

/**
 * Configuration for creating inheritance from flat structure
 */
export interface AdGroupOverride {
  adGroupId: string;
  mode: "replace" | "extend" | "merge";
  ruleIds: string[];
}

/**
 * KeywordInheritanceResolver
 *
 * Resolves keyword rules with inheritance between campaign and ad group levels.
 */
export class KeywordInheritanceResolver {
  /**
   * Resolve effective rules for a specific ad group
   *
   * @param inheritance - The inheritance configuration
   * @param adGroupId - The ad group to resolve rules for
   * @returns Array of effective keyword rules
   */
  resolve(inheritance: KeywordInheritance, adGroupId: string): KeywordRule[] {
    const override = inheritance.adGroupOverrides.get(adGroupId);

    // No override - return campaign rules as-is
    if (!override) {
      return [...inheritance.campaignRules];
    }

    switch (override.mode) {
      case "replace":
        return [...override.rules];

      case "extend":
        return [...inheritance.campaignRules, ...override.rules];

      case "merge":
        return this.mergeRules(inheritance.campaignRules, override.rules);

      default:
        // Fallback to campaign rules for unknown mode
        return [...inheritance.campaignRules];
    }
  }

  /**
   * Resolve effective rules with negative keywords for a specific ad group
   *
   * @param inheritance - The inheritance configuration
   * @param adGroupId - The ad group to resolve rules for
   * @returns Resolved rules and aggregated negative keywords
   */
  resolveWithNegatives(
    inheritance: KeywordInheritance,
    adGroupId: string
  ): ResolvedKeywordRules {
    const override = inheritance.adGroupOverrides.get(adGroupId);
    const rules = this.resolve(inheritance, adGroupId);

    // Collect negative keywords based on mode
    let negativeKeywords: string[];

    if (!override || override.mode === "extend" || override.mode === "merge") {
      // Cascade: combine campaign and ad group negatives
      negativeKeywords = this.collectNegativeKeywords([
        ...inheritance.campaignRules,
        ...(override?.rules ?? []),
      ]);
    } else {
      // Replace: only use ad group negatives
      negativeKeywords = this.collectNegativeKeywords(override.rules);
    }

    return {
      rules,
      negativeKeywords,
    };
  }

  /**
   * Get effective rules for all ad groups in a campaign
   *
   * @param inheritance - The inheritance configuration
   * @param adGroupIds - Array of ad group IDs
   * @returns Map of ad group ID to effective rules
   */
  getAllEffectiveRulesForCampaign(
    inheritance: KeywordInheritance,
    adGroupIds: string[]
  ): Map<string, KeywordRule[]> {
    const result = new Map<string, KeywordRule[]>();

    for (const adGroupId of adGroupIds) {
      result.set(adGroupId, this.resolve(inheritance, adGroupId));
    }

    return result;
  }

  /**
   * Create an inheritance structure from a flat configuration
   *
   * @param rules - All rules (campaign and ad group level)
   * @param overrides - Ad group override configurations
   * @returns KeywordInheritance structure
   */
  createInheritanceFromConfig(
    rules: KeywordRule[],
    overrides: AdGroupOverride[]
  ): KeywordInheritance {
    // Separate campaign-level rules
    const campaignRules = rules.filter((r) => r.scope === "campaign");

    // Build rule lookup by ID
    const ruleById = new Map(rules.map((r) => [r.id, r]));

    // Build ad group overrides
    const adGroupOverrides = new Map<string, AdGroupRuleOverride>();

    for (const override of overrides) {
      const overrideRules = override.ruleIds
        .map((id) => ruleById.get(id))
        .filter((r): r is KeywordRule => r !== undefined);

      adGroupOverrides.set(override.adGroupId, {
        mode: override.mode,
        rules: overrideRules,
      });
    }

    return {
      campaignRules,
      adGroupOverrides,
    };
  }

  /**
   * Merge rules by ID, with ad group rules taking precedence
   *
   * @param campaignRules - Campaign-level rules
   * @param adGroupRules - Ad group-level rules
   * @returns Merged array of rules
   */
  private mergeRules(
    campaignRules: KeywordRule[],
    adGroupRules: KeywordRule[]
  ): KeywordRule[] {
    const result: KeywordRule[] = [];
    const adGroupRuleById = new Map(adGroupRules.map((r) => [r.id, r]));
    const processedIds = new Set<string>();

    // Process campaign rules, potentially merging with ad group rules
    for (const campaignRule of campaignRules) {
      const adGroupRule = adGroupRuleById.get(campaignRule.id);

      if (adGroupRule) {
        // Merge: ad group rule takes precedence for specified properties
        result.push(this.mergeRule(campaignRule, adGroupRule));
        processedIds.add(campaignRule.id);
      } else {
        // No override, use campaign rule
        result.push({ ...campaignRule });
      }
    }

    // Add ad group rules that don't have a campaign counterpart
    for (const adGroupRule of adGroupRules) {
      if (!processedIds.has(adGroupRule.id)) {
        result.push({ ...adGroupRule });
      }
    }

    return result;
  }

  /**
   * Merge a single rule pair, with ad group taking precedence
   *
   * @param campaignRule - Campaign-level rule
   * @param adGroupRule - Ad group-level rule
   * @returns Merged rule
   */
  private mergeRule(
    campaignRule: KeywordRule,
    adGroupRule: KeywordRule
  ): KeywordRule {
    // Ad group rule properties take precedence
    // Create a new object to avoid mutation
    return {
      id: adGroupRule.id,
      name: adGroupRule.name,
      scope: adGroupRule.scope,
      coreTermPattern: adGroupRule.coreTermPattern,
      prefixes: adGroupRule.prefixes,
      suffixes: adGroupRule.suffixes,
      matchTypes: adGroupRule.matchTypes,
      negativeKeywords: adGroupRule.negativeKeywords ?? campaignRule.negativeKeywords,
    };
  }

  /**
   * Collect and deduplicate negative keywords from rules
   *
   * @param rules - Array of rules to collect negatives from
   * @returns Deduplicated array of negative keywords
   */
  private collectNegativeKeywords(rules: KeywordRule[]): string[] {
    const negatives = new Set<string>();

    for (const rule of rules) {
      if (rule.negativeKeywords) {
        for (const neg of rule.negativeKeywords) {
          negatives.add(neg);
        }
      }
    }

    return Array.from(negatives);
  }
}
