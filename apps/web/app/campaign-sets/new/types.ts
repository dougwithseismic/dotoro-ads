import type { TargetingConfig } from '@repo/core';

// Re-export TargetingConfig for use in components
export type { TargetingConfig } from '@repo/core';

// Campaign Builder wizard steps
export type WizardStep =
  | 'campaign-set-name' // Step 1: Name and describe the campaign set (NEW)
  | 'data-source'       // Step 2: Select data source
  | 'rules'             // Step 3: Filtering/modification rules (optional, now before config)
  | 'campaign-config'   // Step 4: Campaign name pattern
  | 'platform'          // Step 5: Multi-platform selection with budget
  | 'ad-type'           // Step 6: Select ad type(s) per platform
  | 'hierarchy'         // Step 7: Ad group + ad configuration (keywords at ad group level)
  | 'targeting'         // Step 8: Targeting configuration (optional)
  | 'preview';          // Step 9: Final preview + generate

// Campaign configuration for the new flow
// Note: Platform selection has been moved to a separate step (selectedPlatforms in WizardState)
// Note: Budget has been moved to per-platform configuration (platformBudgets in WizardState)
export interface CampaignConfig {
  namePattern: string;           // e.g., "{brand_name}-performance"
  objective?: string;
}

// Extended Budget Types
export type BudgetType = 'daily' | 'lifetime' | 'shared';

export interface BudgetCaps {
  dailyCap?: string;
  weeklyCap?: string;
  monthlyCap?: string;
  totalCap?: string;
}

export interface BudgetConfig {
  type: BudgetType;
  amountPattern: string;       // Can be variable like "{budget}" or fixed "100"
  currency: string;
  pacing?: 'standard' | 'accelerated';
  caps?: BudgetCaps;
  sharedBudgetId?: string;     // For shared budget type
}

// Bidding Types
export type BiddingStrategy =
  // Google strategies
  | 'maximize_clicks'
  | 'maximize_conversions'
  | 'maximize_conversion_value'
  | 'target_cpa'
  | 'target_roas'
  | 'target_impression_share'
  | 'manual_cpc'
  | 'enhanced_cpc'
  // Facebook strategies
  | 'lowest_cost'
  | 'cost_cap'
  | 'bid_cap'
  | 'highest_value'
  | 'minimum_roas'
  // Reddit strategies
  | 'reddit_cpm'
  | 'reddit_cpc'
  | 'reddit_cpv';

export interface BiddingConfig {
  strategy: BiddingStrategy;
  targetCpa?: string;         // For target_cpa, cost_cap
  targetRoas?: string;        // For target_roas, minimum_roas
  maxCpc?: string;            // For manual_cpc, enhanced_cpc, bid_cap
  maxCpm?: string;            // For reddit_cpm
  maxCpv?: string;            // For reddit_cpv
}

export interface ScheduleConfig {
  startDate?: string;         // ISO date string
  endDate?: string;           // ISO date string (undefined = run continuously)
  timezone?: string;          // e.g., "America/New_York"
  dayParting?: DayPartingConfig;
}

export interface DayPartingConfig {
  enabled: boolean;
  schedule: DayPartingSchedule;
}

export type DayPartingSchedule = Record<string, boolean[]>; // Day -> 24 hour booleans

// Bidding Strategy Definitions
export interface BiddingStrategyDefinition {
  id: BiddingStrategy;
  name: string;
  description: string;
  platform: Platform;
  minimumData?: {
    conversions?: number;
    spend?: number;
  };
  minimumBudget?: number;
  recommendedFor?: string[];
}

// Platform-specific bidding strategies
const GOOGLE_STRATEGIES: BiddingStrategyDefinition[] = [
  {
    id: 'maximize_clicks',
    name: 'Maximize Clicks',
    description: 'Get as many clicks as possible within your budget',
    platform: 'google',
    recommendedFor: ['Traffic', 'Brand awareness'],
  },
  {
    id: 'maximize_conversions',
    name: 'Maximize Conversions',
    description: 'Get the most conversions within your budget',
    platform: 'google',
    minimumData: { conversions: 15 },
    recommendedFor: ['Lead generation', 'Sales'],
  },
  {
    id: 'target_cpa',
    name: 'Target CPA',
    description: 'Get conversions at your target cost per acquisition',
    platform: 'google',
    minimumData: { conversions: 30 },
    recommendedFor: ['Lead generation', 'Sales'],
  },
  {
    id: 'target_roas',
    name: 'Target ROAS',
    description: 'Get conversion value at your target return on ad spend',
    platform: 'google',
    minimumData: { conversions: 50 },
    recommendedFor: ['E-commerce', 'Revenue optimization'],
  },
  {
    id: 'manual_cpc',
    name: 'Manual CPC',
    description: 'Set your own maximum cost-per-click bids',
    platform: 'google',
    recommendedFor: ['Full control', 'Testing'],
  },
];

