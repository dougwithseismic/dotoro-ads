'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Braces,
  Image,
  Type,
  Plus,
  RefreshCw,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useCanvas } from './CanvasContext';
import { useVariableDetection } from './hooks/useVariableDetection';
import { usePreviewMode } from './hooks/usePreviewMode';
import type { TemplateVariable } from './types';
import styles from './VariablesPanel.module.css';

/**
 * VariablesPanel Props
 */
export interface VariablesPanelProps {
  /** Additional CSS class name */
  className?: string;
  /** Available data source columns for mapping */
  dataSourceColumns?: string[];
  /** Callback when variables change */
  onVariablesChange?: (variables: TemplateVariable[]) => void;
}

/**
 * VariablesPanel - Panel for managing template variables
 *
 * Features:
 * - Lists all detected variables from canvas text objects
 * - Shows variable type (text/image) with icon
 * - Allows setting default/fallback values
 * - Optional data source column mapping
 * - Manual variable creation
 * - Preview mode toggle
 */
export function VariablesPanel({
  className,
  dataSourceColumns = [],
  onVariablesChange,
}: VariablesPanelProps) {
  const { canvas, variables, updateVariables } = useCanvas();
  const {
    detectVariables,
    updateVariable,
    addVariable,
    removeVariable,
  } = useVariableDetection();
  const {
    isPreviewMode,
    sampleData,
    togglePreview,
    updateSampleValue,
  } = usePreviewMode();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<'text' | 'image'>('text');

  /**
   * Refresh variables by scanning canvas
   */
  const handleRefresh = useCallback(() => {
    if (!canvas) return;

    const detected = detectVariables(canvas);
    updateVariables(detected);

    if (onVariablesChange) {
      onVariablesChange(detected);
    }
  }, [canvas, detectVariables, updateVariables, onVariablesChange]);

  /**
   * Auto-detect variables on canvas change
   */
  useEffect(() => {
    if (!canvas) return;

    const handleCanvasChange = () => {
      handleRefresh();
    };

    canvas.on('object:modified', handleCanvasChange);
    canvas.on('object:added', handleCanvasChange);
    canvas.on('object:removed', handleCanvasChange);
    canvas.on('text:changed', handleCanvasChange);

    // Initial detection
    handleRefresh();

    return () => {
      canvas.off('object:modified', handleCanvasChange);
      canvas.off('object:added', handleCanvasChange);
      canvas.off('object:removed', handleCanvasChange);
      canvas.off('text:changed', handleCanvasChange);
    };
  }, [canvas, handleRefresh]);

  /**
   * Notify parent when variables change
   */
  useEffect(() => {
    if (onVariablesChange) {
      onVariablesChange(variables);
    }
  }, [variables, onVariablesChange]);

  /**
   * Handle adding a new variable
   */
  const handleAddVariable = useCallback(() => {
    if (!newVarName.trim()) return;

    // Validate variable name (alphanumeric and underscores only)
    const validName = newVarName.trim().replace(/[^a-zA-Z0-9_]/g, '_');

    addVariable({
      name: validName,
      type: newVarType,
      defaultValue: '',
    });

    setNewVarName('');
    setNewVarType('text');
    setShowAddDialog(false);
  }, [newVarName, newVarType, addVariable]);

  /**
   * Handle default value change
   */
  const handleDefaultValueChange = useCallback(
    (varName: string, value: string) => {
      updateVariable(varName, { defaultValue: value });

      // Also update sample data if in preview mode
      if (isPreviewMode) {
        updateSampleValue(varName, value);
      }
    },
    [updateVariable, isPreviewMode, updateSampleValue]
  );

  /**
   * Handle source column change
   */
  const handleSourceColumnChange = useCallback(
    (varName: string, column: string) => {
      updateVariable(varName, { sourceColumn: column || undefined });
    },
    [updateVariable]
  );

  /**
   * Get icon for variable type
   */
  const getVariableIcon = (type: 'text' | 'image') => {
    if (type === 'image') {
      return <Image size={12} />;
    }
    return <Type size={12} />;
  };

  return (
    <div className={`${styles.panel} ${className ?? ''}`}>
      <div className={styles.panelHeader}>
        <Braces size={16} />
        <span className={styles.panelTitle}>Variables</span>
        <span className={styles.variableCount}>{variables.length}</span>
      </div>

      <div className={styles.variableList}>
        {variables.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No variables detected</p>
            <p className={styles.emptyHint}>
              Use {'{{variable_name}}'} in text objects
            </p>
          </div>
        ) : (
          variables.map((variable) => (
            <div key={variable.name} className={styles.variableItem}>
              <div className={styles.variableHeader}>
                <div
                  className={`${styles.variableIcon} ${styles[variable.type]}`}
                >
                  {getVariableIcon(variable.type)}
                </div>
                <span className={styles.variableName}>{variable.name}</span>
                <span className={styles.variableType}>{variable.type}</span>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeVariable(variable.name)}
                  title="Remove variable"
                  aria-label={`Remove ${variable.name}`}
                >
                  <X size={12} />
                </button>
              </div>

              <div className={styles.variableFields}>
                <div className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>Default</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    value={variable.defaultValue ?? ''}
                    onChange={(e) =>
                      handleDefaultValueChange(variable.name, e.target.value)
                    }
                    placeholder={
                      variable.type === 'image'
                        ? 'Image URL...'
                        : 'Default value...'
                    }
                  />
                </div>

                {dataSourceColumns.length > 0 && (
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Column</label>
                    <select
                      className={styles.fieldSelect}
                      value={variable.sourceColumn ?? ''}
                      onChange={(e) =>
                        handleSourceColumnChange(variable.name, e.target.value)
                      }
                    >
                      <option value="">Select column...</option>
                      {dataSourceColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddDialog && (
        <div className={styles.addDialog}>
          <div className={styles.addDialogTitle}>Add Variable</div>
          <div className={styles.addDialogFields}>
            <div className={styles.addDialogRow}>
              <input
                type="text"
                className={styles.addDialogInput}
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                placeholder="Variable name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddVariable();
                  } else if (e.key === 'Escape') {
                    setShowAddDialog(false);
                  }
                }}
              />
              <select
                className={styles.addDialogSelect}
                value={newVarType}
                onChange={(e) =>
                  setNewVarType(e.target.value as 'text' | 'image')
                }
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
            </div>
          </div>
          <div className={styles.addDialogActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => {
                setShowAddDialog(false);
                setNewVarName('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.confirmButton}
              onClick={handleAddVariable}
              disabled={!newVarName.trim()}
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className={styles.panelFooter}>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setShowAddDialog(true)}
        >
          <Plus size={14} />
          Add Variable
        </button>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={handleRefresh}
          title="Refresh variables from canvas"
          aria-label="Refresh variables"
        >
          <RefreshCw size={14} />
        </button>

        <button
          type="button"
          className={`${styles.previewButton} ${isPreviewMode ? styles.active : ''}`}
          onClick={togglePreview}
        >
          {isPreviewMode ? (
            <>
              <EyeOff size={14} />
              Exit Preview
            </>
          ) : (
            <>
              <Eye size={14} />
              Preview
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default VariablesPanel;
