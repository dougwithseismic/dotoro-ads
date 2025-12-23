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
  KeywordConfig,
  DataSourceColumn,
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
  adGroupNamePattern: '{product_name}',
  adMapping: {
    headline: '{headline}',
    description: '{description}',
  },
};

const validKeywordConfig: KeywordConfig = {
  enabled: true,
  rules: [
    {
      id: 'rule-1',
      coreTermPattern: '{product_name}',
      prefixes: ['buy'],
      suffixes: ['online'],
      matchTypes: ['broad', 'exact'],
    },
  ],
};

describe('wizardReducer', () => {
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
        keywordConfig: validKeywordConfig,
      };
      const result = wizardReducer(stateWithConfigs, {
        type: 'SET_DATA_SOURCE',
        payload: { id: 'new-ds', columns: sampleColumns },
      });
      expect(result.dataSourceId).toBe('new-ds');
      expect(result.campaignConfig).toBeNull();
      expect(result.hierarchyConfig).toBeNull();
      expect(result.keywordConfig).toBeNull();
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

  describe('SET_KEYWORD_CONFIG action', () => {
    it('sets keyword config', () => {
      const result = wizardReducer(initialState, {
        type: 'SET_KEYWORD_CONFIG',
        payload: validKeywordConfig,
      });
      expect(result.keywordConfig).toEqual(validKeywordConfig);
    });

    it('sets keyword config to null', () => {
      const stateWithConfig = { ...initialState, keywordConfig: validKeywordConfig };
      const result = wizardReducer(stateWithConfig, {
        type: 'SET_KEYWORD_CONFIG',
        payload: null,
      });
      expect(result.keywordConfig).toBeNull();
    });
  });

  describe('UPDATE_KEYWORD_CONFIG action', () => {
    it('updates keyword config when it exists', () => {
      const stateWithConfig = { ...initialState, keywordConfig: validKeywordConfig };
      const result = wizardReducer(stateWithConfig, {
        type: 'UPDATE_KEYWORD_CONFIG',
        payload: { enabled: false },
      });
      expect(result.keywordConfig?.enabled).toBe(false);
      expect(result.keywordConfig?.rules).toEqual(validKeywordConfig.rules);
    });

    it('does nothing when keyword config is null', () => {
      const result = wizardReducer(initialState, {
        type: 'UPDATE_KEYWORD_CONFIG',
        payload: { enabled: false },
      });
      expect(result.keywordConfig).toBeNull();
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

  describe('step navigation actions', () => {
    it('sets step directly', () => {
      const result = wizardReducer(initialState, { type: 'SET_STEP', payload: 'rules' });
      expect(result.currentStep).toBe('rules');
    });

    it('advances to next step', () => {
      const result = wizardReducer(initialState, { type: 'NEXT_STEP' });
      expect(result.currentStep).toBe('rules');
    });

    it('goes to previous step', () => {
      const state = { ...initialState, currentStep: 'keywords' as const };
      const result = wizardReducer(state, { type: 'PREV_STEP' });
      expect(result.currentStep).toBe('hierarchy');
    });

    it('does not go before first step', () => {
      const result = wizardReducer(initialState, { type: 'PREV_STEP' });
      expect(result.currentStep).toBe('data-source');
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
      // Order: data-source, rules, campaign-config, hierarchy, keywords, platform, preview
      expect(getNextStep('data-source')).toBe('rules');
      expect(getNextStep('rules')).toBe('campaign-config');
      expect(getNextStep('campaign-config')).toBe('hierarchy');
      expect(getNextStep('hierarchy')).toBe('keywords');
      expect(getNextStep('keywords')).toBe('platform');
      expect(getNextStep('platform')).toBe('preview');
      expect(getNextStep('preview')).toBe('preview');
    });
  });

  describe('getPreviousStep', () => {
    it('returns correct previous steps', () => {
      // Order: data-source, rules, campaign-config, hierarchy, keywords, platform, preview
      expect(getPreviousStep('preview')).toBe('platform');
      expect(getPreviousStep('platform')).toBe('keywords');
      expect(getPreviousStep('keywords')).toBe('hierarchy');
      expect(getPreviousStep('hierarchy')).toBe('campaign-config');
      expect(getPreviousStep('campaign-config')).toBe('rules');
      expect(getPreviousStep('rules')).toBe('data-source');
      expect(getPreviousStep('data-source')).toBe('data-source');
    });
  });

  describe('getStepIndex', () => {
    it('returns correct index for each step', () => {
      // Order: data-source(0), rules(1), campaign-config(2), hierarchy(3), keywords(4), platform(5), preview(6)
      expect(getStepIndex('data-source')).toBe(0);
      expect(getStepIndex('rules')).toBe(1);
      expect(getStepIndex('campaign-config')).toBe(2);
      expect(getStepIndex('hierarchy')).toBe(3);
      expect(getStepIndex('keywords')).toBe(4);
      expect(getStepIndex('platform')).toBe(5);
      expect(getStepIndex('preview')).toBe(6);
    });
  });

  describe('isOptionalStep', () => {
    it('identifies optional steps correctly', () => {
      expect(isOptionalStep('data-source')).toBe(false);
      expect(isOptionalStep('rules')).toBe(true);
      expect(isOptionalStep('campaign-config')).toBe(false);
      expect(isOptionalStep('hierarchy')).toBe(false);
      expect(isOptionalStep('keywords')).toBe(true);
      expect(isOptionalStep('platform')).toBe(false);
      expect(isOptionalStep('preview')).toBe(false);
    });
  });
});

describe('useGenerateWizard hook', () => {
  it('starts with initial state', () => {
    const { result } = renderHook(() => useGenerateWizard());
    expect(result.current.state.currentStep).toBe('data-source');
    expect(result.current.state.dataSourceId).toBeNull();
    expect(result.current.state.availableColumns).toEqual([]);
    expect(result.current.state.campaignConfig).toBeNull();
    expect(result.current.state.hierarchyConfig).toBeNull();
    expect(result.current.state.keywordConfig).toBeNull();
    expect(result.current.state.ruleIds).toEqual([]);
    expect(result.current.state.selectedPlatforms).toEqual([]);
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

  describe('keyword config actions', () => {
    it('setKeywordConfig updates keywordConfig', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setKeywordConfig(validKeywordConfig));
      expect(result.current.state.keywordConfig).toEqual(validKeywordConfig);
    });

    it('setKeywordConfig can set to null', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setKeywordConfig(validKeywordConfig));
      act(() => result.current.setKeywordConfig(null));
      expect(result.current.state.keywordConfig).toBeNull();
    });

    it('updateKeywordConfig partially updates config', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setKeywordConfig(validKeywordConfig));
      act(() => result.current.updateKeywordConfig({ enabled: false }));
      expect(result.current.state.keywordConfig?.enabled).toBe(false);
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

  describe('navigation actions', () => {
    it('setStep changes current step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setStep('preview'));
      expect(result.current.state.currentStep).toBe('preview');
    });

    it('nextStep advances to next step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.nextStep());
      expect(result.current.state.currentStep).toBe('rules');
    });

    it('prevStep goes to previous step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setStep('keywords'));
      act(() => result.current.prevStep());
      expect(result.current.state.currentStep).toBe('hierarchy');
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
    it('canProceed is false without data source on step 1', () => {
      const { result } = renderHook(() => useGenerateWizard());
      expect(result.current.canProceed()).toBe(false);
    });

    it('canProceed is true with data source on step 1', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => result.current.setDataSource('ds1', sampleColumns));
      expect(result.current.canProceed()).toBe(true);
    });

    it('canProceed is false without campaign config on campaign-config step', () => {
      const { result } = renderHook(() => useGenerateWizard());
      act(() => {
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
        result.current.setDataSource('ds1', sampleColumns);
        result.current.nextStep(); // -> rules
        result.current.nextStep(); // -> campaign-config
        result.current.setCampaignConfig(validCampaignConfig);
      });
      expect(result.current.canProceed()).toBe(true);
    });

    it('validateCurrentStep returns validation result', () => {
      const { result } = renderHook(() => useGenerateWizard());
      const validation = result.current.validateCurrentStep();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Please select a data source');
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
      act(() => result.current.setStep('keywords'));
      expect(result.current.canSkip()).toBe(true);
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

    it('getTotalSteps returns 7', () => {
      const { result } = renderHook(() => useGenerateWizard());
      expect(result.current.getTotalSteps()).toBe(7);
    });

    it('getProgress returns correct percentage', () => {
      const { result } = renderHook(() => useGenerateWizard());
      expect(result.current.getProgress()).toBeCloseTo(14.29, 1); // 1/7 steps
      act(() => result.current.setStep('preview'));
      expect(result.current.getProgress()).toBe(100);
    });
  });

  describe('complete wizard flow', () => {
    it('can complete full wizard flow', () => {
      const { result } = renderHook(() => useGenerateWizard());

      // Step 1: Data Source
      expect(result.current.state.currentStep).toBe('data-source');
      act(() => result.current.setDataSource('ds1', sampleColumns));
      expect(result.current.canProceed()).toBe(true);
      act(() => result.current.nextStep());

      // Step 2: Rules (optional - now right after data source)
      expect(result.current.state.currentStep).toBe('rules');
      expect(result.current.canSkip()).toBe(true);
      act(() => result.current.toggleRule('r1'));
      act(() => result.current.nextStep());

      // Step 3: Campaign Config
      expect(result.current.state.currentStep).toBe('campaign-config');
      act(() => result.current.setCampaignConfig(validCampaignConfig));
      expect(result.current.canProceed()).toBe(true);
      act(() => result.current.nextStep());

      // Step 4: Hierarchy
      expect(result.current.state.currentStep).toBe('hierarchy');
      act(() => result.current.setHierarchyConfig(validHierarchyConfig));
      expect(result.current.canProceed()).toBe(true);
      act(() => result.current.nextStep());

      // Step 5: Keywords (optional)
      expect(result.current.state.currentStep).toBe('keywords');
      expect(result.current.canSkip()).toBe(true);
      act(() => result.current.nextStep());

      // Step 6: Platform selection
      expect(result.current.state.currentStep).toBe('platform');
      expect(result.current.canProceed()).toBe(false); // No platforms selected
      act(() => result.current.togglePlatform('google'));
      expect(result.current.canProceed()).toBe(true);
      act(() => result.current.nextStep());

      // Step 7: Preview
      expect(result.current.state.currentStep).toBe('preview');
      expect(result.current.canGoBack()).toBe(true);

      // Verify final state
      expect(result.current.state.dataSourceId).toBe('ds1');
      expect(result.current.state.campaignConfig).toEqual(validCampaignConfig);
      expect(result.current.state.hierarchyConfig).toEqual(validHierarchyConfig);
      expect(result.current.state.ruleIds).toEqual(['r1']);
      expect(result.current.state.selectedPlatforms).toEqual(['google']);
    });
  });
});
