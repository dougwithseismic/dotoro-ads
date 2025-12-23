import { useReducer, useCallback } from 'react';
import type {
  WizardStep,
  WizardState,
  GenerateResponse,
  CampaignConfig,
  HierarchyConfig,
  KeywordConfig,
  DataSourceColumn,
} from '../types';
import { WIZARD_STEPS, OPTIONAL_STEPS, validateWizardStep } from '../types';

// Action types
type WizardAction =
  | { type: 'SET_DATA_SOURCE'; payload: { id: string; columns: DataSourceColumn[] } }
  | { type: 'SET_CAMPAIGN_CONFIG'; payload: CampaignConfig }
  | { type: 'UPDATE_CAMPAIGN_CONFIG'; payload: Partial<CampaignConfig> }
  | { type: 'SET_HIERARCHY_CONFIG'; payload: HierarchyConfig }
  | { type: 'UPDATE_HIERARCHY_CONFIG'; payload: Partial<HierarchyConfig> }
  | { type: 'SET_KEYWORD_CONFIG'; payload: KeywordConfig | null }
  | { type: 'UPDATE_KEYWORD_CONFIG'; payload: Partial<KeywordConfig> }
  | { type: 'TOGGLE_RULE'; payload: string }
  | { type: 'SET_RULES'; payload: string[] }
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_GENERATE_RESULT'; payload: GenerateResponse }
  | { type: 'SET_AVAILABLE_COLUMNS'; payload: DataSourceColumn[] }
  | { type: 'RESET' };

// Initial state
const initialState: WizardState = {
  currentStep: 'data-source',
  dataSourceId: null,
  availableColumns: [],
  campaignConfig: null,
  hierarchyConfig: null,
  keywordConfig: null,
  ruleIds: [],
  generateResult: null,
};

// Step navigation helpers
function getNextStep(current: WizardStep): WizardStep {
  const index = WIZARD_STEPS.indexOf(current);
  return WIZARD_STEPS[Math.min(index + 1, WIZARD_STEPS.length - 1)] ?? current;
}

function getPreviousStep(current: WizardStep): WizardStep {
  const index = WIZARD_STEPS.indexOf(current);
  return WIZARD_STEPS[Math.max(index - 1, 0)] ?? current;
}

function getStepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

function isOptionalStep(step: WizardStep): boolean {
  return OPTIONAL_STEPS.includes(step);
}

