'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Autocomplete suggestion item
 */
export interface AutocompleteSuggestion {
  /** Variable/column name */
  name: string;
  /** Display label */
  label: string;
  /** Type of variable */
  type: 'text' | 'image' | 'column';
  /** Optional description */
  description?: string;
}

/**
 * Position for the autocomplete dropdown
 */
export interface AutocompletePosition {
  top: number;
  left: number;
}

/**
 * Return type for useVariableAutocomplete hook
 */
export interface UseVariableAutocompleteReturn {
  /** Whether autocomplete is open */
  isOpen: boolean;
  /** Current search query */
  query: string;
  /** Filtered suggestions */
  suggestions: AutocompleteSuggestion[];
  /** Currently highlighted index */
  highlightedIndex: number;
  /** Dropdown position */
  position: AutocompletePosition;
  /** Open the autocomplete with a query and position */
  open: (query: string, position: AutocompletePosition) => void;
  /** Close the autocomplete */
  close: () => void;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Move highlight up */
  highlightUp: () => void;
  /** Move highlight down */
  highlightDown: () => void;
  /** Select the currently highlighted suggestion */
  selectHighlighted: () => AutocompleteSuggestion | null;
  /** Select a specific suggestion */
  selectSuggestion: (suggestion: AutocompleteSuggestion) => void;
  /** Callback when a suggestion is selected */
  onSelect: (callback: (suggestion: AutocompleteSuggestion) => void) => void;
}

/**
 * useVariableAutocomplete - Hook for managing variable autocomplete state
 *
 * Features:
 * - Filter suggestions based on query
 * - Keyboard navigation (up/down arrows)
 * - Position management
 * - Selection handling
 */
export function useVariableAutocomplete(
  allSuggestions: AutocompleteSuggestion[]
): UseVariableAutocompleteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [position, setPosition] = useState<AutocompletePosition>({ top: 0, left: 0 });

  const selectCallbackRef = useRef<((suggestion: AutocompleteSuggestion) => void) | null>(null);

  /**
   * Filter suggestions based on query
   */
  const suggestions = useMemo(() => {
    if (!query) return allSuggestions;

    const lowerQuery = query.toLowerCase();
    return allSuggestions.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.label.toLowerCase().includes(lowerQuery)
    );
  }, [allSuggestions, query]);

  /**
   * Reset highlighted index when suggestions change
   */
  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  /**
   * Open the autocomplete
   */
  const open = useCallback((newQuery: string, newPosition: AutocompletePosition) => {
    setQuery(newQuery);
    setPosition(newPosition);
    setHighlightedIndex(0);
    setIsOpen(true);
  }, []);

  /**
   * Close the autocomplete
   */
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setHighlightedIndex(0);
  }, []);

  /**
   * Move highlight up
   */
  const highlightUp = useCallback(() => {
    setHighlightedIndex((prev) => {
      if (prev <= 0) return suggestions.length - 1;
      return prev - 1;
    });
  }, [suggestions.length]);

  /**
   * Move highlight down
   */
  const highlightDown = useCallback(() => {
    setHighlightedIndex((prev) => {
      if (prev >= suggestions.length - 1) return 0;
      return prev + 1;
    });
  }, [suggestions.length]);

  /**
   * Select the currently highlighted suggestion
   */
  const selectHighlighted = useCallback((): AutocompleteSuggestion | null => {
    if (suggestions.length === 0 || highlightedIndex < 0) {
      return null;
    }

    const selected = suggestions[highlightedIndex];
    if (selected && selectCallbackRef.current) {
      selectCallbackRef.current(selected);
    }
    close();
    return selected;
  }, [suggestions, highlightedIndex, close]);

  /**
   * Select a specific suggestion
   */
  const selectSuggestion = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      if (selectCallbackRef.current) {
        selectCallbackRef.current(suggestion);
      }
      close();
    },
    [close]
  );

  /**
   * Register selection callback
   */
  const onSelect = useCallback(
    (callback: (suggestion: AutocompleteSuggestion) => void) => {
      selectCallbackRef.current = callback;
    },
    []
  );

  return useMemo(
    () => ({
      isOpen,
      query,
      suggestions,
      highlightedIndex,
      position,
      open,
      close,
      setQuery,
      highlightUp,
      highlightDown,
      selectHighlighted,
      selectSuggestion,
      onSelect,
    }),
    [
      isOpen,
      query,
      suggestions,
      highlightedIndex,
      position,
      open,
      close,
      highlightUp,
      highlightDown,
      selectHighlighted,
      selectSuggestion,
      onSelect,
    ]
  );
}

export default useVariableAutocomplete;
