"use client";

import { useMemo } from "react";
import type { ColumnMapping } from "../types";
import styles from "./ColumnMapperEnhanced.module.css";

interface ColumnMapperEnhancedProps {
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

// Patterns for auto-detecting column names and types
const COLUMN_PATTERNS: {
  pattern: RegExp;
  normalizedName: string;
  dataType: ColumnMapping["dataType"];
}[] = [
  // Email patterns
  { pattern: /^email(_?address)?$/i, normalizedName: "email", dataType: "string" },
  { pattern: /^e_?mail$/i, normalizedName: "email", dataType: "string" },

  // Name patterns
  { pattern: /^first_?name$/i, normalizedName: "firstName", dataType: "string" },
  { pattern: /^last_?name$/i, normalizedName: "lastName", dataType: "string" },
  { pattern: /^full_?name$/i, normalizedName: "fullName", dataType: "string" },
  { pattern: /^(user)?_?name$/i, normalizedName: "name", dataType: "string" },

  // Phone patterns
  { pattern: /^phone(_?number)?$/i, normalizedName: "phone", dataType: "string" },
  { pattern: /^tel(ephone)?$/i, normalizedName: "phone", dataType: "string" },
  { pattern: /^mobile$/i, normalizedName: "mobile", dataType: "string" },

  // Address patterns
  { pattern: /^(street_?)?address$/i, normalizedName: "address", dataType: "string" },
  { pattern: /^city$/i, normalizedName: "city", dataType: "string" },
  { pattern: /^state$/i, normalizedName: "state", dataType: "string" },
  { pattern: /^country$/i, normalizedName: "country", dataType: "string" },
  { pattern: /^zip(_?code)?$/i, normalizedName: "zipCode", dataType: "string" },
  { pattern: /^postal_?code$/i, normalizedName: "postalCode", dataType: "string" },

  // Date patterns
  { pattern: /^(created|updated|modified)_?(at|on|date)?$/i, normalizedName: "date", dataType: "date" },
  { pattern: /^date(_of)?_birth$/i, normalizedName: "dateOfBirth", dataType: "date" },
  { pattern: /^dob$/i, normalizedName: "dateOfBirth", dataType: "date" },
  { pattern: /^start_?date$/i, normalizedName: "startDate", dataType: "date" },
  { pattern: /^end_?date$/i, normalizedName: "endDate", dataType: "date" },

  // Price/currency patterns
  { pattern: /^price(_usd|_eur|_gbp)?$/i, normalizedName: "price", dataType: "currency" },
  { pattern: /^amount$/i, normalizedName: "amount", dataType: "currency" },
  { pattern: /^cost$/i, normalizedName: "cost", dataType: "currency" },
  { pattern: /^total$/i, normalizedName: "total", dataType: "currency" },

  // URL patterns
  { pattern: /^(web)?_?site(_url)?$/i, normalizedName: "website", dataType: "url" },
  { pattern: /^url$/i, normalizedName: "url", dataType: "url" },
  { pattern: /^link$/i, normalizedName: "link", dataType: "url" },
  { pattern: /^image(_url)?$/i, normalizedName: "imageUrl", dataType: "url" },

  // ID patterns
  { pattern: /^id$/i, normalizedName: "id", dataType: "string" },
  { pattern: /^(user|customer|product)_?id$/i, normalizedName: "id", dataType: "string" },

  // Description patterns
  { pattern: /^desc(ription)?$/i, normalizedName: "description", dataType: "string" },
  { pattern: /^title$/i, normalizedName: "title", dataType: "string" },
  { pattern: /^category$/i, normalizedName: "category", dataType: "string" },
];

function getSuggestion(sourceColumn: string): {
  normalizedName: string;
  dataType: ColumnMapping["dataType"];
} | null {
  for (const { pattern, normalizedName, dataType } of COLUMN_PATTERNS) {
    if (pattern.test(sourceColumn)) {
      return { normalizedName, dataType };
    }
  }
  return null;
}

export function ColumnMapperEnhanced({
  mappings,
  onChange,
  disabled = false,
}: ColumnMapperEnhancedProps) {
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

  const suggestions = useMemo(() => {
    const result: Record<number, { normalizedName: string; dataType: ColumnMapping["dataType"] }> =
      {};

    mappings.forEach((mapping, index) => {
      if (!mapping.normalizedName.trim()) {
        const suggestion = getSuggestion(mapping.sourceColumn);
        if (suggestion) {
          result[index] = suggestion;
        }
      }
    });

    return result;
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

  const handleApplySuggestion = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;

    const newMappings = mappings.map((m, i) =>
      i === index
        ? { ...m, normalizedName: suggestion.normalizedName, dataType: suggestion.dataType }
        : m
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
          const suggestion = suggestions[index];

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
                {suggestion && !disabled && (
                  <div className={styles.suggestion}>
                    <span className={styles.suggestionText}>
                      Suggested: {suggestion.normalizedName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplySuggestion(index)}
                      className={styles.applySuggestionButton}
                      aria-label={`Apply suggestion ${suggestion.normalizedName}`}
                    >
                      Apply
                    </button>
                  </div>
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
                {suggestion && suggestion.dataType !== mapping.dataType && !disabled && (
                  <span className={styles.typeSuggestion}>
                    Suggested: {DATA_TYPES.find((t) => t.value === suggestion.dataType)?.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
