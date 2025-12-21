/**
 * Template Service
 *
 * Integrates the variable engine with templates to provide:
 * - Variable extraction from templates
 * - Template preview with sample data
 * - Template validation before saving
 * - Ad generation from templates
 */

import {
  VariableEngine,
  RedditValidator,
  type RedditAdTemplate,
  type RedditValidationResult,
  type SubstitutionResult,
  type PreviewResult,
} from "@repo/core";

/**
 * Generated ad from template
 */
export interface GeneratedAd {
  headline: string | undefined;
  description: string | undefined;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
  sourceRow: Record<string, unknown>;
  warnings: string[];
}

/**
 * Template preview result
 */
export interface TemplatePreviewResult {
  templateId: string;
  dataSourceId: string;
  previewAds: GeneratedAd[];
  totalRows: number;
  warnings: string[];
  validationErrors: Array<{
    rowIndex: number;
    errors: Array<{ field: string; message: string }>;
  }>;
}

/**
 * Template structure for ad generation
 */
export interface AdTemplateConfig {
  headline: string;
  description?: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    code: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
  extractedVariables: string[];
}

export class TemplateService {
  private variableEngine: VariableEngine;
  private redditValidator: RedditValidator;

  constructor() {
    this.variableEngine = new VariableEngine();
    this.redditValidator = new RedditValidator();
  }

  /**
   * Extract all variables used in a template
   */
  extractVariables(template: AdTemplateConfig): string[] {
    const allVariables = new Set<string>();

    const processField = (field: string | undefined) => {
      if (field) {
        const variables = this.variableEngine.getRequiredVariables(field);
        for (const v of variables) {
          allVariables.add(v);
        }
      }
    };

    processField(template.headline);
    processField(template.description);
    processField(template.displayUrl);
    processField(template.finalUrl);
    processField(template.callToAction);

    return Array.from(allVariables);
  }

