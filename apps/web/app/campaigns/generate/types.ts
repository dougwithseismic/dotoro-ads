// Campaign Builder wizard steps
export type WizardStep =
  | 'data-source'      // Step 1: Select data source
  | 'rules'            // Step 2: Filtering/modification rules (optional, now before config)
  | 'campaign-config'  // Step 3: Campaign name pattern (platform moved to step 6)
  | 'hierarchy'        // Step 4: Ad group + ad configuration
  | 'keywords'         // Step 5: Keyword rules (optional)
  | 'platform'         // Step 6: Multi-platform selection
  | 'preview';         // Step 7: Final preview + generate

// Campaign configuration for the new flow
// Note: Platform selection has been moved to a separate step (selectedPlatforms in WizardState)
export interface CampaignConfig {
  namePattern: string;           // e.g., "{brand_name}-performance"
  objective?: string;
  budget?: BudgetConfig;
}

export interface BudgetConfig {
  type: 'daily' | 'lifetime';
  amountPattern: string;       // Can be variable like "{budget}" or fixed "100"
  currency: string;
}

// Hierarchy configuration for ad group and ad mapping
export interface HierarchyConfig {
  adGroupNamePattern: string;    // e.g., "{product_name}"
  adMapping: AdMapping;
}

export interface AdMapping {
  headline: string;            // Column name or pattern
  description: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

// Keyword configuration (optional step)
export interface KeywordConfig {
  enabled: boolean;
  rules: KeywordRule[];
}

export interface KeywordRule {
  id: string;
  name: string;                // Human-readable name for the rule
  scope: 'campaign' | 'ad-group';  // Where the rule is defined
  coreTermPattern: string;     // e.g., "{product_name}"
  prefixes: string[];          // e.g., ["buy", "cheap", "best"]
  suffixes: string[];          // e.g., ["online", "sale", "near me"]
  matchTypes: MatchType[];
  negativeKeywords?: string[]; // Negative keywords for this rule
}

export type MatchType = 'broad' | 'phrase' | 'exact';

// Available columns from selected data source
export interface DataSourceColumn {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'unknown';
  sampleValues?: string[];
}

// Updated wizard state for campaign-first flow
export interface WizardState {
  currentStep: WizardStep;
  // Data source selection (Step 1)
  dataSourceId: string | null;
  availableColumns: DataSourceColumn[];
  // Rules selection (Step 2 - optional, filter data before config)
  ruleIds: string[];
  // Campaign configuration (Step 3)
  campaignConfig: CampaignConfig | null;
  // Hierarchy configuration (Step 4)
  hierarchyConfig: HierarchyConfig | null;
  // Keyword configuration (Step 5 - optional)
  keywordConfig: KeywordConfig | null;
  // Platform selection (Step 6 - multi-select)
  selectedPlatforms: Platform[];
  // Generation result (Step 7)
  generateResult: GenerateResponse | null;
}

export const WIZARD_STEPS: WizardStep[] = [
  'data-source',
  'rules',
  'campaign-config',
  'hierarchy',
  'keywords',
  'platform',
  'preview',
];

export const STEP_LABELS: Record<WizardStep, string> = {
  'data-source': 'Data Source',
  'campaign-config': 'Campaign Config',
  'hierarchy': 'Ad Structure',
  'keywords': 'Keywords',
  'rules': 'Rules',
  'platform': 'Platforms',
  'preview': 'Preview & Generate',
};

// Steps that are optional and can be skipped
export const OPTIONAL_STEPS: WizardStep[] = ['keywords', 'rules'];

// Entity types for selectors
export type Platform = 'reddit' | 'google' | 'facebook';

export type DataSourceType = 'csv' | 'transform' | 'api';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  rowCount?: number;
  createdAt: string;
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: unknown[];
  actions: unknown[];
  createdAt: string;
}

// Preview types
export interface PreviewCampaign {
  name: string;
  platform: Platform;
  objective?: string;
  budget?: { type: string; amount: number; currency: string };
  adGroups: PreviewAdGroup[];
  sourceRowId: string;
  groups?: string[];
  tags?: string[];
}

export interface PreviewAdGroup {
  name: string;
  ads: PreviewAd[];
}

export interface PreviewAd {
  headline: string | null;
  description: string | null;
  callToAction?: string;
}

