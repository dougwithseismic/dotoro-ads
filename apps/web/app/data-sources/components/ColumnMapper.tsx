"use client";

import { useMemo } from "react";
import type { ColumnMapping } from "../types";
import styles from "./ColumnMapper.module.css";

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  onChange: (mappings: ColumnMapping[]) => void;
  disabled?: boolean;
}

const DATA_TYPES: { value: ColumnMapping["dataType"]; label: string }[] = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "url", label: "URL" },
  { value: "currency", label: "Currency" },
];

export function ColumnMapper({
  mappings,
  onChange,
  disabled = false,
}: ColumnMapperProps) {
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    const normalizedNames = new Set<string>();

    mappings.forEach((mapping, index) => {
      if (!mapping.normalizedName.trim()) {
        errors[`${index}-name`] = "Mapped name is required";
      } else if (normalizedNames.has(mapping.normalizedName)) {
        errors[`${index}-name`] = "Duplicate mapped name";
      } else {
        normalizedNames.add(mapping.normalizedName);
      }
    });

    return errors;
  }, [mappings]);

  const handleNameChange = (index: number, value: string) => {
    const newMappings = mappings.map((m, i) =>
      i === index ? { ...m, normalizedName: value } : m
    );
    onChange(newMappings);
  };

  const handleTypeChange = (index: number, value: string) => {
    const newMappings = mappings.map((m, i) =>
      i === index ? { ...m, dataType: value as ColumnMapping["dataType"] } : m
    );
    onChange(newMappings);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerCell}>Source Column</span>
        <span className={styles.headerCell}>Mapped Name</span>
        <span className={styles.headerCell}>Data Type</span>
      </div>

      <div className={styles.rows}>
        {mappings.map((mapping, index) => {
          const nameError = validationErrors[`${index}-name`];

          return (
            <div key={mapping.sourceColumn} className={styles.row}>
              <div className={styles.sourceColumn}>
                <code>{mapping.sourceColumn}</code>
              </div>

              <div className={styles.inputCell}>
                <input
                  type="text"
                  value={mapping.normalizedName}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  disabled={disabled}
                  className={`${styles.input} ${nameError ? styles.inputError : ""}`}
                  aria-label={`Mapped name for ${mapping.sourceColumn}`}
                  aria-invalid={!!nameError}
                />
                {nameError && (
                  <span className={styles.error} role="alert">
                    {nameError}
                  </span>
                )}
              </div>

              <div className={styles.selectCell}>
                <select
                  value={mapping.dataType}
                  onChange={(e) => handleTypeChange(index, e.target.value)}
                  disabled={disabled}
                  className={styles.select}
                  aria-label={`Data type for ${mapping.sourceColumn}`}
                >
                  {DATA_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