// Reducer function
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_DATA_SOURCE':
      return {
        ...state,
        dataSourceId: action.payload.id,
        availableColumns: action.payload.columns,
        // Reset dependent configs when data source changes
        campaignConfig: null,
        hierarchyConfig: null,
        keywordConfig: null,
      };

    case 'SET_AVAILABLE_COLUMNS':
      return {
        ...state,
        availableColumns: action.payload,
      };

    case 'SET_CAMPAIGN_CONFIG':
      return {
        ...state,
        campaignConfig: action.payload,
      };

    case 'UPDATE_CAMPAIGN_CONFIG':
      return {
        ...state,
        campaignConfig: state.campaignConfig
          ? { ...state.campaignConfig, ...action.payload }
          : null,
      };

    case 'SET_HIERARCHY_CONFIG':
      return {
        ...state,
        hierarchyConfig: action.payload,
      };

    case 'UPDATE_HIERARCHY_CONFIG':
      return {
        ...state,
        hierarchyConfig: state.hierarchyConfig
          ? { ...state.hierarchyConfig, ...action.payload }
          : null,
      };

    case 'SET_KEYWORD_CONFIG':
      return {
        ...state,
        keywordConfig: action.payload,
      };

    case 'UPDATE_KEYWORD_CONFIG':
      return {
        ...state,
        keywordConfig: state.keywordConfig
          ? { ...state.keywordConfig, ...action.payload }
          : null,
      };

    case 'TOGGLE_RULE':
      return {
        ...state,
        ruleIds: state.ruleIds.includes(action.payload)
          ? state.ruleIds.filter(id => id !== action.payload)
          : [...state.ruleIds, action.payload],
      };

    case 'SET_RULES':
      return {
        ...state,
        ruleIds: action.payload,
      };

    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'NEXT_STEP':
      return { ...state, currentStep: getNextStep(state.currentStep) };

    case 'PREV_STEP':
      return { ...state, currentStep: getPreviousStep(state.currentStep) };

    case 'SET_GENERATE_RESULT':
      return { ...state, generateResult: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// The hook
export function useGenerateWizard() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  // Data source actions
  const setDataSource = useCallback((id: string, columns: DataSourceColumn[] = []) => {
    dispatch({ type: 'SET_DATA_SOURCE', payload: { id, columns } });
  }, []);

  const setAvailableColumns = useCallback((columns: DataSourceColumn[]) => {
    dispatch({ type: 'SET_AVAILABLE_COLUMNS', payload: columns });
  }, []);

  // Campaign config actions
  const setCampaignConfig = useCallback((config: CampaignConfig) => {
    dispatch({ type: 'SET_CAMPAIGN_CONFIG', payload: config });
  }, []);

  const updateCampaignConfig = useCallback((config: Partial<CampaignConfig>) => {
    dispatch({ type: 'UPDATE_CAMPAIGN_CONFIG', payload: config });
  }, []);

  // Hierarchy config actions
  const setHierarchyConfig = useCallback((config: HierarchyConfig) => {
    dispatch({ type: 'SET_HIERARCHY_CONFIG', payload: config });
  }, []);

  const updateHierarchyConfig = useCallback((config: Partial<HierarchyConfig>) => {
    dispatch({ type: 'UPDATE_HIERARCHY_CONFIG', payload: config });
  }, []);

  // Keyword config actions
  const setKeywordConfig = useCallback((config: KeywordConfig | null) => {
    dispatch({ type: 'SET_KEYWORD_CONFIG', payload: config });
  }, []);

  const updateKeywordConfig = useCallback((config: Partial<KeywordConfig>) => {
    dispatch({ type: 'UPDATE_KEYWORD_CONFIG', payload: config });
  }, []);

  // Rule actions
  const toggleRule = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_RULE', payload: id });
  }, []);

  const setRules = useCallback((ruleIds: string[]) => {
    dispatch({ type: 'SET_RULES', payload: ruleIds });
  }, []);

  // Navigation actions
  const setStep = useCallback((step: WizardStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  // Result actions
  const setGenerateResult = useCallback((result: GenerateResponse) => {
    dispatch({ type: 'SET_GENERATE_RESULT', payload: result });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Validation helpers
  const validateCurrentStep = useCallback(() => {
    return validateWizardStep(state.currentStep, state);
  }, [state]);

  const canProceed = useCallback((): boolean => {
    const validation = validateWizardStep(state.currentStep, state);
    return validation.valid;
  }, [state]);

  const canGoBack = useCallback((): boolean => {
    return state.currentStep !== WIZARD_STEPS[0];
  }, [state.currentStep]);

  const canSkip = useCallback((): boolean => {
    return isOptionalStep(state.currentStep);
  }, [state.currentStep]);

  // Progress helpers
  const getCurrentStepIndex = useCallback((): number => {
    return getStepIndex(state.currentStep);
  }, [state.currentStep]);

  const getTotalSteps = useCallback((): number => {
    return WIZARD_STEPS.length;
  }, []);

  const getProgress = useCallback((): number => {
    return ((getStepIndex(state.currentStep) + 1) / WIZARD_STEPS.length) * 100;
  }, [state.currentStep]);

  return {
    state,
    // Data source
    setDataSource,
    setAvailableColumns,
    // Campaign config
    setCampaignConfig,
    updateCampaignConfig,
    // Hierarchy config
    setHierarchyConfig,
    updateHierarchyConfig,
    // Keyword config
    setKeywordConfig,
    updateKeywordConfig,
    // Rules
    toggleRule,
    setRules,
    // Navigation
    setStep,
    nextStep,
    prevStep,
    // Result
    setGenerateResult,
    reset,
    // Validation
    validateCurrentStep,
    canProceed,
    canGoBack,
    canSkip,
    // Progress
    getCurrentStepIndex,
    getTotalSteps,
    getProgress,
  };
}

// Export types and helpers for testing
export type { WizardAction };
export { wizardReducer, initialState, getNextStep, getPreviousStep, getStepIndex, isOptionalStep };
