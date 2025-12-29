'use client';

import { useCallback, useEffect } from 'react';
import styles from './CardNavigator.module.css';

export interface CardNavigatorProps {
  /** Current card index (0-based) */
  currentIndex: number;
  /** Total number of cards */
  totalCards: number;
  /** Callback when navigating to previous card */
  onPrevious: () => void;
  /** Callback when navigating to next card */
  onNext: () => void;
  /** Enable keyboard navigation (Arrow keys) */
  enableKeyboardNav?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Compact display mode */
  compact?: boolean;
}

/**
 * CardNavigator - Previous/Next navigation for carousel cards
 *
 * Provides navigation arrows with position indicator and optional
 * keyboard navigation support (Left/Right arrow keys).
 */
export function CardNavigator({
  currentIndex,
  totalCards,
  onPrevious,
  onNext,
  enableKeyboardNav = true,
  disabled = false,
  compact = false,
}: CardNavigatorProps) {
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalCards - 1;

  const handlePrevious = useCallback(() => {
    if (canGoPrevious && !disabled) {
      onPrevious();
    }
  }, [canGoPrevious, disabled, onPrevious]);

  const handleNext = useCallback(() => {
    if (canGoNext && !disabled) {
      onNext();
    }
  }, [canGoNext, disabled, onNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNav || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNav, disabled, handlePrevious, handleNext]);

  if (totalCards === 0) {
    return null;
  }

  return (
    <div
      className={`${styles.container} ${compact ? styles.compact : ''} ${disabled ? styles.disabled : ''}`}
      role="navigation"
      aria-label="Card navigation"
    >
      <button
        type="button"
        className={styles.button}
        onClick={handlePrevious}
        disabled={!canGoPrevious || disabled}
        aria-label="Previous card"
      >
        <ChevronLeftIcon />
      </button>

      <div className={styles.indicator} aria-live="polite">
        <span className={styles.current}>{currentIndex + 1}</span>
        <span className={styles.separator}>of</span>
        <span className={styles.total}>{totalCards}</span>
      </div>

      <button
        type="button"
        className={styles.button}
        onClick={handleNext}
        disabled={!canGoNext || disabled}
        aria-label="Next card"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 5l-5 5 5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CardNavigator;
