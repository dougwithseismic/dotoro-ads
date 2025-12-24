import { useEffect, useRef, useCallback } from 'react';
import type { WizardState } from '../types';

const STORAGE_KEY = 'campaign-wizard-state';
const DEBOUNCE_MS = 500;

/**
 * Subset of WizardState that should be persisted.
 * We exclude generateResult as it's computed and shouldn't persist across sessions.
 */
type PersistedState = Omit<WizardState, 'generateResult'>;

/**
 * Checks if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Safely get persisted state from localStorage
 */
export function getPersistedState(): PersistedState | null {
  if (!isBrowser()) return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as PersistedState;

    // Basic validation - ensure required fields exist
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('currentStep' in parsed)
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[useWizardPersistence] Failed to parse stored state:', error);
    return null;
  }
}

/**
 * Safely persist state to localStorage
 */
function persistState(state: WizardState): void {
  if (!isBrowser()) return;

  try {
    // Exclude generateResult from persistence
    const { generateResult, ...persistedState } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch (error) {
    console.warn('[useWizardPersistence] Failed to persist state:', error);
  }
}

/**
 * Clear persisted state from localStorage
 */
export function clearPersistedState(): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[useWizardPersistence] Failed to clear state:', error);
  }
}

/**
 * Check if there's a persisted session available
 */
export function hasPersistedSession(): boolean {
  return getPersistedState() !== null;
}

/**
 * Hook to persist wizard state to localStorage with debouncing.
 *
 * @param state - The current wizard state to persist
 * @param enabled - Whether persistence is enabled (can be used to pause during generation)
 *
 * @example
 * ```tsx
 * const { state, reset } = useGenerateWizard();
 * useWizardPersistence(state);
 * ```
 */
export function useWizardPersistence(state: WizardState, enabled = true): void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  // Use refs to access latest values in unmount cleanup without adding deps
  const stateRef = useRef(state);
  const enabledRef = useRef(enabled);
  stateRef.current = state;
  enabledRef.current = enabled;

  useEffect(() => {
    // Skip the initial mount to avoid overwriting restored state
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!enabled) return;

    // Debounce state persistence
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      persistState(state);
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, enabled]);

  // Persist immediately on unmount (component leaving)
  // Empty deps - only runs cleanup on actual unmount, not on every state change
  useEffect(() => {
    return () => {
      if (enabledRef.current && !isInitialMount.current) {
        // Clear any pending debounced save
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        // Save immediately using ref to get latest state
        persistState(stateRef.current);
      }
    };
  }, []);
}

/**
 * Hook to restore wizard state from localStorage on mount.
 * Returns a restore function that can be called to apply persisted state.
 *
 * @param restoreState - Function to restore state (typically from useGenerateWizard)
 * @returns Object with restore function and hasSession boolean
 */
export function useWizardRestore(
  restoreState: {
    setDataSource: (id: string, columns: WizardState['availableColumns']) => void;
    setCampaignConfig: (config: NonNullable<WizardState['campaignConfig']>) => void;
    setHierarchyConfig: (config: NonNullable<WizardState['hierarchyConfig']>) => void;
    setRules: (ruleIds: string[]) => void;
    setPlatforms: (platforms: WizardState['selectedPlatforms']) => void;
    setPlatformBudget: (platform: WizardState['selectedPlatforms'][number], budget: WizardState['platformBudgets'][keyof WizardState['platformBudgets']]) => void;
    setStep: (step: WizardState['currentStep']) => void;
  }
): {
  restore: () => boolean;
  hasSession: boolean;
  clearSession: () => void;
} {
  const hasSession = hasPersistedSession();

  const restore = useCallback((): boolean => {
    const persisted = getPersistedState();
    if (!persisted) return false;

    try {
      // Restore data source and columns
      if (persisted.dataSourceId) {
        restoreState.setDataSource(persisted.dataSourceId, persisted.availableColumns || []);
      }

      // Restore campaign config
      if (persisted.campaignConfig) {
        restoreState.setCampaignConfig(persisted.campaignConfig);
      }

      // Restore hierarchy config
      if (persisted.hierarchyConfig) {
        restoreState.setHierarchyConfig(persisted.hierarchyConfig);
      }

      // Restore rules
      if (persisted.ruleIds && persisted.ruleIds.length > 0) {
        restoreState.setRules(persisted.ruleIds);
      }

      // Restore platforms
      if (persisted.selectedPlatforms && persisted.selectedPlatforms.length > 0) {
        restoreState.setPlatforms(persisted.selectedPlatforms);
      }

      // Restore platform budgets
      if (persisted.platformBudgets) {
        for (const [platform, budget] of Object.entries(persisted.platformBudgets)) {
          if (budget) {
            restoreState.setPlatformBudget(platform as WizardState['selectedPlatforms'][number], budget);
          }
        }
      }

      // Restore current step last (after all data is in place)
      if (persisted.currentStep) {
        restoreState.setStep(persisted.currentStep);
      }

      return true;
    } catch (error) {
      console.error('[useWizardRestore] Failed to restore state:', error);
      return false;
    }
  }, [restoreState]);

  const clearSession = useCallback(() => {
    clearPersistedState();
  }, []);

  return { restore, hasSession, clearSession };
}
