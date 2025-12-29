'use client';

import { useCallback, useMemo } from 'react';
import * as fabric from 'fabric';
import { useCanvas } from '../CanvasContext';
import type { FabricCanvasJSON } from '../types';
import { ZOOM_CONSTRAINTS, DEFAULT_CANVAS_SETTINGS } from '../types';

/**
 * Text options for adding text objects
 */
export interface TextOptions {
  text?: string;
  left?: number;
  top?: number;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: number;
}

/**
 * Image options for adding image objects
 */
export interface ImageOptions {
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
}

/**
 * Rectangle options for adding rectangle objects
 */
export interface RectOptions {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  ry?: number;
  angle?: number;
}

/**
 * Circle options for adding circle objects
 */
export interface CircleOptions {
  left?: number;
  top?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  angle?: number;
}

/**
 * Line options for adding line objects
 */
export interface LineOptions {
  points?: [number, number, number, number];
  stroke?: string;
  strokeWidth?: number;
  left?: number;
  top?: number;
}

/**
 * Return type for useFabricCanvas hook
 */
export interface UseFabricCanvasReturn {
  canvas: fabric.Canvas | null;
  isReady: boolean;

  // Object creation
  addText: (options?: TextOptions) => fabric.IText | null;
  addImage: (url: string, options?: ImageOptions) => Promise<fabric.FabricImage | null>;
  addRect: (options?: RectOptions) => fabric.Rect | null;
  addCircle: (options?: CircleOptions) => fabric.Circle | null;
  addLine: (options?: LineOptions) => fabric.Line | null;

  // Selection operations
  deleteSelected: () => void;
  duplicateSelected: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  selectAll: () => void;
  deselectAll: () => void;

  // Serialization
  getCanvasJson: () => FabricCanvasJSON;
  loadFromJson: (json: FabricCanvasJSON) => Promise<void>;

  // Zoom
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  setZoom: (level: number) => void;
  resetZoom: () => void;
}

/**
 * useFabricCanvas - Hook for canvas operations
 *
 * Provides methods for:
 * - Adding objects (text, images, shapes)
 * - Selection operations (delete, duplicate, layer ordering)
 * - Serialization (save/load JSON)
 * - Zoom controls
 */
