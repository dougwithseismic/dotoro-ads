/**
 * Template Validation Service
 *
 * Validates templates against data source rows to identify content
 * that will exceed platform character limits before sync.
 */

import { eq, asc } from "drizzle-orm";
import { PLATFORM_LIMITS, type ConstraintPlatform } from "@repo/core";
import { db, dataRows } from "./db.js";

/**
 * Details about a single invalid row
 */
export interface InvalidRowDetail {
  /** Row index in the data source (0-indexed) */
  rowIndex: number;
  /** Length of the generated content */
  generatedLength: number;
  /** Platform character limit for this field */
  limit: number;
  /** Number of characters over the limit */
  overflow: number;
  /** The actual generated string */
  generatedValue: string;
}

/**
 * Result of template validation against data source
 */
export interface TemplateValidationResult {
  /** Whether the validation completed successfully */
  success: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Total number of rows in the data source */
  totalRows: number;
  /** Number of rows that pass validation */
  validRows: number;
  /** Number of rows that exceed the character limit */
  invalidRows: number;
  /** Details about each invalid row */
  invalidRowDetails: InvalidRowDetail[];
  /** Human-readable summary */
  summary: string;
}

/**
 * Variable pattern that matches both {{variable}} and {variable} syntax
 */
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}|\{([^}]+)\}/g;

/**
 * Expands a template string by substituting variable placeholders with values.
 *
 * Supports both {{variable}} and {variable} syntax.
 *
 * @param template - Template string with variable placeholders
 * @param rowData - Object containing variable values
 * @returns Expanded template with substituted values
 */
export function expandTemplate(
  template: string,
  rowData: Record<string, unknown>
): string {
  return template.replace(VARIABLE_PATTERN, (match, doubleVar, singleVar) => {
    // Handle both {{var}} and {var} syntax
    const varName = (doubleVar || singleVar).trim();

    // Handle filter syntax (e.g., {name|uppercase})
    const [baseName] = varName.split("|");

    const value = rowData[baseName.trim()];

    // Return empty string for null/undefined
    if (value == null) {
      return "";
    }

    return String(value);
  });
}

/**
 * Gets the character limit for a field on a specific platform.
 *
 * @param platform - The advertising platform
 * @param field - The field name
 * @returns The character limit or undefined if no limit defined
 */
function getFieldLimit(platform: string, field: string): number | undefined {
  const platformLimits = PLATFORM_LIMITS[platform as ConstraintPlatform];
  if (!platformLimits) {
    return undefined;
  }

  // Map common field names to platform-specific names
  const fieldMapping: Record<string, Record<string, string>> = {
    google: {
      headline: "headline",
      description: "description",
      displayUrl: "displayUrl",
    },
    facebook: {
      headline: "headline",
      description: "description",
      primaryText: "primaryText",
    },
    reddit: {
      headline: "title",
      title: "title",
      description: "text",
      text: "text",
    },
  };

  const mappedField = fieldMapping[platform]?.[field] ?? field;
  return platformLimits[mappedField as keyof typeof platformLimits] as number | undefined;
}

/**
 * Validates a template against all rows in a data source.
 *
 * Iterates through each row, expands the template with row values,
 * and checks if the resulting length exceeds the platform limit.
 *
 * @param dataSourceId - The UUID of the data source
 * @param template - Template string with variable placeholders
 * @param field - The field being validated (headline, description, etc.)
 * @param platform - The advertising platform (google, facebook, reddit)
 * @returns Validation result with details about invalid rows
 */
export async function validateTemplateAgainstData(
  dataSourceId: string,
  template: string,
  field: string,
  platform: string
): Promise<TemplateValidationResult> {
  try {
    // Fetch all rows from the data source
    const rows = await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, dataSourceId))
      .orderBy(asc(dataRows.rowIndex));

    if (rows.length === 0) {
      return {
        success: true,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        invalidRowDetails: [],
        summary: "No rows to validate",
      };
    }

    // Get the character limit for this field/platform
    const limit = getFieldLimit(platform, field);

    // If no limit defined, all rows are valid
    if (limit === undefined) {
      return {
        success: true,
        totalRows: rows.length,
        validRows: rows.length,
        invalidRows: 0,
        invalidRowDetails: [],
        summary: `All ${rows.length} rows are valid (no limit defined for ${field} on ${platform})`,
      };
    }

    const invalidRowDetails: InvalidRowDetail[] = [];
    let validRows = 0;

    // Validate each row
    for (const row of rows) {
      const rowData = row.rowData as Record<string, unknown>;
      const expandedValue = expandTemplate(template, rowData);
      const length = expandedValue.length;

      if (length > limit) {
        invalidRowDetails.push({
          rowIndex: row.rowIndex,
          generatedLength: length,
          limit,
          overflow: length - limit,
          generatedValue: expandedValue,
        });
      } else {
        validRows++;
      }
    }

    const invalidRows = invalidRowDetails.length;
    const totalRows = rows.length;

    // Generate summary
    const rowWord = invalidRows === 1 ? "row" : "rows";
    const summary = invalidRows > 0
      ? `${invalidRows} of ${totalRows} ${rowWord} will exceed ${field} limit`
      : `All ${totalRows} rows are within ${field} limit`;

    return {
      success: true,
      totalRows,
      validRows,
      invalidRows,
      invalidRowDetails,
      summary,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      invalidRowDetails: [],
      summary: "Validation failed",
    };
  }
}
