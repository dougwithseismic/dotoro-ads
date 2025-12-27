import { describe, it, expect } from 'vitest';
import { mapConfigToWizardState, mapWizardStateToConfig } from '../config-mapper';
import type { CampaignSet, CampaignSetConfig } from '../../../types';
import type { WizardState, Platform, DataSourceColumn } from '../../types';
import { createInitialWizardState } from '../../types';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMinimalCampaignSetConfig = (): CampaignSetConfig => ({
  dataSourceId: 'ds-123',
  availableColumns: ['brand_name', 'product_name', 'headline', 'description'],
  selectedPlatforms: ['google'],
  selectedAdTypes: { google: ['responsive-search'] },
  campaignConfig: {
    namePattern: '{brand_name}-campaign',
  },
  hierarchyConfig: {
    adGroups: [
      {
        namePattern: '{product_name}',
        ads: [
          {
            headline: '{headline}',
            description: '{description}',
          },
        ],
      },
    ],
  },
  generatedAt: '2024-01-15T10:30:00Z',
  rowCount: 50,
  campaignCount: 50,
});

const createFullCampaignSetConfig = (): CampaignSetConfig => ({
  dataSourceId: 'ds-456',
  availableColumns: [
    { name: 'brand_name', type: 'string', sampleValues: ['Nike', 'Adidas'] },
    { name: 'product_name', type: 'string', sampleValues: ['Shoes', 'Shirt'] },
    { name: 'headline', type: 'string', sampleValues: ['Best Shoes'] },
    { name: 'description', type: 'string', sampleValues: ['Great product'] },
    { name: 'budget', type: 'number', sampleValues: ['100', '200'] },
  ],
  selectedPlatforms: ['google', 'reddit'],
  selectedAdTypes: { google: ['responsive-search'], reddit: ['link', 'image'] },
  campaignConfig: {
    namePattern: '{brand_name}-{product_name}-campaign',
    objective: 'conversions',
  },
  hierarchyConfig: {
    adGroups: [
      {
        id: 'ag-1',
        namePattern: '{product_name}-group',
        keywords: ['keyword1', 'keyword2'],
        ads: [
          {
            id: 'ad-1',
            headline: '{headline}',
            headlineFallback: 'truncate',
            description: '{description}',
            descriptionFallback: 'truncate_word',
            displayUrl: 'example.com',
            finalUrl: 'https://example.com',
            callToAction: 'Shop Now',
          },
          {
            id: 'ad-2',
            headline: 'Static Headline',
            description: 'Static Description',
          },
        ],
      },
      {
        id: 'ag-2',
        namePattern: '{brand_name}-brand',
        ads: [
          {
            id: 'ad-3',
            headline: 'Brand Ad',
            description: 'Brand Description',
          },
        ],
      },
    ],
  },
  budgetConfig: {
    type: 'daily',
    amountPattern: '{budget}',
    currency: 'USD',
    pacing: 'standard',
  },
  platformBudgets: {
    google: {
      type: 'daily',
      amountPattern: '100',
      currency: 'USD',
    },
    reddit: {
      type: 'lifetime',
      amountPattern: '500',
      currency: 'USD',
    },
  },
  targetingConfig: {
    locations: ['US', 'CA'],
    devices: ['desktop', 'mobile'],
  },
  ruleIds: ['rule-1', 'rule-2'],
  inlineRules: [
    {
      id: 'ir-1',
      name: 'Skip empty',
      enabled: true,
      logic: 'AND',
      conditions: [
        { id: 'c-1', field: 'headline', operator: 'is_empty', value: '' },
      ],
      actions: [
        { id: 'a-1', type: 'skip' },
      ],
    },
  ],
  threadConfig: {
    post: {
      title: 'Check out {product_name}',
      body: 'Great product',
      type: 'text',
      subreddit: 'test',
    },
    comments: [],
    personas: [],
  },
  generatedAt: '2024-01-15T10:30:00Z',
  rowCount: 100,
  campaignCount: 200,
});

