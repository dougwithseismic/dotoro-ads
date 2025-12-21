/**
 * Inline Variation Generator
 *
 * Generates ad variations from templates with inline variation syntax.
 * Supports:
 * - Inline variation syntax: [[option1|option2|option3]]
 * - Variable substitution: {variable_name}
 * - Cartesian product of all variation combinations
 * - Deduplication of identical variations
 * - Max variations limit
 *
 * Usage:
 * const generator = new InlineVariationGenerator();
 * const result = generator.generateVariations({
 *   template: { headline: "[[Buy|Get]] {product_name}", description: "Great deal!" },
 *   dataRow: { product_name: "iPhone" },
 *   variationConfig: { maxVariations: 10 }
 * });
 */

import { VariableEngine } from "../services/variable-engine.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Ad template with potential inline variations
 */
export interface AdTemplate {
  id: string;
  headline?: string;
  description?: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

/**
 * Configuration for variation generation
 */
export interface VariationConfig {
  /** Maximum number of variations to generate */
  maxVariations?: number;
  /** Fields to consider for deduplication (default: all fields) */
  deduplicateBy?: ("headline" | "description" | "callToAction")[];
}

/**
 * Input for variation generation
 */
export interface VariationInput {
  template: AdTemplate;
  dataRow: Record<string, unknown>;
  variationConfig?: VariationConfig;
}

/**
 * Content of a generated variation
 */
export interface VariationContent {
  headline: string;
  description: string;
  callToAction?: string;
}

/**
 * Metadata about a generated variation
 */
export interface VariationMetadata {
  dataRowId: string;
  variationIndex: number;
  isOriginal: boolean;
}

/**
 * A single generated variation
 */
export interface GeneratedVariation {
  id: string;
  content: VariationContent;
  metadata: VariationMetadata;
}

/**
 * Result of variation generation
 */
export interface VariationResult {
  variations: GeneratedVariation[];
  totalPossibleVariations: number;
  duplicatesRemoved: number;
  wasLimited: boolean;
  warnings: string[];
}

/**
 * Internal type for tracking variation options per field
 */
interface FieldVariations {
  field: "headline" | "description" | "callToAction";
  options: string[];
}

// ============================================================================
// Implementation
// ============================================================================

// Regex to match inline variation syntax: [[option1|option2|option3]]
// The inner group can be empty for [[]] case
const VARIATION_PATTERN = /\[\[([^\[\]]*)\]\]/g;

export class InlineVariationGenerator {
  private variableEngine: VariableEngine;

  constructor() {
    this.variableEngine = new VariableEngine();
  }

  /**
   * Generate variations from a template and data row
   */
  generateVariations(input: VariationInput): VariationResult {
    const { template, dataRow, variationConfig = {} } = input;
    const warnings: string[] = [];

    // Get row ID
    const dataRowId = this.getRowId(dataRow);

    // First, substitute variables in template fields
    const substitutedFields = this.substituteVariables(template, dataRow, warnings);

    // Then, extract inline variations from each field
    const fieldVariations = this.extractFieldVariations(substitutedFields);

    // Calculate total possible variations (cartesian product)
    const totalPossibleVariations = this.calculateTotalVariations(fieldVariations);

    // Generate all combinations
    const allCombinations = this.generateCombinations(fieldVariations);

    // Deduplicate
    const { unique, duplicatesRemoved } = this.deduplicate(
      allCombinations,
      variationConfig.deduplicateBy
    );

    // Apply max variations limit
    const maxVariations = variationConfig.maxVariations;
    const wasLimited = maxVariations !== undefined && unique.length > maxVariations;
    const limitedCombinations = wasLimited ? unique.slice(0, maxVariations) : unique;

    // Build final variations
    const variations: GeneratedVariation[] = limitedCombinations.map(
      (content, index) => ({
        id: this.generateId(),
        content,
        metadata: {
          dataRowId,
          variationIndex: index,
          isOriginal: index === 0,
        },
      })
    );

    return {
      variations,
      totalPossibleVariations,
      duplicatesRemoved,
      wasLimited,
      warnings,
    };
  }

  /**
   * Substitute variables in all template fields
   */
  private substituteVariables(
    template: AdTemplate,
    dataRow: Record<string, unknown>,
    warnings: string[]
  ): { headline: string; description: string; callToAction?: string } {
    const substituteField = (value: string | undefined): string => {
      if (!value) return "";
      const result = this.variableEngine.substitute(value, dataRow);
      for (const w of result.warnings) {
        warnings.push(`${w.variable}: ${w.message}`);
      }
      return result.text;
    };

    return {
      headline: substituteField(template.headline),
      description: substituteField(template.description),
      callToAction: template.callToAction ? substituteField(template.callToAction) : undefined,
    };
  }