export function useFabricCanvas(): UseFabricCanvasReturn {
  const { canvas, zoom, setZoom, canvasSize, markDirty } = useCanvas();

  const isReady = canvas !== null;

  /**
   * Add text object to canvas
   */
  const addText = useCallback(
    (options: TextOptions = {}): fabric.IText | null => {
      if (!canvas) return null;

      const text = new fabric.IText(options.text ?? 'Edit text', {
        left: options.left ?? canvasSize.width / 2,
        top: options.top ?? canvasSize.height / 2,
        fontSize: options.fontSize ?? 24,
        fontFamily: options.fontFamily ?? 'Arial',
        fill: options.fill ?? '#000000',
        fontWeight: options.fontWeight ?? 'normal',
        fontStyle: (options.fontStyle ?? 'normal') as '' | 'normal' | 'italic' | 'oblique',
        textAlign: (options.textAlign ?? 'left') as 'left' | 'center' | 'right' | 'justify' | 'justify-left' | 'justify-center' | 'justify-right',
        lineHeight: options.lineHeight ?? 1.16,
        originX: 'center',
        originY: 'center',
      });

      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.renderAll();
      markDirty();

      return text;
    },
    [canvas, canvasSize, markDirty]
  );

  /**
   * Add image object to canvas from URL
   */
  const addImage = useCallback(
    async (
      url: string,
      options: ImageOptions = {}
    ): Promise<fabric.FabricImage | null> => {
      if (!canvas) return null;

      try {
        const img = await fabric.FabricImage.fromURL(url, {
          crossOrigin: 'anonymous',
        });

        img.set({
          left: options.left ?? canvasSize.width / 2,
          top: options.top ?? canvasSize.height / 2,
          scaleX: options.scaleX ?? 1,
          scaleY: options.scaleY ?? 1,
          angle: options.angle ?? 0,
          originX: 'center',
          originY: 'center',
        });

        // Scale down if larger than canvas
        const maxScale = Math.min(
          (canvasSize.width * 0.8) / (img.width ?? 1),
          (canvasSize.height * 0.8) / (img.height ?? 1),
          1
        );

        if (maxScale < 1) {
          img.scale(maxScale);
        }

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        markDirty();

        return img;
      } catch (error) {
        console.error('Failed to load image:', error);
        return null;
      }
    },
    [canvas, canvasSize, markDirty]
  );

  /**
   * Add rectangle object to canvas
   */
  const addRect = useCallback(
    (options: RectOptions = {}): fabric.Rect | null => {
      if (!canvas) return null;

      const rect = new fabric.Rect({
        left: options.left ?? canvasSize.width / 2,
        top: options.top ?? canvasSize.height / 2,
        width: options.width ?? 100,
        height: options.height ?? 100,
        fill: options.fill ?? '#4a90d9',
        stroke: options.stroke ?? '',
        strokeWidth: options.strokeWidth ?? 0,
        rx: options.rx ?? 0,
        ry: options.ry ?? 0,
        angle: options.angle ?? 0,
        originX: 'center',
        originY: 'center',
      });

      canvas.add(rect);
      canvas.setActiveObject(rect);
      canvas.renderAll();
      markDirty();

      return rect;
    },
    [canvas, canvasSize, markDirty]
  );

  /**
   * Add circle object to canvas
   */
  const addCircle = useCallback(
    (options: CircleOptions = {}): fabric.Circle | null => {
      if (!canvas) return null;

      const circle = new fabric.Circle({
        left: options.left ?? canvasSize.width / 2,
        top: options.top ?? canvasSize.height / 2,
        radius: options.radius ?? 50,
        fill: options.fill ?? '#4a90d9',
        stroke: options.stroke ?? '',
        strokeWidth: options.strokeWidth ?? 0,
        angle: options.angle ?? 0,
        originX: 'center',
        originY: 'center',
      });

      canvas.add(circle);
      canvas.setActiveObject(circle);
      canvas.renderAll();
      markDirty();

      return circle;
    },
    [canvas, canvasSize, markDirty]
  );

  /**
   * Add line object to canvas
   */
  const addLine = useCallback(
    (options: LineOptions = {}): fabric.Line | null => {
      if (!canvas) return null;

      const points = options.points ?? [50, 50, 200, 200];
      const line = new fabric.Line(points, {
        left: options.left ?? canvasSize.width / 2,
        top: options.top ?? canvasSize.height / 2,
        stroke: options.stroke ?? '#000000',
        strokeWidth: options.strokeWidth ?? 2,
        originX: 'center',
        originY: 'center',
      });

      canvas.add(line);
      canvas.setActiveObject(line);
      canvas.renderAll();
      markDirty();

      return line;
    },
    [canvas, canvasSize, markDirty]
  );

  /**
   * Delete selected objects
   */
  const deleteSelected = useCallback(() => {
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    canvas.discardActiveObject();
    activeObjects.forEach((obj) => canvas.remove(obj));
    canvas.renderAll();
    markDirty();
  }, [canvas, markDirty]);

  /**
   * Duplicate selected objects
   */
  const duplicateSelected = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.clone().then((cloned: fabric.FabricObject) => {
      cloned.set({
        left: (cloned.left ?? 0) + 20,
        top: (cloned.top ?? 0) + 20,
      });

      if (cloned instanceof fabric.ActiveSelection) {
        cloned.canvas = canvas;
        cloned.forEachObject((obj) => {
          canvas.add(obj);
        });
        cloned.setCoords();
      } else {
        canvas.add(cloned);
      }

      canvas.setActiveObject(cloned);
      canvas.renderAll();
      markDirty();
    }).catch((error) => {
      console.error('Failed to duplicate object:', error);
    });
  }, [canvas, markDirty]);

  /**
   * Bring selected object to front
   */
  const bringToFront = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.bringObjectToFront(activeObject);
    canvas.renderAll();
    markDirty();
  }, [canvas, markDirty]);

  /**
   * Send selected object to back
   */
  const sendToBack = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.sendObjectToBack(activeObject);
    canvas.renderAll();
    markDirty();
  }, [canvas, markDirty]);

  /**
   * Bring selected object forward one layer
   */
  const bringForward = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.bringObjectForward(activeObject);
    canvas.renderAll();
    markDirty();
  }, [canvas, markDirty]);

  /**
   * Send selected object backward one layer
   */
  const sendBackward = useCallback(() => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.sendObjectBackwards(activeObject);
    canvas.renderAll();
    markDirty();
  }, [canvas, markDirty]);

  /**
   * Select all objects
   */
  const selectAll = useCallback(() => {
    if (!canvas) return;

    canvas.discardActiveObject();
    const objects = canvas.getObjects();

    if (objects.length === 0) return;

    const selection = new fabric.ActiveSelection(objects, { canvas });
    canvas.setActiveObject(selection);
    canvas.renderAll();
  }, [canvas]);

  /**
   * Deselect all objects
   */
  const deselectAll = useCallback(() => {
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas]);

  /**
   * Get canvas JSON
   */
  const getCanvasJson = useCallback((): FabricCanvasJSON => {
    if (!canvas) {
      return {
        version: fabric.version,
        objects: [],
        width: canvasSize.width,
        height: canvasSize.height,
      };
    }

    // Fabric.js v7 toJSON() doesn't accept arguments - custom properties are automatically included
    const json = canvas.toJSON();
    return {
      ...json,
      width: canvas.width ?? canvasSize.width,
      height: canvas.height ?? canvasSize.height,
    } as FabricCanvasJSON;
  }, [canvas, canvasSize]);

  /**
   * Load canvas from JSON
   */
  const loadFromJson = useCallback(
    async (json: FabricCanvasJSON): Promise<void> => {
      if (!canvas) return;

      try {
        await canvas.loadFromJSON(json);
        canvas.renderAll();
      } catch (error) {
        console.error('Failed to load canvas from JSON:', error);
        throw error;
      }
    },
    [canvas]
  );

  /**
   * Zoom in
   */
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + ZOOM_CONSTRAINTS.STEP, ZOOM_CONSTRAINTS.MAX);
    setZoom(newZoom);

    if (canvas) {
      canvas.setZoom(newZoom);
      canvas.renderAll();
    }
  }, [canvas, zoom, setZoom]);

  /**
   * Zoom out
   */
  const zoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - ZOOM_CONSTRAINTS.STEP, ZOOM_CONSTRAINTS.MIN);
    setZoom(newZoom);

    if (canvas) {
      canvas.setZoom(newZoom);
      canvas.renderAll();
    }
  }, [canvas, zoom, setZoom]);

  /**
   * Zoom to fit canvas in viewport
   */
  const zoomToFit = useCallback(() => {
    if (!canvas) return;

    // Reset zoom to 1 for now
    // In a full implementation, would calculate based on container size
    setZoom(1);
    canvas.setZoom(1);
    canvas.renderAll();
  }, [canvas, setZoom]);

  /**
   * Set specific zoom level
   */
  const handleSetZoom = useCallback(
    (level: number) => {
      const clampedZoom = Math.max(
        ZOOM_CONSTRAINTS.MIN,
        Math.min(ZOOM_CONSTRAINTS.MAX, level)
      );
      setZoom(clampedZoom);

      if (canvas) {
        canvas.setZoom(clampedZoom);
        canvas.renderAll();
      }
    },
    [canvas, setZoom]
  );

  /**
   * Reset zoom to 100%
   */
  const resetZoom = useCallback(() => {
    handleSetZoom(1);
  }, [handleSetZoom]);

  return useMemo(
    () => ({
      canvas,
      isReady,

      // Object creation
      addText,
      addImage,
      addRect,
      addCircle,
      addLine,

      // Selection operations
      deleteSelected,
      duplicateSelected,
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      selectAll,
      deselectAll,

      // Serialization
      getCanvasJson,
      loadFromJson,

      // Zoom
      zoom,
      zoomIn,
      zoomOut,
      zoomToFit,
      setZoom: handleSetZoom,
      resetZoom,
    }),
    [
      canvas,
      isReady,
      addText,
      addImage,
      addRect,
      addCircle,
      addLine,
      deleteSelected,
      duplicateSelected,
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      selectAll,
      deselectAll,
      getCanvasJson,
      loadFromJson,
      zoom,
      zoomIn,
      zoomOut,
      zoomToFit,
      handleSetZoom,
      resetZoom,
    ]
  );
}

export default useFabricCanvas;
