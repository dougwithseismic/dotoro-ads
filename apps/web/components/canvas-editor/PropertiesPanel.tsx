'use client';

/**
 * PropertiesPanel Component
 *
 * Displays and allows editing of selected object properties:
 * - Position: X, Y coordinates
 * - Size: Width, Height with aspect ratio lock
 * - Transform: Rotation angle, Opacity
 * - Fill & Stroke: Colors and stroke width (for shapes)
 * - Text: Font size and color (for text objects)
 */

import { useCallback, useEffect, useState } from 'react';
import type * as fabric from 'fabric';
import {
  Move,
  Maximize2,
  RotateCw,
  Palette,
  Type,
  Link,
  Unlink,
} from 'lucide-react';
import { useCanvas } from './CanvasContext';
import styles from './PropertiesPanel.module.css';

export interface PropertiesPanelProps {
  /** The Fabric.js canvas instance */
  canvas: fabric.Canvas | null;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Input field component for numeric values
 */
interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  id: string;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  id,
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className={styles.inputGroup}>
      <label htmlFor={id} className={styles.inputLabel}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        <input
          type="number"
          id={id}
          value={Math.round(value)}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          className={styles.numberInput}
        />
        {unit && <span className={styles.inputUnit}>{unit}</span>}
      </div>
    </div>
  );
}

/**
 * Color input component
 */
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}

function ColorInput({ label, value, onChange, id }: ColorInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Ensure value is a valid hex color
  const colorValue = value && value.startsWith('#') ? value : '#000000';

  return (
    <div className={styles.inputGroup}>
      <label htmlFor={id} className={styles.inputLabel}>
        {label}
      </label>
      <div className={styles.colorInputWrapper}>
        <input
          type="color"
          id={id}
          value={colorValue}
          onChange={handleChange}
          className={styles.colorInput}
        />
        <span className={styles.colorValue}>{colorValue}</span>
      </div>
    </div>
  );
}

/**
 * Range/slider input component
 */
interface RangeInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  displayValue?: string;
  id: string;
}

function RangeInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  displayValue,
  id,
}: RangeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div className={styles.inputGroup}>
      <label htmlFor={id} className={styles.inputLabel}>
        {label}
      </label>
      <div className={styles.rangeWrapper}>
        <input
          type="range"
          id={id}
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          className={styles.rangeInput}
        />
        <span className={styles.rangeValue}>{displayValue ?? value}</span>
      </div>
    </div>
  );
}

/**
 * Check if object is a text type
 */
function isTextObject(obj: fabric.FabricObject): boolean {
  return (
    obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox'
  );
}

/**
 * PropertiesPanel - Edit properties of selected canvas object
 */
