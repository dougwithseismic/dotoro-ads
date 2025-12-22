"use client";

import { useState, useCallback, useMemo } from "react";
import styles from "./GroupByPicker.module.css";

interface GroupByPickerProps {
  columns: string[];
  selectedFields: string[];
  onChange: (fields: string[]) => void;
  loading?: boolean;
}

export function GroupByPicker({
  columns,
  selectedFields,
  onChange,
  loading = false,
}: GroupByPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredColumns = useMemo(() => {
    if (!searchTerm) return columns;
    const term = searchTerm.toLowerCase();
    return columns.filter((col) => col.toLowerCase().includes(term));
  }, [columns, searchTerm]);

  const handleAdd = useCallback(
    (field: string) => {
      if (!selectedFields.includes(field)) {
        onChange([...selectedFields, field]);
      }
      setSearchTerm("");
    },
    [selectedFields, onChange]
  );

  const handleRemove = useCallback(
    (field: string) => {
      onChange(selectedFields.filter((f) => f !== field));
    },
    [selectedFields, onChange]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newFields = [...selectedFields];
      const temp = newFields[index - 1];
      newFields[index - 1] = newFields[index] as string;
      newFields[index] = temp as string;
      onChange(newFields);
    },
    [selectedFields, onChange]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === selectedFields.length - 1) return;
      const newFields = [...selectedFields];
      const temp = newFields[index];
      newFields[index] = newFields[index + 1] as string;
      newFields[index + 1] = temp as string;
      onChange(newFields);
    },
    [selectedFields, onChange]
  );

  const availableColumns = useMemo(() => {
    return filteredColumns.filter((col) => !selectedFields.includes(col));
  }, [filteredColumns, selectedFields]);

  return (
    <div className={styles.container}>
      <label className={styles.label}>Group By Fields *</label>
      <p className={styles.description}>
        Select one or more fields to group rows by
      </p>

      {selectedFields.length > 0 && (
        <div className={styles.selectedFields}>
          {selectedFields.map((field, index) => (
            <div key={field} className={styles.selectedField}>
              <span className={styles.fieldOrder}>{index + 1}</span>
              <span className={styles.fieldName}>{field}</span>
              <div className={styles.fieldActions}>
                <button
                  type="button"
                  className={styles.moveButton}
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  title="Move up"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 4L12 8H4L8 4Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.moveButton}
                  onClick={() => handleMoveDown(index)}
                  disabled={index === selectedFields.length - 1}
                  title="Move down"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 12L4 8H12L8 12Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => handleRemove(field)}
                  title="Remove field"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 4L12 12M4 12L12 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.addFieldSection}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search fields to add..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {loading ? (
          <p className={styles.noColumns}>Loading fields...</p>
        ) : availableColumns.length > 0 ? (
          <div className={styles.availableFields}>
            {availableColumns.slice(0, 10).map((col) => (
              <button
                key={col}
                type="button"
                className={styles.addFieldButton}
                onClick={() => handleAdd(col)}
              >
                <span>{col}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 3V11M3 7H11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ))}
            {availableColumns.length > 10 && (
              <span className={styles.moreFields}>
                +{availableColumns.length - 10} more
              </span>
            )}
          </div>
        ) : columns.length === 0 ? (
          <p className={styles.noColumns}>
            Select a data source to see available fields
          </p>
        ) : searchTerm ? (
          <p className={styles.noColumns}>No fields match your search</p>
        ) : (
          <p className={styles.noColumns}>All fields have been selected</p>
        )}
      </div>
    </div>
  );
}
