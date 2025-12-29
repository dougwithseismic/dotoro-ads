'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Type, Image, Database, Braces } from 'lucide-react';
import type {
  AutocompleteSuggestion,
  AutocompletePosition,
} from './hooks/useVariableAutocomplete';
import styles from './VariableAutocomplete.module.css';

/**
 * VariableAutocomplete Props
 */
export interface VariableAutocompleteProps {
  /** Whether the autocomplete is visible */
  isOpen: boolean;
  /** Current search query */
  query: string;
  /** List of suggestions to display */
  suggestions: AutocompleteSuggestion[];
  /** Currently highlighted index */
  highlightedIndex: number;
  /** Dropdown position */
  position: AutocompletePosition;
  /** Callback when query changes */
  onQueryChange: (query: string) => void;
  /** Callback when a suggestion is selected */
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  /** Callback to close the autocomplete */
  onClose: () => void;
  /** Callback to move highlight up */
  onHighlightUp: () => void;
  /** Callback to move highlight down */
  onHighlightDown: () => void;
  /** Callback to select highlighted item */
  onSelectHighlighted: () => void;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Get icon for suggestion type
 */
function getSuggestionIcon(type: AutocompleteSuggestion['type']) {
  switch (type) {
    case 'text':
      return <Type size={12} />;
    case 'image':
      return <Image size={12} />;
    case 'column':
      return <Database size={12} />;
    default:
      return <Braces size={12} />;
  }
}

/**
 * VariableAutocomplete - Dropdown for variable autocomplete
 *
 * Features:
 * - Shows filtered list of available variables/columns
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Click to select
 * - Positioned relative to text cursor
 */
export function VariableAutocomplete({
  isOpen,
  query,
  suggestions,
  highlightedIndex,
  position,
  onQueryChange,
  onSelect,
  onClose,
  onHighlightUp,
  onHighlightDown,
  onSelectHighlighted,
  className,
}: VariableAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          onHighlightUp();
          break;
        case 'ArrowDown':
          event.preventDefault();
          onHighlightDown();
          break;
        case 'Enter':
          event.preventDefault();
          onSelectHighlighted();
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'Tab':
          event.preventDefault();
          onSelectHighlighted();
          break;
      }
    },
    [onHighlightUp, onHighlightDown, onSelectHighlighted, onClose]
  );

  /**
   * Focus input when opened
   */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Scroll highlighted item into view
   */
  useEffect(() => {
    if (!listRef.current) return;

    const highlightedElement = listRef.current.children[
      highlightedIndex
    ] as HTMLElement;
    if (highlightedElement) {
      highlightedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex]);

  /**
   * Close when clicking outside
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.autocomplete} ${className ?? ''}`}
      style={{
        top: position.top,
        left: position.left,
      }}
      role="listbox"
      aria-label="Variable suggestions"
    >
      <div className={styles.header}>
        <Braces size={12} />
        <span>Insert Variable</span>
      </div>

      <input
        ref={inputRef}
        type="text"
        className={styles.searchInput}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search variables..."
        aria-label="Search variables"
      />

      {suggestions.length === 0 ? (
        <div className={styles.emptyState}>
          No matching variables
        </div>
      ) : (
        <ul ref={listRef} className={styles.list} role="listbox">
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.type}-${suggestion.name}`}
              className={`${styles.item} ${
                index === highlightedIndex ? styles.highlighted : ''
              }`}
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => {
                // Could update highlight on hover if desired
              }}
            >
              <div className={`${styles.itemIcon} ${styles[suggestion.type]}`}>
                {getSuggestionIcon(suggestion.type)}
              </div>
              <div className={styles.itemContent}>
                <span className={styles.itemName}>{suggestion.label}</span>
                {suggestion.description && (
                  <span className={styles.itemDescription}>
                    {suggestion.description}
                  </span>
                )}
              </div>
              <span className={styles.itemType}>{suggestion.type}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.hint}>
        <span>
          <kbd className={styles.kbd}>↑</kbd>
          <kbd className={styles.kbd}>↓</kbd>
          navigate
        </span>
        <span>
          <kbd className={styles.kbd}>↵</kbd>
          select
        </span>
        <span>
          <kbd className={styles.kbd}>esc</kbd>
          close
        </span>
      </div>
    </div>
  );
}

export default VariableAutocomplete;