  /**
   * Validate a template with optional sample data
   */
  validateTemplate(
    template: AdTemplateConfig,
    platform: "reddit" | "google" | "facebook",
    sampleData?: Record<string, unknown>
  ): TemplateValidationResult {
    const extractedVariables = this.extractVariables(template);
    const errors: Array<{ field: string; code: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Currently only Reddit is implemented
    if (platform === "reddit") {
      const redditTemplate: RedditAdTemplate = {
        headline: template.headline,
        description: template.description,
        displayUrl: template.displayUrl,
        finalUrl: template.finalUrl,
        callToAction: template.callToAction,
      };

      let validationResult: RedditValidationResult;

      if (sampleData && Object.keys(sampleData).length > 0) {
        validationResult = this.redditValidator.validateWithVariables(
          redditTemplate,
          sampleData
        );
      } else {
        // Validate template syntax only (check if variables are properly formatted)
        // Use placeholder values that won't exceed limits
        const placeholderData: Record<string, string> = {};
        for (const variable of extractedVariables) {
          placeholderData[variable] = `[${variable}]`;
        }
        validationResult = this.redditValidator.validateWithVariables(
          redditTemplate,
          placeholderData
        );
      }

      for (const error of validationResult.errors) {
        errors.push({
          field: error.field,
          code: error.code,
          message: error.message,
        });
      }

      for (const warning of validationResult.warnings) {
        warnings.push({
          field: warning.field,
          message: warning.message,
        });
      }
    } else {
      // For other platforms, just do basic variable extraction
      warnings.push({
        field: "_platform",
        message: `Validation for platform "${platform}" is not yet implemented`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      extractedVariables,
    };
  }

  /**
   * Generate a single ad from template and data row
   */
  generateAd(
    template: AdTemplateConfig,
    rowData: Record<string, unknown>,
    platform: "reddit" | "google" | "facebook"
  ): GeneratedAd {
    const warnings: string[] = [];

    // Substitute variables in each field
    // Returns undefined for missing fields to maintain consistency
    const substituteField = (
      field: string | undefined,
      fieldName: string
    ): string | undefined => {
      if (!field) return undefined;
      const result = this.variableEngine.substitute(field, rowData);

      // Check for substitution errors
      if (!result.success) {
        for (const error of result.errors) {
          warnings.push(`${fieldName}: ${error.message}`);
        }
      }

      // Collect warnings
      for (const warning of result.warnings) {
        warnings.push(`${fieldName}: ${warning.variable} - ${warning.message}`);
      }

      return result.text;
    };

    const generatedAd: GeneratedAd = {
      headline: substituteField(template.headline, "headline"),
      description: substituteField(template.description, "description"),
      displayUrl: substituteField(template.displayUrl, "displayUrl"),
      finalUrl: substituteField(template.finalUrl, "finalUrl"),
      callToAction: template.callToAction,
      sourceRow: rowData,
      warnings,
    };

    return generatedAd;
  }

  /**
   * Generate preview of ads from template and sample data rows
   */
  previewAds(
    template: AdTemplateConfig,
    dataRows: Record<string, unknown>[],
    platform: "reddit" | "google" | "facebook",
    limit: number = 5
  ): {
    previewAds: GeneratedAd[];
    validationErrors: Array<{
      rowIndex: number;
      errors: Array<{ field: string; message: string }>;
    }>;
    warnings: string[];
  } {
    const previewAds: GeneratedAd[] = [];
    const validationErrors: Array<{
      rowIndex: number;
      errors: Array<{ field: string; message: string }>;
    }> = [];
    const globalWarnings: string[] = [];

    // Limit the number of rows to process
    const rowsToProcess = dataRows.slice(0, limit);

    for (let i = 0; i < rowsToProcess.length; i++) {
      const rowData = rowsToProcess[i];
      if (!rowData) continue;

      const generatedAd = this.generateAd(template, rowData, platform);
      previewAds.push(generatedAd);

      // Validate the generated ad
      if (platform === "reddit") {
        const validationResult = this.redditValidator.validate({
          headline: generatedAd.headline ?? "",
          description: generatedAd.description ?? undefined,
          displayUrl: generatedAd.displayUrl,
          finalUrl: generatedAd.finalUrl,
          callToAction: generatedAd.callToAction,
        });

        if (!validationResult.valid) {
          validationErrors.push({
            rowIndex: i,
            errors: validationResult.errors.map((e) => ({
              field: e.field,
              message: e.message,
            })),
          });
        }
      }
    }

    return {
      previewAds,
      validationErrors,
      warnings: globalWarnings,
    };
  }

  /**
   * Get character count estimates for template fields
   */
  getCharacterEstimates(
    template: AdTemplateConfig,
    sampleData: Record<string, unknown>
  ): {
    headline: number;
    description: number;
    displayUrl: number;
  } {
    const getLength = (field: string | undefined): number => {
      if (!field) return 0;
      const result = this.variableEngine.substitute(field, sampleData);
      return result.text.length;
    };

    return {
      headline: getLength(template.headline),
      description: getLength(template.description),
      displayUrl: getLength(template.displayUrl),
    };
  }

  /**
   * Preview a single field substitution with detailed information
   */
  previewFieldSubstitution(
    template: string,
    sampleData: Record<string, unknown>
  ): PreviewResult {
    return this.variableEngine.previewSubstitution(template, sampleData);
  }

  /**
   * Get platform-specific limits
   */
  getPlatformLimits(platform: "reddit" | "google" | "facebook"): {
    headline: { maxLength: number; required: boolean };
    description: { maxLength: number; required: boolean };
    displayUrl?: { maxLength: number; required: boolean };
  } {
    if (platform === "reddit") {
      return this.redditValidator.getLimits();
    }

    // Default limits for other platforms (placeholder)
    return {
      headline: { maxLength: 100, required: true },
      description: { maxLength: 500, required: false },
    };
  }
}

// Export singleton instance
export const templateService = new TemplateService();
