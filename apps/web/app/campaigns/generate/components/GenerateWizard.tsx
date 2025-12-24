"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StepIndicator } from "./StepIndicator";
import { DataSourceSelector } from "./DataSourceSelector";
import { CampaignConfig } from "./CampaignConfig";
import { HierarchyConfig } from "./HierarchyConfig";
import { InlineRuleBuilder } from "./InlineRuleBuilder";
import { PlatformSelector } from "./PlatformSelector";
import { GenerationPreview } from "./GenerationPreview";
import { ValidationMessage } from "./ValidationMessage";
import { WizardSidePanel } from "./WizardSidePanel";
import { useGenerateWizard } from "../hooks/useGenerateWizard";
import {
  useWizardPersistence,
  useWizardRestore,
  clearPersistedState,
} from "../hooks/useWizardPersistence";
import { api } from "@/lib/api-client";
import {
  WizardStep,
  WIZARD_STEPS,
  STEP_LABELS,
  OPTIONAL_STEPS,
  validateCampaignConfig,
  validateHierarchyConfig,
  validatePlatformSelection,
  createDefaultAdGroup,
  CampaignConfig as CampaignConfigType,
  HierarchyConfig as HierarchyConfigType,
} from "../types";
import styles from "../GenerateWizard.module.css";

function getStepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

// Default initial campaign config
const DEFAULT_CAMPAIGN_CONFIG: CampaignConfigType = {
  namePattern: "",
};

// Default initial hierarchy config with new structure
const DEFAULT_HIERARCHY_CONFIG: HierarchyConfigType = {
  adGroups: [createDefaultAdGroup()],
};

