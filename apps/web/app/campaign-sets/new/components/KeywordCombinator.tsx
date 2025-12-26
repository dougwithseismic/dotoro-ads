"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { interpolatePattern } from "../types";
import styles from "./KeywordCombinator.module.css";

interface KeywordCombinatorProps {
  /** Current keywords array (for restoring state) */
  keywords?: string[];
  /** Sample data row for variable interpolation preview */
  sampleRow?: Record<string, unknown>;
  /** Callback when keywords change */
  onChange: (keywords: string[]) => void;
  /** Whether to show the preview section */
  showPreview?: boolean;
}

interface ColumnConfig {
  label: string;
  placeholder: string;
  hint: string;
}

type CombinationType = "coreOnly" | "prefixCore" | "coreSuffix" | "full";

interface CombinationOption {
  type: CombinationType;
  label: string;
  example: string;
}

const COMBINATION_OPTIONS: CombinationOption[] = [
  { type: "coreOnly", label: "Core only", example: "{core}" },
  { type: "prefixCore", label: "Prefix + Core", example: "{prefix} {core}" },
  { type: "coreSuffix", label: "Core + Suffix", example: "{core} {suffix}" },
  { type: "full", label: "Full combination", example: "{prefix} {core} {suffix}" },
];

const COLUMN_PREFIX: ColumnConfig = {
  label: "Prefixes",
  placeholder: "buy\ncheap\nbest\naffordable",
  hint: "Action words or modifiers (optional)",
};

const COLUMN_CORE: ColumnConfig = {
  label: "Core Terms",
  placeholder: "{product_name}\n{brand}",
  hint: "Main keywords or {variables}",
};

const COLUMN_SUFFIX: ColumnConfig = {
  label: "Suffixes",
  placeholder: "online\nnear me\nfor sale\nreviews",
  hint: "Qualifiers or location terms (optional)",
};

/**
 * Parses a saved keywords array back into column format.
 * Attempts to detect patterns and split intelligently.
 */
function parseKeywordsToColumns(
  keywords: string[]
): [string[], string[], string[]] {
  // If no keywords, return empty columns
  if (!keywords || keywords.length === 0) {
    return [[], [], []];
  }

  // Try to detect if keywords were generated from a combinator pattern
  // by finding common prefixes and suffixes
  const prefixes = new Set<string>();
  const coreTerms = new Set<string>();
  const suffixes = new Set<string>();

  // For simplicity, if keywords exist, put them all in the core column
  // Users can manually distribute them if needed
  return [[], keywords, []];
}

/**
 * Generates combinations from the three columns based on selected combination types.
 */
function generateCombinations(
  prefixes: string[],
  coreTerms: string[],
  suffixes: string[],
  enabledTypes: Set<CombinationType>
): string[] {
  const results: string[] = [];

  // Filter out empty strings
  const validPrefixes = prefixes.filter((p) => p.trim());
  const validCores = coreTerms.filter((c) => c.trim());
  const validSuffixes = suffixes.filter((s) => s.trim());

  // If no core terms, no keywords
  if (validCores.length === 0) {
    return [];
  }

  // Generate combinations based on enabled types
  for (const core of validCores) {
    const trimmedCore = core.trim();

    // Core only
    if (enabledTypes.has("coreOnly")) {
      results.push(trimmedCore);
    }

    // Prefix + Core
    if (enabledTypes.has("prefixCore") && validPrefixes.length > 0) {
      for (const prefix of validPrefixes) {
        results.push(`${prefix.trim()} ${trimmedCore}`);
      }
    }

    // Core + Suffix
    if (enabledTypes.has("coreSuffix") && validSuffixes.length > 0) {
      for (const suffix of validSuffixes) {
        results.push(`${trimmedCore} ${suffix.trim()}`);
      }
    }

    // Full combination (Prefix + Core + Suffix)
    if (enabledTypes.has("full") && validPrefixes.length > 0 && validSuffixes.length > 0) {
      for (const prefix of validPrefixes) {
        for (const suffix of validSuffixes) {
          results.push(`${prefix.trim()} ${trimmedCore} ${suffix.trim()}`);
        }
      }
    }
  }

  // Remove duplicates while preserving order
  return [...new Set(results)];
}