  /**
   * Extract inline variations from template fields
   * Returns an array of field variations for cartesian product generation
   */
  private extractFieldVariations(
    fields: { headline: string; description: string; callToAction?: string }
  ): FieldVariations[] {
    const result: FieldVariations[] = [];

    // Process headline
    const headlineVariations = this.extractVariationsFromField(fields.headline);
    result.push({ field: "headline", options: headlineVariations });

    // Process description
    const descriptionVariations = this.extractVariationsFromField(fields.description);
    result.push({ field: "description", options: descriptionVariations });

    // Process callToAction if present
    if (fields.callToAction !== undefined) {
      const ctaVariations = this.extractVariationsFromField(fields.callToAction);
      result.push({ field: "callToAction", options: ctaVariations });
    }

    return result;
  }

  /**
   * Extract all variation options from a single field value
   * Handles multiple [[...]] blocks and generates cartesian product
   */
  private extractVariationsFromField(value: string): string[] {
    if (!value) return [""];

    // Find all variation blocks
    const blocks: Array<{ match: string; options: string[] }> = [];
    let match: RegExpExecArray | null;
    const pattern = new RegExp(VARIATION_PATTERN.source, "g");

    while ((match = pattern.exec(value)) !== null) {
      const optionsStr = match[1] || "";
      const options = optionsStr.split("|").map((opt) => opt.trim());
      blocks.push({
        match: match[0],
        options: options.length > 0 ? options : [""],
      });
    }

    // If no variation blocks, return the value as-is
    if (blocks.length === 0) {
      return [value];
    }

    // Generate all combinations of variation blocks
    const blockCombinations = this.generateBlockCombinations(blocks);

    // For each combination, substitute into the template
    return blockCombinations.map((combo) => {
      let result = value;
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block) {
          result = result.replace(block.match, combo[i] || "");
        }
      }
      return result;
    });
  }

  /**
   * Generate all combinations of block options (cartesian product)
   */
  private generateBlockCombinations(
    blocks: Array<{ match: string; options: string[] }>
  ): string[][] {
    if (blocks.length === 0) return [[]];

    const [first, ...rest] = blocks;
    if (!first) return [[]];

    const restCombinations = this.generateBlockCombinations(rest);
    const result: string[][] = [];

    for (const option of first.options) {
      for (const restCombo of restCombinations) {
        result.push([option, ...restCombo]);
      }
    }

    return result;
  }

  /**
   * Calculate total number of possible variations
   */
  private calculateTotalVariations(fieldVariations: FieldVariations[]): number {
    return fieldVariations.reduce((total, fv) => total * fv.options.length, 1);
  }

  /**
   * Generate all combinations across fields (cartesian product)
   */
  private generateCombinations(fieldVariations: FieldVariations[]): VariationContent[] {
    // Find variations for each field type
    const headlineOptions = fieldVariations.find((fv) => fv.field === "headline")?.options || [""];
    const descriptionOptions = fieldVariations.find((fv) => fv.field === "description")?.options || [""];
    const ctaField = fieldVariations.find((fv) => fv.field === "callToAction");
    const ctaOptions = ctaField ? ctaField.options : undefined;

    const combinations: VariationContent[] = [];

    for (const headline of headlineOptions) {
      for (const description of descriptionOptions) {
        if (ctaOptions) {
          for (const callToAction of ctaOptions) {
            combinations.push({ headline, description, callToAction });
          }
        } else {
          combinations.push({ headline, description });
        }
      }
    }

    return combinations;
  }

  /**
   * Deduplicate variations based on content
   */
  private deduplicate(
    combinations: VariationContent[],
    deduplicateBy?: ("headline" | "description" | "callToAction")[]
  ): { unique: VariationContent[]; duplicatesRemoved: number } {
    const seen = new Set<string>();
    const unique: VariationContent[] = [];

    for (const combo of combinations) {
      const key = this.createDedupKey(combo, deduplicateBy);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(combo);
      }
    }

    return {
      unique,
      duplicatesRemoved: combinations.length - unique.length,
    };
  }

  /**
   * Create a deduplication key for a variation
   */
  private createDedupKey(
    content: VariationContent,
    deduplicateBy?: ("headline" | "description" | "callToAction")[]
  ): string {
    const fields = deduplicateBy || ["headline", "description", "callToAction"];
    const parts: string[] = [];

    for (const field of fields) {
      if (field === "headline") parts.push(content.headline);
      if (field === "description") parts.push(content.description);
      if (field === "callToAction") parts.push(content.callToAction || "");
    }

    return parts.join("|||");
  }

  /**
   * Get row ID from data row
   */
  private getRowId(row: Record<string, unknown>): string {
    if (typeof row.id === "string") return row.id;
    if (typeof row.id === "number") return String(row.id);
    return this.generateId();
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