const FACEBOOK_STRATEGIES: BiddingStrategyDefinition[] = [
  {
    id: 'lowest_cost',
    name: 'Lowest Cost',
    description: 'Get the most results for your budget',
    platform: 'facebook',
    recommendedFor: ['Traffic', 'Engagement'],
  },
  {
    id: 'cost_cap',
    name: 'Cost Cap',
    description: 'Keep average cost per result at or below your amount',
    platform: 'facebook',
    minimumData: { conversions: 50 },
    recommendedFor: ['Lead generation', 'Sales'],
  },
  {
    id: 'bid_cap',
    name: 'Bid Cap',
    description: 'Set maximum bid across auctions',
    platform: 'facebook',
    recommendedFor: ['Full control', 'Testing'],
  },
];

const REDDIT_STRATEGIES: BiddingStrategyDefinition[] = [
  {
    id: 'reddit_cpm',
    name: 'CPM - Cost per 1,000 Impressions',
    description: 'Pay per thousand impressions',
    platform: 'reddit',
    recommendedFor: ['Brand awareness', 'Reach'],
  },
  {
    id: 'reddit_cpc',
    name: 'CPC - Cost per Click',
    description: 'Pay when users click your ad',
    platform: 'reddit',
    recommendedFor: ['Traffic', 'Engagement'],
  },
  {
    id: 'reddit_cpv',
    name: 'CPV - Cost per View',
    description: 'Pay per video view (3+ seconds)',
    platform: 'reddit',
    recommendedFor: ['Video campaigns'],
  },
];

/**
 * Get available bidding strategies for a platform
 */
export function getBiddingStrategies(platform: Platform): BiddingStrategyDefinition[] {
  switch (platform) {
    case 'google':
      return GOOGLE_STRATEGIES;
    case 'facebook':
      return FACEBOOK_STRATEGIES;
    case 'reddit':
      return REDDIT_STRATEGIES;
    default:
      return [];
  }
}

// Fallback strategy for character limit handling
export type FallbackStrategy = 'truncate' | 'truncate_word' | 'error';

