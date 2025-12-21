/**
 * Reddit Ads Template Validator
 *
 * Validates ad templates against Reddit Ads platform specifications:
 * - Headline: max 100 characters (required)
 * - Description: max 500 characters (optional)
 * - Display URL: max 25 characters (optional)
 * - Final URL: must be HTTPS (required for live ads)
 * - Call to Action: must be from approved list (optional)
 */

import { VariableEngine } from "../services/variable-engine.js";

/**
 * Reddit ad template structure
 */
export interface RedditAdTemplate {
  headline: string;
  description?: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

/**
 * Validation error
 */
export interface RedditValidationError {
  field: string;
  code: "REQUIRED" | "MAX_LENGTH" | "INVALID_FORMAT" | "INVALID_VALUE";
  message: string;
  limit?: number;
  actual?: number;
}

/**
 * Validation warning
 */
export interface RedditValidationWarning {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface RedditValidationResult {
  valid: boolean;
  errors: RedditValidationError[];
  warnings: RedditValidationWarning[];
}

/**
 * Reddit platform constraints
 */
const REDDIT_LIMITS = {
  headline: {
    maxLength: 100,
    required: true,
  },
  description: {
    maxLength: 500,
    required: false,
  },
  displayUrl: {
    maxLength: 25,
    required: false,
  },
} as const;

/**
 * Approved Reddit CTAs
 */
const APPROVED_CTAS = new Set([
  "Shop Now",
  "Learn More",
  "Sign Up",
  "Download",
  "Install",
  "Get Quote",
  "Contact Us",
  "Book Now",
  "Apply Now",
  "Watch More",
  "Get Started",
  "Subscribe",
  "Order Now",
  "See More",
  "View More",
  "Play Now",
]);

export class RedditValidator {
  private variableEngine: VariableEngine;

  constructor() {
    this.variableEngine = new VariableEngine();
  }

  /**
   * Validate a Reddit ad template (static, without variable substitution)
   */
  validate(template: RedditAdTemplate): RedditValidationResult {
    const errors: RedditValidationError[] = [];
    const warnings: RedditValidationWarning[] = [];

    // Validate headline (required)
    if (!template.headline || template.headline.trim() === "") {
      errors.push({
        field: "headline",
        code: "REQUIRED",
        message: "Headline is required",
      });
    } else if (template.headline.length > REDDIT_LIMITS.headline.maxLength) {
      errors.push({
        field: "headline",
        code: "MAX_LENGTH",
        message: `Headline must not exceed ${REDDIT_LIMITS.headline.maxLength} characters`,
        limit: REDDIT_LIMITS.headline.maxLength,
        actual: template.headline.length,
      });
    }

    // Validate description (optional)
    if (template.description) {
      if (template.description.length > REDDIT_LIMITS.description.maxLength) {
        errors.push({
          field: "description",
          code: "MAX_LENGTH",
          message: `Description must not exceed ${REDDIT_LIMITS.description.maxLength} characters`,
          limit: REDDIT_LIMITS.description.maxLength,
          actual: template.description.length,
        });
      }
    }

    // Validate display URL (optional)
    if (template.displayUrl) {
      if (template.displayUrl.length > REDDIT_LIMITS.displayUrl.maxLength) {
        errors.push({
          field: "displayUrl",
          code: "MAX_LENGTH",
          message: `Display URL must not exceed ${REDDIT_LIMITS.displayUrl.maxLength} characters`,
          limit: REDDIT_LIMITS.displayUrl.maxLength,
          actual: template.displayUrl.length,
        });
      }
    }

    // Validate final URL (optional, but must be HTTPS if provided)
    if (template.finalUrl) {
      try {
        const url = new URL(template.finalUrl);
        if (url.protocol !== "https:") {
          errors.push({
            field: "finalUrl",
            code: "INVALID_FORMAT",
            message: "Final URL must use HTTPS protocol",
          });
        }
      } catch {
        errors.push({
          field: "finalUrl",
          code: "INVALID_FORMAT",
          message: "Final URL must be a valid URL",
        });
      }
    }

    // Validate call to action (optional, but must be from approved list if provided)
    if (template.callToAction) {
      if (!APPROVED_CTAS.has(template.callToAction)) {
        errors.push({
          field: "callToAction",
          code: "INVALID_VALUE",
          message: `Call to action must be one of: ${Array.from(APPROVED_CTAS).join(", ")}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a template with variable substitution
   */
  validateWithVariables(
    template: RedditAdTemplate,
    sampleData: Record<string, unknown>
  ): RedditValidationResult {
    const warnings: RedditValidationWarning[] = [];

    // Substitute variables in all fields
    const substitutedTemplate: RedditAdTemplate = {
      headline: "",
    };

    // Process headline
    if (template.headline) {
      const headlineResult = this.variableEngine.substitute(template.headline, sampleData);
      substitutedTemplate.headline = headlineResult.text;

      // Add warnings for missing variables
      for (const warning of headlineResult.warnings) {
        warnings.push({
          field: "headline",
          message: `Variable "${warning.variable}" is missing from sample data`,
        });
      }
    }

    // Process description
    if (template.description) {
      const descResult = this.variableEngine.substitute(template.description, sampleData);
      substitutedTemplate.description = descResult.text;

      for (const warning of descResult.warnings) {
        warnings.push({
          field: "description",
          message: `Variable "${warning.variable}" is missing from sample data`,
        });
      }
    }

    // Process display URL
    if (template.displayUrl) {
      const urlResult = this.variableEngine.substitute(template.displayUrl, sampleData);
      substitutedTemplate.displayUrl = urlResult.text;
    }

    // Process final URL
    if (template.finalUrl) {
      const finalUrlResult = this.variableEngine.substitute(template.finalUrl, sampleData);
      substitutedTemplate.finalUrl = finalUrlResult.text;
    }

    // Process CTA (usually static, but might have variables)
    if (template.callToAction) {
      const ctaResult = this.variableEngine.substitute(template.callToAction, sampleData);
      substitutedTemplate.callToAction = ctaResult.text;
    }

    // Validate the substituted template
    const validationResult = this.validate(substitutedTemplate);

    return {
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: [...warnings, ...validationResult.warnings],
    };
  }

  /**
   * Extract all required variables from a template
   */
  extractRequiredVariables(template: RedditAdTemplate): string[] {
    const allVariables = new Set<string>();

    const processField = (field: string | undefined) => {
      if (field) {
        const required = this.variableEngine.getRequiredVariables(field);
        for (const v of required) {
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
   * Get character count after variable substitution
   */
  getCharacterCount(
    template: string,
    sampleData: Record<string, unknown>
  ): number {
    const result = this.variableEngine.substitute(template, sampleData);
    return result.text.length;
  }

  /**
   * Get platform limits for reference
   */
  getLimits(): typeof REDDIT_LIMITS {
    return REDDIT_LIMITS;
  }

  /**
   * Get approved CTAs for reference
   */
  getApprovedCTAs(): string[] {
    return Array.from(APPROVED_CTAS);
  }
}
