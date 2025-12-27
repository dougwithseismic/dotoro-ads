import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  useGenerateWizard,
  wizardReducer,
  initialState,
  getNextStep,
  getPreviousStep,
  getStepIndex,
  isOptionalStep,
} from '../useGenerateWizard';
import type {
  CampaignConfig,
  HierarchyConfig,
  DataSourceColumn,
  BudgetConfig,
} from '../../types';

// Test fixtures
const sampleColumns: DataSourceColumn[] = [
  { name: 'brand_name', type: 'string', sampleValues: ['Nike', 'Adidas'] },
  { name: 'product_name', type: 'string', sampleValues: ['Air Max', 'Ultraboost'] },
  { name: 'headline', type: 'string', sampleValues: ['Run Fast'] },
  { name: 'description', type: 'string', sampleValues: ['Best shoe'] },
];

const validCampaignConfig: CampaignConfig = {
  namePattern: '{brand_name}-performance',
};

const validHierarchyConfig: HierarchyConfig = {
  adGroups: [{
    id: 'ag-1',
    namePattern: '{product_name}',
    ads: [{
      id: 'ad-1',
      headline: '{headline}',
      description: '{description}',
    }],
  }],
};

const validBudgetConfig: BudgetConfig = {
  type: 'daily',
  amountPattern: '100',
  currency: 'USD',
};

