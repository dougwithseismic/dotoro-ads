"use client";

import { useState, useCallback } from "react";
import { StepIndicator } from "./StepIndicator";
import { WizardStep, WizardState, WIZARD_STEPS, STEP_LABELS } from "../types";
import styles from "../GenerateWizard.module.css";

function getStepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

function getNextStep(currentStep: WizardStep): WizardStep | null {
  const currentIndex = getStepIndex(currentStep);
  if (currentIndex < WIZARD_STEPS.length - 1) {
    return WIZARD_STEPS[currentIndex + 1] ?? null;
  }
  return null;
}

function getPreviousStep(currentStep: WizardStep): WizardStep | null {
  const currentIndex = getStepIndex(currentStep);
  if (currentIndex > 0) {
    return WIZARD_STEPS[currentIndex - 1] ?? null;
  }
  return null;
}

export function GenerateWizard() {
  const [state, setState] = useState<WizardState>({
    currentStep: "template",
    templateId: null,
    dataSourceId: null,
    ruleIds: [],
  });

  const { currentStep, templateId, dataSourceId } = state;

  const isFirstStep = currentStep === WIZARD_STEPS[0];
  const isLastStep = currentStep === WIZARD_STEPS[WIZARD_STEPS.length - 1];

  // Determine if next button should be enabled based on current step requirements
  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case "template":
        return templateId !== null;
      case "data-source":
        return dataSourceId !== null;
      case "rules":
        // Rules are optional, so always allow proceeding
        return true;
      case "preview":
        // On preview step, the next button becomes "Generate"
        return true;
      default:
        return false;
    }
  }, [currentStep, templateId, dataSourceId]);

  const handleNext = useCallback(() => {
    const nextStep = getNextStep(currentStep);
    if (nextStep && canProceed()) {
      setState((prev) => ({ ...prev, currentStep: nextStep }));
    }
  }, [currentStep, canProceed]);

  const handleBack = useCallback(() => {
    const previousStep = getPreviousStep(currentStep);
    if (previousStep) {
      setState((prev) => ({ ...prev, currentStep: previousStep }));
    }
  }, [currentStep]);

  const handleStepClick = useCallback((step: WizardStep) => {
    // Only allow clicking on completed steps (earlier steps)
    const clickedIndex = getStepIndex(step);
    const currentIndex = getStepIndex(state.currentStep);

    if (clickedIndex < currentIndex) {
      setState((prev) => ({ ...prev, currentStep: step }));
    }
  }, [state.currentStep]);

  // For testing: provide a way to set selections
  const setTemplateId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, templateId: id }));
  }, []);

  const setDataSourceId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, dataSourceId: id }));
  }, []);

  const renderStepContent = () => {
    const stepNumber = getStepIndex(currentStep) + 1;

    return (
      <div className={styles.stepContent}>
        <p className={styles.placeholderText} data-testid="step-content">
          Step {stepNumber} content: {STEP_LABELS[currentStep]}
        </p>
        {/* Temporary buttons for testing selection */}
        {currentStep === "template" && (
          <button
            type="button"
            onClick={() => setTemplateId("test-template-1")}
            data-testid="select-template"
            style={{ marginTop: "16px", padding: "8px 16px" }}
          >
            Select Template
          </button>
        )}
        {currentStep === "data-source" && (
          <button
            type="button"
            onClick={() => setDataSourceId("test-datasource-1")}
            data-testid="select-data-source"
            style={{ marginTop: "16px", padding: "8px 16px" }}
          >
            Select Data Source
          </button>
        )}
      </div>
    );
  };

  const nextButtonText = isLastStep ? "Generate" : "Next";
  const isNextDisabled = !canProceed();

  return (
    <div className={styles.wizard}>
      <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />

      <div className={styles.content}>{renderStepContent()}</div>

      <div className={styles.navigation}>
        <button
          type="button"
          onClick={handleBack}
          disabled={isFirstStep}
          className={`${styles.button} ${styles.buttonSecondary} ${isFirstStep ? styles.buttonDisabled : ""}`}
          aria-label="Go to previous step"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isNextDisabled}
          className={`${styles.button} ${styles.buttonPrimary} ${isNextDisabled ? styles.buttonDisabled : ""}`}
          aria-label={isLastStep ? "Generate campaigns" : "Go to next step"}
        >
          {nextButtonText}
        </button>
      </div>
    </div>
  );
}