export interface ValidationWarning {
  rowIndex: number;
  field: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface PreviewResponse {
  campaign_count: number;
  ad_group_count: number;
  ad_count: number;
  rows_processed: number;
  rows_skipped: number;
  preview: PreviewCampaign[];
  warnings: string[];
  validation_warnings: ValidationWarning[];
}

export interface GenerateResponse {
  generatedCount: number;
  campaigns: { id: string; name: string; status: string }[];
  warnings: string[];
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Variable pattern regex: matches {variable_name} or {variable_name|default}
const VARIABLE_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\|([^}]*))?\}/g;

/**
 * Interpolates variables in a pattern string using values from a data row.
 * Supports default values with syntax {variable_name|default_value}.
 * Returns the original match if no value is found and no default is specified.
 *
 * @param pattern - The pattern string with {variable} placeholders
 * @param row - A data row object with variable values
 * @returns The interpolated string with variables replaced by their values
 *
 * @example
 * interpolatePattern("{brand_name}-{region}", { brand_name: "Nike", region: "US" })
 * // Returns: "Nike-US"
 *
 * @example
 * interpolatePattern("{brand|Unknown}", { })
 * // Returns: "Unknown"
 */
export function interpolatePattern(
  pattern: string,
  row: Record<string, unknown>
): string {
  if (!pattern) return "";
  return pattern.replace(VARIABLE_PATTERN, (match, varName, defaultVal) => {
    const value = row[varName];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
    return defaultVal ?? match;
  });
}

/**
 * Extracts variable names from a pattern string
 * e.g., "{brand_name}-{region}" -> ["brand_name", "region"]
 */
