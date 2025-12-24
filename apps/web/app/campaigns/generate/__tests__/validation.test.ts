import { describe, it, expect } from 'vitest';
import {
  extractVariables,
  validateVariablesInPattern,
  validateCampaignConfig,
  validateBudgetConfig,
  validateHierarchyConfig,
  validateKeywordConfig,
  validateWizardStep,
  validatePlatformSelection,
  generateId,
  createDefaultAdGroup,
  createDefaultAd,
  type DataSourceColumn,
  type CampaignConfig,
  type BudgetConfig,
  type HierarchyConfig,
  type KeywordConfig,
  type WizardState,
  type AdGroupDefinition,
  type AdDefinition,
} from '../types';

// Test fixtures
const sampleColumns: DataSourceColumn[] = [
  { name: 'brand_name', type: 'string', sampleValues: ['Nike', 'Adidas'] },
  { name: 'product_name', type: 'string', sampleValues: ['Air Max', 'Ultraboost'] },
  { name: 'region', type: 'string', sampleValues: ['US', 'EU'] },
  { name: 'budget', type: 'number', sampleValues: ['100', '200'] },
  { name: 'headline', type: 'string', sampleValues: ['Run Fast', 'Speed Up'] },
  { name: 'description', type: 'string', sampleValues: ['Best shoe', 'Top rated'] },
];

const createInitialState = (): WizardState => ({
  currentStep: 'data-source',
  dataSourceId: null,
  availableColumns: [],
  campaignConfig: null,
  hierarchyConfig: null,
  ruleIds: [],
  inlineRules: [],
  selectedPlatforms: [],
  selectedAdTypes: { google: [], reddit: [], facebook: [] },
  platformBudgets: {},
  threadConfig: null,
  targetingConfig: null,
  generateResult: null,
});

// Helper to create a valid ad group definition
const createValidAdGroup = (): AdGroupDefinition => ({
  id: generateId(),
  namePattern: '{product_name}',
  ads: [{
    id: generateId(),
    headline: '{headline}',
    description: '{description}',
  }],
});

// Helper to create a valid hierarchy config
const createValidHierarchyConfig = (): HierarchyConfig => ({
  adGroups: [createValidAdGroup()],
});

