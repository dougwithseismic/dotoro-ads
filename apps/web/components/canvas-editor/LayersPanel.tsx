'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import type * as fabric from 'fabric';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Type,
  Image,
  Square,
  Circle,
  Minus,
  Layers,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { useCanvas } from './CanvasContext';
import { useFabricCanvas } from './hooks/useFabricCanvas';
import styles from './LayersPanel.module.css';

/**
 * Layer item representation
 */
interface LayerItem {
  id: string;
  object: fabric.FabricObject;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
}

/**
 * Get icon for layer type
 */
function getLayerIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'i-text':
    case 'text':
    case 'textbox':
      return <Type size={14} />;
    case 'image':
      return <Image size={14} />;
    case 'rect':
      return <Square size={14} />;
    case 'circle':
      return <Circle size={14} />;
    case 'line':
      return <Minus size={14} />;
    default:
      return <Layers size={14} />;
  }
}

/**
 * Get display name for layer type
 */
function getLayerTypeName(type: string): string {
  switch (type.toLowerCase()) {
    case 'i-text':
      return 'Text';
    case 'textbox':
      return 'Textbox';
    case 'image':
      return 'Image';
    case 'rect':
      return 'Rectangle';
    case 'circle':
      return 'Circle';
    case 'line':
      return 'Line';
    case 'path':
      return 'Path';
    case 'group':
      return 'Group';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

/**
 * LayersPanel Props
 */
export interface LayersPanelProps {
  /** Additional CSS class name */
  className?: string;
}

/**
 * LayersPanel - Panel showing all canvas objects as layers
 *
 * Features:
 * - List all canvas objects (bottom to top = back to front)
 * - Visibility toggle (eye icon)
 * - Lock toggle
 * - Layer type icon
 * - Layer name (double-click to rename)
 * - Click to select on canvas
 * - Drag to reorder (or up/down buttons)
 * - Keyboard navigation
 */
export function LayersPanel({ className }: LayersPanelProps) {
  const { canvas, selectedObjects, markDirty } = useCanvas();
  const { bringForward, sendBackward, bringToFront, sendToBack } = useFabricCanvas();

  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Build layer list from canvas objects
   */
  const buildLayerList = useCallback(() => {
    if (!canvas) {
      setLayers([]);
      return;
    }

    const objects = canvas.getObjects();
    const activeObjects = canvas.getActiveObjects();

    // Reverse to show layers from top to bottom (front to back)
    const layerItems: LayerItem[] = objects.map((obj, index) => {
      const objType = obj.type ?? 'unknown';
      const objName = (obj as unknown as { name?: string }).name || `${getLayerTypeName(objType)} ${index + 1}`;

      return {
        id: `layer-${index}`,
        object: obj,
        name: objName,
        type: objType,
        visible: obj.visible !== false,
        locked: Boolean(obj.lockMovementX && obj.lockMovementY),
        selected: activeObjects.includes(obj),
      };
    }).reverse();

    setLayers(layerItems);
  }, [canvas]);

  /**
   * Update layers when canvas changes
   */
  useEffect(() => {
    if (!canvas) return;

    buildLayerList();

    const handleObjectChange = () => {
      buildLayerList();
    };

    canvas.on('object:added', handleObjectChange);
    canvas.on('object:removed', handleObjectChange);
    canvas.on('object:modified', handleObjectChange);
    canvas.on('selection:created', handleObjectChange);
    canvas.on('selection:updated', handleObjectChange);
    canvas.on('selection:cleared', handleObjectChange);

    return () => {
      canvas.off('object:added', handleObjectChange);
      canvas.off('object:removed', handleObjectChange);
      canvas.off('object:modified', handleObjectChange);
      canvas.off('selection:created', handleObjectChange);
      canvas.off('selection:updated', handleObjectChange);
      canvas.off('selection:cleared', handleObjectChange);
    };
  }, [canvas, buildLayerList]);

  /**
   * Handle layer click to select on canvas
   */
  const handleLayerClick = useCallback((layer: LayerItem, event: React.MouseEvent) => {
    if (!canvas) return;

    // Don't select if clicking on controls
    if ((event.target as HTMLElement).closest(`.${styles.layerAction}`)) {
      return;
    }

    canvas.discardActiveObject();
    canvas.setActiveObject(layer.object);
    canvas.renderAll();
  }, [canvas]);

  /**
   * Handle double-click to rename layer
   */
  const handleDoubleClick = useCallback((layer: LayerItem) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, []);

  /**
   * Save layer name
   */
  const saveLayerName = useCallback(() => {
    if (!canvas || !editingLayerId) return;

    const layer = layers.find((l) => l.id === editingLayerId);
    if (layer && editingName.trim()) {
      (layer.object as unknown as { name: string }).name = editingName.trim();
      markDirty();
      buildLayerList();
    }

    setEditingLayerId(null);
    setEditingName('');
  }, [canvas, editingLayerId, editingName, layers, markDirty, buildLayerList]);

  /**
   * Handle input key down
   */
  const handleInputKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      saveLayerName();
    } else if (event.key === 'Escape') {
      setEditingLayerId(null);
      setEditingName('');
    }
  }, [saveLayerName]);

  /**
   * Toggle layer visibility
   */
  const toggleVisibility = useCallback((layer: LayerItem) => {
    if (!canvas) return;

    layer.object.set('visible', !layer.visible);
    canvas.renderAll();
    markDirty();
    buildLayerList();
  }, [canvas, markDirty, buildLayerList]);

  /**
   * Toggle layer lock
   */
  const toggleLock = useCallback((layer: LayerItem) => {
    if (!canvas) return;

    const newLockState = !layer.locked;

    layer.object.set({
      lockMovementX: newLockState,
      lockMovementY: newLockState,
      lockRotation: newLockState,
      lockScalingX: newLockState,
      lockScalingY: newLockState,
      hasControls: !newLockState,
    });

    canvas.renderAll();
    markDirty();
    buildLayerList();
  }, [canvas, markDirty, buildLayerList]);

  /**
   * Move layer up (bring forward)
   */
  const moveLayerUp = useCallback((layer: LayerItem) => {
    if (!canvas) return;

    canvas.setActiveObject(layer.object);
    bringForward();
    buildLayerList();
  }, [canvas, bringForward, buildLayerList]);

  /**
   * Move layer down (send backward)
   */
  const moveLayerDown = useCallback((layer: LayerItem) => {
    if (!canvas) return;

    canvas.setActiveObject(layer.object);
    sendBackward();
    buildLayerList();
  }, [canvas, sendBackward, buildLayerList]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent, layer: LayerItem, index: number) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          const prevButton = document.querySelector(`[data-layer-index="${index - 1}"]`) as HTMLElement;
          prevButton?.focus();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (index < layers.length - 1) {
          const nextButton = document.querySelector(`[data-layer-index="${index + 1}"]`) as HTMLElement;
          nextButton?.focus();
        }
        break;
      case 'Enter':
        handleLayerClick(layer, event as unknown as React.MouseEvent);
        break;
      case 'F2':
        event.preventDefault();
        handleDoubleClick(layer);
        break;
    }
  }, [layers.length, handleLayerClick, handleDoubleClick]);

  return (
    <div className={`${styles.panel} ${className ?? ''}`}>
      <div className={styles.panelHeader}>
        <Layers size={16} />
        <span className={styles.panelTitle}>Layers</span>
        <span className={styles.layerCount}>{layers.length}</span>
      </div>

      <div className={styles.layerList} role="listbox" aria-label="Layers">
        {layers.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No layers yet</p>
            <p className={styles.emptyHint}>Add elements using the toolbar</p>
          </div>
        ) : (
          layers.map((layer, index) => (
            <div
              key={layer.id}
              data-layer-index={index}
              className={`${styles.layerRow} ${layer.selected ? styles.selected : ''} ${layer.locked ? styles.locked : ''}`}
              onClick={(e) => handleLayerClick(layer, e)}
              onDoubleClick={() => handleDoubleClick(layer)}
              onKeyDown={(e) => handleKeyDown(e, layer, index)}
              role="option"
              aria-selected={layer.selected}
              tabIndex={0}
            >
              <div className={styles.dragHandle}>
                <GripVertical size={12} />
              </div>

              <button
                type="button"
                className={`${styles.layerAction} ${!layer.visible ? styles.inactive : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisibility(layer);
                }}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              <button
                type="button"
                className={`${styles.layerAction} ${layer.locked ? styles.active : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLock(layer);
                }}
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
              >
                {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>

              <div className={styles.layerIcon}>
                {getLayerIcon(layer.type)}
              </div>

              <div className={styles.layerName}>
                {editingLayerId === layer.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveLayerName}
                    onKeyDown={handleInputKeyDown}
                    className={styles.layerNameInput}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className={styles.layerNameText}>{layer.name}</span>
                )}
              </div>

              <div className={styles.layerOrderControls}>
                <button
                  type="button"
                  className={styles.orderButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayerUp(layer);
                  }}
                  disabled={index === 0}
                  title="Move up (bring forward)"
                  aria-label="Move layer up"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  type="button"
                  className={styles.orderButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayerDown(layer);
                  }}
                  disabled={index === layers.length - 1}
                  title="Move down (send backward)"
                  aria-label="Move layer down"
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LayersPanel;