export function extractVariables(pattern: string): string[] {
  const variables: string[] = [];
  let match;
  while ((match = VARIABLE_PATTERN.exec(pattern)) !== null) {
    if (match[1] && !variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  // Reset lastIndex for stateful regex
  VARIABLE_PATTERN.lastIndex = 0;
  return variables;
}

/**
 * Validates that all variables in a pattern exist in available columns
 */
export function validateVariablesInPattern(
  pattern: string,
  availableColumns: DataSourceColumn[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const variables = extractVariables(pattern);
  const columnNames = availableColumns.map(c => c.name);

  for (const variable of variables) {
    if (!columnNames.includes(variable)) {
      errors.push(`Variable "{${variable}}" not found in data source columns`);
    }
  }

  if (pattern.trim() === '') {
    errors.push('Pattern cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates campaign configuration
 * Note: Platform validation is now handled separately in validatePlatformSelection
 */
export function validateCampaignConfig(
  config: CampaignConfig | null,
  availableColumns: DataSourceColumn[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    errors.push('Campaign configuration is required');
    return { valid: false, errors, warnings };
  }

  // Validate name pattern
  const patternResult = validateVariablesInPattern(config.namePattern, availableColumns);
  errors.push(...patternResult.errors);
  warnings.push(...patternResult.warnings);

  // Validate budget if present
  if (config.budget) {
    if (!['daily', 'lifetime'].includes(config.budget.type)) {
      errors.push(`Invalid budget type: ${config.budget.type}`);
    }
    if (!config.budget.amountPattern || config.budget.amountPattern.trim() === '') {
      errors.push('Budget amount pattern is required');
    }
    if (!config.budget.currency || config.budget.currency.length !== 3) {
      errors.push('Budget currency must be a 3-letter code (e.g., USD)');
    }

    // Validate variables in budget amount pattern
    const budgetPatternResult = validateVariablesInPattern(
      config.budget.amountPattern,
      availableColumns
    );
    // Only report errors for budget, not empty pattern (already checked)
    const budgetVariableErrors = budgetPatternResult.errors.filter(
      e => !e.includes('cannot be empty')
    );
    errors.push(...budgetVariableErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates platform selection (multi-select)
 */
export function validatePlatformSelection(
  selectedPlatforms: Platform[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!selectedPlatforms || selectedPlatforms.length === 0) {
    errors.push('At least one platform must be selected');
    return { valid: false, errors, warnings };
  }

  // Validate each platform is a known platform
  const validPlatforms: Platform[] = ['reddit', 'google', 'facebook'];
  for (const platform of selectedPlatforms) {
    if (!validPlatforms.includes(platform)) {
      errors.push(`Invalid platform: ${platform}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates hierarchy configuration
 */
export function validateHierarchyConfig(
  config: HierarchyConfig | null,
  availableColumns: DataSourceColumn[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    errors.push('Hierarchy configuration is required');
    return { valid: false, errors, warnings };
  }

  // Validate ad group name pattern
  const adGroupResult = validateVariablesInPattern(config.adGroupNamePattern, availableColumns);
  errors.push(...adGroupResult.errors.map(e => `Ad group pattern: ${e}`));

  // Validate ad mapping
  if (!config.adMapping) {
    errors.push('Ad mapping is required');
  } else {
    // Headline is required
    if (!config.adMapping.headline || config.adMapping.headline.trim() === '') {
      errors.push('Ad headline mapping is required');
    } else {
      const headlineResult = validateVariablesInPattern(config.adMapping.headline, availableColumns);
      errors.push(...headlineResult.errors.map(e => `Headline: ${e}`));
    }

    // Description is required
    if (!config.adMapping.description || config.adMapping.description.trim() === '') {
      errors.push('Ad description mapping is required');
    } else {
      const descResult = validateVariablesInPattern(config.adMapping.description, availableColumns);
      errors.push(...descResult.errors.map(e => `Description: ${e}`));
    }

    // Optional fields validation
    if (config.adMapping.displayUrl) {
      const urlResult = validateVariablesInPattern(config.adMapping.displayUrl, availableColumns);
      warnings.push(...urlResult.errors.map(e => `Display URL: ${e}`));
    }

    if (config.adMapping.finalUrl) {
      const urlResult = validateVariablesInPattern(config.adMapping.finalUrl, availableColumns);
      warnings.push(...urlResult.errors.map(e => `Final URL: ${e}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates keyword configuration
 */
export function validateKeywordConfig(
  config: KeywordConfig | null,
  availableColumns: DataSourceColumn[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Keywords are optional - null/disabled is valid
  if (!config || !config.enabled) {
    return { valid: true, errors, warnings };
  }

  // Validate rules if enabled
  for (let i = 0; i < config.rules.length; i++) {
    const rule = config.rules[i];
    if (!rule) continue;

    if (!rule.coreTermPattern || rule.coreTermPattern.trim() === '') {
      errors.push(`Keyword rule ${i + 1}: Core term pattern is required`);
    } else {
      const coreResult = validateVariablesInPattern(rule.coreTermPattern, availableColumns);
      errors.push(...coreResult.errors.map(e => `Keyword rule ${i + 1}: ${e}`));
    }

    if (!rule.matchTypes || rule.matchTypes.length === 0) {
      errors.push(`Keyword rule ${i + 1}: At least one match type is required`);
    } else {
      const validMatchTypes: MatchType[] = ['broad', 'phrase', 'exact'];
      for (const mt of rule.matchTypes) {
        if (!validMatchTypes.includes(mt)) {
          errors.push(`Keyword rule ${i + 1}: Invalid match type "${mt}"`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates entire wizard state for a specific step
 */
export function validateWizardStep(
  step: WizardStep,
  state: WizardState
): ValidationResult {
  switch (step) {
    case 'data-source':
      if (!state.dataSourceId) {
        return { valid: false, errors: ['Please select a data source'], warnings: [] };
      }
      return { valid: true, errors: [], warnings: [] };

    case 'campaign-config':
      return validateCampaignConfig(state.campaignConfig, state.availableColumns);

    case 'hierarchy':
      return validateHierarchyConfig(state.hierarchyConfig, state.availableColumns);

    case 'keywords':
      return validateKeywordConfig(state.keywordConfig, state.availableColumns);

    case 'rules':
      // Rules are optional
      return { valid: true, errors: [], warnings: [] };

    case 'platform':
      return validatePlatformSelection(state.selectedPlatforms);

    case 'preview':
      // Preview requires all previous steps to be valid
      const dataSourceResult = validateWizardStep('data-source', state);
      if (!dataSourceResult.valid) return dataSourceResult;

      const campaignResult = validateWizardStep('campaign-config', state);
      if (!campaignResult.valid) return campaignResult;

      const hierarchyResult = validateWizardStep('hierarchy', state);
      if (!hierarchyResult.valid) return hierarchyResult;

      const platformResult = validateWizardStep('platform', state);
      if (!platformResult.valid) return platformResult;

      return { valid: true, errors: [], warnings: [] };

    default:
      return { valid: false, errors: [`Unknown step: ${step}`], warnings: [] };
  }
}
