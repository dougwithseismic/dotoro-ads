/**
 * Config Mapper Utility
 *
 * Provides bidirectional mapping between CampaignSet/CampaignSetConfig (database format)
 * and WizardState (frontend format) to enable editing of existing campaign sets.
 */

import type { CampaignSet, CampaignSetConfig } from '../../types';
import type {
  WizardState,
  Platform,
  DataSourceColumn,
  CampaignConfig,
  HierarchyConfig,
  AdGroupDefinition,
  AdDefinition,
  BudgetConfig,
  InlineRule,
  ThreadConfig,
  TargetingConfig,
} from '../types';
import { generateId, createInitialWizardState } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Check if a value is a DataSourceColumn object (has name and type properties)
 */
function isDataSourceColumn(value: unknown): value is DataSourceColumn {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'type' in value
  );
}

/**
 * Check if available columns are in the typed format (DataSourceColumn[])
 */
function isTypedColumns(columns: unknown[]): columns is DataSourceColumn[] {
  return columns.length > 0 && isDataSourceColumn(columns[0]);
}

// ============================================================================
// Map CampaignSet -> WizardState
// ============================================================================

/**
 * Maps a CampaignSet from the database to WizardState for the wizard.
 * This enables loading an existing campaign set into the edit wizard.
 *
 * @param campaignSet - The campaign set from the database
 * @returns A complete WizardState object ready for the wizard
 */
export function mapConfigToWizardState(campaignSet: CampaignSet): WizardState {
  const { config, name, description } = campaignSet;

  // Start with initial state to ensure all fields are present
  const initialState = createInitialWizardState();

  return {
    ...initialState,
    // Campaign set identity
    campaignSetName: name,
    campaignSetDescription: description ?? '',

    // Data source
    dataSourceId: config.dataSourceId,
    availableColumns: mapAvailableColumns(config.availableColumns),

    // Campaign configuration
    campaignConfig: mapCampaignConfig(config.campaignConfig),

    // Hierarchy configuration
    hierarchyConfig: mapHierarchyConfig(config.hierarchyConfig),

    // Platform and budget configuration
    selectedPlatforms: mapPlatforms(config.selectedPlatforms),
    platformBudgets: mapPlatformBudgets(config.platformBudgets),

    // Ad types
    selectedAdTypes: mapSelectedAdTypes(config.selectedAdTypes),

    // Rules
    ruleIds: config.ruleIds ?? [],
    inlineRules: mapInlineRules(config.inlineRules),

    // Targeting
    targetingConfig: config.targetingConfig
      ? (config.targetingConfig as TargetingConfig)
      : null,

    // Thread configuration (for Reddit)
    threadConfig: config.threadConfig
      ? mapThreadConfig(config.threadConfig)
      : null,

    // Reset transient state
    currentStep: 'campaign-set-name',
    generateResult: null,
  };
}

// ============================================================================
// Helper Mapping Functions
// ============================================================================

/**
 * Maps available columns from config format to DataSourceColumn[]
 * Handles both string[] (legacy) and DataSourceColumn[] formats
 */
function mapAvailableColumns(
  columns: string[] | DataSourceColumn[]
): DataSourceColumn[] {
  if (!columns || columns.length === 0) {
    return [];
  }

  if (isTypedColumns(columns)) {
    // Already in typed format, return as-is
    return columns;
  }

  // Convert string array to DataSourceColumn array
  return columns.map((name) => ({
    name: String(name),
    type: 'unknown' as const,
  }));
}

/**
 * Maps campaign config from database format to wizard format
 */
function mapCampaignConfig(
  config: CampaignSetConfig['campaignConfig']
): CampaignConfig {
  return {
    namePattern: config.namePattern,
    ...(config.objective ? { objective: config.objective } : {}),
  };
}

/**
 * Maps hierarchy config, ensuring all ad groups and ads have IDs
 */