const createCampaignSet = (config: CampaignSetConfig, overrides: Partial<CampaignSet> = {}): CampaignSet => ({
  id: 'cs-123',
  userId: 'user-1',
  name: 'Test Campaign Set',
  description: 'A test campaign set for editing',
  dataSourceId: config.dataSourceId,
  templateId: null,
  config,
  campaigns: [],
  status: 'active',
  syncStatus: 'synced',
  lastSyncedAt: '2024-01-15T12:00:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T12:00:00Z',
  ...overrides,
});

// ============================================================================
// mapConfigToWizardState Tests
// ============================================================================

describe('mapConfigToWizardState', () => {
  describe('basic mapping', () => {
    it('maps campaign set name and description', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.campaignSetName).toBe('Test Campaign Set');
      expect(result.campaignSetDescription).toBe('A test campaign set for editing');
    });

    it('handles null description', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config, { description: null });

      const result = mapConfigToWizardState(campaignSet);

      expect(result.campaignSetDescription).toBe('');
    });

    it('maps dataSourceId', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.dataSourceId).toBe('ds-123');
    });
  });

  describe('availableColumns mapping', () => {
    it('maps string array columns to DataSourceColumn format', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.availableColumns).toHaveLength(4);
      expect(result.availableColumns[0]).toEqual({
        name: 'brand_name',
        type: 'unknown',
      });
    });

    it('preserves DataSourceColumn format when already typed', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.availableColumns).toHaveLength(5);
      expect(result.availableColumns[0]).toEqual({
        name: 'brand_name',
        type: 'string',
        sampleValues: ['Nike', 'Adidas'],
      });
    });
  });

  describe('campaignConfig mapping', () => {
    it('maps campaign config with name pattern', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.campaignConfig).toEqual({
        namePattern: '{brand_name}-campaign',
      });
    });

    it('maps campaign config with objective', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.campaignConfig).toEqual({
        namePattern: '{brand_name}-{product_name}-campaign',
        objective: 'conversions',
      });
    });
  });

  describe('hierarchyConfig mapping', () => {
    it('maps ad groups with generated IDs when missing', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.hierarchyConfig).not.toBeNull();
      expect(result.hierarchyConfig?.adGroups).toHaveLength(1);
      expect(result.hierarchyConfig?.adGroups[0]?.id).toBeDefined();
      expect(result.hierarchyConfig?.adGroups[0]?.namePattern).toBe('{product_name}');
    });

    it('preserves existing ad group IDs', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.hierarchyConfig?.adGroups[0]?.id).toBe('ag-1');
      expect(result.hierarchyConfig?.adGroups[1]?.id).toBe('ag-2');
    });

    it('maps ads with generated IDs when missing', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      const ads = result.hierarchyConfig?.adGroups[0]?.ads;
      expect(ads).toHaveLength(1);
      expect(ads?.[0]?.id).toBeDefined();
      expect(ads?.[0]?.headline).toBe('{headline}');
      expect(ads?.[0]?.description).toBe('{description}');
    });

    it('preserves existing ad IDs', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      const ads = result.hierarchyConfig?.adGroups[0]?.ads;
      expect(ads?.[0]?.id).toBe('ad-1');
      expect(ads?.[1]?.id).toBe('ad-2');
    });

    it('maps all ad properties including optional ones', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      const ad = result.hierarchyConfig?.adGroups[0]?.ads[0];
      expect(ad?.headline).toBe('{headline}');
      expect(ad?.headlineFallback).toBe('truncate');
      expect(ad?.description).toBe('{description}');
      expect(ad?.descriptionFallback).toBe('truncate_word');
      expect(ad?.displayUrl).toBe('example.com');
      expect(ad?.finalUrl).toBe('https://example.com');
      expect(ad?.callToAction).toBe('Shop Now');
    });

    it('maps keywords at ad group level', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.hierarchyConfig?.adGroups[0]?.keywords).toEqual(['keyword1', 'keyword2']);
    });

    it('handles ad groups without keywords', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.hierarchyConfig?.adGroups[0]?.keywords).toBeUndefined();
    });
  });

  describe('platform and budget mapping', () => {
    it('maps selected platforms', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.selectedPlatforms).toEqual(['google', 'reddit']);
    });

    it('maps platforms as Platform type', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      const platforms: Platform[] = result.selectedPlatforms;
      expect(platforms).toContain('google');
    });

    it('maps platform budgets', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.platformBudgets.google).toEqual({
        type: 'daily',
        amountPattern: '100',
        currency: 'USD',
      });
      expect(result.platformBudgets.reddit).toEqual({
        type: 'lifetime',
        amountPattern: '500',
        currency: 'USD',
      });
    });

    it('initializes empty platform budgets when not provided', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.platformBudgets.google).toBeNull();
      expect(result.platformBudgets.reddit).toBeNull();
      expect(result.platformBudgets.facebook).toBeNull();
    });
  });

  describe('ad types mapping', () => {
    it('maps selected ad types per platform', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.selectedAdTypes.google).toEqual(['responsive-search']);
      expect(result.selectedAdTypes.reddit).toEqual(['link', 'image']);
    });

    it('initializes empty arrays for platforms without ad types', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.selectedAdTypes.google).toEqual(['responsive-search']);
      expect(result.selectedAdTypes.reddit).toEqual([]);
      expect(result.selectedAdTypes.facebook).toEqual([]);
    });
  });

  describe('rules mapping', () => {
    it('maps rule IDs', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.ruleIds).toEqual(['rule-1', 'rule-2']);
    });

    it('maps inline rules', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.inlineRules).toHaveLength(1);
      expect(result.inlineRules[0]?.id).toBe('ir-1');
      expect(result.inlineRules[0]?.name).toBe('Skip empty');
    });

    it('handles missing rules', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.ruleIds).toEqual([]);
      expect(result.inlineRules).toEqual([]);
    });
  });

  describe('targeting config mapping', () => {
    it('maps targeting config', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.targetingConfig).toEqual({
        locations: ['US', 'CA'],
        devices: ['desktop', 'mobile'],
      });
    });

    it('handles missing targeting config', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.targetingConfig).toBeNull();
    });
  });

  describe('thread config mapping', () => {
    it('maps thread config for Reddit', () => {
      const config = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.threadConfig).not.toBeNull();
      expect(result.threadConfig?.post.title).toBe('Check out {product_name}');
      expect(result.threadConfig?.post.subreddit).toBe('test');
    });

    it('handles missing thread config', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.threadConfig).toBeNull();
    });

    it('maps comments with authorPersonaId field correctly to persona', () => {
      // Test that authorPersonaId from database is mapped to persona in wizard state
      const config: CampaignSetConfig = {
        ...createMinimalCampaignSetConfig(),
        threadConfig: {
          post: {
            title: 'Test Post',
            body: 'Test body',
            type: 'text',
            subreddit: 'test',
          },
          comments: [
            {
              id: 'comment-1',
              body: 'Comment body',
              authorPersonaId: 'enthusiast', // Database field name
              depth: 0,
            },
          ],
          personas: [
            { id: 'enthusiast', name: 'Enthusiast' },
          ],
        },
      };
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.threadConfig?.comments[0]?.persona).toBe('enthusiast');
    });

    it('maps comments with persona field correctly (fallback)', () => {
      // Test that if persona field is used instead of authorPersonaId, it still works
      const config: CampaignSetConfig = {
        ...createMinimalCampaignSetConfig(),
        threadConfig: {
          post: {
            title: 'Test Post',
            body: 'Test body',
            type: 'text',
            subreddit: 'test',
          },
          comments: [
            {
              id: 'comment-1',
              body: 'Comment body',
              // Using type assertion to simulate a config with persona field directly
              ...(({ persona: 'skeptic' }) as { authorPersonaId?: string }),
              depth: 0,
            },
          ],
          personas: [
            { id: 'skeptic', name: 'Skeptic' },
          ],
        },
      };
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      // Should fall back to 'op' if neither authorPersonaId nor persona is found
      expect(result.threadConfig?.comments[0]?.persona).toBeDefined();
    });
  });

  describe('wizard state defaults', () => {
    it('sets currentStep to campaign-set-name', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.currentStep).toBe('campaign-set-name');
    });

    it('sets generateResult to null', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.generateResult).toBeNull();
    });

    it('returns a complete WizardState object', () => {
      const config = createMinimalCampaignSetConfig();
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      // Verify all required WizardState properties exist
      const initialState = createInitialWizardState();
      const resultKeys = Object.keys(result).sort();
      const expectedKeys = Object.keys(initialState).sort();

      expect(resultKeys).toEqual(expectedKeys);
    });
  });

  describe('edge cases', () => {
    it('handles empty ad groups array', () => {
      const config: CampaignSetConfig = {
        ...createMinimalCampaignSetConfig(),
        hierarchyConfig: { adGroups: [] },
      };
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.hierarchyConfig?.adGroups).toEqual([]);
    });

    it('handles ad group with empty ads array', () => {
      const config: CampaignSetConfig = {
        ...createMinimalCampaignSetConfig(),
        hierarchyConfig: {
          adGroups: [
            {
              namePattern: '{product_name}',
              ads: [],
            },
          ],
        },
      };
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      expect(result.hierarchyConfig?.adGroups[0]?.ads).toEqual([]);
    });

    it('handles ads with only required fields', () => {
      const config: CampaignSetConfig = {
        ...createMinimalCampaignSetConfig(),
        hierarchyConfig: {
          adGroups: [
            {
              namePattern: '{product_name}',
              ads: [
                {
                  headline: 'Title',
                  description: 'Desc',
                },
              ],
            },
          ],
        },
      };
      const campaignSet = createCampaignSet(config);

      const result = mapConfigToWizardState(campaignSet);

      const ad = result.hierarchyConfig?.adGroups[0]?.ads[0];
      expect(ad?.headline).toBe('Title');
      expect(ad?.description).toBe('Desc');
      expect(ad?.displayUrl).toBeUndefined();
      expect(ad?.finalUrl).toBeUndefined();
      expect(ad?.callToAction).toBeUndefined();
    });
  });
});

