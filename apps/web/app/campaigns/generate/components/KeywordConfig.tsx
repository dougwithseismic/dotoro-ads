"use client";

import { useCallback, useMemo, useId } from "react";
import type {
  KeywordConfig as KeywordConfigType,
  KeywordRule,
  DataSourceColumn,
  ValidationResult,
  MatchType,
} from "../types";
import { VariableAutocomplete } from "./VariableAutocomplete";
import styles from "./KeywordConfig.module.css";

/** Maximum number of keywords to show in the preview section */
const PREVIEW_LIMIT = 8;

interface KeywordConfigProps {
  config: KeywordConfigType | null;
  availableColumns: DataSourceColumn[];
  sampleRow?: Record<string, unknown>;
  onChange: (config: KeywordConfigType | null) => void;
  validation?: ValidationResult;
}

/**
 * KeywordConfig - Full keyword configuration component
 *
 * Provides:
 * - Enable/disable toggle for keyword generation
 * - Rule builder with prefix/suffix inputs
 * - Match type checkboxes (broad, phrase, exact)
 * - Negative keyword input
 * - Preview of generated keywords for sample row
 * - Inheritance visualization (campaign vs ad group level)
 */
export function KeywordConfig({
  config,
  availableColumns,
  sampleRow,
  onChange,
  validation,
}: KeywordConfigProps) {
  const baseId = useId();
  const isEnabled = config?.enabled ?? false;
  const rules = config?.rules ?? [];

  // Handle enable/disable toggle
  const handleEnableChange = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        onChange({
          enabled: true,
          rules: [],
        });
      } else {
        onChange(null);
      }
    },
    [onChange]
  );

  // Add a new rule
  const handleAddRule = useCallback(() => {
    const ruleNumber = rules.length + 1;
    const newRule: KeywordRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: `Keyword Rule ${ruleNumber}`,
      scope: "campaign",
      coreTermPattern: "",
      prefixes: [],
      suffixes: [],
      matchTypes: ["broad"],
    };

    onChange({
      enabled: true,
      rules: [...rules, newRule],
    });
  }, [onChange, rules]);

  // Update a specific rule
  const handleUpdateRule = useCallback(
    (ruleId: string, updates: Partial<KeywordRule>) => {
      const updatedRules = rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      );
      onChange({ enabled: true, rules: updatedRules });
    },
    [onChange, rules]
  );

  // Delete a rule
  const handleDeleteRule = useCallback(
    (ruleId: string) => {
      const updatedRules = rules.filter((rule) => rule.id !== ruleId);
      onChange({ enabled: true, rules: updatedRules });
    },
    [onChange, rules]
  );

  // Check if a specific rule has validation errors
  const hasRuleError = useCallback(
    (ruleId: string, ruleIndex: number): boolean => {
      if (!validation?.errors?.length) return false;
      return validation.errors.some(
        (err) =>
          err.includes(`rule ${ruleIndex + 1}`) ||
          err.toLowerCase().includes(ruleId.toLowerCase())
      );
    },
    [validation]
  );

  return (
    <div className={styles.container}>
      {/* Enable/Disable Toggle */}
      <div className={styles.header}>
        <label className={styles.enableToggle}>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => handleEnableChange(e.target.checked)}
            className={styles.enableCheckbox}
            aria-label="Enable keyword generation"
          />
          <span className={styles.enableText}>Enable keyword generation</span>
        </label>

        <p className={styles.optionalNote}>
          Keywords are optional. You can add them later if needed.
        </p>
      </div>

      {/* Keyword Rules Section */}
      {isEnabled && (
        <div data-testid="keyword-rules-section" className={styles.rulesSection}>
          {/* Validation Errors */}
          {validation?.errors && validation.errors.length > 0 && (
            <div
              data-testid="validation-errors"
              className={styles.validationErrors}
              role="alert"
            >
              {validation.errors.map((error, i) => (
                <p key={i} className={styles.errorText}>
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Validation Warnings */}
          {validation?.warnings && validation.warnings.length > 0 && (
            <div data-testid="validation-warnings" className={styles.validationWarnings}>
              {validation.warnings.map((warning, i) => (
                <p key={i} className={styles.warningText}>
                  {warning}
                </p>
              ))}
            </div>
          )}

          {/* Empty state */}
          {rules.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No keyword rules defined yet.</p>
              <p className={styles.emptyHint}>
                Add a keyword rule to generate keywords for your campaigns.
              </p>
            </div>
          )}

          {/* Rule Cards */}
          {rules.map((rule, index) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              index={index}
              baseId={baseId}
              availableColumns={availableColumns}
              sampleRow={sampleRow}
              hasError={hasRuleError(rule.id, index)}
              onUpdate={(updates) => handleUpdateRule(rule.id, updates)}
              onDelete={() => handleDeleteRule(rule.id)}
            />
          ))}

          {/* Add Rule Button */}
          <button
            type="button"
            onClick={handleAddRule}
            className={styles.addRuleButton}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Keyword Rule
          </button>

          {/* No columns hint */}
          {availableColumns.length === 0 && (
            <p className={styles.noColumnsHint}>
              No variables available. Select a data source first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Rule Card Component
// ============================================================================

interface RuleCardProps {
  rule: KeywordRule;
  index: number;
  baseId: string;
  availableColumns: DataSourceColumn[];
  sampleRow?: Record<string, unknown>;
  hasError: boolean;
  onUpdate: (updates: Partial<KeywordRule>) => void;
  onDelete: () => void;
}

function RuleCard({
  rule,
  index,
  baseId,
  availableColumns,
  sampleRow,
  hasError,
  onUpdate,
  onDelete,
}: RuleCardProps) {
  const ruleId = `${baseId}-rule-${index}`;

  // Parse comma-separated strings to arrays
  const parseCommaSeparated = (value: string): string[] => {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  // Handle prefix input blur (commit value)
  const handlePrefixBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const prefixes = parseCommaSeparated(e.target.value);
      onUpdate({ prefixes });
    },
    [onUpdate]
  );

  // Handle suffix input blur (commit value)
  const handleSuffixBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const suffixes = parseCommaSeparated(e.target.value);
      onUpdate({ suffixes });
    },
    [onUpdate]
  );

  // Handle negative keywords input blur
  const handleNegativeBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const negativeKeywords = parseCommaSeparated(e.target.value);
      onUpdate({ negativeKeywords });
    },
    [onUpdate]
  );

  // Handle match type toggle
  const handleMatchTypeToggle = useCallback(
    (matchType: MatchType) => {
      const currentTypes = rule.matchTypes;
      const newTypes = currentTypes.includes(matchType)
        ? currentTypes.filter((t) => t !== matchType)
        : [...currentTypes, matchType];
      onUpdate({ matchTypes: newTypes });
    },
    [onUpdate, rule.matchTypes]
  );

  // Generate preview keywords
  const previewKeywords = useMemo(() => {
    if (!sampleRow || !rule.coreTermPattern) return [];

    const coreTerm = interpolatePattern(rule.coreTermPattern, sampleRow);
    if (!coreTerm) return [];

    const prefixes = rule.prefixes.length > 0 ? rule.prefixes : [""];
    const suffixes = rule.suffixes.length > 0 ? rule.suffixes : [""];

    const keywords: Array<{ text: string; matchType: MatchType }> = [];

    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        const keywordText = buildKeyword(prefix, coreTerm, suffix);
        for (const matchType of rule.matchTypes) {
          keywords.push({ text: keywordText, matchType });
        }
      }
    }

    return keywords;
  }, [rule, sampleRow]);

  return (
    <div
      data-testid={`keyword-rule-card-${rule.id}`}
      data-invalid={hasError}
      className={`${styles.ruleCard} ${hasError ? styles.ruleCardError : ""}`}
    >
      <div className={styles.ruleHeader}>
        <span className={styles.ruleNumber}>Rule {index + 1}</span>
        <span className={styles.scopeBadge}>
          {rule.scope === "ad-group" ? "Ad Group Level" : "Campaign Level"}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className={styles.deleteButton}
          aria-label="Delete rule"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className={styles.ruleBody}>
        {/* Core Term Pattern */}
        <VariableAutocomplete
          id={`${ruleId}-core-term`}
          value={rule.coreTermPattern}
          onChange={(value) => onUpdate({ coreTermPattern: value })}
          columns={availableColumns}
          label="Core Term Pattern"
          placeholder="e.g., {product_name}"
          hint="Use {variable} syntax to insert data values"
          error={hasError && !rule.coreTermPattern}
        />

        {/* Prefixes */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${ruleId}-prefixes`} className={styles.fieldLabel}>
            Prefixes
          </label>
          <input
            id={`${ruleId}-prefixes`}
            type="text"
            defaultValue={rule.prefixes.join(", ")}
            onBlur={handlePrefixBlur}
            placeholder="buy, cheap, best"
            className={styles.textInput}
            aria-describedby={`${ruleId}-prefixes-hint`}
          />
          <p id={`${ruleId}-prefixes-hint`} className={styles.fieldHint}>
            Comma-separated list. Leave empty for no prefix.
          </p>
        </div>

        {/* Suffixes */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${ruleId}-suffixes`} className={styles.fieldLabel}>
            Suffixes
          </label>
          <input
            id={`${ruleId}-suffixes`}
            type="text"
            defaultValue={rule.suffixes.join(", ")}
            onBlur={handleSuffixBlur}
            placeholder="online, sale, near me"
            className={styles.textInput}
            aria-describedby={`${ruleId}-suffixes-hint`}
          />
          <p id={`${ruleId}-suffixes-hint`} className={styles.fieldHint}>
            Comma-separated list. Leave empty for no suffix.
          </p>
        </div>

        {/* Match Types */}
        <fieldset className={styles.matchTypeGroup}>
          <legend className={styles.fieldLabel}>Match Types</legend>
          <div className={styles.matchTypeOptions} role="group" aria-label="Match types">
            {(["broad", "phrase", "exact"] as MatchType[]).map((matchType) => (
              <label key={matchType} className={styles.matchTypeLabel}>
                <input
                  type="checkbox"
                  checked={rule.matchTypes.includes(matchType)}
                  onChange={() => handleMatchTypeToggle(matchType)}
                  className={styles.matchTypeCheckbox}
                  aria-label={matchType}
                />
                <span className={styles.matchTypeName}>{matchType}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Negative Keywords */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${ruleId}-negatives`} className={styles.fieldLabel}>
            Negative Keywords
          </label>
          <input
            id={`${ruleId}-negatives`}
            type="text"
            defaultValue={rule.negativeKeywords?.join(", ") ?? ""}
            onBlur={handleNegativeBlur}
            placeholder="free, cheap, discount"
            className={styles.textInput}
            aria-describedby={`${ruleId}-negatives-hint`}
          />
          <p id={`${ruleId}-negatives-hint`} className={styles.fieldHint}>
            Keywords to exclude. Supports {"{variable}"} syntax.
          </p>
        </div>

        {/* Keyword Preview */}
        <div data-testid="keyword-preview" className={styles.previewSection}>
          <h4 className={styles.previewTitle}>Keyword Preview</h4>

          {!sampleRow && (
            <p className={styles.previewEmpty}>
              Select a data source to see preview of generated keywords.
            </p>
          )}

          {sampleRow && previewKeywords.length === 0 && (
            <p className={styles.previewEmpty}>
              Enter a core term pattern to see keyword preview.
            </p>
          )}

          {sampleRow && previewKeywords.length > 0 && (
            <>
              <p className={styles.previewCount}>
                {previewKeywords.length} keywords will be generated
              </p>
              <p className={styles.inheritanceNote}>
                Applies to all ad groups in this campaign
              </p>
              <div className={styles.previewList}>
                {previewKeywords.slice(0, PREVIEW_LIMIT).map((kw, i) => (
                  <div key={i} className={styles.previewKeyword}>
                    <span className={styles.keywordText}>{kw.text}</span>
                    <span
                      className={`${styles.matchTypeBadge} ${styles[`matchType_${kw.matchType}`]}`}
                    >
                      {kw.matchType}
                    </span>
                  </div>
                ))}
                {previewKeywords.length > PREVIEW_LIMIT && (
                  <p className={styles.previewMore}>
                    ...and {previewKeywords.length - PREVIEW_LIMIT} more
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Interpolate variables in a pattern string using values from a data row.
 */
function interpolatePattern(
  pattern: string,
  row: Record<string, unknown>
): string {
  if (!pattern) return "";
  const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\|([^}]*))?\}/g;
  return pattern.replace(variablePattern, (match, varName, defaultVal) => {
    const value = row[varName];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
    return defaultVal ?? "";
  });
}

/**
 * Build a keyword from prefix, core term, and suffix.
 */
function buildKeyword(prefix: string, coreTerm: string, suffix: string): string {
  const parts = [prefix.trim(), coreTerm.trim(), suffix.trim()].filter(Boolean);
  return parts.join(" ").toLowerCase().replace(/\s+/g, " ");
}