describe('wizardReducer', () => {
  describe('INITIALIZE action', () => {
    it('initializes state with provided payload merged over defaults', () => {
      const result = wizardReducer(initialState, {
        type: 'INITIALIZE',
        payload: {
          campaignSetName: 'Test Campaign',
          dataSourceId: 'ds-123',
        },
      });
      expect(result.campaignSetName).toBe('Test Campaign');
      expect(result.dataSourceId).toBe('ds-123');
      // Other fields should be default values
      expect(result.currentStep).toBe('campaign-set-name');
      expect(result.ruleIds).toEqual([]);
    });

    it('overwrites existing state with defaults then payload', () => {
      const existingState = {
        ...initialState,
        campaignSetName: 'Old Name',
        dataSourceId: 'old-ds',
        ruleIds: ['r1', 'r2'],
      };
      const result = wizardReducer(existingState, {
        type: 'INITIALIZE',
        payload: {
          campaignSetName: 'New Name',
        },
      });
      expect(result.campaignSetName).toBe('New Name');
      // dataSourceId should be reset to default (null), not kept from existing state
      expect(result.dataSourceId).toBeNull();
      expect(result.ruleIds).toEqual([]);
    });
  });

  describe('SET_DATA_SOURCE action', () => {
    it('sets data source id and columns', () => {
      const result = wizardReducer(initialState, {
        type: 'SET_DATA_SOURCE',
        payload: { id: 'ds1', columns: sampleColumns },
      });
      expect(result.dataSourceId).toBe('ds1');
      expect(result.availableColumns).toEqual(sampleColumns);
    });

    it('resets dependent configs when data source changes', () => {
      const stateWithConfigs = {
        ...initialState,
        dataSourceId: 'old-ds',
        campaignConfig: validCampaignConfig,
        hierarchyConfig: validHierarchyConfig,
      };
      const result = wizardReducer(stateWithConfigs, {
        type: 'SET_DATA_SOURCE',
        payload: { id: 'new-ds', columns: sampleColumns },
      });
      expect(result.dataSourceId).toBe('new-ds');
      expect(result.campaignConfig).toBeNull();
      expect(result.hierarchyConfig).toBeNull();
    });
  });

  describe('SET_AVAILABLE_COLUMNS action', () => {
    it('sets available columns', () => {
      const result = wizardReducer(initialState, {
        type: 'SET_AVAILABLE_COLUMNS',
        payload: sampleColumns,
      });
      expect(result.availableColumns).toEqual(sampleColumns);
    });
  });

  describe('SET_CAMPAIGN_CONFIG action', () => {
    it('sets campaign config', () => {
      const result = wizardReducer(initialState, {
        type: 'SET_CAMPAIGN_CONFIG',
        payload: validCampaignConfig,
      });
      expect(result.campaignConfig).toEqual(validCampaignConfig);
    });
  });

  describe('UPDATE_CAMPAIGN_CONFIG action', () => {
    it('updates campaign config when it exists', () => {
      const stateWithConfig = { ...initialState, campaignConfig: validCampaignConfig };
      const result = wizardReducer(stateWithConfig, {
        type: 'UPDATE_CAMPAIGN_CONFIG',
        payload: { objective: 'conversions' },
      });
      expect(result.campaignConfig?.objective).toBe('conversions');
      expect(result.campaignConfig?.namePattern).toBe(validCampaignConfig.namePattern);
    });

    it('does nothing when campaign config is null', () => {
      const result = wizardReducer(initialState, {
        type: 'UPDATE_CAMPAIGN_CONFIG',
        payload: { objective: 'conversions' },
      });
      expect(result.campaignConfig).toBeNull();
    });
  });

  describe('SET_HIERARCHY_CONFIG action', () => {
    it('sets hierarchy config', () => {
      const result = wizardReducer(initialState, {
        type: 'SET_HIERARCHY_CONFIG',
        payload: validHierarchyConfig,
      });
      expect(result.hierarchyConfig).toEqual(validHierarchyConfig);
    });
  });

  describe('UPDATE_HIERARCHY_CONFIG action', () => {
    it('updates hierarchy config when it exists', () => {
      const stateWithConfig = { ...initialState, hierarchyConfig: validHierarchyConfig };
      const result = wizardReducer(stateWithConfig, {
        type: 'UPDATE_HIERARCHY_CONFIG',
        payload: { adGroupNamePattern: '{brand_name}' },
      });
      expect(result.hierarchyConfig?.adGroupNamePattern).toBe('{brand_name}');
      expect(result.hierarchyConfig?.adMapping).toEqual(validHierarchyConfig.adMapping);
    });

    it('does nothing when hierarchy config is null', () => {
      const result = wizardReducer(initialState, {
        type: 'UPDATE_HIERARCHY_CONFIG',
        payload: { adGroupNamePattern: '{brand_name}' },
      });
      expect(result.hierarchyConfig).toBeNull();
    });
  });

  describe('TOGGLE_RULE action', () => {
    it('toggles rule on', () => {
      const result = wizardReducer(initialState, { type: 'TOGGLE_RULE', payload: 'r1' });
      expect(result.ruleIds).toContain('r1');
    });

    it('toggles rule off', () => {
      const state = { ...initialState, ruleIds: ['r1', 'r2'] };
      const result = wizardReducer(state, { type: 'TOGGLE_RULE', payload: 'r1' });
      expect(result.ruleIds).not.toContain('r1');
      expect(result.ruleIds).toContain('r2');
    });
  });

  describe('SET_RULES action', () => {
    it('sets all rules at once', () => {
      const result = wizardReducer(initialState, {
        type: 'SET_RULES',
        payload: ['r1', 'r2', 'r3'],
      });
      expect(result.ruleIds).toEqual(['r1', 'r2', 'r3']);
    });

    it('replaces existing rules', () => {
      const state = { ...initialState, ruleIds: ['old1', 'old2'] };
      const result = wizardReducer(state, {
        type: 'SET_RULES',
        payload: ['new1'],
      });
      expect(result.ruleIds).toEqual(['new1']);
    });
  });

  describe('SET_PLATFORM_BUDGET action', () => {
    it('sets budget for a platform', () => {
      const result = wizardReducer(initialState, {
        type: 'SET_PLATFORM_BUDGET',
        payload: { platform: 'google', budget: validBudgetConfig },
      });
      expect(result.platformBudgets.google).toEqual(validBudgetConfig);
    });

    it('sets budget to null to disable', () => {
      const stateWithBudget = {
        ...initialState,
        platformBudgets: { google: validBudgetConfig },
      };
      const result = wizardReducer(stateWithBudget as typeof initialState, {
        type: 'SET_PLATFORM_BUDGET',
        payload: { platform: 'google', budget: null },
      });
      expect(result.platformBudgets.google).toBeNull();
    });

    it('preserves other platform budgets when setting one', () => {
      const stateWithBudget = {
        ...initialState,
        platformBudgets: { google: validBudgetConfig },
      };
      const redditBudget: BudgetConfig = { type: 'lifetime', amountPattern: '500', currency: 'EUR' };
      const result = wizardReducer(stateWithBudget as typeof initialState, {
        type: 'SET_PLATFORM_BUDGET',
        payload: { platform: 'reddit', budget: redditBudget },
      });
      expect(result.platformBudgets.google).toEqual(validBudgetConfig);
      expect(result.platformBudgets.reddit).toEqual(redditBudget);
    });
  });

  describe('step navigation actions', () => {
    it('sets step directly', () => {
      const result = wizardReducer(initialState, { type: 'SET_STEP', payload: 'rules' });
      expect(result.currentStep).toBe('rules');
    });

    it('advances to next step', () => {
      // Initial step is now 'campaign-set-name', next is 'data-source'
      const result = wizardReducer(initialState, { type: 'NEXT_STEP' });
      expect(result.currentStep).toBe('data-source');
    });

    it('goes to previous step', () => {
      const state = { ...initialState, currentStep: 'ad-type' as const };
      const result = wizardReducer(state, { type: 'PREV_STEP' });
      expect(result.currentStep).toBe('platform');
    });

    it('does not go before first step', () => {
      // First step is now 'campaign-set-name'
      const result = wizardReducer(initialState, { type: 'PREV_STEP' });
      expect(result.currentStep).toBe('campaign-set-name');
    });

    it('does not go after last step', () => {
      const state = { ...initialState, currentStep: 'preview' as const };
      const result = wizardReducer(state, { type: 'NEXT_STEP' });
      expect(result.currentStep).toBe('preview');
    });
  });

  describe('SET_GENERATE_RESULT action', () => {
    it('sets generate result', () => {
      const result = {
        generatedCount: 10,
        campaigns: [{ id: 'c1', name: 'Campaign 1', status: 'created' }],
        warnings: [],
      };
      const newState = wizardReducer(initialState, { type: 'SET_GENERATE_RESULT', payload: result });
      expect(newState.generateResult).toEqual(result);
    });
  });

  describe('RESET action', () => {
    it('resets to initial state', () => {
      const state = {
        ...initialState,
        currentStep: 'preview' as const,
        dataSourceId: 'ds1',
        campaignConfig: validCampaignConfig,
        hierarchyConfig: validHierarchyConfig,
        ruleIds: ['r1'],
        generateResult: { generatedCount: 5, campaigns: [], warnings: [] },
      };
      const result = wizardReducer(state, { type: 'RESET' });
      expect(result).toEqual(initialState);
    });
  });

  it('returns same state for unknown action', () => {
    // @ts-expect-error - testing unknown action
    const result = wizardReducer(initialState, { type: 'UNKNOWN' });
    expect(result).toBe(initialState);
  });
});