function mapHierarchyConfig(
  config: CampaignSetConfig['hierarchyConfig']
): HierarchyConfig {
  return {
    adGroups: config.adGroups.map(mapAdGroupDefinition),
  };
}

/**
 * Maps a single ad group definition, generating ID if missing
 */
function mapAdGroupDefinition(
  adGroup: CampaignSetConfig['hierarchyConfig']['adGroups'][number]
): AdGroupDefinition {
  return {
    id: adGroup.id ?? generateId(),
    namePattern: adGroup.namePattern,
    ...(adGroup.keywords ? { keywords: adGroup.keywords } : {}),
    ads: adGroup.ads.map(mapAdDefinition),
  };
}

/**
 * Maps a single ad definition, generating ID if missing
 */
function mapAdDefinition(
  ad: CampaignSetConfig['hierarchyConfig']['adGroups'][number]['ads'][number]
): AdDefinition {
  return {
    id: ad.id ?? generateId(),
    headline: ad.headline ?? '',
    description: ad.description ?? '',
    ...(ad.headlineFallback ? { headlineFallback: ad.headlineFallback } : {}),
    ...(ad.descriptionFallback
      ? { descriptionFallback: ad.descriptionFallback }
      : {}),
    ...(ad.displayUrl ? { displayUrl: ad.displayUrl } : {}),
    ...(ad.finalUrl ? { finalUrl: ad.finalUrl } : {}),
    ...(ad.callToAction ? { callToAction: ad.callToAction } : {}),
  };
}

/**
 * Maps platform strings to Platform type
 */
function mapPlatforms(platforms: string[]): Platform[] {
  const validPlatforms: Platform[] = ['google', 'reddit', 'facebook'];
  return platforms.filter((p): p is Platform =>
    validPlatforms.includes(p as Platform)
  );
}

/**
 * Maps platform budgets from config to wizard format
 */
function mapPlatformBudgets(
  budgets?: Record<string, BudgetConfig | null>
): Record<Platform, BudgetConfig | null> {
  return {
    google: budgets?.google ?? null,
    reddit: budgets?.reddit ?? null,
    facebook: budgets?.facebook ?? null,
  };
}

/**
 * Maps selected ad types from config to wizard format
 */
function mapSelectedAdTypes(
  adTypes: Record<string, string[]>
): Record<Platform, string[]> {
  return {
    google: adTypes.google ?? [],
    reddit: adTypes.reddit ?? [],
    facebook: adTypes.facebook ?? [],
  };
}

/**
 * Maps inline rules, handling both legacy and enhanced formats
 */
function mapInlineRules(rules?: unknown[]): InlineRule[] {
  if (!rules || !Array.isArray(rules)) {
    return [];
  }

  return rules.map((rule) => {
    // Type guard for enhanced format
    if (
      typeof rule === 'object' &&
      rule !== null &&
      'id' in rule &&
      'conditions' in rule &&
      'actions' in rule
    ) {
      return rule as InlineRule;
    }

    // Legacy format - convert to enhanced format
    const legacyRule = rule as {
      field?: string;
      operator?: string;
      value?: unknown;
      enabled?: boolean;
    };

    return {
      id: generateId(),
      name: `Rule on ${legacyRule.field ?? 'unknown'}`,
      enabled: legacyRule.enabled ?? true,
      logic: 'AND' as const,
      conditions: [
        {
          id: generateId(),
          field: legacyRule.field ?? '',
          operator: legacyRule.operator ?? 'equals',
          value: String(legacyRule.value ?? ''),
        },
      ],
      actions: [],
    };
  });
}

/**
 * Maps thread config for Reddit
 */