describe('generateId', () => {
  it('generates a unique string', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('generates UUID-like format', () => {
    const id = generateId();
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe('createDefaultAdGroup', () => {
  it('creates an ad group with an id', () => {
    const adGroup = createDefaultAdGroup();
    expect(adGroup.id).toBeTruthy();
  });

  it('creates an ad group with empty name pattern', () => {
    const adGroup = createDefaultAdGroup();
    expect(adGroup.namePattern).toBe('');
  });

  it('creates an ad group with one default ad', () => {
    const adGroup = createDefaultAdGroup();
    expect(adGroup.ads).toHaveLength(1);
    expect(adGroup.ads[0]?.id).toBeTruthy();
    expect(adGroup.ads[0]?.headline).toBe('');
    expect(adGroup.ads[0]?.description).toBe('');
  });
});

describe('createDefaultAd', () => {
  it('creates an ad with an id', () => {
    const ad = createDefaultAd();
    expect(ad.id).toBeTruthy();
  });

  it('creates an ad with empty headline and description', () => {
    const ad = createDefaultAd();
    expect(ad.headline).toBe('');
    expect(ad.description).toBe('');
  });

  it('creates an ad without optional fields', () => {
    const ad = createDefaultAd();
    expect(ad.displayUrl).toBeUndefined();
    expect(ad.finalUrl).toBeUndefined();
    expect(ad.callToAction).toBeUndefined();
  });
});

describe('extractVariables', () => {
  it('extracts single variable from pattern', () => {
    expect(extractVariables('{brand_name}')).toEqual(['brand_name']);
  });

  it('extracts multiple variables from pattern', () => {
    expect(extractVariables('{brand_name}-{region}')).toEqual(['brand_name', 'region']);
  });

  it('extracts variables with default values', () => {
    expect(extractVariables('{brand_name|default}-{region}')).toEqual(['brand_name', 'region']);
  });

  it('handles pattern with no variables', () => {
    expect(extractVariables('static-campaign-name')).toEqual([]);
  });

  it('handles empty pattern', () => {
    expect(extractVariables('')).toEqual([]);
  });

  it('does not duplicate variables', () => {
    expect(extractVariables('{brand_name}-{brand_name}-{region}')).toEqual(['brand_name', 'region']);
  });

  it('handles complex patterns', () => {
    expect(extractVariables('{brand_name}-performance-{product_name}-{region}-launch')).toEqual([
      'brand_name',
      'product_name',
      'region',
    ]);
  });

  it('handles underscores in variable names', () => {
    expect(extractVariables('{product_category_name}')).toEqual(['product_category_name']);
  });

  it('handles numbers in variable names', () => {
    expect(extractVariables('{field1}-{field2}')).toEqual(['field1', 'field2']);
  });
});

describe('validateVariablesInPattern', () => {
  it('returns valid for pattern with existing variables', () => {
    const result = validateVariablesInPattern('{brand_name}-{region}', sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error for pattern with non-existent variable', () => {
    const result = validateVariablesInPattern('{brand_name}-{unknown_field}', sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Variable "{unknown_field}" not found in data source columns');
  });

  it('returns error for empty pattern', () => {
    const result = validateVariablesInPattern('', sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Pattern cannot be empty');
  });

  it('returns error for whitespace-only pattern', () => {
    const result = validateVariablesInPattern('   ', sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Pattern cannot be empty');
  });

  it('returns valid for static pattern', () => {
    const result = validateVariablesInPattern('my-static-campaign', sampleColumns);
    expect(result.valid).toBe(true);
  });

  it('returns multiple errors for multiple invalid variables', () => {
    const result = validateVariablesInPattern('{unknown1}-{unknown2}', sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});

describe('validateCampaignConfig', () => {
  it('returns error when config is null', () => {
    const result = validateCampaignConfig(null, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Campaign configuration is required');
  });

  it('validates valid campaign config without budget', () => {
    const config: CampaignConfig = {
      namePattern: '{brand_name}-performance',

    };
    const result = validateCampaignConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates valid campaign config with budget', () => {
    const config: CampaignConfig = {
      namePattern: '{brand_name}-performance',

      budget: {
        type: 'daily',
        amountPattern: '{budget}',
        currency: 'USD',
      },
    };
    const result = validateCampaignConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
  });

  // Platform validation moved to validatePlatformSelection - test that instead
  it('validates platform selection requires at least one', () => {
    const result = validatePlatformSelection([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one platform must be selected');
  });

  it('returns error for empty name pattern', () => {
    const config: CampaignConfig = {
      namePattern: '',
    };
    const result = validateCampaignConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Pattern cannot be empty');
  });

  it('returns error for invalid variable in name pattern', () => {
    const config: CampaignConfig = {
      namePattern: '{nonexistent_field}',

    };
    const result = validateCampaignConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Variable "{nonexistent_field}" not found in data source columns');
  });

});

describe('validateBudgetConfig', () => {
  it('validates null budget is valid (optional)', () => {
    const result = validateBudgetConfig(null, sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates valid budget config', () => {
    const budget: BudgetConfig = {
      type: 'daily',
      amountPattern: '100',
      currency: 'USD',
    };
    const result = validateBudgetConfig(budget, sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates budget with variable', () => {
    const budget: BudgetConfig = {
      type: 'lifetime',
      amountPattern: '{budget}',
      currency: 'EUR',
    };
    const result = validateBudgetConfig(budget, sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates budget type', () => {
    const budget: BudgetConfig = {
      type: 'invalid' as 'daily' | 'lifetime',
      amountPattern: '100',
      currency: 'USD',
    };
    const result = validateBudgetConfig(budget, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid budget type: invalid');
  });

  it('validates budget amount pattern is required', () => {
    const budget: BudgetConfig = {
      type: 'daily',
      amountPattern: '',
      currency: 'USD',
    };
    const result = validateBudgetConfig(budget, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Budget amount pattern is required');
  });

  it('validates budget currency is 3 letters', () => {
    const budget: BudgetConfig = {
      type: 'daily',
      amountPattern: '100',
      currency: 'US',
    };
    const result = validateBudgetConfig(budget, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Budget currency must be a 3-letter code (e.g., USD)');
  });

  it('validates budget amount variable exists', () => {
    const budget: BudgetConfig = {
      type: 'daily',
      amountPattern: '{nonexistent}',
      currency: 'USD',
    };
    const result = validateBudgetConfig(budget, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Variable "{nonexistent}" not found in data source columns');
  });
});

describe('validateHierarchyConfig', () => {
  it('returns error when config is null', () => {
    const result = validateHierarchyConfig(null, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Hierarchy configuration is required');
  });

  it('returns error when adGroups is empty', () => {
    const config: HierarchyConfig = {
      adGroups: [],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one ad group is required');
  });

  it('validates valid hierarchy config', () => {
    const config = createValidHierarchyConfig();
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates ad group name pattern variables', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{nonexistent}',
        ads: [{
          id: generateId(),
          headline: '{headline}',
          description: '{description}',
        }],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Ad Group 1 name pattern'))).toBe(true);
  });

  it('requires ad group name pattern', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '',
        ads: [{
          id: generateId(),
          headline: '{headline}',
          description: '{description}',
        }],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Ad Group 1: Name pattern is required'))).toBe(true);
  });

  it('requires at least one ad per ad group', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{product_name}',
        ads: [],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('At least one ad is required'))).toBe(true);
  });

  it('requires headline mapping', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{product_name}',
        ads: [{
          id: generateId(),
          headline: '',
          description: '{description}',
        }],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Headline is required'))).toBe(true);
  });

  it('requires description mapping', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{product_name}',
        ads: [{
          id: generateId(),
          headline: '{headline}',
          description: '',
        }],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Description is required'))).toBe(true);
  });

  it('validates headline variable exists', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{product_name}',
        ads: [{
          id: generateId(),
          headline: '{nonexistent}',
          description: '{description}',
        }],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('headline'))).toBe(true);
  });

  it('validates description variable exists', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{product_name}',
        ads: [{
          id: generateId(),
          headline: '{headline}',
          description: '{nonexistent}',
        }],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('description'))).toBe(true);
  });

  it('warns for invalid displayUrl variable but does not fail', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{product_name}',
        ads: [{
          id: generateId(),
          headline: '{headline}',
          description: '{description}',
          displayUrl: '{nonexistent}',
        }],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('display URL'))).toBe(true);
  });

  it('warns for invalid finalUrl variable but does not fail', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{product_name}',
        ads: [{
          id: generateId(),
          headline: '{headline}',
          description: '{description}',
          finalUrl: '{nonexistent}',
        }],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('final URL'))).toBe(true);
  });

  it('validates config with all optional fields', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{product_name}',
        ads: [{
          id: generateId(),
          headline: '{headline}',
          description: '{description}',
          displayUrl: '{brand_name}.com',
          finalUrl: 'https://example.com/{product_name}',
          callToAction: 'Buy Now',
        }],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
  });

  it('validates multiple ad groups', () => {
    const config: HierarchyConfig = {
      adGroups: [
        {
          id: generateId(),
          namePattern: '{product_name}',
          ads: [{
            id: generateId(),
            headline: '{headline}',
            description: '{description}',
          }],
        },
        {
          id: generateId(),
          namePattern: '{brand_name}',
          ads: [{
            id: generateId(),
            headline: '{headline}',
            description: '{description}',
          }],
        },
      ],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
  });

  it('validates multiple ads per ad group', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{product_name}',
        ads: [
          {
            id: generateId(),
            headline: '{headline}',
            description: '{description}',
          },
          {
            id: generateId(),
            headline: '{brand_name} - Sale',
            description: '{description}',
          },
        ],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
  });

  it('reports errors for multiple invalid ads', () => {
    const config: HierarchyConfig = {
      adGroups: [{
        id: generateId(),
        namePattern: '{product_name}',
        ads: [
          {
            id: generateId(),
            headline: '',
            description: '{description}',
          },
          {
            id: generateId(),
            headline: '{headline}',
            description: '',
          },
        ],
      }],
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Ad 1') && e.includes('Headline'))).toBe(true);
    expect(result.errors.some(e => e.includes('Ad 2') && e.includes('Description'))).toBe(true);
  });
});

describe('validateKeywordConfig', () => {
  it('returns valid when config is null (keywords optional)', () => {
    const result = validateKeywordConfig(null, sampleColumns);
    expect(result.valid).toBe(true);
  });

  it('returns valid when config is disabled', () => {
    const config: KeywordConfig = {
      enabled: false,
      rules: [],
    };
    const result = validateKeywordConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
  });

  it('validates enabled config with valid rules', () => {
    const config: KeywordConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule-1',
          name: 'Test Rule',
          scope: 'campaign',
          coreTermPattern: '{product_name}',
          prefixes: ['buy', 'cheap'],
          suffixes: ['online', 'sale'],
          matchTypes: ['broad', 'exact'],
        },
      ],
    };
    const result = validateKeywordConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
  });

  it('returns error for empty core term pattern', () => {
    const config: KeywordConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule-1',
          name: 'Test Rule',
          scope: 'campaign',
          coreTermPattern: '',
          prefixes: [],
          suffixes: [],
          matchTypes: ['broad'],
        },
      ],
    };
    const result = validateKeywordConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Keyword rule 1: Core term pattern is required');
  });

  it('returns error for invalid variable in core term', () => {
    const config: KeywordConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule-1',
          name: 'Test Rule',
          scope: 'campaign',
          coreTermPattern: '{nonexistent}',
          prefixes: [],
          suffixes: [],
          matchTypes: ['broad'],
        },
      ],
    };
    const result = validateKeywordConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Keyword rule 1'))).toBe(true);
  });

  it('returns error for empty match types', () => {
    const config: KeywordConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule-1',
          name: 'Test Rule',
          scope: 'campaign',
          coreTermPattern: '{product_name}',
          prefixes: [],
          suffixes: [],
          matchTypes: [],
        },
      ],
    };
    const result = validateKeywordConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Keyword rule 1: At least one match type is required');
  });

  it('returns error for invalid match type', () => {
    const config: KeywordConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule-1',
          name: 'Test Rule',
          scope: 'campaign',
          coreTermPattern: '{product_name}',
          prefixes: [],
          suffixes: [],
          matchTypes: ['invalid' as 'broad'],
        },
      ],
    };
    const result = validateKeywordConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid match type'))).toBe(true);
  });

  it('validates multiple rules', () => {
    const config: KeywordConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule-1',
          name: 'Rule 1',
          scope: 'campaign',
          coreTermPattern: '{product_name}',
          prefixes: ['buy'],
          suffixes: [],
          matchTypes: ['broad'],
        },
        {
          id: 'rule-2',
          name: 'Rule 2',
          scope: 'ad-group',
          coreTermPattern: '',
          prefixes: [],
          suffixes: [],
          matchTypes: ['exact'],
        },
      ],
    };
    const result = validateKeywordConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Keyword rule 2: Core term pattern is required');
  });

  it('accepts all valid match types', () => {
    const config: KeywordConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule-1',
          name: 'Test Rule',
          scope: 'campaign',
          coreTermPattern: '{product_name}',
          prefixes: [],
          suffixes: [],
          matchTypes: ['broad', 'phrase', 'exact'],
        },
      ],
    };
    const result = validateKeywordConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
  });
});

