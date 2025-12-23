import { describe, it, expect } from 'vitest';
import {
  extractVariables,
  validateVariablesInPattern,
  validateCampaignConfig,
  validateHierarchyConfig,
  validateKeywordConfig,
  validateWizardStep,
  validatePlatformSelection,
  type DataSourceColumn,
  type CampaignConfig,
  type HierarchyConfig,
  type KeywordConfig,
  type WizardState,
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
  keywordConfig: null,
  ruleIds: [],
  selectedPlatforms: [],
  generateResult: null,
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

  it('validates budget type', () => {
    const config: CampaignConfig = {
      namePattern: '{brand_name}',
      
      budget: {
        type: 'invalid' as 'daily' | 'lifetime',
        amountPattern: '100',
        currency: 'USD',
      },
    };
    const result = validateCampaignConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid budget type: invalid');
  });

  it('validates budget amount pattern is required', () => {
    const config: CampaignConfig = {
      namePattern: '{brand_name}',
      
      budget: {
        type: 'daily',
        amountPattern: '',
        currency: 'USD',
      },
    };
    const result = validateCampaignConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Budget amount pattern is required');
  });

  it('validates budget currency is 3 letters', () => {
    const config: CampaignConfig = {
      namePattern: '{brand_name}',
      
      budget: {
        type: 'daily',
        amountPattern: '100',
        currency: 'US',
      },
    };
    const result = validateCampaignConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Budget currency must be a 3-letter code (e.g., USD)');
  });

  it('validates budget amount variable exists', () => {
    const config: CampaignConfig = {
      namePattern: '{brand_name}',
      
      budget: {
        type: 'daily',
        amountPattern: '{nonexistent}',
        currency: 'USD',
      },
    };
    const result = validateCampaignConfig(config, sampleColumns);
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

  it('validates valid hierarchy config', () => {
    const config: HierarchyConfig = {
      adGroupNamePattern: '{product_name}',
      adMapping: {
        headline: '{headline}',
        description: '{description}',
      },
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates ad group pattern variables', () => {
    const config: HierarchyConfig = {
      adGroupNamePattern: '{nonexistent}',
      adMapping: {
        headline: '{headline}',
        description: '{description}',
      },
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Ad group pattern'))).toBe(true);
  });

  it('requires headline mapping', () => {
    const config: HierarchyConfig = {
      adGroupNamePattern: '{product_name}',
      adMapping: {
        headline: '',
        description: '{description}',
      },
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Ad headline mapping is required');
  });

  it('requires description mapping', () => {
    const config: HierarchyConfig = {
      adGroupNamePattern: '{product_name}',
      adMapping: {
        headline: '{headline}',
        description: '',
      },
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Ad description mapping is required');
  });

  it('validates headline variable exists', () => {
    const config: HierarchyConfig = {
      adGroupNamePattern: '{product_name}',
      adMapping: {
        headline: '{nonexistent}',
        description: '{description}',
      },
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Headline'))).toBe(true);
  });

  it('validates description variable exists', () => {
    const config: HierarchyConfig = {
      adGroupNamePattern: '{product_name}',
      adMapping: {
        headline: '{headline}',
        description: '{nonexistent}',
      },
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Description'))).toBe(true);
  });

  it('warns for invalid displayUrl variable but does not fail', () => {
    const config: HierarchyConfig = {
      adGroupNamePattern: '{product_name}',
      adMapping: {
        headline: '{headline}',
        description: '{description}',
        displayUrl: '{nonexistent}',
      },
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('Display URL'))).toBe(true);
  });

  it('warns for invalid finalUrl variable but does not fail', () => {
    const config: HierarchyConfig = {
      adGroupNamePattern: '{product_name}',
      adMapping: {
        headline: '{headline}',
        description: '{description}',
        finalUrl: '{nonexistent}',
      },
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('Final URL'))).toBe(true);
  });

  it('validates config with all optional fields', () => {
    const config: HierarchyConfig = {
      adGroupNamePattern: '{product_name}',
      adMapping: {
        headline: '{headline}',
        description: '{description}',
        displayUrl: '{brand_name}.com',
        finalUrl: 'https://example.com/{product_name}',
        callToAction: 'Buy Now',
      },
    };
    const result = validateHierarchyConfig(config, sampleColumns);
    expect(result.valid).toBe(true);
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
          coreTermPattern: '{product_name}',
          prefixes: ['buy'],
          suffixes: [],
          matchTypes: ['broad'],
        },
        {
          id: 'rule-2',
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
      state.hierarchyConfig = {
        adGroupNamePattern: '{product_name}',
        adMapping: {
          headline: '{headline}',
          description: '{description}',
        },
      };
      const result = validateWizardStep('hierarchy', state);
      expect(result.valid).toBe(true);
    });
  });

  describe('keywords step', () => {
    it('returns valid when keywords are disabled', () => {
      const state = createInitialState();
      state.availableColumns = sampleColumns;
      const result = validateWizardStep('keywords', state);
      expect(result.valid).toBe(true);
    });

    it('validates enabled keyword config', () => {
      const state = createInitialState();
      state.availableColumns = sampleColumns;
      state.keywordConfig = {
        enabled: true,
        rules: [
          {
            id: 'rule-1',
            coreTermPattern: '{product_name}',
            prefixes: [],
            suffixes: [],
            matchTypes: ['broad'],
          },
        ],
      };
      const result = validateWizardStep('keywords', state);
      expect(result.valid).toBe(true);
    });
  });

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
      state.hierarchyConfig = {
        adGroupNamePattern: '{product_name}',
        adMapping: {
          headline: '{headline}',
          description: '{description}',
        },
      };
      state.selectedPlatforms = ['google'];
      const result = validateWizardStep('preview', state);
      expect(result.valid).toBe(true);
    });
  });
});