describe('step navigation helpers', () => {
  describe('getNextStep', () => {
    it('returns correct next steps', () => {
      // Order: campaign-set-name, data-source, rules, campaign-config, platform, ad-type, hierarchy, targeting, preview
      expect(getNextStep('campaign-set-name')).toBe('data-source');
      expect(getNextStep('data-source')).toBe('rules');
      expect(getNextStep('rules')).toBe('campaign-config');
      expect(getNextStep('campaign-config')).toBe('platform');
      expect(getNextStep('platform')).toBe('ad-type');
      expect(getNextStep('ad-type')).toBe('hierarchy');
      expect(getNextStep('hierarchy')).toBe('targeting');
      expect(getNextStep('targeting')).toBe('preview');
      expect(getNextStep('preview')).toBe('preview');
    });
  });

  describe('getPreviousStep', () => {
    it('returns correct previous steps', () => {
      // Order: campaign-set-name, data-source, rules, campaign-config, platform, ad-type, hierarchy, targeting, preview
      expect(getPreviousStep('preview')).toBe('targeting');
      expect(getPreviousStep('targeting')).toBe('hierarchy');
      expect(getPreviousStep('hierarchy')).toBe('ad-type');
      expect(getPreviousStep('ad-type')).toBe('platform');
      expect(getPreviousStep('platform')).toBe('campaign-config');
      expect(getPreviousStep('campaign-config')).toBe('rules');
      expect(getPreviousStep('rules')).toBe('data-source');
      expect(getPreviousStep('data-source')).toBe('campaign-set-name');
      expect(getPreviousStep('campaign-set-name')).toBe('campaign-set-name');
    });
  });

  describe('getStepIndex', () => {
    it('returns correct index for each step', () => {
      // Order: campaign-set-name(0), data-source(1), rules(2), campaign-config(3), platform(4), ad-type(5), hierarchy(6), targeting(7), preview(8)
      expect(getStepIndex('campaign-set-name')).toBe(0);
      expect(getStepIndex('data-source')).toBe(1);
      expect(getStepIndex('rules')).toBe(2);
      expect(getStepIndex('campaign-config')).toBe(3);
      expect(getStepIndex('platform')).toBe(4);
      expect(getStepIndex('ad-type')).toBe(5);
      expect(getStepIndex('hierarchy')).toBe(6);
      expect(getStepIndex('targeting')).toBe(7);
      expect(getStepIndex('preview')).toBe(8);
    });
  });

  describe('isOptionalStep', () => {
    it('identifies optional steps correctly', () => {
      expect(isOptionalStep('campaign-set-name')).toBe(false);
      expect(isOptionalStep('data-source')).toBe(false);
      expect(isOptionalStep('rules')).toBe(true);
      expect(isOptionalStep('campaign-config')).toBe(false);
      expect(isOptionalStep('platform')).toBe(false);
      expect(isOptionalStep('ad-type')).toBe(false);
      expect(isOptionalStep('hierarchy')).toBe(false);
      expect(isOptionalStep('targeting')).toBe(true);
      expect(isOptionalStep('preview')).toBe(false);
    });
  });
});

