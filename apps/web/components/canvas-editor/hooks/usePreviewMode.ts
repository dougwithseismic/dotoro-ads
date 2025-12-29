'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type * as fabric from 'fabric';
import { useCanvas } from '../CanvasContext';

/**
 * Sample data for preview
 */
export type PreviewData = Record<string, string>;

/**
 * Return type for usePreviewMode hook
 */
export interface UsePreviewModeReturn {
  /** Whether preview mode is active */
  isPreviewMode: boolean;
  /** Current sample data */
  sampleData: PreviewData;
  /** Toggle preview mode on/off */
  togglePreview: () => void;
  /** Enter preview mode */
  enterPreview: () => void;
  /** Exit preview mode */
  exitPreview: () => void;
  /** Set sample data for preview */
  setSampleData: (data: PreviewData) => void;
  /** Update a single sample value */
  updateSampleValue: (key: string, value: string) => void;
}

/**
 * Regex pattern for text variables
 */
const TEXT_VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Store original text values for objects
 */
interface OriginalTextMap {
  [objectId: string]: string;
}

/**
 * usePreviewMode - Hook for toggling between edit and preview mode
 *
 * In preview mode:
 * - Variables like {{product_name}} are replaced with sample data values
 * - Image variables show bound images
 *
 * In edit mode:
 * - Original variable syntax is shown
 */
export function usePreviewMode(): UsePreviewModeReturn {
  const { canvas, variables, markDirty } = useCanvas();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [sampleData, setSampleData] = useState<PreviewData>({});

  // Store original text values when entering preview mode
  const originalTextsRef = useRef<OriginalTextMap>({});
  const originalImagesRef = useRef<Map<string, string>>(new Map());

  /**
   * Replace variables in text with sample data values
   */
  const substituteVariables = useCallback(
    (text: string, data: PreviewData): string => {
      return text.replace(TEXT_VARIABLE_PATTERN, (match, varName) => {
        return data[varName] ?? match;
      });
    },
    []
  );

  /**
   * Apply preview substitutions to canvas
   */
  const applyPreview = useCallback(
    (data: PreviewData) => {
      if (!canvas) return;

      const objects = canvas.getObjects();
      originalTextsRef.current = {};
      originalImagesRef.current.clear();

      objects.forEach((obj, index) => {
        const objId = `obj-${index}`;
        const objType = obj.type ?? '';

        // Handle text objects
        if (['i-text', 'text', 'textbox'].includes(objType.toLowerCase())) {
          const textObj = obj as fabric.IText;
          const originalText = textObj.text ?? '';

          // Store original
          originalTextsRef.current[objId] = originalText;

          // Apply substitution
          const previewText = substituteVariables(originalText, data);
          if (previewText !== originalText) {
            textObj.set('text', previewText);
          }
        }

        // Handle image variable bindings
        const variableBinding = (obj as unknown as { variableBinding?: string })
          .variableBinding;
        if (variableBinding) {
          const varMatch = variableBinding.match(/^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/);
          if (varMatch) {
            const varName = varMatch[1];
            const imageUrl = data[varName];

            if (imageUrl && obj.type === 'image') {
              const imgObj = obj as fabric.FabricImage;
              // Store original src
              const originalSrc = imgObj.getSrc?.() ?? '';
              originalImagesRef.current.set(objId, originalSrc);

              // Load new image (async)
              fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })
                .then((newImg) => {
                  if (newImg.getElement()) {
                    imgObj.setElement(newImg.getElement());
                    canvas.renderAll();
                  }
                })
                .catch((err) => {
                  console.warn('Failed to load preview image:', err);
                });
            }
          }
        }
      });

      canvas.renderAll();
    },
    [canvas, substituteVariables]
  );

  /**
   * Restore original values when exiting preview
   */
  const restoreOriginal = useCallback(() => {
    if (!canvas) return;

    const objects = canvas.getObjects();

    objects.forEach((obj, index) => {
      const objId = `obj-${index}`;
      const objType = obj.type ?? '';

      // Restore text objects
      if (['i-text', 'text', 'textbox'].includes(objType.toLowerCase())) {
        const textObj = obj as fabric.IText;
        const originalText = originalTextsRef.current[objId];

        if (originalText !== undefined) {
          textObj.set('text', originalText);
        }
      }

      // Restore image objects
      const originalSrc = originalImagesRef.current.get(objId);
      if (originalSrc && obj.type === 'image') {
        const imgObj = obj as fabric.FabricImage;
        fabric.FabricImage.fromURL(originalSrc, { crossOrigin: 'anonymous' })
          .then((newImg) => {
            if (newImg.getElement()) {
              imgObj.setElement(newImg.getElement());
              canvas.renderAll();
            }
          })
          .catch((err) => {
            console.warn('Failed to restore original image:', err);
          });
      }
    });

    canvas.renderAll();
    originalTextsRef.current = {};
    originalImagesRef.current.clear();
  }, [canvas]);

  /**
   * Enter preview mode
   */
  const enterPreview = useCallback(() => {
    if (isPreviewMode) return;

    // Generate default sample data from variables if not set
    const defaultData: PreviewData = {};
    variables.forEach((v) => {
      if (!(v.name in sampleData)) {
        defaultData[v.name] = v.defaultValue || `[${v.name}]`;
      }
    });

    const mergedData = { ...defaultData, ...sampleData };
    setSampleData(mergedData);

    applyPreview(mergedData);
    setIsPreviewMode(true);
  }, [isPreviewMode, variables, sampleData, applyPreview]);

  /**
   * Exit preview mode
   */
  const exitPreview = useCallback(() => {
    if (!isPreviewMode) return;

    restoreOriginal();
    setIsPreviewMode(false);
  }, [isPreviewMode, restoreOriginal]);

  /**
   * Toggle preview mode
   */
  const togglePreview = useCallback(() => {
    if (isPreviewMode) {
      exitPreview();
    } else {
      enterPreview();
    }
  }, [isPreviewMode, enterPreview, exitPreview]);

  /**
   * Update sample data
   */
  const handleSetSampleData = useCallback(
    (data: PreviewData) => {
      setSampleData(data);

      // If in preview mode, reapply with new data
      if (isPreviewMode && canvas) {
        restoreOriginal();
        applyPreview(data);
      }
    },
    [isPreviewMode, canvas, restoreOriginal, applyPreview]
  );

  /**
   * Update a single sample value
   */
  const updateSampleValue = useCallback(
    (key: string, value: string) => {
      const newData = { ...sampleData, [key]: value };
      handleSetSampleData(newData);
    },
    [sampleData, handleSetSampleData]
  );

  return useMemo(
    () => ({
      isPreviewMode,
      sampleData,
      togglePreview,
      enterPreview,
      exitPreview,
      setSampleData: handleSetSampleData,
      updateSampleValue,
    }),
    [
      isPreviewMode,
      sampleData,
      togglePreview,
      enterPreview,
      exitPreview,
      handleSetSampleData,
      updateSampleValue,
    ]
  );
}

export default usePreviewMode;
