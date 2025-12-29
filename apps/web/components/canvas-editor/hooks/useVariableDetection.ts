'use client';

import { useCallback, useMemo } from 'react';
import type * as fabric from 'fabric';
import { useCanvas } from '../CanvasContext';
import type { TemplateVariable } from '../types';

/**
 * Regex patterns for variable detection
 */
const TEXT_VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
const IMAGE_VARIABLE_PATTERN = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/;

/**
 * Return type for useVariableDetection hook
 */
export interface UseVariableDetectionReturn {
  /** List of detected variables */
  variables: TemplateVariable[];
  /** Manually detect variables from canvas */
  detectVariables: (canvas: fabric.Canvas) => TemplateVariable[];
  /** Update a specific variable */
  updateVariable: (name: string, updates: Partial<TemplateVariable>) => void;
  /** Add a new variable manually */
  addVariable: (variable: TemplateVariable) => void;
  /** Remove a variable by name */
  removeVariable: (name: string) => void;
}

/**
 * Extract text variables from a string
 */
function extractTextVariables(text: string): string[] {
  const matches: string[] = [];
  const pattern = new RegExp(TEXT_VARIABLE_PATTERN.source, 'g');
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }

  return matches;
}

/**
 * Check if a string is an image variable binding
 */
function extractImageVariable(binding: string | undefined): string | null {
  if (!binding) return null;

  const match = binding.match(IMAGE_VARIABLE_PATTERN);
  return match ? match[1] : null;
}

/**
 * useVariableDetection - Hook for detecting and managing template variables
 *
 * Scans canvas objects for:
 * - Text variables: {{variable_name}} pattern in text objects
 * - Image variables: {variable_name} in variableBinding property
 *
 * Returns deduplicated list of variables with types
 */
export function useVariableDetection(): UseVariableDetectionReturn {
  const { canvas, variables, updateVariables, markDirty } = useCanvas();

  /**
   * Detect all variables from canvas objects
   */
  const detectVariables = useCallback(
    (targetCanvas: fabric.Canvas): TemplateVariable[] => {
      const detectedVars: Map<string, TemplateVariable> = new Map();
      const objects = targetCanvas.getObjects();

      for (const obj of objects) {
        const objType = obj.type ?? '';

        // Check text objects for {{variable}} patterns
        if (['i-text', 'text', 'textbox'].includes(objType.toLowerCase())) {
          const textObj = obj as fabric.IText;
          const text = textObj.text ?? '';
          const textVars = extractTextVariables(text);

          for (const varName of textVars) {
            if (!detectedVars.has(varName)) {
              // Check if we have existing variable data to preserve
              const existing = variables.find((v) => v.name === varName);
              detectedVars.set(varName, {
                name: varName,
                type: 'text',
                defaultValue: existing?.defaultValue ?? '',
                sourceColumn: existing?.sourceColumn,
              });
            }
          }
        }

        // Check for image variable binding
        const variableBinding = (obj as unknown as { variableBinding?: string })
          .variableBinding;
        const imageVar = extractImageVariable(variableBinding);

        if (imageVar && !detectedVars.has(imageVar)) {
          const existing = variables.find((v) => v.name === imageVar);
          detectedVars.set(imageVar, {
            name: imageVar,
            type: 'image',
            defaultValue: existing?.defaultValue ?? '',
            sourceColumn: existing?.sourceColumn,
          });
        }
      }

      return Array.from(detectedVars.values());
    },
    [variables]
  );

  /**
   * Update a specific variable
   */
  const updateVariable = useCallback(
    (name: string, updates: Partial<TemplateVariable>) => {
      const updatedVariables = variables.map((v) =>
        v.name === name ? { ...v, ...updates } : v
      );
      updateVariables(updatedVariables);
      markDirty();
    },
    [variables, updateVariables, markDirty]
  );

  /**
   * Add a new variable manually
   */
  const addVariable = useCallback(
    (variable: TemplateVariable) => {
      // Don't add duplicates
      if (variables.some((v) => v.name === variable.name)) {
        return;
      }
      updateVariables([...variables, variable]);
      markDirty();
    },
    [variables, updateVariables, markDirty]
  );

  /**
   * Remove a variable by name
   */
  const removeVariable = useCallback(
    (name: string) => {
      const updatedVariables = variables.filter((v) => v.name !== name);
      updateVariables(updatedVariables);
      markDirty();
    },
    [variables, updateVariables, markDirty]
  );

  return useMemo(
    () => ({
      variables,
      detectVariables,
      updateVariable,
      addVariable,
      removeVariable,
    }),
    [variables, detectVariables, updateVariable, addVariable, removeVariable]
  );
}

export default useVariableDetection;
