import { useReducer, useCallback, useEffect, useRef } from 'react';
import type {
  WizardStep,
  WizardState,
  GenerateResponse,
  CampaignConfig,
  HierarchyConfig,
  DataSourceColumn,
  Platform,
  BudgetConfig,
  InlineRule,
  TargetingConfig,
} from '../types';
import { WIZARD_STEPS, OPTIONAL_STEPS, validateWizardStep, createInitialWizardState } from '../types';

// Type for platformBudgets initialization
type PlatformBudgetsRecord = Record<Platform, BudgetConfig | null>;
// Type for selectedAdTypes
type SelectedAdTypesRecord = Record<Platform, string[]>;

// Action types
type WizardAction =
  | { type: 'INITIALIZE'; payload: Partial<WizardState> }
  | { type: 'SET_CAMPAIGN_SET_NAME'; payload: string }
  | { type: 'SET_CAMPAIGN_SET_DESCRIPTION'; payload: string }
  | { type: 'SET_DATA_SOURCE'; payload: { id: string; columns: DataSourceColumn[] } }
  | { type: 'SET_CAMPAIGN_CONFIG'; payload: CampaignConfig }
  | { type: 'UPDATE_CAMPAIGN_CONFIG'; payload: Partial<CampaignConfig> }
  | { type: 'SET_HIERARCHY_CONFIG'; payload: HierarchyConfig }
  | { type: 'UPDATE_HIERARCHY_CONFIG'; payload: Partial<HierarchyConfig> }
  | { type: 'TOGGLE_RULE'; payload: string }
  | { type: 'SET_RULES'; payload: string[] }
  | { type: 'SET_INLINE_RULES'; payload: InlineRule[] }
  | { type: 'SET_SELECTED_AD_TYPES'; payload: SelectedAdTypesRecord }
  | { type: 'TOGGLE_PLATFORM'; payload: Platform }
  | { type: 'SET_PLATFORMS'; payload: Platform[] }
  | { type: 'SET_PLATFORM_BUDGET'; payload: { platform: Platform; budget: BudgetConfig | null } }
  | { type: 'SET_TARGETING_CONFIG'; payload: TargetingConfig | null }
  | { type: 'UPDATE_TARGETING_CONFIG'; payload: Partial<TargetingConfig> }
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_GENERATE_RESULT'; payload: GenerateResponse }
  | { type: 'SET_AVAILABLE_COLUMNS'; payload: DataSourceColumn[] }
  | { type: 'RESET' };

// Default initial state - use the factory function from types.ts
const defaultInitialState: WizardState = createInitialWizardState();

/**
 * Options for useGenerateWizard hook
 */
export interface UseGenerateWizardOptions {
  /**
   * Initial state to populate the wizard with (for edit mode).
   * When provided, the wizard will start with these values instead of empty defaults.
   */
  initialState?: Partial<WizardState>;
}

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
    case 'INITIALIZE':
      return { ...defaultInitialState, ...action.payload };

    case 'SET_CAMPAIGN_SET_NAME':
      return {
        ...state,
        campaignSetName: action.payload,
      };

    case 'SET_CAMPAIGN_SET_DESCRIPTION':
      return {
        ...state,
        campaignSetDescription: action.payload,
      };

    case 'SET_DATA_SOURCE':
      return {
        ...state,
        dataSourceId: action.payload.id,
        availableColumns: action.payload.columns,
        // Reset dependent configs when data source changes
        campaignConfig: null,
        hierarchyConfig: null,
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

    case 'SET_INLINE_RULES':
      return {
        ...state,
        inlineRules: action.payload,
      };

    case 'SET_SELECTED_AD_TYPES':
      return {
        ...state,
        selectedAdTypes: action.payload,
      };

    case 'TOGGLE_PLATFORM':
      return {
        ...state,
        selectedPlatforms: state.selectedPlatforms.includes(action.payload)
          ? state.selectedPlatforms.filter(p => p !== action.payload)
          : [...state.selectedPlatforms, action.payload],
      };

    case 'SET_PLATFORMS':
      return {
        ...state,
        selectedPlatforms: action.payload,
      };

    case 'SET_PLATFORM_BUDGET':
      return {
        ...state,
        platformBudgets: {
          ...state.platformBudgets,
          [action.payload.platform]: action.payload.budget,
        },
      };

    case 'SET_TARGETING_CONFIG':
      return {
        ...state,
        targetingConfig: action.payload,
      };

    case 'UPDATE_TARGETING_CONFIG':
      return {
        ...state,
        targetingConfig: state.targetingConfig
          ? { ...state.targetingConfig, ...action.payload }
          : { ...action.payload },
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
      return defaultInitialState;

    default:
      return state;
  }
}