// Ad definition within an ad group
export interface AdDefinition {
  id: string;
  headline: string;            // Pattern like "{headline}" or static text
  headlineFallback?: FallbackStrategy;  // Optional fallback for headline overflow
  description: string;
  descriptionFallback?: FallbackStrategy;  // Optional fallback for description overflow
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

// Ad group definition with multiple ads
export interface AdGroupDefinition {
  id: string;
  namePattern: string;         // Pattern like "{product_name}" or static text
  ads: AdDefinition[];         // Multiple ads per group
  keywords?: string[];         // Optional keywords at ad group level (simple strings)
}

// Hierarchy configuration for ad group and ad mapping
export interface HierarchyConfig {
  adGroups: AdGroupDefinition[];  // Explicit ad group definitions
}

// Legacy AdMapping interface (for backwards compatibility during migration)
export interface AdMapping {
  headline: string;            // Column name or pattern
  description: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

/**
 * Generates a unique ID for ad groups and ads
 * Uses crypto.randomUUID if available, otherwise falls back to Math.random
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Creates a default ad group with one empty ad
 */
export function createDefaultAdGroup(): AdGroupDefinition {
  return {
    id: generateId(),
    namePattern: '',
    ads: [createDefaultAd()],
  };
}

/**
 * Creates a default empty ad
 */
export function createDefaultAd(): AdDefinition {
  return {
    id: generateId(),
    headline: '',
    description: '',
  };
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

// Inline rule types for wizard
export interface InlineCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface InlineAction {
  id: string;
  type: "skip" | "set_field" | "modify_field" | "add_tag";
  field?: string;
  value?: string;
  operation?: "append" | "prepend" | "replace";
  tag?: string;
}

export interface InlineRule {
  id: string;
  name: string;
  enabled: boolean;
  logic: "AND" | "OR";
  conditions: InlineCondition[];
  actions: InlineAction[];
}

// Updated wizard state for campaign-first flow
// Ad Type Selection State (Step 4)
export interface AdTypeSelectionState {
  /** Selected ad type IDs per platform: { google: ['responsive-search'], reddit: ['link', 'image'] } */
  selectedAdTypes: Record<Platform, string[]>;
}

export interface WizardState {
  // Campaign set fields (Step 1 - NEW)
  campaignSetName: string;
  campaignSetDescription: string;
  currentStep: WizardStep;
  // Data source selection (Step 2)
  dataSourceId: string | null;
  availableColumns: DataSourceColumn[];
  // Rules (Step 3 - optional, filter data before config)
  ruleIds: string[];  // Legacy: selected rule template IDs
  inlineRules: InlineRule[];  // New: inline rule definitions
  // Campaign configuration (Step 4)
  campaignConfig: CampaignConfig | null;
  // Ad Type selection (Step 6) - per-platform ad type selection
  selectedAdTypes: Record<Platform, string[]>;
  // Hierarchy configuration (Step 7) - keywords are now at ad group level
  hierarchyConfig: HierarchyConfig | null;
  // Thread configuration (for reddit-thread ad type)
  threadConfig: ThreadConfig | null;
  // Platform selection (Step 5 - multi-select)
  selectedPlatforms: Platform[];
  // Per-platform budget configuration (Step 5)
  platformBudgets: Record<Platform, BudgetConfig | null>;
  // Targeting configuration (Step 8 - optional)
  targetingConfig: TargetingConfig | null;
  // Generation result (Step 9)
  generateResult: GenerateResponse | null;
}

export const WIZARD_STEPS: WizardStep[] = [
  'campaign-set-name',
  'data-source',
  'rules',
  'campaign-config',
  'platform',
  'ad-type',
  'hierarchy',
  'targeting',
  'preview',
];

export const STEP_LABELS: Record<WizardStep, string> = {
  'campaign-set-name': 'Campaign Set',
  'data-source': 'Data Source',
  'rules': 'Rules',
  'campaign-config': 'Campaign Config',
  'platform': 'Platforms',
  'ad-type': 'Ad Types',
  'hierarchy': 'Ad Structure',
  'targeting': 'Targeting',
  'preview': 'Preview & Create',
};

// Steps that are optional and can be skipped
export const OPTIONAL_STEPS: WizardStep[] = ['rules', 'targeting'];

// ============================================================================
// Thread Configuration Types (Reddit Threads)
// ============================================================================

/**
 * Role of an author persona in a thread
 */
export type PersonaRole =
  | 'op'              // Original poster
  | 'community_member' // Regular community participant
  | 'skeptic'         // Asks challenging questions
  | 'enthusiast'      // Positive supporter
  | 'expert'          // Provides detailed information
  | 'curious'         // Asks questions for clarification
  | 'moderator';      // Simulated mod responses

/**
 * Tone of an author persona
 */
export type PersonaTone =
  | 'friendly'
  | 'skeptical'
  | 'enthusiastic'
  | 'neutral'
  | 'curious';

/**
 * Type of Reddit post
 */
export type RedditPostType = 'text' | 'link' | 'image' | 'video';

/**
 * Author persona for thread generation
 */
export interface AuthorPersona {
  /** Unique identifier for the persona */
  id: string;
  /** Display name of the persona */
  name: string;
  /** Description of the persona's characteristics */
  description: string;
  /** Role of the persona in discussions */
  role: PersonaRole;
  /** Tone of the persona's comments */
  tone?: PersonaTone;
}

/**
 * Configuration for a Reddit post
 */
export interface RedditPostConfig {
  /** Post title (supports {variable} patterns) */
  title: string;
  /** Post body text (optional, for self-posts) */
  body?: string;
  /** Link URL (for link posts) */
  url?: string;
  /** Type of post */
  type: RedditPostType;
  /** Target subreddit (pattern like "{target_subreddit}" or fixed) */
  subreddit: string;
  /** Post flair (optional) */
  flair?: string;
  /** Whether the post is NSFW */
  nsfw?: boolean;
  /** Whether the post contains spoilers */
  spoiler?: boolean;
  /** Whether to receive reply notifications */
  sendReplies?: boolean;
}

/**
 * Definition of a single comment in a thread
 */
export interface CommentDefinition {
  /** Unique identifier for the comment */
  id: string;
  /** Parent comment ID (null/undefined for top-level comments) */
  parentId?: string | null;
  /** ID of the persona making this comment */
  persona: string;
  /** Comment body (supports {variable} patterns) */
  body: string;
  /** Nesting depth (0 = top-level, 1 = reply to top-level, etc.) */
  depth: number;
  /** Order of appearance in the thread */
  sortOrder: number;
}

/**
 * Configuration for a Reddit thread (organic content)
 */
export interface ThreadConfig {
  /** Main post configuration */
  post: RedditPostConfig;
  /** Comment definitions */
  comments: CommentDefinition[];
  /** Author personas used in the thread */
  personas: AuthorPersona[];
}

/**
 * Default personas for thread generation
 */
export const DEFAULT_PERSONAS: AuthorPersona[] = [
  {
    id: 'op',
    name: 'Original Poster',
    description: 'The person who created the thread, responds to questions',
    role: 'op',
    tone: 'friendly',
  },
  {
    id: 'curious',
    name: 'Curious User',
    description: 'Asks genuine questions, seeks more information',
    role: 'curious',
    tone: 'neutral',
  },
  {
    id: 'skeptic',
    name: 'Skeptic',
    description: 'Raises objections, compares to alternatives',
    role: 'skeptic',
    tone: 'skeptical',
  },
  {
    id: 'enthusiast',
    name: 'Enthusiast',
    description: 'Shares positive experience, supports the product',
    role: 'enthusiast',
    tone: 'enthusiastic',
  },
];

/**
 * Creates a default empty thread configuration
 */
export function createDefaultThreadConfig(): ThreadConfig {
  return {
    post: {
      title: '',
      body: '',
      type: 'text',
      subreddit: '',
      sendReplies: true,
    },
    comments: [],
    personas: [...DEFAULT_PERSONAS],
  };
}

/**
 * Creates a default comment with a unique ID
 */
export function createDefaultComment(
  parentId: string | null = null,
  depth: number = 0,
  sortOrder: number = 0
): CommentDefinition {
  return {
    id: generateId(),
    parentId,
    persona: 'op',
    body: '',
    depth,
    sortOrder,
  };
}

/**
 * Creates a default persona with a unique ID
 */
export function createDefaultPersona(): AuthorPersona {
  return {
    id: generateId(),
    name: '',
    description: '',
    role: 'community_member',
    tone: 'neutral',
  };
}

/**
 * Maximum allowed comment depth
 */
export const MAX_COMMENT_DEPTH = 3;

/**
 * Comment tree node for hierarchical display
 */
export interface CommentTreeNode {
  comment: CommentDefinition;
  children: CommentTreeNode[];
}

/**
 * Builds a hierarchical comment tree from a flat array of comments.
 * This utility is shared across multiple components to ensure consistent tree building.
 *
 * @param comments - Flat array of comment definitions
 * @returns Array of top-level comment tree nodes with nested children
 */
export function buildCommentTree(comments: CommentDefinition[]): CommentTreeNode[] {
  const buildTree = (parentId: string | null): CommentTreeNode[] => {
    return comments
      .filter(
        (c) =>
          c.parentId === parentId || (parentId === null && !c.parentId)
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((comment) => ({
        comment,
        children: buildTree(comment.id),
      }));
  };

  return buildTree(null);
}

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
  /** ID of the created campaign set for navigation */
  campaignSetId?: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Variable pattern regex: matches {variable_name} or {variable_name|filter} or {variable_name|filter:args}
const VARIABLE_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\|([^}]*))?\}/g;

// Available filters for variable transformation
export const AVAILABLE_FILTERS = [
  { name: 'uppercase', description: 'Convert to UPPERCASE', example: '{brand|uppercase}' },
  { name: 'lowercase', description: 'Convert to lowercase', example: '{brand|lowercase}' },
  { name: 'capitalize', description: 'Capitalize first letter', example: '{brand|capitalize}' },
  { name: 'titlecase', description: 'Capitalize Each Word', example: '{brand|titlecase}' },
  { name: 'trim', description: 'Remove whitespace', example: '{brand|trim}' },
  { name: 'truncate', description: 'Truncate to length', example: '{desc|truncate:30}' },
  { name: 'slug', description: 'URL-friendly slug', example: '{title|slug}' },
  { name: 'currency', description: 'Format as currency', example: '{price|currency}' },
  { name: 'number', description: 'Format number', example: '{qty|number:2}' },
  { name: 'percent', description: 'Format as percentage', example: '{rate|percent}' },
  { name: 'replace', description: 'Find and replace', example: '{text|replace:old:new}' },
  { name: 'default', description: 'Default if empty', example: '{sale|default:N/A}' },
] as const;

// Filter name set for quick lookup
const FILTER_NAMES: Set<string> = new Set(AVAILABLE_FILTERS.map(f => f.name));

// Filter functions
type FilterFn = (value: string, ...args: string[]) => string;

const FILTER_FUNCTIONS: Record<string, FilterFn> = {
  uppercase: (value) => value.toUpperCase(),
  lowercase: (value) => value.toLowerCase(),
  capitalize: (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
  titlecase: (value) => value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
  trim: (value) => value.trim(),
  truncate: (value, length, suffix = '...') => {
    const maxLen = parseInt(length, 10);
    if (isNaN(maxLen) || value.length <= maxLen) return value;
    return value.slice(0, maxLen).trimEnd() + suffix;
  },
  slug: (value) => value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim(),
  currency: (value, currencyCode = 'USD') => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(num);
    } catch {
      return `$${num.toFixed(2)}`;
    }
  },
  number: (value, decimals) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    const dec = decimals !== undefined ? parseInt(decimals, 10) : undefined;
    if (dec !== undefined && !isNaN(dec) && dec >= 0) {
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(num);
    }
    return new Intl.NumberFormat('en-US').format(num);
  },
  percent: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `${(num * 100).toFixed(1)}%`;
  },
  replace: (value, search, replacement = '') => {
    if (!search) return value;
    return value.split(search).join(replacement);
  },
  default: (value, defaultValue = '') => value === '' ? defaultValue : value,
};

