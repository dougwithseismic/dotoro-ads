'use client';

import { useCallback, useState } from 'react';
import {
  MousePointer2,
  Type,
  Image,
  Square,
  Circle,
  Minus,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize,
  Save,
  Eye,
  Loader2,
} from 'lucide-react';
import { useCanvas } from './CanvasContext';
import { useFabricCanvas } from './hooks/useFabricCanvas';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import type { EditorTool } from './types';
import { ZOOM_CONSTRAINTS } from './types';
import styles from './EditorToolbar.module.css';

/**
 * Tool configuration for the toolbar
 */
interface ToolConfig {
  id: EditorTool;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const TOOLS: ToolConfig[] = [
  { id: 'select', label: 'Select', icon: <MousePointer2 size={18} />, shortcut: 'V' },
  { id: 'text', label: 'Text', icon: <Type size={18} />, shortcut: 'T' },
  { id: 'image', label: 'Image', icon: <Image size={18} />, shortcut: 'I' },
  { id: 'rect', label: 'Rectangle', icon: <Square size={18} />, shortcut: 'R' },
  { id: 'circle', label: 'Circle', icon: <Circle size={18} />, shortcut: 'C' },
  { id: 'line', label: 'Line', icon: <Minus size={18} />, shortcut: 'L' },
];

/**
 * Zoom presets for quick zoom selection
 */
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

/**
 * EditorToolbar Props
 */
export interface EditorToolbarProps {
  /** Callback when save is clicked */
  onSave?: () => void | Promise<void>;
  /** Callback when preview is clicked */
  onPreview?: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Whether save button is disabled */
  saveDisabled?: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * EditorToolbar - Main toolbar for the canvas editor
 *
 * Features:
 * - Tool selection (Select, Text, Image, Rectangle, Circle, Line)
 * - Edit actions (Undo, Redo, Delete, Duplicate)
 * - Zoom controls (Zoom in/out, Fit, 100%, Slider)
 * - Save and Preview buttons
 */
export function EditorToolbar({
  onSave,
  onPreview,
  isSaving = false,
  saveDisabled = false,
  className,
}: EditorToolbarProps) {
  const { activeTool, setTool, selectedObjects, canvas } = useCanvas();
  const { deleteSelected, duplicateSelected, zoom, zoomIn, zoomOut, zoomToFit, setZoom } = useFabricCanvas();
  const { undo, redo, canUndo, canRedo } = useCanvasHistory({ canvas });

  const [showZoomDropdown, setShowZoomDropdown] = useState(false);

  const hasSelection = selectedObjects.length > 0;

  /**
   * Handle tool selection
   */
  const handleToolSelect = useCallback((tool: EditorTool) => {
    setTool(tool);

    // Add object when tool is selected (except select tool)
    if (!canvas) return;

    // For now, just switch the tool - actual object creation can happen on canvas click
    // This is a common pattern where selecting a tool prepares for object creation
  }, [setTool, canvas]);

  /**
   * Handle zoom slider change
   */
  const handleZoomSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setZoom(value);
  }, [setZoom]);

  /**
   * Handle zoom preset selection
   */
  const handleZoomPreset = useCallback((preset: number) => {
    setZoom(preset);
    setShowZoomDropdown(false);
  }, [setZoom]);

  /**
   * Handle save click with error handling
   */
  const handleSave = useCallback(async () => {
    if (onSave && !isSaving && !saveDisabled) {
      try {
        await onSave();
      } catch (error) {
        console.error('Failed to save canvas:', error);
        // Error should be handled by the parent via onSave rejection
        // Parent components can implement toast/notification display
      }
    }
  }, [onSave, isSaving, saveDisabled]);

  /**
   * Format zoom percentage for display
   */
  const formatZoomPercent = (zoomLevel: number) => {
    return `${Math.round(zoomLevel * 100)}%`;
  };

  return (
    <div className={`${styles.toolbar} ${className ?? ''}`}>
      {/* Tool Selection */}
      <div className={styles.toolGroup}>
        <span className={styles.groupLabel}>Tools</span>
        <div className={styles.tools}>
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`${styles.toolButton} ${activeTool === tool.id ? styles.active : ''}`}
              onClick={() => handleToolSelect(tool.id)}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              aria-label={tool.label}
              aria-pressed={activeTool === tool.id}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Edit Actions */}
      <div className={styles.toolGroup}>
        <span className={styles.groupLabel}>Edit</span>
        <div className={styles.tools}>
          <button
            type="button"
            className={styles.toolButton}
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={18} />
          </button>
          <button
            type="button"
            className={styles.toolButton}
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <Redo2 size={18} />
          </button>
          <button
            type="button"
            className={styles.toolButton}
            onClick={deleteSelected}
            disabled={!hasSelection}
            title="Delete (Delete)"
            aria-label="Delete selected"
          >
            <Trash2 size={18} />
          </button>
          <button
            type="button"
            className={styles.toolButton}
            onClick={duplicateSelected}
            disabled={!hasSelection}
            title="Duplicate (Ctrl+D)"
            aria-label="Duplicate selected"
          >
            <Copy size={18} />
          </button>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Zoom Controls */}
      <div className={styles.toolGroup}>
        <span className={styles.groupLabel}>Zoom</span>
        <div className={styles.zoomControls}>
          <button
            type="button"
            className={styles.toolButton}
            onClick={zoomOut}
            disabled={zoom <= ZOOM_CONSTRAINTS.MIN}
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </button>

          <div className={styles.zoomSliderContainer}>
            <input
              type="range"
              min={ZOOM_CONSTRAINTS.MIN}
              max={ZOOM_CONSTRAINTS.MAX}
              step={0.05}
              value={zoom}
              onChange={handleZoomSliderChange}
              className={styles.zoomSlider}
              aria-label="Zoom level"
            />
          </div>

          <button
            type="button"
            className={styles.toolButton}
            onClick={zoomIn}
            disabled={zoom >= ZOOM_CONSTRAINTS.MAX}
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </button>

          <div className={styles.zoomDropdownContainer}>
            <button
              type="button"
              className={styles.zoomValueButton}
              onClick={() => setShowZoomDropdown(!showZoomDropdown)}
              aria-haspopup="listbox"
              aria-expanded={showZoomDropdown}
            >
              {formatZoomPercent(zoom)}
            </button>
            {showZoomDropdown && (
              <div className={styles.zoomDropdown} role="listbox">
                <button
                  type="button"
                  className={styles.zoomPresetButton}
                  onClick={zoomToFit}
                  role="option"
                >
                  Fit
                </button>
                {ZOOM_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`${styles.zoomPresetButton} ${zoom === preset ? styles.activePreset : ''}`}
                    onClick={() => handleZoomPreset(preset)}
                    role="option"
                    aria-selected={zoom === preset}
                  >
                    {formatZoomPercent(preset)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.toolButton}
            onClick={zoomToFit}
            title="Fit to view"
            aria-label="Fit to view"
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>

      <div className={styles.spacer} />

      {/* Right Actions */}
      <div className={styles.rightActions}>
        {onPreview && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onPreview}
            title="Preview"
            aria-label="Preview"
          >
            <Eye size={18} />
            <span>Preview</span>
          </button>
        )}

        {onSave && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={isSaving || saveDisabled}
            title="Save"
            aria-label="Save"
          >
            {isSaving ? (
              <Loader2 size={18} className={styles.spinning} />
            ) : (
              <Save size={18} />
            )}
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default EditorToolbar;