function mapThreadConfig(
  config: CampaignSetConfig['threadConfig']
): ThreadConfig | null {
  if (!config) {
    return null;
  }

  // Ensure required fields have valid defaults
  const postType = config.post.type || 'text';
  const subreddit = config.post.subreddit || '';

  return {
    post: {
      title: config.post.title,
      body: config.post.body,
      url: config.post.url,
      type: postType as 'text' | 'link' | 'image' | 'video',
      subreddit,
      flair: config.post.flair,
      nsfw: config.post.nsfw,
      spoiler: config.post.spoiler,
      sendReplies: config.post.sendReplies,
    },
    // Map comments with all required fields
    // Handle both field names: authorPersonaId (database schema) and persona (legacy/direct)
    comments: (config.comments ?? []).map((c, index) => ({
      id: c.id ?? generateId(),
      body: c.body ?? '',
      parentId: c.parentId,
      persona: (c as { persona?: string }).persona ?? c.authorPersonaId ?? 'op',
      depth: c.depth ?? 0,
      sortOrder: index,
    })),
    // Map personas with all required fields
    personas: (config.personas ?? []).map((p) => ({
      id: p.id ?? generateId(),
      name: p.name ?? 'Unknown',
      description: '',
      role: 'op' as const,
    })),
  };
}

// ============================================================================
// Map WizardState -> CampaignSetConfig (for updates)
// ============================================================================

/**
 * Maps WizardState back to CampaignSetConfig for API updates.
 * This is used when saving changes from the edit wizard.
 *
 * @param state - The current wizard state
 * @returns A CampaignSetConfig object for API submission
 */
export function mapWizardStateToConfig(state: WizardState): CampaignSetConfig {
  // Convert DataSourceColumn[] back to the format expected by CampaignSetConfig
  const columnsForConfig = state.availableColumns.map(col => ({
    name: col.name,
    type: col.type,
    ...(col.sampleValues ? { sampleValues: col.sampleValues } : {}),
  }));

  // Convert TargetingConfig to a plain object for CampaignSetConfig
  const targetingConfigForApi = state.targetingConfig
    ? (JSON.parse(JSON.stringify(state.targetingConfig)) as CampaignSetConfig['targetingConfig'])
    : undefined;

  // Convert ThreadConfig to CampaignSetConfig format
  const threadConfigForApi: CampaignSetConfig['threadConfig'] = state.threadConfig
    ? {
        post: {
          title: state.threadConfig.post.title,
          body: state.threadConfig.post.body ?? '',
          url: state.threadConfig.post.url,
          type: state.threadConfig.post.type,
          subreddit: state.threadConfig.post.subreddit,
          flair: state.threadConfig.post.flair,
          nsfw: state.threadConfig.post.nsfw,
          spoiler: state.threadConfig.post.spoiler,
          sendReplies: state.threadConfig.post.sendReplies,
        },
        comments: state.threadConfig.comments.map(c => ({
          id: c.id,
          body: c.body,
          parentId: c.parentId ?? undefined,
          authorPersonaId: c.persona,
          depth: c.depth,
        })),
        personas: state.threadConfig.personas.map(p => ({
          id: p.id,
          name: p.name,
        })),
      }
    : undefined;

  return {
    dataSourceId: state.dataSourceId ?? '',
    availableColumns: columnsForConfig,
    selectedPlatforms: state.selectedPlatforms,
    selectedAdTypes: state.selectedAdTypes,
    campaignConfig: state.campaignConfig ?? { namePattern: '' },
    hierarchyConfig: state.hierarchyConfig ?? { adGroups: [] },
    generatedAt: new Date().toISOString(),
    rowCount: 0, // Will be updated during regeneration
    campaignCount: 0, // Will be updated during regeneration

    // Optional fields
    ...(state.platformBudgets &&
    Object.values(state.platformBudgets).some((b) => b !== null)
      ? { platformBudgets: state.platformBudgets }
      : {}),
    ...(targetingConfigForApi ? { targetingConfig: targetingConfigForApi } : {}),
    ...(state.ruleIds.length > 0 ? { ruleIds: state.ruleIds } : {}),
    ...(state.inlineRules.length > 0 ? { inlineRules: state.inlineRules } : {}),
    ...(threadConfigForApi ? { threadConfig: threadConfigForApi } : {}),
  };
}
