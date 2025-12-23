/**
 * Keyword Generator
 *
 * Generates keyword combinations from rules and data rows.
 * Supports:
 * - Variable interpolation in core term patterns
 * - Prefix/suffix combinatorial generation
 * - Match type variations
 * - Deduplication
 * - Negative keywords with variable interpolation
 */

import type {
  KeywordRule,
  GeneratedKeyword,
  KeywordGenerationContext,
  KeywordGenerationResult,
  KeywordGenerationRow,
} from "./types.js";

/**
 * Maximum number of keywords to generate per rule to prevent explosive combinatorial growth.
 * With 10 prefixes, 10 suffixes, and 3 match types = 300 keywords per row.
 * Setting a limit prevents memory issues with large combinations.
 */
export const MAX_KEYWORDS_PER_RULE = 10000;

/**
 * Warning callback type for generation issues
 */
export type KeywordWarningCallback = (message: string) => void;

/**
 * KeywordGenerator class
 *
 * Generates keywords from rules by:
 * 1. Interpolating variables in core term pattern
 * 2. Creating all prefix/suffix combinations
 * 3. Applying match type variations
 * 4. Deduplicating results
 */
export class KeywordGenerator {
  private onWarning?: KeywordWarningCallback;

  /**
   * Create a new KeywordGenerator
   *
   * @param onWarning - Optional callback for warnings (e.g., when keyword limit is reached)
   */
  constructor(onWarning?: KeywordWarningCallback) {
    this.onWarning = onWarning;
  }

