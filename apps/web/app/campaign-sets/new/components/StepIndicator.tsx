"use client";

import { Check } from "lucide-react";
import { WizardStep, WIZARD_STEPS, STEP_LABELS } from "../types";
import styles from "../GenerateWizard.module.css";

interface StepIndicatorProps {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
}

function getStepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

function getStepState(
  step: WizardStep,
  currentStep: WizardStep
): "completed" | "current" | "upcoming" {
  const stepIndex = getStepIndex(step);
  const currentIndex = getStepIndex(currentStep);

  if (stepIndex < currentIndex) {
    return "completed";
  } else if (stepIndex === currentIndex) {
    return "current";
  } else {
    return "upcoming";
  }
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <nav
      className={styles.stepIndicator}
      role="navigation"
      aria-label="Wizard progress"
    >
      {WIZARD_STEPS.map((step, index) => {
        const state = getStepState(step, currentStep);
        const isCompleted = state === "completed";
        const isCurrent = state === "current";
        const isClickable = isCompleted;

        const stateClass =
          state === "completed"
            ? styles.stepCompleted
            : state === "current"
              ? styles.stepCurrent
              : styles.stepUpcoming;

        const handleClick = () => {
          if (isClickable) {
            onStepClick(step);
          }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (isClickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onStepClick(step);
          }
        };

        return (
          <div
            key={step}
            className={`${styles.step} ${stateClass} ${isClickable ? styles.stepClickable : ""}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={isClickable ? 0 : -1}
            role="button"
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`Step ${index + 1}: ${STEP_LABELS[step]}${isCompleted ? " (completed)" : isCurrent ? " (current)" : ""}`}
            aria-disabled={!isClickable}
          >
            <div className={styles.stepNumber}>
              {isCompleted ? (
                <Check size={18} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </div>
            <span className={styles.stepLabel}>{STEP_LABELS[step]}</span>
          </div>
        );
      })}
    </nav>
  );
}