describe('validateWizardStep', () => {
  describe('data-source step', () => {
    it('returns error when no data source selected', () => {
      const state = createInitialState();
      const result = validateWizardStep('data-source', state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Please select a data source');
    });

    it('returns valid when data source is selected', () => {
      const state = createInitialState();
      state.dataSourceId = 'ds-123';
      const result = validateWizardStep('data-source', state);
      expect(result.valid).toBe(true);
    });
  });

  describe('campaign-config step', () => {
    it('returns error when campaign config is null', () => {
      const state = createInitialState();
      state.availableColumns = sampleColumns;
      const result = validateWizardStep('campaign-config', state);
      expect(result.valid).toBe(false);
    });

    it('returns valid with proper campaign config', () => {
      const state = createInitialState();
      state.availableColumns = sampleColumns;
      state.campaignConfig = {
        namePattern: '{brand_name}-performance',

      };
      const result = validateWizardStep('campaign-config', state);
      expect(result.valid).toBe(true);
    });
  });

  describe('hierarchy step', () => {
    it('returns error when hierarchy config is null', () => {
      const state = createInitialState();
      state.availableColumns = sampleColumns;
      const result = validateWizardStep('hierarchy', state);
      expect(result.valid).toBe(false);
    });

    it('returns valid with proper hierarchy config', () => {
      const state = createInitialState();
      state.availableColumns = sampleColumns;
      state.hierarchyConfig = createValidHierarchyConfig();
      const result = validateWizardStep('hierarchy', state);
      expect(result.valid).toBe(true);
    });
  });

  // NOTE: Keywords step was removed in Phase 6 - keywords are now at ad group level in HierarchyConfig
  // The validateKeywordConfig function still exists for potential future use but is not used in the wizard flow

  describe('rules step', () => {
    it('always returns valid (rules are optional)', () => {
      const state = createInitialState();
      const result = validateWizardStep('rules', state);
      expect(result.valid).toBe(true);
    });
  });

  describe('preview step', () => {
    it('returns error if data source not selected', () => {
      const state = createInitialState();
      const result = validateWizardStep('preview', state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Please select a data source');
    });

    it('returns error if campaign config missing', () => {
      const state = createInitialState();
      state.dataSourceId = 'ds-123';
      state.availableColumns = sampleColumns;
      const result = validateWizardStep('preview', state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Campaign configuration is required');
    });

    it('returns error if hierarchy config missing', () => {
      const state = createInitialState();
      state.dataSourceId = 'ds-123';
      state.availableColumns = sampleColumns;
      state.campaignConfig = {
        namePattern: '{brand_name}',
      };
      // Need to also set ad types since validation checks them before hierarchy
      state.selectedAdTypes = { google: ['responsive-search'], reddit: [], facebook: [] };
      const result = validateWizardStep('preview', state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Hierarchy configuration is required');
    });

    it('returns valid when all required steps are complete', () => {
      const state = createInitialState();
      state.dataSourceId = 'ds-123';
      state.availableColumns = sampleColumns;
      state.campaignConfig = {
        namePattern: '{brand_name}',
      };
      state.hierarchyConfig = createValidHierarchyConfig();
      state.selectedPlatforms = ['google'];
      state.selectedAdTypes = { google: ['responsive-search'], reddit: [], facebook: [] };
      const result = validateWizardStep('preview', state);
      expect(result.valid).toBe(true);
    });
  });
});
