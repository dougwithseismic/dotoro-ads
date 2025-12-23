"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StepIndicator } from "./StepIndicator";
import { DataSourceSelector } from "./DataSourceSelector";
import { CampaignConfig } from "./CampaignConfig";
import { HierarchyConfig } from "./HierarchyConfig";
import { KeywordConfig } from "./KeywordConfig";
import { RuleSelector } from "./RuleSelector";
import { PlatformSelector } from "./PlatformSelector";
import { GenerationPreview } from "./GenerationPreview";
import { ValidationMessage } from "./ValidationMessage";
import { useGenerateWizard } from "../hooks/useGenerateWizard";
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
    setKeywordConfig,
    toggleRule,
    togglePlatform,
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

  const { currentStep, dataSourceId, campaignConfig, hierarchyConfig, keywordConfig, availableColumns } = state;

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
          `/api/v1/data-sources/${dataSourceId}/sample?limit=10`
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
        // keywords and rules are optional - no validation message needed
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

      case "keywords":
        return (
          <div className={styles.stepContent} data-testid="step-content">
            <h2 className={styles.stepTitle}>{STEP_LABELS[currentStep]}</h2>
            <p className={styles.stepDescription}>
              Optionally configure keyword generation rules.
            </p>
            <KeywordConfig
              config={keywordConfig}
              availableColumns={availableColumns}
              onChange={setKeywordConfig}
            />
          </div>
        );

      case "rules":
        return (
          <div className={styles.stepContent} data-testid="step-content">
            <h2 className={styles.stepTitle}>{STEP_LABELS[currentStep]}</h2>
            <p className={styles.stepDescription}>
              Filter your data before configuring campaigns. Rules help you work with a refined dataset.
            </p>
            <RuleSelector selectedIds={state.ruleIds} onToggle={toggleRule} />
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

  return (
    <div className={styles.wizard}>
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

      <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />

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
      </div>

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
  );
}