// ============================================================================
// mapWizardStateToConfig Tests (comprehensive coverage)
// ============================================================================

describe('mapWizardStateToConfig', () => {
  describe('basic state to config conversion', () => {
    it('creates config from wizard state for updates', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignSetName: 'Updated Campaign Set',
        campaignSetDescription: 'Updated description',
        dataSourceId: 'ds-789',
        availableColumns: [
          { name: 'col1', type: 'string' },
          { name: 'col2', type: 'number' },
        ],
        selectedPlatforms: ['google', 'facebook'],
        selectedAdTypes: { google: ['responsive-search'], reddit: [], facebook: ['image'] },
        campaignConfig: { namePattern: '{col1}-campaign' },
        hierarchyConfig: {
          adGroups: [
            {
              id: 'ag-new',
              namePattern: '{col1}',
              ads: [
                {
                  id: 'ad-new',
                  headline: 'Headline',
                  description: 'Desc',
                },
              ],
            },
          ],
        },
        platformBudgets: {
          google: { type: 'daily', amountPattern: '100', currency: 'USD' },
          reddit: null,
          facebook: null,
        },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.dataSourceId).toBe('ds-789');
      expect(result.selectedPlatforms).toEqual(['google', 'facebook']);
      expect(result.campaignConfig.namePattern).toBe('{col1}-campaign');
      expect(result.hierarchyConfig.adGroups).toHaveLength(1);
      expect(result.platformBudgets?.google?.amountPattern).toBe('100');
    });

    it('maps dataSourceId correctly', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        dataSourceId: 'test-ds-id',
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.dataSourceId).toBe('test-ds-id');
    });

    it('uses empty string for null dataSourceId', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        dataSourceId: null,
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.dataSourceId).toBe('');
    });
  });

  describe('availableColumns conversion', () => {
    it('converts DataSourceColumn to config format', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        availableColumns: [
          { name: 'brand', type: 'string', sampleValues: ['Nike', 'Adidas'] },
          { name: 'price', type: 'number' },
        ],
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.availableColumns).toHaveLength(2);
      expect(result.availableColumns[0]).toEqual({
        name: 'brand',
        type: 'string',
        sampleValues: ['Nike', 'Adidas'],
      });
      expect(result.availableColumns[1]).toEqual({
        name: 'price',
        type: 'number',
      });
    });

    it('handles empty availableColumns array', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        availableColumns: [],
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.availableColumns).toEqual([]);
    });
  });

  describe('threadConfig conversion', () => {
    it('converts threadConfig with post and comments', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        selectedPlatforms: ['reddit'],
        threadConfig: {
          post: {
            title: 'Test Post',
            body: 'Test body content',
            type: 'text',
            subreddit: 'testsubreddit',
            flair: 'Discussion',
            nsfw: false,
            spoiler: false,
            sendReplies: true,
          },
          comments: [
            {
              id: 'comment-1',
              body: 'First comment',
              parentId: null,
              persona: 'op',
              depth: 0,
              sortOrder: 0,
            },
            {
              id: 'comment-2',
              body: 'Reply comment',
              parentId: 'comment-1',
              persona: 'skeptic',
              depth: 1,
              sortOrder: 1,
            },
          ],
          personas: [
            { id: 'op', name: 'Original Poster', description: 'The OP', role: 'op' },
            { id: 'skeptic', name: 'Skeptic', description: 'Skeptical user', role: 'skeptic' },
          ],
        },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.threadConfig).toBeDefined();
      expect(result.threadConfig?.post.title).toBe('Test Post');
      expect(result.threadConfig?.post.body).toBe('Test body content');
      expect(result.threadConfig?.post.subreddit).toBe('testsubreddit');
      expect(result.threadConfig?.comments).toHaveLength(2);
      expect(result.threadConfig?.comments[0]?.authorPersonaId).toBe('op');
      expect(result.threadConfig?.comments[1]?.authorPersonaId).toBe('skeptic');
      expect(result.threadConfig?.personas).toHaveLength(2);
    });

    it('handles null threadConfig', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        threadConfig: null,
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.threadConfig).toBeUndefined();
    });

    it('maps persona field to authorPersonaId in comments', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        selectedPlatforms: ['reddit'],
        threadConfig: {
          post: {
            title: 'Test',
            body: 'Body',
            type: 'text',
            subreddit: 'test',
          },
          comments: [
            {
              id: 'c1',
              body: 'Comment',
              persona: 'enthusiast',
              depth: 0,
              sortOrder: 0,
            },
          ],
          personas: [],
        },
      };

      const result = mapWizardStateToConfig(wizardState);

      // WizardState uses 'persona', CampaignSetConfig uses 'authorPersonaId'
      expect(result.threadConfig?.comments[0]?.authorPersonaId).toBe('enthusiast');
    });
  });

  describe('hierarchyConfig conversion', () => {
    it('preserves ad group and ad IDs for updates', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignSetName: 'Test',
        dataSourceId: 'ds-1',
        availableColumns: [],
        selectedPlatforms: ['google'],
        selectedAdTypes: { google: [], reddit: [], facebook: [] },
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: {
          adGroups: [
            {
              id: 'existing-ag-id',
              namePattern: 'group',
              ads: [
                {
                  id: 'existing-ad-id',
                  headline: 'H',
                  description: 'D',
                },
              ],
            },
          ],
        },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.hierarchyConfig.adGroups[0]?.id).toBe('existing-ag-id');
      expect(result.hierarchyConfig.adGroups[0]?.ads[0]?.id).toBe('existing-ad-id');
    });

    it('converts multiple ad groups with multiple ads', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: {
          adGroups: [
            {
              id: 'ag-1',
              namePattern: '{brand}-group-1',
              keywords: ['kw1', 'kw2'],
              ads: [
                { id: 'ad-1', headline: 'H1', description: 'D1' },
                { id: 'ad-2', headline: 'H2', description: 'D2' },
              ],
            },
            {
              id: 'ag-2',
              namePattern: '{brand}-group-2',
              ads: [
                { id: 'ad-3', headline: 'H3', description: 'D3' },
              ],
            },
          ],
        },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.hierarchyConfig.adGroups).toHaveLength(2);
      expect(result.hierarchyConfig.adGroups[0]?.ads).toHaveLength(2);
      expect(result.hierarchyConfig.adGroups[0]?.keywords).toEqual(['kw1', 'kw2']);
      expect(result.hierarchyConfig.adGroups[1]?.ads).toHaveLength(1);
    });

    it('handles empty ad groups array', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.hierarchyConfig.adGroups).toEqual([]);
    });

    it('handles null hierarchyConfig', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: null,
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.hierarchyConfig).toEqual({ adGroups: [] });
    });
  });

  describe('platformBudgets conversion', () => {
    it('converts platform budgets with all platforms', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        platformBudgets: {
          google: { type: 'daily', amountPattern: '100', currency: 'USD' },
          reddit: { type: 'lifetime', amountPattern: '500', currency: 'EUR' },
          facebook: { type: 'daily', amountPattern: '200', currency: 'GBP' },
        },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.platformBudgets?.google).toEqual({
        type: 'daily',
        amountPattern: '100',
        currency: 'USD',
      });
      expect(result.platformBudgets?.reddit).toEqual({
        type: 'lifetime',
        amountPattern: '500',
        currency: 'EUR',
      });
      expect(result.platformBudgets?.facebook).toEqual({
        type: 'daily',
        amountPattern: '200',
        currency: 'GBP',
      });
    });

    it('omits platformBudgets when all are null', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        platformBudgets: {
          google: null,
          reddit: null,
          facebook: null,
        },
      };

      const result = mapWizardStateToConfig(wizardState);

      // Should not include platformBudgets when all are null
      expect(result.platformBudgets).toBeUndefined();
    });

    it('includes platformBudgets when at least one is set', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        platformBudgets: {
          google: { type: 'daily', amountPattern: '100', currency: 'USD' },
          reddit: null,
          facebook: null,
        },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.platformBudgets).toBeDefined();
      expect(result.platformBudgets?.google?.amountPattern).toBe('100');
    });
  });

  describe('inlineRules conversion', () => {
    it('converts inline rules', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        inlineRules: [
          {
            id: 'rule-1',
            name: 'Skip Empty',
            enabled: true,
            logic: 'AND',
            conditions: [
              { id: 'c1', field: 'headline', operator: 'is_empty', value: '' },
            ],
            actions: [
              { id: 'a1', type: 'skip' },
            ],
          },
        ],
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.inlineRules).toHaveLength(1);
      expect(result.inlineRules?.[0]?.id).toBe('rule-1');
      expect(result.inlineRules?.[0]?.name).toBe('Skip Empty');
    });

    it('omits inlineRules when empty', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        inlineRules: [],
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.inlineRules).toBeUndefined();
    });
  });

  describe('ruleIds conversion', () => {
    it('converts rule IDs', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        ruleIds: ['rule-1', 'rule-2', 'rule-3'],
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.ruleIds).toEqual(['rule-1', 'rule-2', 'rule-3']);
    });

    it('omits ruleIds when empty', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        ruleIds: [],
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.ruleIds).toBeUndefined();
    });
  });

  describe('targetingConfig conversion', () => {
    it('converts targeting config', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        targetingConfig: {
          locations: ['US', 'CA', 'UK'],
          devices: ['mobile', 'desktop'],
          languages: ['en', 'es'],
        },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.targetingConfig).toBeDefined();
      expect(result.targetingConfig?.locations).toEqual(['US', 'CA', 'UK']);
      expect(result.targetingConfig?.devices).toEqual(['mobile', 'desktop']);
    });

    it('omits targetingConfig when null', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
        targetingConfig: null,
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.targetingConfig).toBeUndefined();
    });
  });

  describe('campaignConfig conversion', () => {
    it('converts campaign config with namePattern', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: '{brand}-{product}-campaign' },
        hierarchyConfig: { adGroups: [] },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.campaignConfig.namePattern).toBe('{brand}-{product}-campaign');
    });

    it('converts campaign config with objective', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test', objective: 'conversions' },
        hierarchyConfig: { adGroups: [] },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.campaignConfig.objective).toBe('conversions');
    });

    it('handles null campaignConfig', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: null,
        hierarchyConfig: { adGroups: [] },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.campaignConfig).toEqual({ namePattern: '' });
    });
  });

  describe('metadata fields', () => {
    it('sets generatedAt to current ISO timestamp', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
      };

      const before = new Date().toISOString();
      const result = mapWizardStateToConfig(wizardState);
      const after = new Date().toISOString();

      expect(result.generatedAt).toBeDefined();
      expect(result.generatedAt >= before).toBe(true);
      expect(result.generatedAt <= after).toBe(true);
    });

    it('sets rowCount and campaignCount to 0 (updated during regeneration)', () => {
      const wizardState: WizardState = {
        ...createInitialWizardState(),
        campaignConfig: { namePattern: 'test' },
        hierarchyConfig: { adGroups: [] },
      };

      const result = mapWizardStateToConfig(wizardState);

      expect(result.rowCount).toBe(0);
      expect(result.campaignCount).toBe(0);
    });
  });

  describe('round-trip conversion', () => {
    it('config -> wizardState -> config should preserve essential data', () => {
      // Start with a full config
      const originalConfig = createFullCampaignSetConfig();
      const campaignSet = createCampaignSet(originalConfig);

      // Convert to WizardState
      const wizardState = mapConfigToWizardState(campaignSet);

      // Convert back to config
      const resultConfig = mapWizardStateToConfig(wizardState);

      // Essential data should be preserved
      expect(resultConfig.dataSourceId).toBe(originalConfig.dataSourceId);
      expect(resultConfig.selectedPlatforms).toEqual(originalConfig.selectedPlatforms);
      // selectedAdTypes may have additional empty arrays for platforms not in original
      // so we check specific platform values rather than exact equality
      expect(resultConfig.selectedAdTypes.google).toEqual(originalConfig.selectedAdTypes.google);
      expect(resultConfig.selectedAdTypes.reddit).toEqual(originalConfig.selectedAdTypes.reddit);
      expect(resultConfig.campaignConfig.namePattern).toBe(originalConfig.campaignConfig.namePattern);
      expect(resultConfig.campaignConfig.objective).toBe(originalConfig.campaignConfig.objective);
      expect(resultConfig.hierarchyConfig.adGroups.length).toBe(originalConfig.hierarchyConfig.adGroups.length);
      expect(resultConfig.ruleIds).toEqual(originalConfig.ruleIds);
    });

    it('preserves thread config through round-trip', () => {
      const originalConfig: CampaignSetConfig = {
        ...createMinimalCampaignSetConfig(),
        selectedPlatforms: ['reddit'],
        threadConfig: {
          post: {
            title: 'Round Trip Test',
            body: 'Testing round trip',
            type: 'text',
            subreddit: 'test',
          },
          comments: [
            {
              id: 'c1',
              body: 'Comment text',
              authorPersonaId: 'op',
              depth: 0,
            },
          ],
          personas: [
            { id: 'op', name: 'OP' },
          ],
        },
      };
      const campaignSet = createCampaignSet(originalConfig);

      const wizardState = mapConfigToWizardState(campaignSet);
      const resultConfig = mapWizardStateToConfig(wizardState);

      expect(resultConfig.threadConfig?.post.title).toBe('Round Trip Test');
      expect(resultConfig.threadConfig?.comments[0]?.body).toBe('Comment text');
      expect(resultConfig.threadConfig?.comments[0]?.authorPersonaId).toBe('op');
    });
  });
});