describe('useGenerateWizard hook', () => {
  it('starts with initial state', () => {
    const { result } = renderHook(() => useGenerateWizard());
    // Now starts at 'campaign-set-name' step
    expect(result.current.state.currentStep).toBe('campaign-set-name');
    expect(result.current.state.campaignSetName).toBe('');
    expect(result.current.state.campaignSetDescription).toBe('');
    expect(result.current.state.dataSourceId).toBeNull();
    expect(result.current.state.availableColumns).toEqual([]);
    expect(result.current.state.campaignConfig).toBeNull();
    expect(result.current.state.hierarchyConfig).toBeNull();
    expect(result.current.state.ruleIds).toEqual([]);
    expect(result.current.state.selectedPlatforms).toEqual([]);
    expect(result.current.state.platformBudgets).toEqual({ reddit: null, google: null, facebook: null });
    expect(result.current.state.generateResult).toBeNull();
  });

  describe('data source actions', () => {
    it('setDataSource updates dataSourceId and columns', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setDataSource('ds1', sampleColumns));
      expect(result.current.state.dataSourceId).toBe('ds1');
      expect(result.current.state.availableColumns).toEqual(sampleColumns);
    });

    it('setDataSource with only id sets empty columns', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setDataSource('ds1'));
      expect(result.current.state.dataSourceId).toBe('ds1');
      expect(result.current.state.availableColumns).toEqual([]);
    });

    it('setAvailableColumns updates columns', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setAvailableColumns(sampleColumns));
      expect(result.current.state.availableColumns).toEqual(sampleColumns);
    });
  });

  describe('campaign config actions', () => {
    it('setCampaignConfig updates campaignConfig', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setCampaignConfig(validCampaignConfig));
      expect(result.current.state.campaignConfig).toEqual(validCampaignConfig);
    });

    it('updateCampaignConfig partially updates config', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setCampaignConfig(validCampaignConfig));
      act(() => result.current.updateCampaignConfig({ objective: 'conversions' }));
      expect(result.current.state.campaignConfig?.objective).toBe('conversions');
      expect(result.current.state.campaignConfig?.namePattern).toBe(validCampaignConfig.namePattern);
    });
  });

  describe('hierarchy config actions', () => {
    it('setHierarchyConfig updates hierarchyConfig', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setHierarchyConfig(validHierarchyConfig));
      expect(result.current.state.hierarchyConfig).toEqual(validHierarchyConfig);
    });

    it('updateHierarchyConfig partially updates config', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setHierarchyConfig(validHierarchyConfig));
      act(() => result.current.updateHierarchyConfig({ adGroupNamePattern: '{brand_name}' }));
      expect(result.current.state.hierarchyConfig?.adGroupNamePattern).toBe('{brand_name}');
    });
  });

  describe('rule actions', () => {
    it('toggleRule adds and removes rules', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.toggleRule('r1'));
      expect(result.current.state.ruleIds).toContain('r1');
      act(() => result.current.toggleRule('r2'));
      expect(result.current.state.ruleIds).toEqual(['r1', 'r2']);
      act(() => result.current.toggleRule('r1'));
      expect(result.current.state.ruleIds).toEqual(['r2']);
    });

    it('setRules sets all rules at once', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setRules(['r1', 'r2', 'r3']));
      expect(result.current.state.ruleIds).toEqual(['r1', 'r2', 'r3']);
    });
  });

  describe('platform budget actions', () => {
    it('setPlatformBudget sets budget for a platform', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setPlatformBudget('google', validBudgetConfig));
      expect(result.current.state.platformBudgets.google).toEqual(validBudgetConfig);
    });

    it('setPlatformBudget can set multiple platform budgets', () => {
      const { result } = renderHook(() => useGenerateWizard());
      const redditBudget: BudgetConfig = { type: 'lifetime', amountPattern: '500', currency: 'EUR' };
      act(() => {
        result.current.setPlatformBudget('google', validBudgetConfig);
        result.current.setPlatformBudget('reddit', redditBudget);
      });
      expect(result.current.state.platformBudgets.google).toEqual(validBudgetConfig);
      expect(result.current.state.platformBudgets.reddit).toEqual(redditBudget);
    });

    it('setPlatformBudget can clear budget with null', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setPlatformBudget('google', validBudgetConfig));
      expect(result.current.state.platformBudgets.google).toEqual(validBudgetConfig);
      act(() => result.current.setPlatformBudget('google', null));
      expect(result.current.state.platformBudgets.google).toBeNull();
    });
  });

  describe('navigation actions', () => {
    it('setStep changes current step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setStep('preview'));
      expect(result.current.state.currentStep).toBe('preview');
    });

    it('nextStep advances to next step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      // From campaign-set-name to data-source
      act(() => result.current.nextStep());
      expect(result.current.state.currentStep).toBe('data-source');
    });

    it('prevStep goes to previous step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setStep('ad-type'));
      act(() => result.current.prevStep());
      expect(result.current.state.currentStep).toBe('platform');
    });
  });

  describe('result actions', () => {
    it('setGenerateResult updates generateResult', () => {
      const { result } = renderHook(() => useGenerateWizard());
      const generateResult = {
        generatedCount: 5,
        campaigns: [{ id: 'c1', name: 'Test', status: 'created' }],
        warnings: [],
      };
      act(() => result.current.setGenerateResult(generateResult));
      expect(result.current.state.generateResult).toEqual(generateResult);
    });

    it('reset returns to initial state', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => {
        result.current.setDataSource('ds1', sampleColumns);
        result.current.setCampaignConfig(validCampaignConfig);
        result.current.toggleRule('r1');
        result.current.nextStep();
      });
      act(() => result.current.reset());
      expect(result.current.state).toEqual(initialState);
    });
  });

  describe('validation helpers', () => {
    it('canProceed is false without campaign set name on step 1', () => {
      const { result } = renderHook(() => useGenerateWizard());
      // First step is now campaign-set-name, which requires a valid name
      expect(result.current.canProceed()).toBe(false);
    });

    it('canProceed is true with valid campaign set name on step 1', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setCampaignSetName('My Campaign Set'));
      expect(result.current.canProceed()).toBe(true);
    });

    it('canProceed is false without data source on data-source step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => {
        result.current.setCampaignSetName('My Campaign Set');
        result.current.nextStep(); // -> data-source
      });
      expect(result.current.state.currentStep).toBe('data-source');
      expect(result.current.canProceed()).toBe(false);
    });

    it('canProceed is true with data source on data-source step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => {
        result.current.setCampaignSetName('My Campaign Set');
        result.current.nextStep(); // -> data-source
        result.current.setDataSource('ds1', sampleColumns);
      });
      expect(result.current.canProceed()).toBe(true);
    });

    it('canProceed is false without campaign config on campaign-config step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => {
        result.current.setCampaignSetName('My Campaign Set');
        result.current.nextStep(); // -> data-source
        result.current.setDataSource('ds1', sampleColumns);
        result.current.nextStep(); // -> rules (optional, always valid)
        result.current.nextStep(); // -> campaign-config
      });
      expect(result.current.state.currentStep).toBe('campaign-config');
      expect(result.current.canProceed()).toBe(false);
    });

    it('canProceed is true with valid campaign config', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => {
        result.current.setCampaignSetName('My Campaign Set');
        result.current.nextStep(); // -> data-source
        result.current.setDataSource('ds1', sampleColumns);
        result.current.nextStep(); // -> rules
        result.current.nextStep(); // -> campaign-config
        result.current.setCampaignConfig(validCampaignConfig);
      });
      expect(result.current.canProceed()).toBe(true);
    });

    it('validateCurrentStep returns validation result', () => {
      const { result } = renderHook(() => useGenerateWizard());
      // First step is campaign-set-name now
      const validation = result.current.validateCurrentStep();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Campaign set name is required');
    });

    it('canGoBack is false on first step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      expect(result.current.canGoBack()).toBe(false);
    });

    it('canGoBack is true on later steps', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.nextStep());
      expect(result.current.canGoBack()).toBe(true);
    });

    it('canSkip returns true for optional steps', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setStep('rules'));
      expect(result.current.canSkip()).toBe(true);
    });

    it('canSkip returns false for required steps', () => {
      const { result } = renderHook(() => useGenerateWizard());
      expect(result.current.canSkip()).toBe(false);
      act(() => result.current.setStep('campaign-config'));
      expect(result.current.canSkip()).toBe(false);
    });
  });

  describe('progress helpers', () => {
    it('getCurrentStepIndex returns correct index', () => {
      const { result } = renderHook(() => useGenerateWizard());
      expect(result.current.getCurrentStepIndex()).toBe(0);
      act(() => result.current.nextStep());
      expect(result.current.getCurrentStepIndex()).toBe(1);
    });

    it('getTotalSteps returns 9', () => {
      const { result } = renderHook(() => useGenerateWizard());
      expect(result.current.getTotalSteps()).toBe(9);
    });

    it('getProgress returns correct percentage', () => {
      const { result } = renderHook(() => useGenerateWizard());
      // First step (1/9) = ~11.1%
      expect(result.current.getProgress()).toBeCloseTo(11.1, 0);
      act(() => result.current.setStep('preview'));
      expect(result.current.getProgress()).toBe(100);
    });
  });

  describe('complete wizard flow', () => {
    it('can complete full wizard flow', () => {
      const { result } = renderHook(() => useGenerateWizard());

      // Step 1: Campaign Set Name
      expect(result.current.state.currentStep).toBe('campaign-set-name');
      act(() => result.current.setCampaignSetName('Q4 Holiday Campaign'));
      act(() => result.current.setCampaignSetDescription('Campaigns for holiday season'));
      expect(result.current.canProceed()).toBe(true);
      act(() => result.current.nextStep());

      // Step 2: Data Source
      expect(result.current.state.currentStep).toBe('data-source');
      act(() => result.current.setDataSource('ds1', sampleColumns));
      expect(result.current.canProceed()).toBe(true);
      act(() => result.current.nextStep());

      // Step 3: Rules (optional - now right after data source)
      expect(result.current.state.currentStep).toBe('rules');
      expect(result.current.canSkip()).toBe(true);
      act(() => result.current.toggleRule('r1'));
      act(() => result.current.nextStep());

      // Step 4: Campaign Config
      expect(result.current.state.currentStep).toBe('campaign-config');
      act(() => result.current.setCampaignConfig(validCampaignConfig));
      expect(result.current.canProceed()).toBe(true);
      act(() => result.current.nextStep());

      // Step 5: Platform selection
      expect(result.current.state.currentStep).toBe('platform');
      expect(result.current.canProceed()).toBe(false); // No platforms selected
      act(() => result.current.togglePlatform('google'));
      expect(result.current.canProceed()).toBe(true);
      act(() => result.current.nextStep());

      // Step 6: Ad Type selection
      expect(result.current.state.currentStep).toBe('ad-type');
      expect(result.current.canProceed()).toBe(false); // No ad types selected
      act(() => result.current.setSelectedAdTypes({ google: ['responsive-search'], reddit: [], facebook: [] }));
      expect(result.current.canProceed()).toBe(true);
      act(() => result.current.nextStep());

      // Step 7: Hierarchy (keywords now at ad group level)
      expect(result.current.state.currentStep).toBe('hierarchy');
      act(() => result.current.setHierarchyConfig(validHierarchyConfig));
      expect(result.current.canProceed()).toBe(true);
      act(() => result.current.nextStep());

      // Step 8: Targeting (optional)
      expect(result.current.state.currentStep).toBe('targeting');
      expect(result.current.canSkip()).toBe(true);
      act(() => result.current.nextStep());

      // Step 9: Preview
      expect(result.current.state.currentStep).toBe('preview');
      expect(result.current.canGoBack()).toBe(true);

      // Verify final state
      expect(result.current.state.campaignSetName).toBe('Q4 Holiday Campaign');
      expect(result.current.state.campaignSetDescription).toBe('Campaigns for holiday season');
      expect(result.current.state.dataSourceId).toBe('ds1');
      expect(result.current.state.campaignConfig).toEqual(validCampaignConfig);
      expect(result.current.state.hierarchyConfig).toEqual(validHierarchyConfig);
      expect(result.current.state.ruleIds).toEqual(['r1']);
      expect(result.current.state.selectedPlatforms).toEqual(['google']);
      expect(result.current.state.selectedAdTypes.google).toEqual(['responsive-search']);
    });
  });

  describe('initialState prop changes', () => {
    it('re-initializes state when initialState prop changes', () => {
      const initialOptions = {
        initialState: {
          campaignSetName: 'Initial Name',
          dataSourceId: 'ds-1',
        },
      };

      const { result, rerender } = renderHook(
        (props: { initialState?: Partial<typeof initialState> }) =>
          useGenerateWizard({ initialState: props.initialState }),
        { initialProps: initialOptions }
      );

      // Initial state should be set
      expect(result.current.state.campaignSetName).toBe('Initial Name');
      expect(result.current.state.dataSourceId).toBe('ds-1');

      // User modifies state
      act(() => {
        result.current.setCampaignSetName('User Modified Name');
        result.current.toggleRule('r1');
      });
      expect(result.current.state.campaignSetName).toBe('User Modified Name');
      expect(result.current.state.ruleIds).toContain('r1');

      // Rerender with new initialState (simulating edit mode switching to different campaign set)
      const newOptions = {
        initialState: {
          campaignSetName: 'Different Campaign',
          dataSourceId: 'ds-2',
          selectedPlatforms: ['google'] as const,
        },
      };

      rerender(newOptions);

      // State should be re-initialized with new values
      expect(result.current.state.campaignSetName).toBe('Different Campaign');
      expect(result.current.state.dataSourceId).toBe('ds-2');
      expect(result.current.state.selectedPlatforms).toEqual(['google']);
      // User modifications should be gone (reset to defaults then overwritten by new initialState)
      expect(result.current.state.ruleIds).toEqual([]);
    });

    it('does not re-initialize when initialState is not provided', () => {
      const { result, rerender } = renderHook(() => useGenerateWizard());

      // Modify state
      act(() => {
        result.current.setCampaignSetName('User Name');
        result.current.setDataSource('ds-1');
      });
      expect(result.current.state.campaignSetName).toBe('User Name');
      expect(result.current.state.dataSourceId).toBe('ds-1');

      // Rerender without initialState
      rerender();

      // State should remain unchanged
      expect(result.current.state.campaignSetName).toBe('User Name');
      expect(result.current.state.dataSourceId).toBe('ds-1');
    });

    it('only initializes once even when parent re-renders with same object reference', () => {
      // This tests the fix for the infinite re-initialization loop bug
      // When parent re-renders and creates a new object reference for initialState,
      // we should NOT re-initialize if the content is the same (hasInitialized ref guard)
      const initialStateValue = {
        campaignSetName: 'Initial Name',
        dataSourceId: 'ds-1',
      };

      const { result, rerender } = renderHook(
        (props: { initialState?: Partial<typeof initialState> }) =>
          useGenerateWizard({ initialState: props.initialState }),
        { initialProps: { initialState: initialStateValue } }
      );

      // Initial state should be set
      expect(result.current.state.campaignSetName).toBe('Initial Name');
      expect(result.current.state.dataSourceId).toBe('ds-1');

      // User modifies state
      act(() => {
        result.current.setCampaignSetName('User Modified Name');
        result.current.toggleRule('r1');
      });
      expect(result.current.state.campaignSetName).toBe('User Modified Name');
      expect(result.current.state.ruleIds).toContain('r1');

      // Rerender with a NEW object reference but SAME content
      // This simulates parent component re-rendering and creating new object
      const sameContentNewReference = {
        campaignSetName: 'Initial Name',
        dataSourceId: 'ds-1',
      };
      rerender({ initialState: sameContentNewReference });

      // User modifications should be PRESERVED (not wiped out by re-initialization)
      // because hasInitialized ref prevents re-initialization after first time
      expect(result.current.state.campaignSetName).toBe('User Modified Name');
      expect(result.current.state.ruleIds).toContain('r1');
    });
  });
});
