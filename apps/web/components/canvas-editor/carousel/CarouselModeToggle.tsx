'use client';

import { useState, useCallback } from 'react';
import type { CarouselMode } from '@repo/core';
import styles from './CarouselModeToggle.module.css';

export interface CarouselModeToggleProps {
  /** Current carousel mode */
  mode: CarouselMode;
  /** Callback when mode changes */
  onModeChange: (mode: CarouselMode) => void;
  /** Whether there is existing content that would be affected by mode change */
  hasExistingContent?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * CarouselModeToggle - Toggle between data-driven and manual carousel modes
 *
 * Provides a segmented control for selecting carousel editing mode with
 * descriptive labels and confirmation dialog when switching with existing content.
 */
export function CarouselModeToggle({
  mode,
  onModeChange,
  hasExistingContent = false,
  disabled = false,
}: CarouselModeToggleProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingMode, setPendingMode] = useState<CarouselMode | null>(null);

  const handleModeClick = useCallback(
    (newMode: CarouselMode) => {
      if (newMode === mode || disabled) return;

      if (hasExistingContent) {
        setPendingMode(newMode);
        setShowWarning(true);
      } else {
        onModeChange(newMode);
      }
    },
    [mode, hasExistingContent, onModeChange, disabled]
  );

  const handleConfirm = useCallback(() => {
    if (pendingMode) {
      onModeChange(pendingMode);
    }
    setShowWarning(false);
    setPendingMode(null);
  }, [pendingMode, onModeChange]);

  const handleCancel = useCallback(() => {
    setShowWarning(false);
    setPendingMode(null);
  }, []);

  return (
    <div className={styles.container}>
      <div
        className={`${styles.toggle} ${disabled ? styles.disabled : ''}`}
        role="radiogroup"
        aria-label="Carousel mode"
      >
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'data-driven'}
          className={`${styles.option} ${mode === 'data-driven' ? styles.active : ''}`}
          onClick={() => handleModeClick('data-driven')}
          disabled={disabled}
        >
          <span className={styles.optionIcon}>
            <DataDrivenIcon />
          </span>
          <span className={styles.optionContent}>
            <span className={styles.optionTitle}>Data-Driven</span>
            <span className={styles.optionDescription}>
              One template, data drives cards
            </span>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={mode === 'manual'}
          className={`${styles.option} ${mode === 'manual' ? styles.active : ''}`}
          onClick={() => handleModeClick('manual')}
          disabled={disabled}
        >
          <span className={styles.optionIcon}>
            <ManualIcon />
          </span>
          <span className={styles.optionContent}>
            <span className={styles.optionTitle}>Manual</span>
            <span className={styles.optionDescription}>
              Design each card individually
            </span>
          </span>
        </button>
      </div>

      {showWarning && (
        <div
          className={styles.warningOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mode-change-warning-title"
        >
          <div className={styles.warningDialog}>
            <h3 id="mode-change-warning-title" className={styles.warningTitle}>
              Switch Carousel Mode?
            </h3>
            <p className={styles.warningMessage}>
              Switching modes will clear your existing{' '}
              {mode === 'data-driven' ? 'template' : 'cards'}. This action cannot
              be undone.
            </p>
            <div className={styles.warningActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleConfirm}
              >
                Switch Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataDrivenIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 5L10 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 10L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ManualIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="5" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8" y="3" width="5" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="3" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

export default CarouselModeToggle;
