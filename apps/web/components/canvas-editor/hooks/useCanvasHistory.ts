'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import type * as fabric from 'fabric';
import type { FabricCanvasJSON } from '../types';
import { HISTORY_CONFIG } from '../types';

/**
 * Options for the useCanvasHistory hook
 */
export interface UseCanvasHistoryOptions {
  /** Fabric.js canvas instance */
  canvas: fabric.Canvas | null;
  /** Maximum number of history states to keep */
  maxHistory?: number;
  /** Debounce delay in milliseconds for saving state */
  debounceMs?: number;
}

/**
 * Return type for useCanvasHistory hook
 */
export interface UseCanvasHistoryReturn {
  /** Undo the last action */
  undo: () => void;
  /** Redo the last undone action */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Current number of states in history */
  historySize: number;
  /** Clear all history */
  clearHistory: () => void;
  /** Manually save current state to history */
  saveState: () => void;
}

/**
 * useCanvasHistory - Hook for canvas undo/redo functionality
 *
 * Provides:
 * - Automatic state saving on canvas modifications
 * - Keyboard shortcuts (Cmd/Ctrl+Z for undo, Cmd/Ctrl+Shift+Z for redo)
 * - Debounced saves to prevent excessive history entries
 * - Configurable history size limit
 */
export function useCanvasHistory({
  canvas,
  maxHistory = HISTORY_CONFIG.MAX_STATES,
  debounceMs = HISTORY_CONFIG.DEBOUNCE_MS,
}: UseCanvasHistoryOptions): UseCanvasHistoryReturn {
  const historyRef = useRef<FabricCanvasJSON[]>([]);
  const redoStackRef = useRef<FabricCanvasJSON[]>([]);
  const [historySize, setHistorySize] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isUndoRedoRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const lastCanvasRef = useRef<fabric.Canvas | null>(null);

  /**
   * Get current canvas state as JSON
   */
  const getCanvasState = useCallback((): FabricCanvasJSON | null => {
    if (!canvas) return null;

    // In Fabric.js v7, toJSON() does not accept arguments
    const json = canvas.toJSON();
    return {
      ...json,
      width: canvas.width ?? 800,
      height: canvas.height ?? 800,
    } as FabricCanvasJSON;
  }, [canvas]);

  /**
   * Update state indicators
   */
  const updateStateIndicators = useCallback(() => {
    setHistorySize(historyRef.current.length);
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  /**
   * Save current state to history
   */
  const saveState = useCallback(() => {
    if (!canvas || isUndoRedoRef.current) return;

    const state = getCanvasState();
    if (!state) return;

    // Clear redo stack when new action is taken
    redoStackRef.current = [];

    // Add to history
    historyRef.current.push(state);

    // Limit history size
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    }

    updateStateIndicators();
  }, [canvas, getCanvasState, maxHistory, updateStateIndicators]);

  /**
   * Debounced save for rapid changes
   */
  const debouncedSaveState = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveState();
    }, debounceMs);
  }, [saveState, debounceMs]);

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (!canvas || historyRef.current.length <= 1) return;

    isUndoRedoRef.current = true;

    // Save current state to redo stack
    const currentState = getCanvasState();
    if (currentState) {
      redoStackRef.current.push(currentState);
    }

    // Pop from history
    historyRef.current.pop();

    // Get previous state
    const previousState = historyRef.current[historyRef.current.length - 1];

    if (previousState) {
      canvas
        .loadFromJSON(previousState)
        .then(() => {
          canvas.renderAll();
          isUndoRedoRef.current = false;
          updateStateIndicators();
        })
        .catch((error) => {
          console.error('Failed to undo:', error);
          isUndoRedoRef.current = false;
        });
    } else {
      isUndoRedoRef.current = false;
    }
  }, [canvas, getCanvasState, updateStateIndicators]);

  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    if (!canvas || redoStackRef.current.length === 0) return;

    isUndoRedoRef.current = true;

    // Pop from redo stack
    const redoState = redoStackRef.current.pop();

    if (redoState) {
      // Save current state to history first
      const currentState = getCanvasState();
      if (currentState) {
        historyRef.current.push(currentState);

        // Limit history size
        if (historyRef.current.length > maxHistory) {
          historyRef.current.shift();
        }
      }

      // Load redo state
      canvas
        .loadFromJSON(redoState)
        .then(() => {
          canvas.renderAll();
          isUndoRedoRef.current = false;
          updateStateIndicators();
        })
        .catch((error) => {
          console.error('Failed to redo:', error);
          isUndoRedoRef.current = false;
        });
    } else {
      isUndoRedoRef.current = false;
    }
  }, [canvas, getCanvasState, maxHistory, updateStateIndicators]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    redoStackRef.current = [];

    // Save initial state
    if (canvas) {
      saveState();
    }

    updateStateIndicators();
  }, [canvas, saveState, updateStateIndicators]);

  /**
   * Set up canvas event listeners for auto-save
   */
  useEffect(() => {
    if (!canvas) {
      initializedRef.current = false;
      return;
    }

    // Reset if canvas instance changed
    if (lastCanvasRef.current !== canvas) {
      initializedRef.current = false;
      lastCanvasRef.current = canvas;
    }

    // Only initialize once per canvas instance
    if (initializedRef.current) return;
    initializedRef.current = true;

    const handleModification = () => {
      debouncedSaveState();
    };

    canvas.on('object:modified', handleModification);
    canvas.on('object:added', handleModification);
    canvas.on('object:removed', handleModification);

    // Save initial state
    saveState();

    return () => {
      canvas.off('object:modified', handleModification);
      canvas.off('object:added', handleModification);
      canvas.off('object:removed', handleModification);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      initializedRef.current = false;
    };
  }, [canvas, debouncedSaveState, saveState]);

  /**
   * Keyboard shortcuts for undo/redo
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if target is an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac =
        typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      // Also support Ctrl+Y for redo on Windows
      if (!isMac && e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    historySize,
    clearHistory,
    saveState,
  };
}

export default useCanvasHistory;