export function PropertiesPanel({ canvas, className }: PropertiesPanelProps) {
  const { selectedObjects, markDirty } = useCanvas();
  const [aspectLocked, setAspectLocked] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);

  const selectedObject = selectedObjects[0] ?? null;

  // Update aspect ratio when selection changes
  useEffect(() => {
    if (selectedObject) {
      const width = (selectedObject.width ?? 1) * (selectedObject.scaleX ?? 1);
      const height = (selectedObject.height ?? 1) * (selectedObject.scaleY ?? 1);
      setAspectRatio(width / height);
    }
  }, [selectedObject]);

  /**
   * Update a property on the selected object
   */
  const updateProperty = useCallback(
    (key: string, value: unknown) => {
      if (!selectedObject || !canvas) return;

      selectedObject.set(key as keyof fabric.FabricObject, value);
      canvas.renderAll();
      markDirty();
    },
    [selectedObject, canvas, markDirty]
  );

  /**
   * Get current scaled width
   */
  const getWidth = () => {
    if (!selectedObject) return 0;
    return (selectedObject.width ?? 0) * (selectedObject.scaleX ?? 1);
  };

  /**
   * Get current scaled height
   */
  const getHeight = () => {
    if (!selectedObject) return 0;
    return (selectedObject.height ?? 0) * (selectedObject.scaleY ?? 1);
  };

  /**
   * Update width (adjusts scaleX)
   */
  const updateWidth = useCallback(
    (newWidth: number) => {
      if (!selectedObject) return;
      const baseWidth = selectedObject.width ?? 1;
      const newScaleX = newWidth / baseWidth;
      updateProperty('scaleX', newScaleX);

      if (aspectLocked) {
        const newScaleY = newScaleX / aspectRatio;
        updateProperty('scaleY', newScaleY);
      }
    },
    [selectedObject, updateProperty, aspectLocked, aspectRatio]
  );

  /**
   * Update height (adjusts scaleY)
   */
  const updateHeight = useCallback(
    (newHeight: number) => {
      if (!selectedObject) return;
      const baseHeight = selectedObject.height ?? 1;
      const newScaleY = newHeight / baseHeight;
      updateProperty('scaleY', newScaleY);

      if (aspectLocked) {
        const newScaleX = newScaleY * aspectRatio;
        updateProperty('scaleX', newScaleX);
      }
    },
    [selectedObject, updateProperty, aspectLocked, aspectRatio]
  );

  /**
   * Get fill color as string
   */
  const getFillColor = (): string => {
    if (!selectedObject || !selectedObject.fill) return '#000000';
    const fill = selectedObject.fill;
    if (typeof fill === 'string') return fill;
    return '#000000';
  };

  /**
   * Get stroke color as string
   */
  const getStrokeColor = (): string => {
    if (!selectedObject || !selectedObject.stroke) return '#000000';
    const stroke = selectedObject.stroke;
    if (typeof stroke === 'string') return stroke;
    return '#000000';
  };

  // Empty state when no selection
  if (!selectedObject) {
    return (
      <div className={`${styles.panel} ${className ?? ''}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>Properties</h3>
        </div>
        <div className={styles.emptyState}>
          Select an object to edit properties
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${className ?? ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Properties</h3>
      </div>

      <div className={styles.sections}>
        {/* Position Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Move size={14} />
            <h4 className={styles.sectionTitle}>Position</h4>
          </div>
          <div className={styles.row}>
            <NumberInput
              id="prop-x"
              label="X"
              value={selectedObject.left ?? 0}
              onChange={(v) => updateProperty('left', v)}
            />
            <NumberInput
              id="prop-y"
              label="Y"
              value={selectedObject.top ?? 0}
              onChange={(v) => updateProperty('top', v)}
            />
          </div>
        </div>

        {/* Size Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Maximize2 size={14} />
            <h4 className={styles.sectionTitle}>Size</h4>
            <button
              type="button"
              className={`${styles.aspectButton} ${aspectLocked ? styles.active : ''}`}
              onClick={() => setAspectLocked(!aspectLocked)}
              title={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
              aria-label={
                aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'
              }
            >
              {aspectLocked ? <Link size={12} /> : <Unlink size={12} />}
            </button>
          </div>
          <div className={styles.row}>
            <NumberInput
              id="prop-width"
              label="W"
              value={getWidth()}
              onChange={updateWidth}
              min={1}
            />
            <NumberInput
              id="prop-height"
              label="H"
              value={getHeight()}
              onChange={updateHeight}
              min={1}
            />
          </div>
        </div>

        {/* Transform Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <RotateCw size={14} />
            <h4 className={styles.sectionTitle}>Transform</h4>
          </div>
          <NumberInput
            id="prop-rotation"
            label="Rotation"
            value={selectedObject.angle ?? 0}
            onChange={(v) => updateProperty('angle', v)}
            min={-360}
            max={360}
            unit="deg"
          />
          <RangeInput
            id="prop-opacity"
            label="Opacity"
            value={selectedObject.opacity ?? 1}
            onChange={(v) => updateProperty('opacity', v)}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${Math.round((selectedObject.opacity ?? 1) * 100)}%`}
          />
        </div>

        {/* Fill & Stroke Section (for shapes) */}
        {!isTextObject(selectedObject) && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Palette size={14} />
              <h4 className={styles.sectionTitle}>Fill & Stroke</h4>
            </div>
            <ColorInput
              id="prop-fill"
              label="Fill"
              value={getFillColor()}
              onChange={(v) => updateProperty('fill', v)}
            />
            <ColorInput
              id="prop-stroke"
              label="Stroke"
              value={getStrokeColor()}
              onChange={(v) => updateProperty('stroke', v)}
            />
            <NumberInput
              id="prop-stroke-width"
              label="Stroke Width"
              value={selectedObject.strokeWidth ?? 0}
              onChange={(v) => updateProperty('strokeWidth', v)}
              min={0}
              max={50}
            />
          </div>
        )}

        {/* Text Section (for text objects) */}
        {isTextObject(selectedObject) && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Type size={14} />
              <h4 className={styles.sectionTitle}>Text</h4>
            </div>
            <NumberInput
              id="prop-font-size"
              label="Font Size"
              value={(selectedObject as fabric.IText).fontSize ?? 24}
              onChange={(v) => updateProperty('fontSize', v)}
              min={8}
              max={200}
            />
            <ColorInput
              id="prop-text-color"
              label="Color"
              value={getFillColor()}
              onChange={(v) => updateProperty('fill', v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertiesPanel;
