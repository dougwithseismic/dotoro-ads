/**
 * Variable Substitution Engine
 *
 * Handles variable parsing, substitution, and filter application for ad templates.
 * Supports:
 * - Simple variables: {variable_name}
 * - Nested variables: {category.{lang}}
 * - Filters: {price|currency}, {name|uppercase}
 * - Filter arguments: {date|format:YYYY-MM-DD}
 * - Fallbacks: {sale_price|regular_price} (use regular_price if sale_price is undefined)
 *
 * Note on fallback behavior:
 * The syntax {a|b} is interpreted as a filter if 'b' is a known filter name,
 * otherwise 'b' is treated as a fallback variable name. For example:
 * - {name|uppercase} - 'uppercase' is a filter, so it applies the filter
 * - {sale_price|regular_price} - 'regular_price' is not a filter, so it's a fallback
 */

export interface Filter {
  name: string;
  args: string[];
}

export interface ExtractedVariable {
  name: string;
  raw: string;
  filters: Filter[];
  fallback?: string;
  nested?: boolean;
}

export interface SubstitutionWarning {
  variable: string;
  message: string;
}

export interface SubstitutionError {
  variable: string;
  message: string;
}

export interface SubstitutionResult {
  text: string;
  success: boolean;
  warnings: SubstitutionWarning[];
  errors: SubstitutionError[];
}

export interface ValidationResult {
  valid: boolean;
  missingVariables: string[];
}

export interface SubstitutionDetail {
  variable: string;
  originalValue: string;
  transformedValue: string;
  filters: string[];
}

export interface PreviewResult extends SubstitutionResult {
  substitutions: SubstitutionDetail[];
}

export type FilterFunction = (value: string, ...args: string[]) => string;

// DoS prevention limits
const MAX_TEMPLATE_LENGTH = 50000; // 50KB
const MAX_VARIABLES = 100;
const MAX_NESTING_DEPTH = 5;

export class VariableEngine {
  private filters: Map<string, FilterFunction> = new Map();
  private builtInFilterNames: Set<string>;

  constructor() {
    // Track built-in filter names at instance level to avoid mutation of shared state
    this.builtInFilterNames = new Set([
      "uppercase",
      "lowercase",
      "capitalize",
      "titlecase",
      "trim",
      "truncate",
      "currency",
      "number",
      "percent",
      "format",
      "slug",
      "replace",
      "default",
    ]);
    this.registerBuiltInFilters();
  }

