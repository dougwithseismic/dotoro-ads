'use client';

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import * as fabric from 'fabric';
import type { FabricCanvasJSON, FabricCanvasProps } from './types';
import { DEFAULT_CANVAS_SETTINGS } from './types';
import styles from './FabricCanvas.module.css';

/**
 * Ref handle for FabricCanvas component
 */
export interface FabricCanvasRef {
  /** Get the Fabric.js canvas instance */
  canvas: fabric.Canvas | null;
  /** Export canvas to JSON */
  getJson: () => FabricCanvasJSON;
  /** Load canvas from JSON */
  loadFromJson: (json: FabricCanvasJSON) => Promise<void>;
  /** Clear canvas */
  clear: () => void;
  /** Get the canvas HTML element */
  getElement: () => HTMLCanvasElement | null;
}

/**
 * FabricCanvas - React wrapper component for Fabric.js canvas
 *
 * Handles:
 * - Canvas initialization and disposal
 * - Object events (modified, added, removed)
 * - Selection events (created, updated, cleared)
 * - Container resize with ResizeObserver
 * - JSON serialization and loading
 */
export const FabricCanvas = forwardRef<FabricCanvasRef, FabricCanvasProps>(
  (
    {
      initialJson,
      width = DEFAULT_CANVAS_SETTINGS.WIDTH,
      height = DEFAULT_CANVAS_SETTINGS.HEIGHT,
      onChange,
      onSelectionChange,
      readOnly = false,
      className,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitializedRef = useRef(false);

    /**
     * Get canvas JSON in serialized format
     */
    const getJson = useCallback((): FabricCanvasJSON => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        return {
          version: fabric.version,
          objects: [],
          width,
          height,
        };
      }

      // Fabric.js v7 toJSON() doesn't accept arguments - custom properties are automatically included
      const json = canvas.toJSON();
      return {
        ...json,
        width: canvas.width ?? width,
        height: canvas.height ?? height,
      } as FabricCanvasJSON;
    }, [width, height]);

    /**
     * Load canvas from JSON
     */
    const loadFromJson = useCallback(
      async (json: FabricCanvasJSON): Promise<void> => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        try {
          await canvas.loadFromJSON(json);
          canvas.renderAll();
        } catch (error) {
          console.error('Failed to load canvas from JSON:', error);
          throw error;
        }
      },
      []
    );

    /**
     * Clear canvas
     */
    const clear = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      canvas.clear();
      canvas.backgroundColor = DEFAULT_CANVAS_SETTINGS.BACKGROUND;
      canvas.renderAll();
    }, []);

    /**
     * Get canvas element
     */
    const getElement = useCallback((): HTMLCanvasElement | null => {
      return canvasRef.current;
    }, []);

    // Expose ref methods
    useImperativeHandle(
      ref,
      () => ({
        canvas: fabricCanvasRef.current,
        getJson,
        loadFromJson,
        clear,
        getElement,
      }),
      [getJson, loadFromJson, clear, getElement]
    );

    /**
     * Handle canvas change events
     */
    const handleCanvasChange = useCallback(() => {
      if (onChange) {
        onChange(getJson());
      }
    }, [onChange, getJson]);

    /**
     * Handle selection change events
     */
    const handleSelectionChange = useCallback(
      (objects: fabric.FabricObject[]) => {
        if (onSelectionChange) {
          onSelectionChange(objects);
        }
      },
      [onSelectionChange]
    );

    // Store callbacks in refs to avoid stale closures in mount-only useEffect
    const handleCanvasChangeRef = useRef(handleCanvasChange);
    const handleSelectionChangeRef = useRef(handleSelectionChange);
    const loadFromJsonRef = useRef(loadFromJson);
    const initialJsonRef = useRef(initialJson);

    // Keep refs updated with latest callback references
    useEffect(() => {
      handleCanvasChangeRef.current = handleCanvasChange;
      handleSelectionChangeRef.current = handleSelectionChange;
      loadFromJsonRef.current = loadFromJson;
      initialJsonRef.current = initialJson;
    });

    // Initialize canvas
    useEffect(() => {
      if (!canvasRef.current || isInitializedRef.current) return;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: DEFAULT_CANVAS_SETTINGS.BACKGROUND,
        selection: !readOnly,
        preserveObjectStacking: true,
        selectionColor: DEFAULT_CANVAS_SETTINGS.SELECTION_COLOR,
        selectionBorderColor: DEFAULT_CANVAS_SETTINGS.SELECTION_BORDER_COLOR,
        selectionLineWidth: DEFAULT_CANVAS_SETTINGS.SELECTION_LINE_WIDTH,
      });

      fabricCanvasRef.current = canvas;
      isInitializedRef.current = true;

      // Object modification events - use refs to get latest callbacks
      const onObjectModified = () => handleCanvasChangeRef.current();
      const onObjectAdded = () => handleCanvasChangeRef.current();
      const onObjectRemoved = () => handleCanvasChangeRef.current();

      // Selection events - use refs to get latest callbacks
      // Fabric.js v7 selection events have partial event properties
      const onSelectionCreated = () => {
        const activeObjects = canvas.getActiveObjects();
        handleSelectionChangeRef.current(activeObjects);
      };

      const onSelectionUpdated = () => {
        const activeObjects = canvas.getActiveObjects();
        handleSelectionChangeRef.current(activeObjects);
      };

      const onSelectionCleared = () => {
        handleSelectionChangeRef.current([]);
      };

      // Register event listeners
      canvas.on('object:modified', onObjectModified);
      canvas.on('object:added', onObjectAdded);
      canvas.on('object:removed', onObjectRemoved);
      canvas.on('selection:created', onSelectionCreated);
      canvas.on('selection:updated', onSelectionUpdated);
      canvas.on('selection:cleared', onSelectionCleared);

      // Load initial JSON if provided
      if (initialJsonRef.current) {
        loadFromJsonRef.current(initialJsonRef.current).catch((error) => {
          console.error('Failed to load initial canvas JSON:', error);
        });
      }

      // Cleanup
      return () => {
        canvas.off('object:modified', onObjectModified);
        canvas.off('object:added', onObjectAdded);
        canvas.off('object:removed', onObjectRemoved);
        canvas.off('selection:created', onSelectionCreated);
        canvas.off('selection:updated', onSelectionUpdated);
        canvas.off('selection:cleared', onSelectionCleared);
        canvas.dispose();
        fabricCanvasRef.current = null;
        isInitializedRef.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally mount-only: callbacks are accessed via refs to avoid stale closures
    }, []);

    // Handle width/height changes
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      canvas.setDimensions({ width, height });
      canvas.renderAll();
    }, [width, height]);

    // Handle readOnly changes
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      canvas.selection = !readOnly;
      canvas.forEachObject((obj) => {
        obj.selectable = !readOnly;
        obj.evented = !readOnly;
      });
      canvas.renderAll();
    }, [readOnly]);

    // Handle container resize
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const resizeObserver = new ResizeObserver((entries) => {
        // Could be used for responsive canvas sizing
        // For now, we just log the resize
        // In future, could auto-scale canvas to fit container
      });

      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`${styles.canvasContainer} ${className ?? ''}`}
      >
        <canvas ref={canvasRef} />
      </div>
    );
  }
);

FabricCanvas.displayName = 'FabricCanvas';

export default FabricCanvas;
