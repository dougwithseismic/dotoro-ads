'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { Image as ImageIcon, Variable, X, ImageOff } from 'lucide-react';
import styles from './ImageVariableBinding.module.css';

/**
 * Source type for the image: static (fixed image) or variable (from data source)
 */
type ImageSourceType = 'static' | 'variable';

/**
 * ImageVariableBinding Props
 */
export interface ImageVariableBindingProps {
  /** Available data source columns to bind to */
  availableColumns: string[];
  /** Currently bound variable name (null if static) */
  currentBinding: string | null;
  /** URL of the fallback image when variable has no value */
  fallbackImageUrl: string;
  /** Callback when a variable is bound */
  onBindVariable: (variableName: string) => void;
  /** Callback when binding is removed */
  onUnbind: () => void;
  /** Callback when fallback image selection is requested */
  onSelectFallback: () => void;
  /** Additional CSS class name */
  className?: string;
}

/**
 * ImageVariableBinding - Panel for binding image layers to data source variables
 *
 * Allows users to:
 * - Toggle between static image and variable-bound image
 * - Select a data column to bind the image to
 * - Set a fallback image for when the variable has no value
 *
 * @example
 * ```tsx
 * <ImageVariableBinding
 *   availableColumns={['product_image', 'hero_image']}
 *   currentBinding="product_image"
 *   fallbackImageUrl="/fallback.png"
 *   onBindVariable={(col) => bindImageToVariable(col)}
 *   onUnbind={() => removeBinding()}
 *   onSelectFallback={() => openFallbackPicker()}
 * />
 * ```
 */
export function ImageVariableBinding({
  availableColumns,
  currentBinding,
  fallbackImageUrl,
  onBindVariable,
  onUnbind,
  onSelectFallback,
  className,
}: ImageVariableBindingProps) {
  // Determine initial source type based on current binding
  const [sourceType, setSourceType] = useState<ImageSourceType>(
    currentBinding ? 'variable' : 'static'
  );
  const [selectedColumn, setSelectedColumn] = useState(currentBinding || '');

  // Generate unique IDs for accessibility
  const selectId = useId();

  // Sync source type with current binding changes from outside
  useEffect(() => {
    if (currentBinding) {
      setSourceType('variable');
      setSelectedColumn(currentBinding);
    }
  }, [currentBinding]);

  /**
   * Handle source type toggle
   */
  const handleSourceTypeChange = useCallback(
    (type: ImageSourceType) => {
      setSourceType(type);

      if (type === 'static' && currentBinding) {
        // Switching from variable to static - remove binding
        onUnbind();
        setSelectedColumn('');
      }
    },
    [currentBinding, onUnbind]
  );

  /**
   * Handle column selection
   */
  const handleColumnChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const column = e.target.value;
      setSelectedColumn(column);

      if (column) {
        onBindVariable(column);
      }
    },
    [onBindVariable]
  );

  const hasColumns = availableColumns.length > 0;
  const isVariableMode = sourceType === 'variable';
  const hasFallback = !!fallbackImageUrl;

  return (
    <div className={`${styles.panel} ${className || ''}`}>
      <h4 className={styles.title}>Image Source</h4>

      {/* Source Type Toggle */}
      <div className={styles.sourceToggle} role="group" aria-label="Image source type">
        <button
          type="button"
          className={`${styles.toggleButton} ${!isVariableMode ? styles.active : ''}`}
          onClick={() => handleSourceTypeChange('static')}
          aria-pressed={!isVariableMode}
        >
          <ImageIcon size={14} />
          <span>Static Image</span>
        </button>
        <button
          type="button"
          className={`${styles.toggleButton} ${isVariableMode ? styles.active : ''}`}
          onClick={() => handleSourceTypeChange('variable')}
          aria-pressed={isVariableMode}
        >
          <Variable size={14} />
          <span>Variable</span>
        </button>
      </div>

      {/* Variable Configuration */}
      {isVariableMode && (
        <div className={styles.variableSection}>
          {/* Current Binding Indicator */}
          {currentBinding && (
            <div className={styles.bindingIndicator}>
              <span className={styles.bindingLabel}>Bound to</span>
              <div className={styles.bindingBadge}>
                <code>{`{${currentBinding}}`}</code>
                <button
                  type="button"
                  className={styles.unbindButton}
                  onClick={onUnbind}
                  title="Remove binding"
                  aria-label="Remove variable binding"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Column Selector */}
          <div className={styles.field}>
            <label htmlFor={selectId} className={styles.label}>
              Data Column
            </label>
            <select
              id={selectId}
              value={selectedColumn}
              onChange={handleColumnChange}
              className={styles.select}
              disabled={!hasColumns}
              aria-describedby={!hasColumns ? `${selectId}-help` : undefined}
            >
              <option value="">Select column...</option>
              {availableColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            {!hasColumns && (
              <p id={`${selectId}-help`} className={styles.helpText}>
                No data columns available. Connect a data source first.
              </p>
            )}
          </div>

          {/* Fallback Image */}
          <div className={styles.fallbackSection}>
            <span className={styles.fallbackLabel}>Fallback Image</span>
            <p className={styles.fallbackDescription}>
              Shown when the variable value is empty or missing
            </p>

            {hasFallback ? (
              <div className={styles.fallbackPreview}>
                <img
                  src={fallbackImageUrl}
                  alt="Fallback image"
                  className={styles.fallbackImage}
                />
                <button
                  type="button"
                  onClick={onSelectFallback}
                  className={styles.changeFallbackButton}
                >
                  Change fallback
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSelectFallback}
                className={styles.fallbackButton}
              >
                <ImageOff size={16} />
                <span>Set Fallback Image</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Static Mode Info */}
      {!isVariableMode && (
        <p className={styles.staticInfo}>
          The current image will be used as-is. Switch to Variable mode to dynamically replace this image from your data source.
        </p>
      )}
    </div>
  );
}

export default ImageVariableBinding;