// The hook
export function useGenerateWizard(options: UseGenerateWizardOptions = {}) {
  // Merge provided initial state with defaults
  const mergedInitialState: WizardState = options.initialState
    ? { ...defaultInitialState, ...options.initialState }
    : defaultInitialState;

  const [state, dispatch] = useReducer(wizardReducer, mergedInitialState);

  // Track if we've already initialized to prevent infinite loops
  // when parent re-renders with a new object reference for the same initialState
  const hasInitialized = useRef(false);
  // Track the previous initialState to detect actual content changes
  const prevInitialStateRef = useRef<Partial<WizardState> | undefined>(undefined);

  // Re-initialize when initialState prop changes (for edit mode)
  // Uses shallow comparison of key properties to detect actual changes vs reference changes
  useEffect(() => {
    if (!options.initialState) {
      return;
    }

    // Check if initialState has actually changed (not just reference)
    const prevState = prevInitialStateRef.current;
    const isActuallyDifferent = !prevState ||
      prevState.dataSourceId !== options.initialState.dataSourceId ||
      prevState.campaignSetName !== options.initialState.campaignSetName;

    if (!hasInitialized.current || isActuallyDifferent) {
      dispatch({ type: 'INITIALIZE', payload: options.initialState });
      hasInitialized.current = true;
      prevInitialStateRef.current = options.initialState;
    }
  }, [options.initialState]);

  // Campaign set actions
  const setCampaignSetName = useCallback((name: string) => {
    dispatch({ type: 'SET_CAMPAIGN_SET_NAME', payload: name });
  }, []);

  const setCampaignSetDescription = useCallback((description: string) => {
    dispatch({ type: 'SET_CAMPAIGN_SET_DESCRIPTION', payload: description });
  }, []);

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

  // Rule actions
  const toggleRule = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_RULE', payload: id });
  }, []);

  const setRules = useCallback((ruleIds: string[]) => {
    dispatch({ type: 'SET_RULES', payload: ruleIds });
  }, []);

  const setInlineRules = useCallback((rules: InlineRule[]) => {
    dispatch({ type: 'SET_INLINE_RULES', payload: rules });
  }, []);

  // Ad type actions
  const setSelectedAdTypes = useCallback((selectedAdTypes: Record<Platform, string[]>) => {
    dispatch({ type: 'SET_SELECTED_AD_TYPES', payload: selectedAdTypes });
  }, []);

  // Platform actions
  const togglePlatform = useCallback((platform: Platform) => {
    dispatch({ type: 'TOGGLE_PLATFORM', payload: platform });
  }, []);

  const setPlatforms = useCallback((platforms: Platform[]) => {
    dispatch({ type: 'SET_PLATFORMS', payload: platforms });
  }, []);

  const setPlatformBudget = useCallback((platform: Platform, budget: BudgetConfig | null) => {
    dispatch({ type: 'SET_PLATFORM_BUDGET', payload: { platform, budget } });
  }, []);

  // Targeting config actions
  const setTargetingConfig = useCallback((config: TargetingConfig | null) => {
    dispatch({ type: 'SET_TARGETING_CONFIG', payload: config });
  }, []);

  const updateTargetingConfig = useCallback((config: Partial<TargetingConfig>) => {
    dispatch({ type: 'UPDATE_TARGETING_CONFIG', payload: config });
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
    // Campaign set
    setCampaignSetName,
    setCampaignSetDescription,
    // Data source
    setDataSource,
    setAvailableColumns,
    // Campaign config
    setCampaignConfig,
    updateCampaignConfig,
    // Ad types
    setSelectedAdTypes,
    // Hierarchy config
    setHierarchyConfig,
    updateHierarchyConfig,
    // Rules
    toggleRule,
    setRules,
    setInlineRules,
    // Platforms
    togglePlatform,
    setPlatforms,
    setPlatformBudget,
    // Targeting
    setTargetingConfig,
    updateTargetingConfig,
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
export { wizardReducer, defaultInitialState as initialState, getNextStep, getPreviousStep, getStepIndex, isOptionalStep };
