"use client";

import { useState, useMemo, useCallback } from "react";
import styles from "./VariablePickerPanel.module.css";

export interface Variable {
  name: string;
  sampleValue: string;
  description?: string;
  category?: string;
}

interface VariablePickerPanelProps {
  variables: Variable[];
  onInsertVariable: (variableName: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  focusedFieldId?: string | null;
}

export function VariablePickerPanel({
  variables,
  onInsertVariable,
  isCollapsed = false,
  onToggleCollapse,
}: VariablePickerPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredVariable, setHoveredVariable] = useState<string | null>(null);

  const groupedVariables = useMemo(() => {
    const filtered = variables.filter(
      (v) =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups: Record<string, Variable[]> = {};
    for (const variable of filtered) {
      const category = variable.category || "General";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(variable);
    }

    return groups;
  }, [variables, searchTerm]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    []
  );

  const handleInsert = useCallback(
    (variableName: string) => {
      onInsertVariable(variableName);
    },
    [onInsertVariable]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, variableName: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleInsert(variableName);
      }
    },
    [handleInsert]
  );

  if (isCollapsed) {
    return (
      <div className={styles.collapsedPanel}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={styles.expandButton}
          aria-label="Expand variable picker"
          aria-expanded="false"
        >
          <span className={styles.expandIcon}>&#x276E;</span>
          <span className={styles.expandText}>Variables</span>
        </button>
      </div>
    );
  }

  return (
    <aside className={styles.panel} aria-label="Variable picker">
      <div className={styles.header}>
        <h3 className={styles.title}>Variables</h3>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={styles.collapseButton}
            aria-label="Collapse variable picker"
            aria-expanded="true"
          >
            <span className={styles.collapseIcon}>&#x276F;</span>
          </button>
        )}
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search variables..."
          className={styles.searchInput}
          aria-label="Search variables"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className={styles.clearButton}
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      <div className={styles.hint}>
        Click a variable to insert it at cursor position
      </div>

      <div className={styles.variablesList} role="list">
        {Object.keys(groupedVariables).length === 0 ? (
          <div className={styles.emptyState}>
            {searchTerm
              ? "No variables match your search"
              : "No variables available"}
          </div>
        ) : (
          Object.entries(groupedVariables).map(([category, vars]) => (
            <div key={category} className={styles.categoryGroup}>
              {Object.keys(groupedVariables).length > 1 && (
                <div className={styles.categoryHeader}>{category}</div>
              )}
              {vars.map((variable) => (
                <button
                  key={variable.name}
                  type="button"
                  className={styles.variableItem}
                  onClick={() => handleInsert(variable.name)}
                  onKeyDown={(e) => handleKeyDown(e, variable.name)}
                  onMouseEnter={() => setHoveredVariable(variable.name)}
                  onMouseLeave={() => setHoveredVariable(null)}
                  aria-label={`Insert ${variable.name}`}
                  role="listitem"
                >
                  <div className={styles.variableMain}>
                    <span className={styles.variableName}>{variable.name}</span>
                    <span className={styles.insertIcon} aria-hidden="true">
                      +
                    </span>
                  </div>
                  {(hoveredVariable === variable.name || variable.description) && (
                    <div className={styles.variableDetails}>
                      {variable.description && (
                        <span className={styles.variableDescription}>
                          {variable.description}
                        </span>
                      )}
                      <span className={styles.sampleValue}>
                        Sample: {variable.sampleValue}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.syntaxHint}>
          <span className={styles.syntaxLabel}>Syntax:</span>
          <code className={styles.syntaxCode}>{"{variable_name}"}</code>
        </div>
        <div className={styles.filterHint}>
          <span className={styles.syntaxLabel}>With filter:</span>
          <code className={styles.syntaxCode}>{"{name|uppercase}"}</code>
        </div>
      </div>
    </aside>
  );
}