  /**
   * Generate keywords from a rule and context
   *
   * @param rule - The keyword rule defining generation parameters
   * @param context - Context with ad group ID and row data
   * @returns Array of generated keywords
   */
  generateKeywords(rule: KeywordRule, context: KeywordGenerationContext): GeneratedKeyword[] {
    // Interpolate the core term
    const coreTerm = this.interpolate(rule.coreTermPattern, context.rowData);

    // If core term is empty after interpolation, return no keywords
    if (!coreTerm.trim()) {
      return [];
    }

    // Get prefixes and suffixes (use [""] if empty to ensure base keyword is generated)
    const prefixes = rule.prefixes.length > 0 ? rule.prefixes : [""];
    const suffixes = rule.suffixes.length > 0 ? rule.suffixes : [""];

    // Check for combinatorial explosion before generating
    const estimatedCount = prefixes.length * suffixes.length * rule.matchTypes.length;
    if (estimatedCount > MAX_KEYWORDS_PER_RULE) {
      this.onWarning?.(
        `Rule "${rule.name}" would generate ${estimatedCount} keywords, which exceeds the limit of ${MAX_KEYWORDS_PER_RULE}. Results will be truncated.`
      );
    }

    // Generate all combinations
    const keywordTexts: string[] = [];

    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        const keyword = this.buildKeyword(prefix, coreTerm, suffix);
        keywordTexts.push(keyword);
      }
    }

    // Apply match types and create GeneratedKeyword objects
    const keywords: GeneratedKeyword[] = [];

    for (const matchType of rule.matchTypes) {
      for (const keywordText of keywordTexts) {
        // Skip empty keywords
        if (!keywordText) continue;

        keywords.push({
          keyword: keywordText,
          matchType,
          adGroupId: context.adGroupId,
          sourceRuleId: rule.id,
        });

        // Enforce limit to prevent memory issues
        if (keywords.length >= MAX_KEYWORDS_PER_RULE) {
          break;
        }
      }

      // Break outer loop too if limit reached
      if (keywords.length >= MAX_KEYWORDS_PER_RULE) {
        break;
      }
    }

    // Deduplicate by keyword+matchType combination
    return this.deduplicate(keywords);
  }

  /**
   * Generate keywords with negative keywords
   *
   * @param rule - The keyword rule
   * @param context - Context with ad group ID and row data
   * @returns Object containing keywords and negative keywords
   */
  generateKeywordsWithNegatives(
    rule: KeywordRule,
    context: KeywordGenerationContext
  ): KeywordGenerationResult {
    const keywords = this.generateKeywords(rule, context);

    // Interpolate negative keywords
    const negativeKeywords = (rule.negativeKeywords ?? [])
      .map((neg) => this.interpolate(neg, context.rowData))
      .filter((neg) => neg.trim() !== "");

    return {
      keywords,
      negativeKeywords,
    };
  }

  /**
   * Generate keywords for multiple rows (batch processing)
   *
   * @param rule - The keyword rule
   * @param rows - Array of row data with _adGroupId
   * @returns Array of generated keywords, deduplicated across rows
   */
  generateKeywordsForRows(rule: KeywordRule, rows: KeywordGenerationRow[]): GeneratedKeyword[] {
    const allKeywords: GeneratedKeyword[] = [];

    for (const row of rows) {
      const { _adGroupId, ...rowData } = row;
      const context: KeywordGenerationContext = {
        adGroupId: _adGroupId,
        rowData,
      };

      const keywords = this.generateKeywords(rule, context);
      allKeywords.push(...keywords);
    }

    // Deduplicate across all rows (same keyword+matchType+adGroupId)
    return this.deduplicateWithAdGroup(allKeywords);
  }

  /**
   * Interpolate variables in a template string
   *
   * Supports default values with syntax: {variable_name|default_value}
   *
   * @param template - Template with {variable} or {variable|default} placeholders
   * @param data - Data object with variable values
   * @returns Interpolated string, normalized
   */
  private interpolate(template: string, data: Record<string, unknown>): string {
    // Match {variable_name} or {variable_name|default_value} patterns
    const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\|([^}]*))?\}/g;

    const result = template.replace(variablePattern, (_, varName: string, defaultVal?: string) => {
      const value = data[varName];

      if (value !== null && value !== undefined && value !== "") {
        return String(value);
      }

      return defaultVal ?? "";
    });

    // Normalize the result
    return this.normalize(result);
  }

  /**
   * Build a keyword from prefix, core term, and suffix
   *
   * @param prefix - Prefix string (can be empty)
   * @param coreTerm - Core term (required)
   * @param suffix - Suffix string (can be empty)
   * @returns Combined and normalized keyword
   */
  private buildKeyword(prefix: string, coreTerm: string, suffix: string): string {
    const parts = [prefix.trim(), coreTerm.trim(), suffix.trim()].filter(Boolean);
    const combined = parts.join(" ");
    return this.normalize(combined);
  }

  /**
   * Normalize a keyword string
   *
   * - Trim whitespace
   * - Collapse multiple spaces to single space
   * - Convert to lowercase
   *
   * @param keyword - Raw keyword string
   * @returns Normalized keyword
   */
  private normalize(keyword: string): string {
    return keyword
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  /**
   * Deduplicate keywords by keyword+matchType
   *
   * @param keywords - Array of keywords to deduplicate
   * @returns Deduplicated array
   */
  private deduplicate(keywords: GeneratedKeyword[]): GeneratedKeyword[] {
    const seen = new Set<string>();
    const result: GeneratedKeyword[] = [];

    for (const kw of keywords) {
      const key = `${kw.keyword}|${kw.matchType}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(kw);
      }
    }

    return result;
  }

  /**
   * Deduplicate keywords by keyword+matchType+adGroupId
   *
   * Used for batch processing where same keyword in different ad groups should be preserved
   *
   * @param keywords - Array of keywords to deduplicate
   * @returns Deduplicated array
   */
  private deduplicateWithAdGroup(keywords: GeneratedKeyword[]): GeneratedKeyword[] {
    const seen = new Set<string>();
    const result: GeneratedKeyword[] = [];

    for (const kw of keywords) {
      const key = `${kw.keyword}|${kw.matchType}|${kw.adGroupId}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(kw);
      }
    }

    return result;
  }
}