export function KeywordCombinator({
  keywords = [],
  sampleRow,
  onChange,
  showPreview = true,
}: KeywordCombinatorProps) {
  // Initialize columns from existing keywords
  const [initialParsed] = useState(() => parseKeywordsToColumns(keywords));

  // Column values as text (one item per line)
  const [column1, setColumn1] = useState<string>(initialParsed[0].join("\n"));
  const [column2, setColumn2] = useState<string>(initialParsed[1].join("\n"));
  const [column3, setColumn3] = useState<string>(initialParsed[2].join("\n"));

  // Enabled combination types - default to all enabled
  const [enabledTypes, setEnabledTypes] = useState<Set<CombinationType>>(
    () => new Set(["coreOnly", "prefixCore", "coreSuffix", "full"])
  );

  // Toggle a combination type
  const toggleCombinationType = useCallback((type: CombinationType) => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Parse column text into arrays
  const parseColumn = (text: string): string[] => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  // Memoize parsed arrays
  const col1Array = useMemo(() => parseColumn(column1), [column1]);
  const col2Array = useMemo(() => parseColumn(column2), [column2]);
  const col3Array = useMemo(() => parseColumn(column3), [column3]);

  // Generate keyword combinations
  const combinations = useMemo(
    () => generateCombinations(col1Array, col2Array, col3Array, enabledTypes),
    [col1Array, col2Array, col3Array, enabledTypes]
  );

  // Interpolate combinations with sample data for preview
  const previewKeywords = useMemo(() => {
    if (!sampleRow) return combinations;
    return combinations.map((keyword) => interpolatePattern(keyword, sampleRow));
  }, [combinations, sampleRow]);

  // Use ref pattern to avoid onChange in deps (prevents infinite loop when parent passes inline arrow function)
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Notify parent of changes
  useEffect(() => {
    onChangeRef.current(combinations);
  }, [combinations]);

  // Handle column changes
  const handleColumn1Change = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setColumn1(e.target.value);
    },
    []
  );

  const handleColumn2Change = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setColumn2(e.target.value);
    },
    []
  );

  const handleColumn3Change = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setColumn3(e.target.value);
    },
    []
  );

  // Calculate statistics
  const stats = useMemo(
    () => ({
      prefixes: col1Array.length,
      coreTerms: col2Array.length,
      suffixes: col3Array.length,
      combinations: combinations.length,
    }),
    [col1Array, col2Array, col3Array, combinations]
  );

  return (
    <div className={styles.container}>
      <div className={styles.columnsGrid}>
        {/* Column 1: Prefixes */}
        <div className={styles.column}>
          <label className={styles.columnLabel}>{COLUMN_PREFIX.label}</label>
          <textarea
            className={styles.textarea}
            value={column1}
            onChange={handleColumn1Change}
            placeholder={COLUMN_PREFIX.placeholder}
            rows={6}
            aria-label={COLUMN_PREFIX.label}
          />
          <p className={styles.columnHint}>{COLUMN_PREFIX.hint}</p>
          {col1Array.length > 0 && (
            <span className={styles.columnCount}>{col1Array.length} terms</span>
          )}
        </div>

        {/* Column 2: Core Terms */}
        <div className={styles.column}>
          <label className={styles.columnLabel}>{COLUMN_CORE.label}</label>
          <textarea
            className={styles.textarea}
            value={column2}
            onChange={handleColumn2Change}
            placeholder={COLUMN_CORE.placeholder}
            rows={6}
            aria-label={COLUMN_CORE.label}
          />
          <p className={styles.columnHint}>{COLUMN_CORE.hint}</p>
          {col2Array.length > 0 && (
            <span className={styles.columnCount}>{col2Array.length} terms</span>
          )}
        </div>

        {/* Column 3: Suffixes */}
        <div className={styles.column}>
          <label className={styles.columnLabel}>{COLUMN_SUFFIX.label}</label>
          <textarea
            className={styles.textarea}
            value={column3}
            onChange={handleColumn3Change}
            placeholder={COLUMN_SUFFIX.placeholder}
            rows={6}
            aria-label={COLUMN_SUFFIX.label}
          />
          <p className={styles.columnHint}>{COLUMN_SUFFIX.hint}</p>
          {col3Array.length > 0 && (
            <span className={styles.columnCount}>{col3Array.length} terms</span>
          )}
        </div>
      </div>

      {/* Combination Types */}
      <div className={styles.combinationTypes}>
        <span className={styles.combinationTypesLabel}>Include:</span>
        {COMBINATION_OPTIONS.map((option) => {
          // Determine if this option is applicable based on current inputs
          const isApplicable =
            option.type === "coreOnly" ||
            (option.type === "prefixCore" && col1Array.length > 0) ||
            (option.type === "coreSuffix" && col3Array.length > 0) ||
            (option.type === "full" && col1Array.length > 0 && col3Array.length > 0);

          return (
            <label
              key={option.type}
              className={`${styles.combinationTypeOption} ${!isApplicable ? styles.combinationTypeDisabled : ""}`}
            >
              <input
                type="checkbox"
                checked={enabledTypes.has(option.type)}
                onChange={() => toggleCombinationType(option.type)}
                disabled={!isApplicable}
                className={styles.combinationTypeCheckbox}
              />
              <span className={styles.combinationTypeLabel}>{option.label}</span>
              <span className={styles.combinationTypeExample}>{option.example}</span>
            </label>
          );
        })}
      </div>

      {/* Combination Formula */}
      <div className={styles.formula}>
        <span className={styles.formulaResult}>
          {stats.combinations} keyword{stats.combinations !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Preview Section */}
      {showPreview && previewKeywords.length > 0 && (
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <span className={styles.previewTitle}>Generated Keywords</span>
            <span className={styles.previewCount}>
              Showing {Math.min(previewKeywords.length, 15)} of {previewKeywords.length}
            </span>
          </div>
          <div className={styles.previewList}>
            {previewKeywords.slice(0, 15).map((keyword, idx) => (
              <span key={idx} className={styles.previewKeyword}>
                {keyword}
              </span>
            ))}
            {previewKeywords.length > 15 && (
              <span className={styles.previewMore}>
                +{previewKeywords.length - 15} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {combinations.length === 0 && (
        <p className={styles.emptyHint}>
          Enter at least one core term to generate keywords
        </p>
      )}
    </div>
  );
}