  private registerBuiltInFilters(): void {
    // Text transformations
    this.filters.set("uppercase", (value: string) => value.toUpperCase());
    this.filters.set("lowercase", (value: string) => value.toLowerCase());
    this.filters.set("capitalize", (value: string) =>
      value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    );
    this.filters.set("titlecase", (value: string) =>
      value
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    );
    this.filters.set("trim", (value: string) => value.trim());

    // Truncate: {text|truncate:length} or {text|truncate:length:suffix}
    // Trims trailing whitespace before adding suffix for cleaner output
    this.filters.set("truncate", (value: string, length: string, suffix?: string) => {
      const maxLength = parseInt(length, 10);
      if (isNaN(maxLength) || value.length <= maxLength) {
        return value;
      }
      const actualSuffix = suffix !== undefined ? suffix : "...";
      const truncated = value.slice(0, maxLength).trimEnd();
      return truncated + actualSuffix;
    });

    // Currency formatting
    this.filters.set("currency", (value: string, currencyCode = "USD") => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;

      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currencyCode,
        }).format(num);
      } catch {
        // Fallback for invalid currency codes
        return `$${num.toFixed(2)}`;
      }
    });

    // Number formatting
    this.filters.set("number", (value: string, decimals?: string) => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;

      try {
        const options: Intl.NumberFormatOptions = {};
        if (decimals !== undefined) {
          const decimalPlaces = parseInt(decimals, 10);
          // Only apply if valid non-negative number
          if (!isNaN(decimalPlaces) && decimalPlaces >= 0) {
            options.minimumFractionDigits = decimalPlaces;
            options.maximumFractionDigits = decimalPlaces;
          }
        }

        return new Intl.NumberFormat("en-US", options).format(num);
      } catch {
        // Fallback for invalid options
        return new Intl.NumberFormat("en-US").format(num);
      }
    });

    // Percentage formatting
    this.filters.set("percent", (value: string) => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return `${(num * 100).toFixed(1)}%`;
    });

    // Date formatting (simplified - supports common patterns)
    this.filters.set("format", (value: string, pattern: string) => {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;

        // Simple pattern replacement
        let result = pattern;
        result = result.replace("YYYY", date.getUTCFullYear().toString());
        result = result.replace("MM", String(date.getUTCMonth() + 1).padStart(2, "0"));
        result = result.replace("DD", String(date.getUTCDate()).padStart(2, "0"));
        result = result.replace("HH", String(date.getUTCHours()).padStart(2, "0"));
        result = result.replace("mm", String(date.getUTCMinutes()).padStart(2, "0"));
        result = result.replace("ss", String(date.getUTCSeconds()).padStart(2, "0"));

        return result;
      } catch {
        return value;
      }
    });

    // Slug generation
    this.filters.set("slug", (value: string) => {
      return value
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
    });

    // Replace: {text|replace:search:replacement}
    this.filters.set("replace", (value: string, search: string, replacement: string) => {
      if (!search) return value;
      return value.split(search).join(replacement || "");
    });

    // Default value for empty strings
    // Note: value is always a string at this point (converted by valueToString)
    this.filters.set("default", (value: string, defaultValue: string) => {
      return value === "" ? (defaultValue || "") : value;
    });
  }

  /**
   * Register a custom filter function
   * Note: Custom filters are registered but not added to builtInFilterNames
   * to maintain the distinction between built-in and custom filters
   */
  registerFilter(name: string, fn: FilterFunction): void {
    this.filters.set(name, fn);
  }

  /**
   * Check if a name is a built-in filter
   */
  isBuiltInFilter(name: string): boolean {
    return this.builtInFilterNames.has(name);
  }

  /**
   * Check if a name is a registered filter (built-in or custom)
   */
  private isFilter(name: string): boolean {
    return this.filters.has(name) || this.builtInFilterNames.has(name);
  }

  /**
   * Parse a filter string like "format:YYYY-MM-DD" into { name, args }
   */
  private parseFilter(filterStr: string): Filter {
    const parts = filterStr.split(":");
    const name = parts[0] || "";
    const args = parts.slice(1);
    return { name, args };
  }

  /**
   * Extract all variables from a template string
   */
  extractVariables(template: string): ExtractedVariable[] {
    const variables: ExtractedVariable[] = [];
    const seen = new Set<string>();
    // Track ranges of nested variables to skip their inner parts
    const nestedRanges: Array<{ start: number; end: number }> = [];

    // Handle nested variables first - match {outer.{inner}}
    // Pattern requires some text before the inner variable (like "category.")
    // This prevents matching {{text}} as a nested variable
    const nestedPattern = /\{([^{}]+\{[^{}]+\}[^{}]*)\}/g;
    let match: RegExpMatchArray | null;

    while ((match = nestedPattern.exec(template)) !== null) {
      const raw = match[0];
      const content = match[1];
      const matchStart = match.index ?? 0;
      const matchEnd = matchStart + raw.length;

      // Skip if content starts with { (this would be {{...}} escape sequence)
      if (content && content.startsWith("{")) continue;

      if (content && !seen.has(raw)) {
        seen.add(raw);
        nestedRanges.push({ start: matchStart, end: matchEnd });
        variables.push({
          name: content,
          raw,
          filters: [],
          fallback: undefined,
          nested: true,
        });
      }
    }

    // Now find escaped brace positions, but exclude those inside nested variables
    const escapedRanges: Array<{ start: number; end: number }> = [];
    let escapeMatch;
    const escapedPattern = /\{\{|\}\}/g;
    while ((escapeMatch = escapedPattern.exec(template)) !== null) {
      const escStart = escapeMatch.index;
      const escEnd = escStart + 2;
      // Check if this escaped sequence is inside a nested variable
      const isInsideNested = nestedRanges.some(
        (range) => escStart >= range.start && escEnd <= range.end
      );
      if (!isInsideNested) {
        escapedRanges.push({ start: escStart, end: escEnd });
      }
    }

    // Helper to check if a position overlaps with escaped braces
    const overlapsEscaped = (start: number, end: number): boolean => {
      return escapedRanges.some(
        (range) => start < range.end && end > range.start
      );
    };

    // Match simple variables: {variable_name} or {variable|filter} or {variable|fallback}
    // Exclude nested ones we already found
    const simplePattern = /\{([^{}|]+)(?:\|([^{}]+))?\}/g;

    while ((match = simplePattern.exec(template)) !== null) {
      const raw = match[0];
      const name = match[1]?.trim() || "";
      const filterOrFallback = match[2];
      const matchIndex = match.index ?? 0;
      const matchEnd = matchIndex + raw.length;

      // Skip if this was already captured as nested
      if (seen.has(raw)) continue;
      // Skip if overlaps with escaped braces
      if (overlapsEscaped(matchIndex, matchEnd)) continue;
      // Skip if this match is inside a nested variable range
      const isInsideNested = nestedRanges.some(
        (range) => matchIndex > range.start && matchIndex < range.end
      );
      if (isInsideNested) continue;

      seen.add(raw);

      const extractedVar: ExtractedVariable = {
        name,
        raw,
        filters: [],
        fallback: undefined,
      };

      if (filterOrFallback) {
        const parts = filterOrFallback.split("|");
        const filters: Filter[] = [];
        let fallback: string | undefined;

        for (const part of parts) {
          const trimmedPart = part.trim();
          const parsed = this.parseFilter(trimmedPart);

          // Determine if this is a filter or fallback
          // If it has args with ":", it's definitely a filter
          // If the name is a known filter, it's a filter
          // Otherwise, it's a fallback
          if (parsed.args.length > 0 || this.isFilter(parsed.name)) {
            filters.push(parsed);
          } else {
            // It's a fallback (a variable name to use if primary is missing)
            fallback = parsed.name;
          }
        }

        extractedVar.filters = filters;
        extractedVar.fallback = fallback;
      }

      variables.push(extractedVar);
    }

    return variables;
  }

  /**
   * Get list of all required variable names from a template
   */
  getRequiredVariables(template: string): string[] {
    const variables = this.extractVariables(template);
    const required = new Set<string>();

    for (const variable of variables) {
      required.add(variable.name);
      if (variable.fallback) {
        required.add(variable.fallback);
      }
    }

    return Array.from(required);
  }

  /**
   * Apply a filter to a value.
   * If the filter is unknown or throws an error, returns the original value
   * and adds a warning to the provided warnings array.
   */
  private applyFilter(
    value: string,
    filter: Filter,
    warnings: SubstitutionWarning[]
  ): string {
    const filterFn = this.filters.get(filter.name);
    if (!filterFn) {
      // Unknown filter - return value unchanged and add warning
      warnings.push({
        variable: `filter:${filter.name}`,
        message: `Unknown filter "${filter.name}" - value returned unchanged`,
      });
      return value;
    }

    try {
      return filterFn(value, ...filter.args);
    } catch (error) {
      // Filter failed - return original value and add warning
      // This prevents one bad filter from crashing the entire substitution
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      warnings.push({
        variable: `filter:${filter.name}`,
        message: `Filter "${filter.name}" failed: ${errorMessage} - original value returned`,
      });
      return value;
    }
  }

  /**
   * Convert data value to string
   */
  private valueToString(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    return String(value);
  }

  /**
   * Get a value from data using direct key lookup.
   * Note: Does not traverse nested objects via dot notation.
   * For nested access, use keys like "category.en" directly in the data object.
   */
  private getValue(data: Record<string, unknown>, key: string): unknown {
    // Direct key match only - does not traverse nested objects
    if (key in data) {
      return data[key];
    }
    return undefined;
  }

  /**
   * Resolve nested variable references like {category.{lang}}
   * This works by iteratively resolving innermost variables first
   */
  private resolveNested(
    nestedExpression: string,
    data: Record<string, unknown>,
    warnings: SubstitutionWarning[]
  ): string {
    // Remove the outer braces to work with the content
    // e.g., "{category.{lang}}" -> "category.{lang}"
    let content = nestedExpression;
    if (content.startsWith("{") && content.endsWith("}")) {
      content = content.slice(1, -1);
    }

    // Find innermost variables and resolve them first
    // Using MAX_NESTING_DEPTH to prevent deeply nested expressions (DoS prevention)
    const innerPattern = /\{([^{}]+)\}/;
    let iterations = 0;

    while (content.includes("{") && iterations < MAX_NESTING_DEPTH) {
      const innerMatch = innerPattern.exec(content);
      if (!innerMatch) break;

      const varName = innerMatch[1];
      if (!varName) break;

      const value = this.getValue(data, varName);
      if (value === undefined) {
        warnings.push({
          variable: varName,
          message: `Variable "${varName}" is missing from data`,
        });
        // If inner variable is missing, the whole nested expression fails
        return "";
      }

      // Replace the inner variable with its value
      content = content.replace(innerMatch[0], this.valueToString(value));
      iterations++;
    }

    // Now content should be a fully resolved key (e.g., "category.en")
    // Look it up in the data
    const finalValue = this.getValue(data, content);
    if (finalValue === undefined) {
      warnings.push({
        variable: content,
        message: `Variable "${content}" is missing from data`,
      });
      return "";
    }

    return this.valueToString(finalValue);
  }

  /**
   * Substitute variables in a template with data values
   */
  substitute(
    template: string,
    data: Record<string, unknown>
  ): SubstitutionResult {
    const warnings: SubstitutionWarning[] = [];
    const errors: SubstitutionError[] = [];

    if (!template) {
      return { text: "", success: true, warnings, errors };
    }

    // DoS prevention: Check template length
    if (template.length > MAX_TEMPLATE_LENGTH) {
      errors.push({
        variable: "_template",
        message: `Template exceeds maximum length of ${MAX_TEMPLATE_LENGTH} characters`,
      });
      return { text: template, success: false, warnings, errors };
    }

    // First, extract variables from the original template
    const variables = this.extractVariables(template);

    // DoS prevention: Check variable count
    if (variables.length > MAX_VARIABLES) {
      errors.push({
        variable: "_template",
        message: `Template exceeds maximum variable count of ${MAX_VARIABLES}`,
      });
      return { text: template, success: false, warnings, errors };
    }

    // Build a map of variable raw -> placeholder -> resolved value
    const replacements: Array<{ raw: string; resolved: string }> = [];

    for (const variable of variables) {
      let resolved: string;

      if (variable.nested) {
        // Handle nested variables
        resolved = this.resolveNested(variable.raw, data, warnings);
      } else {
        // Get value from data
        let value = this.getValue(data, variable.name);

        // If value is missing, try fallback
        if (value === undefined || value === null) {
          if (variable.fallback) {
            value = this.getValue(data, variable.fallback);
            if (value === undefined || value === null) {
              warnings.push({
                variable: variable.name,
                message: `Variable "${variable.name}" is missing and fallback "${variable.fallback}" is also missing`,
              });
              value = "";
            }
          } else {
            warnings.push({
              variable: variable.name,
              message: `Variable "${variable.name}" is missing from data`,
            });
            value = "";
          }
        }

        // Convert to string
        let stringValue = this.valueToString(value);

        // Apply filters
        for (const filter of variable.filters) {
          stringValue = this.applyFilter(stringValue, filter, warnings);
        }

        resolved = stringValue;
      }

      replacements.push({ raw: variable.raw, resolved });
    }

    // Sort replacements by raw length descending to replace longer patterns first
    // This prevents partial replacements (e.g., {a} before {ab})
    replacements.sort((a, b) => b.raw.length - a.raw.length);

    // Replace variables with placeholders first to avoid interference
    let result = template;
    const placeholderMap = new Map<string, string>();

    for (let i = 0; i < replacements.length; i++) {
      const r = replacements[i];
      if (r) {
        const placeholder = `\x00VAR${i}\x00`;
        placeholderMap.set(placeholder, r.resolved);
        // Replace all occurrences of this variable
        result = result.split(r.raw).join(placeholder);
      }
    }

    // Now handle escaped braces: {{ -> {, }} -> }
    result = result.replace(/\{\{/g, "\x00LBRACE\x00").replace(/\}\}/g, "\x00RBRACE\x00");

    // Replace placeholders with resolved values
    for (const [placeholder, resolved] of placeholderMap) {
      result = result.split(placeholder).join(resolved);
    }

    // Restore escaped braces
    result = result.replace(/\x00LBRACE\x00/g, "{").replace(/\x00RBRACE\x00/g, "}");

    return {
      text: result,
      success: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Validate that all required variables are present in data
   */
  validate(
    template: string,
    data: Record<string, unknown>
  ): ValidationResult {
    const variables = this.extractVariables(template);
    const missingVariables: string[] = [];

    for (const variable of variables) {
      const value = this.getValue(data, variable.name);

      if (value === undefined || value === null) {
        // Check if fallback is present
        if (variable.fallback) {
          const fallbackValue = this.getValue(data, variable.fallback);
          if (fallbackValue === undefined || fallbackValue === null) {
            missingVariables.push(variable.name);
          }
        } else {
          missingVariables.push(variable.name);
        }
      }
    }

    return {
      valid: missingVariables.length === 0,
      missingVariables,
    };
  }

  /**
   * Preview substitution with detailed information about each replacement
   */
  previewSubstitution(
    template: string,
    data: Record<string, unknown>
  ): PreviewResult {
    const substitutions: SubstitutionDetail[] = [];
    const warnings: SubstitutionWarning[] = [];
    const errors: SubstitutionError[] = [];

    if (!template) {
      return {
        text: "",
        success: true,
        warnings,
        errors,
        substitutions,
      };
    }

    // First, extract variables from the original template
    const variables = this.extractVariables(template);

    // Build replacements and track substitution details
    const replacements: Array<{ raw: string; resolved: string }> = [];

    for (const variable of variables) {
      let resolved: string;

      if (variable.nested) {
        resolved = this.resolveNested(variable.raw, data, warnings);
      } else {
        let value = this.getValue(data, variable.name);
        const originalValue = this.valueToString(value);

        if (value === undefined || value === null) {
          if (variable.fallback) {
            value = this.getValue(data, variable.fallback);
            if (value === undefined || value === null) {
              warnings.push({
                variable: variable.name,
                message: `Variable "${variable.name}" is missing and fallback "${variable.fallback}" is also missing`,
              });
              value = "";
            }
          } else {
            warnings.push({
              variable: variable.name,
              message: `Variable "${variable.name}" is missing from data`,
            });
            value = "";
          }
        }

        let stringValue = this.valueToString(value);
        const appliedFilters: string[] = [];

        for (const filter of variable.filters) {
          stringValue = this.applyFilter(stringValue, filter, warnings);
          appliedFilters.push(filter.name);
        }

        substitutions.push({
          variable: variable.name,
          originalValue,
          transformedValue: stringValue,
          filters: appliedFilters,
        });

        resolved = stringValue;
      }

      replacements.push({ raw: variable.raw, resolved });
    }

    // Sort replacements by raw length descending
    replacements.sort((a, b) => b.raw.length - a.raw.length);

    // Replace variables with placeholders
    let result = template;
    const placeholderMap = new Map<string, string>();

    for (let i = 0; i < replacements.length; i++) {
      const r = replacements[i];
      if (r) {
        const placeholder = `\x00VAR${i}\x00`;
        placeholderMap.set(placeholder, r.resolved);
        result = result.split(r.raw).join(placeholder);
      }
    }

    // Handle escaped braces
    result = result.replace(/\{\{/g, "\x00LBRACE\x00").replace(/\}\}/g, "\x00RBRACE\x00");

    // Replace placeholders with resolved values
    for (const [placeholder, resolved] of placeholderMap) {
      result = result.split(placeholder).join(resolved);
    }

    // Restore escaped braces
    result = result.replace(/\x00LBRACE\x00/g, "{").replace(/\x00RBRACE\x00/g, "}");

    return {
      text: result,
      success: errors.length === 0,
      warnings,
      errors,
      substitutions,
    };
  }
}