/**
 * Apply filters to a value. Supports chained filters with pipe syntax.
 * e.g., "uppercase" or "truncate:20" or "uppercase|truncate:20"
 */
function applyFilters(value: string, filterStr: string): string {
  const filters = filterStr.split('|');
  let result = value;

  for (const filter of filters) {
    const parts = filter.split(':');
    const filterName = parts[0]?.trim() || '';
    const args = parts.slice(1);

    const filterFn = FILTER_FUNCTIONS[filterName];
    if (filterFn) {
      try {
        result = filterFn(result, ...args);
      } catch {
        // Filter failed, continue with current value
      }
    }
    // Unknown filters are ignored (might be fallback variable names)
  }

  return result;
}

/**
 * Check if a string is a known filter name
 */
export function isKnownFilter(name: string): boolean {
  return FILTER_NAMES.has(name);
}

/**
 * Interpolates variables in a pattern string using values from a data row.
 * Supports filters with syntax {variable_name|filter} or {variable_name|filter:arg}.
 * Supports chained filters: {variable|uppercase|truncate:20}.
 * Supports fallbacks: {sale_price|regular_price} (if sale_price is empty, use regular_price).
 *
 * @param pattern - The pattern string with {variable} placeholders
 * @param row - A data row object with variable values
 * @returns The interpolated string with variables replaced by their values
 *
 * @example
 * interpolatePattern("{brand|uppercase}", { brand: "Nike" })
 * // Returns: "NIKE"
 *
 * @example
 * interpolatePattern("{price|currency}", { price: "99.99" })
 * // Returns: "$99.99"
 */