export function GenerateWizard() {
  const {
    state,
    setDataSource,
    setCampaignConfig,
    setHierarchyConfig,
    toggleRule,
    setRules,
    setInlineRules,
    togglePlatform,
    setPlatforms,
    setPlatformBudget,
    setStep,
    nextStep,
    prevStep,
    setGenerateResult,
    reset,
    canProceed,
    canGoBack,
    canSkip,
  } = useGenerateWizard();

  const { currentStep, dataSourceId, campaignConfig, hierarchyConfig, availableColumns } = state;

  // Persistence: Save state to localStorage
  useWizardPersistence(state, !state.generateResult);

  // Memoize restoreState object to prevent unnecessary re-renders in useWizardRestore
  const restoreState = useMemo(() => ({
    setDataSource,
    setCampaignConfig,
    setHierarchyConfig,
    setRules,
    setPlatforms,
    setPlatformBudget,
    setStep,
  }), [setDataSource, setCampaignConfig, setHierarchyConfig, setRules, setPlatforms, setPlatformBudget, setStep]);

  // Persistence: Restore state from localStorage
  const { restore, hasSession, clearSession } = useWizardRestore(restoreState);

  // State for showing restore session dialog
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const isFirstStep = currentStep === WIZARD_STEPS[0];
  const isLastStep = currentStep === WIZARD_STEPS[WIZARD_STEPS.length - 1];
  const isOptionalStep = OPTIONAL_STEPS.includes(currentStep);

  // Refs for focus management
  const contentRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef<WizardStep>(currentStep);

  // State for validation messages
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // State for ARIA live region announcements
  const [announcement, setAnnouncement] = useState<string>("");

  // State for sample data (used in HierarchyConfig preview)
  const [sampleData, setSampleData] = useState<Record<string, unknown>[]>([]);

  // State for API fetch status
  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const [sampleDataError, setSampleDataError] = useState<string | null>(null);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState<string | null>(null);

  // Check for saved session on mount
  useEffect(() => {
    if (!sessionChecked && hasSession) {
      setShowRestoreDialog(true);
    }
    setSessionChecked(true);
  }, [hasSession, sessionChecked]);

  // Handle restoring session
  const handleRestoreSession = useCallback(() => {
    restore();
    setShowRestoreDialog(false);
  }, [restore]);

  // Handle starting fresh (clearing session)
  const handleStartFresh = useCallback(() => {
    clearSession();
    setShowRestoreDialog(false);
  }, [clearSession]);

  // Handle "Start Over" button click
  const handleStartOver = useCallback(() => {
    clearPersistedState();
    reset();
  }, [reset]);

  // Focus management on step change
  useEffect(() => {
    if (previousStepRef.current !== currentStep) {
      // Announce step change to screen readers
      const stepNumber = getStepIndex(currentStep) + 1;
      const stepLabel = STEP_LABELS[currentStep];
      setAnnouncement(`Step ${stepNumber} of ${WIZARD_STEPS.length}: ${stepLabel}`);

      // Clear any validation message when step changes
      setValidationMessage(null);

      // Focus the content area
      if (contentRef.current) {
        contentRef.current.focus();
      }

      previousStepRef.current = currentStep;
    }
  }, [currentStep]);

  // Fetch sample data when data source is selected (for hierarchy preview)
  useEffect(() => {
    if (dataSourceId) {
      setSampleDataLoading(true);
      setSampleDataError(null);
      api
        .get<{ data: Record<string, unknown>[]; total: number }>(
          `/api/v1/data-sources/${dataSourceId}/sample?limit=100`
        )
        .then((data) => {
          setSampleData(data.data || []);
          setSampleDataError(null);
        })
        .catch((err) => {
          setSampleData([]);
          const errorMessage = err instanceof Error ? err.message : "Failed to load sample data";
          setSampleDataError(errorMessage);
          console.error("[GenerateWizard] Failed to fetch sample data:", {
            dataSourceId,
            error: err,
            timestamp: new Date().toISOString(),
          });
        })
        .finally(() => {
          setSampleDataLoading(false);
        });
    } else {
      setSampleData([]);
      setSampleDataError(null);
    }
  }, [dataSourceId]);

  // Handle data source selection with columns
  const handleDataSourceSelect = useCallback(
    async (id: string) => {
      setColumnsLoading(true);
      setColumnsError(null);
      try {
        // Fetch columns for the selected data source
        interface ColumnResponse {
          name: string;
          type: "string" | "number" | "boolean" | "date" | "unknown";
          sampleValues?: string[];
        }
        const response = await api.get<{ data: ColumnResponse[] }>(
          `/api/v1/data-sources/${id}/columns`
        );
        const columns = response.data || [];
        setDataSource(id, columns);
        setColumnsError(null);
      } catch (err) {
        // Don't set the data source if columns fetch fails - users need columns to proceed
        const errorMessage = err instanceof Error ? err.message : "Failed to load columns";
        setColumnsError(errorMessage);
        console.error("[GenerateWizard] Failed to fetch columns:", {
          dataSourceId: id,
          error: err,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setColumnsLoading(false);
      }
    },
    [setDataSource]
  );

  // Handle campaign config changes
  const handleCampaignConfigChange = useCallback(
    (config: CampaignConfigType) => {
      setCampaignConfig(config);
    },
    [setCampaignConfig]
  );

  // Handle hierarchy config changes
  const handleHierarchyConfigChange = useCallback(
    (config: HierarchyConfigType) => {
      setHierarchyConfig(config);
    },
    [setHierarchyConfig]
  );

  // Get current working campaign config (use state or default)
  const workingCampaignConfig = campaignConfig ?? DEFAULT_CAMPAIGN_CONFIG;

  // Get current working hierarchy config (use state or default)
  const workingHierarchyConfig = hierarchyConfig ?? DEFAULT_HIERARCHY_CONFIG;

  // Validation helpers for each step
  const getValidationMessage = useCallback(
    (step: WizardStep): string | null => {
      switch (step) {
        case "data-source":
          if (!dataSourceId) {
            return "Please select a data source to continue";
          }
          break;
        case "campaign-config": {
          const campaignValidation = validateCampaignConfig(campaignConfig, availableColumns);
          if (!campaignValidation.valid) {
            return "Please configure campaign settings to continue";
          }
          break;
        }
        case "hierarchy": {
          const hierarchyValidation = validateHierarchyConfig(hierarchyConfig, availableColumns);
          if (!hierarchyValidation.valid) {
            return "Please configure ad structure to continue";
          }
          break;
        }
        case "platform": {
          const platformValidation = validatePlatformSelection(state.selectedPlatforms);
          if (!platformValidation.valid) {
            return "Please select at least one platform to continue";
          }
          break;
        }
        // rules step is optional - no validation message needed
        // Note: keywords are configured at ad group level in the hierarchy step
      }
      return null;
    },
    [dataSourceId, campaignConfig, hierarchyConfig, availableColumns, state.selectedPlatforms]
  );

  const handleNext = useCallback(() => {
    if (canProceed()) {
      setValidationMessage(null);
      nextStep();
    } else {
      // Show validation message based on current step
      const message = getValidationMessage(currentStep);
      if (message) {
        setValidationMessage(message);
      }
    }
  }, [canProceed, nextStep, currentStep, getValidationMessage]);

  const handleBack = useCallback(() => {
    if (canGoBack()) {
      prevStep();
    }
  }, [canGoBack, prevStep]);

  const handleSkip = useCallback(() => {
    if (canSkip()) {
      nextStep();
    }
  }, [canSkip, nextStep]);

  const handleStepClick = useCallback(
    (step: WizardStep) => {
      // Only allow clicking on completed steps (earlier steps)
      const clickedIndex = getStepIndex(step);
      const currentIndex = getStepIndex(state.currentStep);

      if (clickedIndex < currentIndex) {
        setStep(step);
      }
    },
    [state.currentStep, setStep]
  );

  // Get validation result for current step (used by CampaignConfig and HierarchyConfig)
  const getCampaignValidation = () => {
    return validateCampaignConfig(campaignConfig, availableColumns);
  };

  const getHierarchyValidation = () => {
    return validateHierarchyConfig(hierarchyConfig, availableColumns);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "data-source":
        return (
          <div className={styles.stepContent} data-testid="step-content">
            <h2 className={styles.stepTitle}>Select Data Source</h2>
            <p className={styles.stepDescription}>
              Select the data source that contains your campaign content.
            </p>
            {columnsLoading && (
              <div className={styles.loadingMessage}>Loading columns...</div>
            )}
            {columnsError && (
              <ValidationMessage message={columnsError} type="error" />
            )}
            <DataSourceSelector selectedId={dataSourceId} onSelect={handleDataSourceSelect} />
          </div>
        );

      case "campaign-config":
        return (
          <div className={styles.stepContent} data-testid="step-content">
            <h2 className={styles.stepTitle}>{STEP_LABELS[currentStep]}</h2>
            <p className={styles.stepDescription}>
              Configure your campaign name pattern and budget settings.
            </p>
            {columnsLoading && (
              <div className={styles.loadingMessage}>Loading columns...</div>
            )}
            {columnsError && (
              <ValidationMessage message={columnsError} type="warning" />
            )}
            <CampaignConfig
              config={workingCampaignConfig}
              availableColumns={availableColumns}
              onChange={handleCampaignConfigChange}
              validation={campaignConfig ? getCampaignValidation() : undefined}
            />
          </div>
        );

      case "hierarchy":
        return (
          <div className={styles.stepContent} data-testid="step-content">
            <h2 className={styles.stepTitle}>{STEP_LABELS[currentStep]}</h2>
            <p className={styles.stepDescription}>
              Define how your data rows will be grouped into campaigns, ad groups, and ads.
            </p>
            {sampleDataLoading && (
              <div className={styles.loadingMessage}>Loading preview data...</div>
            )}
            {sampleDataError && (
              <ValidationMessage message={sampleDataError} type="warning" />
            )}
            <HierarchyConfig
              config={workingHierarchyConfig}
              campaignConfig={workingCampaignConfig}
              availableColumns={availableColumns}
              sampleData={sampleData}
              onChange={handleHierarchyConfigChange}
              validation={hierarchyConfig ? getHierarchyValidation() : undefined}
            />
          </div>
        );

      case "rules":
        return (
          <div className={styles.stepContent} data-testid="step-content">
            <h2 className={styles.stepTitle}>{STEP_LABELS[currentStep]}</h2>
            <p className={styles.stepDescription}>
              Create rules to filter or modify data before generating campaigns.
            </p>
            <InlineRuleBuilder
              rules={state.inlineRules}
              onChange={setInlineRules}
              availableColumns={availableColumns}
            />
          </div>
        );

      case "platform":
        return (
          <div className={styles.stepContent} data-testid="step-content">
            <h2 className={styles.stepTitle}>{STEP_LABELS[currentStep]}</h2>
            <p className={styles.stepDescription}>
              Select one or more platforms to generate campaigns for.
            </p>
            <PlatformSelector
              selectedPlatforms={state.selectedPlatforms}
              platformBudgets={state.platformBudgets}
              availableColumns={availableColumns}
              onToggle={togglePlatform}
              onBudgetChange={setPlatformBudget}
              showError={validationMessage !== null}
            />
          </div>
        );

      case "preview":
        return (
          <div className={styles.stepContent} data-testid="step-content">
            <h2 className={styles.stepTitle}>{STEP_LABELS[currentStep]}</h2>
            <p className={styles.stepDescription}>
              Review your generated campaigns before creating them.
            </p>
            {state.campaignConfig && state.hierarchyConfig && state.selectedPlatforms.length > 0 ? (
              <GenerationPreview
                dataSourceId={state.dataSourceId ?? ""}
                ruleIds={state.ruleIds}
                campaignConfig={state.campaignConfig}
                hierarchyConfig={state.hierarchyConfig}
                selectedPlatforms={state.selectedPlatforms}
                platformBudgets={state.platformBudgets}
                sampleData={sampleData}
                onGenerateComplete={setGenerateResult}
              />
            ) : (
              <div className={styles.errorMessage}>
                Please configure your campaign and select platforms before previewing.
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const isNextDisabled = !canProceed();
  // Hide navigation on preview step (generation is handled inside GenerationPreview)
  // Also hide navigation when generation is complete
  const showNavigation = !isLastStep && !state.generateResult;
  const showStartOver = state.generateResult !== null;
  // Show "Start Over" option when not on first step and has made progress
  const showStartOverOption = !isFirstStep && !state.generateResult;

  // Determine if we can proceed to generate (on last step before preview)
  const isReadyToGenerate = currentStep === "platform" && canProceed();
  const showGenerateInHeader = currentStep !== "preview" && !state.generateResult;

  return (
    <div className={styles.wizard}>
      {/* Restore Session Dialog */}
      {showRestoreDialog && (
        <div className={styles.restoreDialog} role="dialog" aria-labelledby="restore-dialog-title">
          <div className={styles.restoreDialogContent}>
            <h3 id="restore-dialog-title" className={styles.restoreDialogTitle}>
              Resume Previous Session?
            </h3>
            <p className={styles.restoreDialogText}>
              You have an unfinished campaign generation session. Would you like to continue where you left off?
            </p>
            <div className={styles.restoreDialogActions}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={handleStartFresh}
              >
                Start Fresh
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={handleRestoreSession}
              >
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip link for keyboard users */}
      <a href="#wizard-content" className={styles.skipLink}>
        Skip to wizard content
      </a>

      {/* ARIA live region for step announcements */}
      <div
        className={styles.liveRegion}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>

      {/* Sticky Header Bar */}
      <header className={styles.stickyHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerBrand}>
            <h1 className={styles.title}>Generate Campaigns</h1>
            <p className={styles.subtitle}>Build ad campaigns from your data</p>
          </div>
          <div className={styles.headerDivider} />
        </div>

        <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />

        <div className={styles.headerRight}>
          {showStartOverOption && (
            <button
              type="button"
              className={styles.startOverButton}
              onClick={handleStartOver}
              aria-label="Start over from the beginning"
            >
              Start Over
            </button>
          )}
          {showGenerateInHeader && (
            <button
              type="button"
              className={styles.generateButton}
              disabled={!isReadyToGenerate}
              onClick={isReadyToGenerate ? handleNext : undefined}
              aria-label={isReadyToGenerate ? "Continue to preview" : "Complete all steps to generate"}
            >
              <span>Preview & Generate</span>
              <svg className={styles.generateButtonIcon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Legacy header (hidden via CSS) */}
      <div className={styles.wizardHeader}>
        <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />
      </div>

      <div className={styles.wizardBody}>
        <div
          id="wizard-content"
          ref={contentRef}
          className={styles.content}
          tabIndex={-1}
          aria-label={`Wizard step: ${STEP_LABELS[currentStep]}`}
        >
          {validationMessage && (
            <ValidationMessage message={validationMessage} type="error" />
          )}
          {renderStepContent()}

          {/* Navigation inside content area */}
          {showNavigation && (
            <div className={styles.navigation} role="navigation" aria-label="Wizard navigation">
              <button
                type="button"
                onClick={handleBack}
                disabled={isFirstStep}
                className={`${styles.button} ${styles.buttonSecondary} ${isFirstStep ? styles.buttonDisabled : ""}`}
                aria-label="Go to previous step"
              >
                Back
              </button>

              <div className={styles.navigationRight}>
                {isOptionalStep && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    aria-label="Skip this optional step"
                  >
                    Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isNextDisabled}
                  className={`${styles.button} ${styles.buttonPrimary} ${isNextDisabled ? styles.buttonDisabled : ""}`}
                  aria-label="Go to next step"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {showStartOver && (
            <div className={styles.navigation} role="navigation" aria-label="Wizard navigation">
              <button
                type="button"
                onClick={reset}
                className={`${styles.button} ${styles.buttonSecondary}`}
                aria-label="Start a new generation"
              >
                Start New Generation
              </button>
            </div>
          )}
        </div>

        <WizardSidePanel
          currentStep={currentStep}
          state={state}
          sampleData={sampleData}
          campaignConfig={state.campaignConfig}
          hierarchyConfig={state.hierarchyConfig}
        />
      </div>
    </div>
  );
}