export function interpolatePattern(
  pattern: string,
  row: Record<string, unknown>
): string {
  if (!pattern) return "";
  return pattern.replace(VARIABLE_PATTERN, (match, varName, filterOrFallback) => {
    let value = row[varName];

    // If no value, check if filterOrFallback is a fallback variable (not a filter)
    if ((value === undefined || value === null || value === "") && filterOrFallback) {
      // Check if first part before | is a known filter
      const firstPart = filterOrFallback.split('|')[0]?.split(':')[0]?.trim();
      if (firstPart && !isKnownFilter(firstPart)) {
        // It's a fallback variable name
        value = row[firstPart];
        if (value !== undefined && value !== null && value !== "") {
          return String(value);
        }
        return match; // Neither primary nor fallback found
      }
    }

    // Apply value
    if (value !== undefined && value !== null && value !== "") {
      let result = String(value);
      // Apply filters if present
      if (filterOrFallback) {
        result = applyFilters(result, filterOrFallback);
      }
      return result;
    }

    return match; // No value found
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
 * Note: Budget validation is now handled separately in validatePlatformBudgets
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

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates budget configuration for a single platform
 */
export function validateBudgetConfig(
  budget: BudgetConfig | null,
  availableColumns: DataSourceColumn[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Budget is optional - null is valid
  if (!budget) {
    return { valid: true, errors, warnings };
  }

  if (!['daily', 'lifetime', 'shared'].includes(budget.type)) {
    errors.push(`Invalid budget type: ${budget.type}`);
  }
  if (!budget.amountPattern || budget.amountPattern.trim() === '') {
    errors.push('Budget amount pattern is required');
  }
  if (!budget.currency || budget.currency.length !== 3) {
    errors.push('Budget currency must be a 3-letter code (e.g., USD)');
  }

  // Validate variables in budget amount pattern
  if (budget.amountPattern && budget.amountPattern.trim() !== '') {
    const budgetPatternResult = validateVariablesInPattern(
      budget.amountPattern,
      availableColumns
    );
    // Only report variable errors, not empty pattern (already checked)
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
 * Validates a single ad definition
 */
function validateAdDefinition(
  ad: AdDefinition,
  adGroupIndex: number,
  adIndex: number,
  availableColumns: DataSourceColumn[]
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Ad Group ${adGroupIndex + 1}, Ad ${adIndex + 1}`;

  // Headline is required
  if (!ad.headline || ad.headline.trim() === '') {
    errors.push(`${prefix}: Headline is required`);
  } else {
    const headlineResult = validateVariablesInPattern(ad.headline, availableColumns);
    errors.push(...headlineResult.errors.map(e => `${prefix} headline: ${e}`));
  }

  // Description is required
  if (!ad.description || ad.description.trim() === '') {
    errors.push(`${prefix}: Description is required`);
  } else {
    const descResult = validateVariablesInPattern(ad.description, availableColumns);
    errors.push(...descResult.errors.map(e => `${prefix} description: ${e}`));
  }

  // Optional fields validation
  if (ad.displayUrl) {
    const urlResult = validateVariablesInPattern(ad.displayUrl, availableColumns);
    warnings.push(...urlResult.errors.map(e => `${prefix} display URL: ${e}`));
  }

  if (ad.finalUrl) {
    const urlResult = validateVariablesInPattern(ad.finalUrl, availableColumns);
    warnings.push(...urlResult.errors.map(e => `${prefix} final URL: ${e}`));
  }

  return { errors, warnings };
}

/**
 * Validates a single ad group definition
 */
function validateAdGroupDefinition(
  adGroup: AdGroupDefinition,
  adGroupIndex: number,
  availableColumns: DataSourceColumn[]
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Ad Group ${adGroupIndex + 1}`;

  // Validate ad group name pattern
  if (!adGroup.namePattern || adGroup.namePattern.trim() === '') {
    errors.push(`${prefix}: Name pattern is required`);
  } else {
    const patternResult = validateVariablesInPattern(adGroup.namePattern, availableColumns);
    errors.push(...patternResult.errors.map(e => `${prefix} name pattern: ${e}`));
  }

  // Validate that at least one ad exists
  if (!adGroup.ads || adGroup.ads.length === 0) {
    errors.push(`${prefix}: At least one ad is required`);
  } else {
    // Validate each ad
    for (let adIndex = 0; adIndex < adGroup.ads.length; adIndex++) {
      const ad = adGroup.ads[adIndex];
      if (ad) {
        const adValidation = validateAdDefinition(ad, adGroupIndex, adIndex, availableColumns);
        errors.push(...adValidation.errors);
        warnings.push(...adValidation.warnings);
      }
    }
  }

  return { errors, warnings };
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

  // Validate that at least one ad group exists
  if (!config.adGroups || config.adGroups.length === 0) {
    errors.push('At least one ad group is required');
    return { valid: false, errors, warnings };
  }

  // Validate each ad group
  for (let i = 0; i < config.adGroups.length; i++) {
    const adGroup = config.adGroups[i];
    if (adGroup) {
      const adGroupValidation = validateAdGroupDefinition(adGroup, i, availableColumns);
      errors.push(...adGroupValidation.errors);
      warnings.push(...adGroupValidation.warnings);
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
/**
 * Validates ad type selection - at least one ad type must be selected
 */
export function validateAdTypeSelection(
  selectedAdTypes: Record<Platform, string[]>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Count total selected ad types across all platforms
  const totalSelected = Object.values(selectedAdTypes).reduce(
    (sum, adTypes) => sum + (adTypes?.length || 0),
    0
  );

  if (totalSelected === 0) {
    errors.push('At least one ad type must be selected');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates campaign set name.
 * Name is required, must be 3-255 characters after trimming.
 * Description is optional.
 */
export function validateCampaignSetName(state: WizardState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmedName = state.campaignSetName.trim();

  if (!trimmedName) {
    errors.push('Campaign set name is required');
  } else if (trimmedName.length < 3) {
    errors.push('Campaign set name must be at least 3 characters');
  } else if (trimmedName.length > 255) {
    errors.push('Campaign set name must be at most 255 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Creates the initial wizard state with all fields properly initialized.
 * The wizard starts at the campaign-set-name step.
 */
export function createInitialWizardState(): WizardState {
  return {
    campaignSetName: '',
    campaignSetDescription: '',
    currentStep: 'campaign-set-name',
    dataSourceId: null,
    availableColumns: [],
    ruleIds: [],
    inlineRules: [],
    campaignConfig: null,
    selectedAdTypes: { google: [], reddit: [], facebook: [] },
    hierarchyConfig: null,
    threadConfig: null,
    selectedPlatforms: [],
    platformBudgets: { reddit: null, google: null, facebook: null },
    targetingConfig: null,
    generateResult: null,
  };
}

export function validateWizardStep(
  step: WizardStep,
  state: WizardState
): ValidationResult {
  switch (step) {
    case 'campaign-set-name':
      return validateCampaignSetName(state);

    case 'data-source':
      if (!state.dataSourceId) {
        return { valid: false, errors: ['Please select a data source'], warnings: [] };
      }
      return { valid: true, errors: [], warnings: [] };

    case 'campaign-config':
      return validateCampaignConfig(state.campaignConfig, state.availableColumns);

    case 'ad-type':
      return validateAdTypeSelection(state.selectedAdTypes);

    case 'hierarchy':
      return validateHierarchyConfig(state.hierarchyConfig, state.availableColumns);

    case 'rules':
      // Rules are optional
      return { valid: true, errors: [], warnings: [] };

    case 'platform':
      return validatePlatformSelection(state.selectedPlatforms);

    case 'targeting':
      // Targeting is optional - always valid (validation happens in UI)
      return { valid: true, errors: [], warnings: [] };

    case 'preview':
      // Preview requires all previous required steps to be valid
      const campaignSetResult = validateWizardStep('campaign-set-name', state);
      if (!campaignSetResult.valid) return campaignSetResult;

      const dataSourceResult = validateWizardStep('data-source', state);
      if (!dataSourceResult.valid) return dataSourceResult;

      const campaignResult = validateWizardStep('campaign-config', state);
      if (!campaignResult.valid) return campaignResult;

      const adTypeResult = validateWizardStep('ad-type', state);
      if (!adTypeResult.valid) return adTypeResult;

      const hierarchyResult = validateWizardStep('hierarchy', state);
      if (!hierarchyResult.valid) return hierarchyResult;

      const platformResult = validateWizardStep('platform', state);
      if (!platformResult.valid) return platformResult;

      return { valid: true, errors: [], warnings: [] };

    default:
      return { valid: false, errors: [`Unknown step: ${step}`], warnings: [] };
  }
}

// ============================================================================
// Platform Character Limits
// ============================================================================

/**
 * Character limits for different advertising platforms.
 * These are approximate limits - actual limits may vary by ad type.
 * IMPORTANT: Keep in sync with packages/core/src/generation/platform-constraints.ts
 */
export const PLATFORM_LIMITS = {
  google: {
    headline: 30,
    description: 90,
    displayUrl: 30, // path1 (15) + path2 (15) = 30 total
  },
  facebook: {
    headline: 40,
    primaryText: 125,
    description: 30,
  },
  reddit: {
    title: 300,
    text: 500, // Recommended display limit - actual max is 40,000 chars
  },
} as const;

/**
 * Maps common ad field names to platform-specific field names.
 */
const FIELD_MAPPING: Record<Platform, Record<string, string>> = {
  google: {
    headline: 'headline',
    description: 'description',
    displayUrl: 'displayUrl',
  },
  facebook: {
    headline: 'headline',
    description: 'description',
    primaryText: 'primaryText',
  },
  reddit: {
    headline: 'title',
    description: 'text',
    title: 'title',
    text: 'text',
  },
};

export interface CharacterLimitWarning {
  field: string;
  value: string;
  length: number;
  limit: number;
  overflow: number;
  rowIndex?: number;
}

export interface CharacterLimitSummary {
  headlineOverflows: number;
  descriptionOverflows: number;
  displayUrlOverflows: number;
  totalOverflows: number;
  warnings: CharacterLimitWarning[];
}

/**
 * Gets the character limit for a field on a specific platform.
 */
export function getFieldLimit(platform: Platform, field: string): number | undefined {
  const platformLimits = PLATFORM_LIMITS[platform];
  if (!platformLimits) return undefined;

  const mappedField = FIELD_MAPPING[platform]?.[field] ?? field;
  return platformLimits[mappedField as keyof typeof platformLimits] as number | undefined;
}

/**
 * Truncates text to a maximum length, adding ellipsis if truncated.
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  if (maxLength <= 3) {
    return text.slice(0, maxLength);
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Truncates text at word boundary, adding ellipsis if truncated.
 */
export function truncateToWordBoundary(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  if (maxLength <= 3) {
    return text.slice(0, maxLength);
  }
  const targetLength = maxLength - 3;
  const truncated = text.slice(0, targetLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  if (lastSpaceIndex === -1) {
    return truncated + '...';
  }
  return text.slice(0, lastSpaceIndex) + '...';
}

/**
 * Checks character limits for interpolated ad content across sample data.
 * Returns a summary of overflows and warnings.
 */
export function checkCharacterLimits(
  sampleData: Record<string, unknown>[],
  hierarchyConfig: HierarchyConfig,
  platform: Platform
): CharacterLimitSummary {
  const warnings: CharacterLimitWarning[] = [];
  let headlineOverflows = 0;
  let descriptionOverflows = 0;
  let displayUrlOverflows = 0;

  const headlineLimit = getFieldLimit(platform, 'headline');
  const descriptionLimit = getFieldLimit(platform, 'description');
  const displayUrlLimit = getFieldLimit(platform, 'displayUrl');

  for (let rowIndex = 0; rowIndex < sampleData.length; rowIndex++) {
    const row = sampleData[rowIndex];
    if (!row) continue;

    for (const adGroup of hierarchyConfig.adGroups) {
      for (const ad of adGroup.ads) {
        // Check headline
        const interpolatedHeadline = interpolatePattern(ad.headline, row);
        if (headlineLimit && interpolatedHeadline.length > headlineLimit) {
          headlineOverflows++;
          warnings.push({
            field: 'headline',
            value: interpolatedHeadline,
            length: interpolatedHeadline.length,
            limit: headlineLimit,
            overflow: interpolatedHeadline.length - headlineLimit,
            rowIndex,
          });
        }

        // Check description
        const interpolatedDescription = interpolatePattern(ad.description, row);
        if (descriptionLimit && interpolatedDescription.length > descriptionLimit) {
          descriptionOverflows++;
          warnings.push({
            field: 'description',
            value: interpolatedDescription,
            length: interpolatedDescription.length,
            limit: descriptionLimit,
            overflow: interpolatedDescription.length - descriptionLimit,
            rowIndex,
          });
        }

        // Check displayUrl if present
        if (ad.displayUrl) {
          const interpolatedDisplayUrl = interpolatePattern(ad.displayUrl, row);
          if (displayUrlLimit && interpolatedDisplayUrl.length > displayUrlLimit) {
            displayUrlOverflows++;
            warnings.push({
              field: 'displayUrl',
              value: interpolatedDisplayUrl,
              length: interpolatedDisplayUrl.length,
              limit: displayUrlLimit,
              overflow: interpolatedDisplayUrl.length - displayUrlLimit,
              rowIndex,
            });
          }
        }
      }
    }
  }

  return {
    headlineOverflows,
    descriptionOverflows,
    displayUrlOverflows,
    totalOverflows: headlineOverflows + descriptionOverflows + displayUrlOverflows,
    warnings,
  };
}
