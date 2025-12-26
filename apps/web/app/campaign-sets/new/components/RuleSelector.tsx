"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { Rule } from "../types";
import styles from "../GenerateWizard.module.css";

interface RuleSelectorProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
}

interface RulesResponse {
  data: Rule[];
}

export function RuleSelector({ selectedIds, onToggle }: RuleSelectorProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLLabelElement>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<RulesResponse>("/api/v1/rules");
      // Filter to only show enabled rules by default
      setRules(response.data.filter((rule) => rule.enabled));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Focus first item when rules load
  useEffect(() => {
    if (!loading && rules.length > 0 && firstItemRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const firstCheckbox = firstItemRef.current?.querySelector("input");
        firstCheckbox?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, rules.length]);

  // Keyboard navigation handler for list
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
      const { key } = event;
      let newIndex = currentIndex;

      const listElement = listRef.current;
      if (!listElement) return;

      const checkboxes = listElement.querySelectorAll("input[type='checkbox']");
      const itemCount = checkboxes.length;

      switch (key) {
        case "ArrowDown":
          newIndex = Math.min(currentIndex + 1, itemCount - 1);
          event.preventDefault();
          break;
        case "ArrowUp":
          newIndex = Math.max(currentIndex - 1, 0);
          event.preventDefault();
          break;
        case "Home":
          newIndex = 0;
          event.preventDefault();
          break;
        case "End":
          newIndex = itemCount - 1;
          event.preventDefault();
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        (checkboxes[newIndex] as HTMLInputElement)?.focus();
      }
    },
    []
  );

  if (loading) {
    return (
      <div className={styles.rulesList} data-testid="rules-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState} data-testid="rules-error">
        <p>{error}</p>
        <button
          type="button"
          onClick={fetchRules}
          className={styles.retryButton}
        >
          Retry
        </button>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className={styles.emptyState} data-testid="rules-empty">
        <p>No rules configured. You can skip this step or create rules.</p>
        <Link href="/rules">Configure rules</Link>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className={styles.rulesList}
      data-testid="rules-list"
      role="group"
      aria-label="Select rules to apply"
    >
      {rules.map((rule, index) => {
        const isSelected = selectedIds.includes(rule.id);
        const conditionCount = rule.conditions?.length ?? 0;
        const actionCount = rule.actions?.length ?? 0;
        const isFirst = index === 0;

        return (
          <label
            key={rule.id}
            ref={isFirst ? firstItemRef : undefined}
            className={`${styles.ruleItem} ${isSelected ? styles.ruleItemSelected : ""}`}
            data-testid={`rule-item-${rule.id}`}
          >
            <input
              type="checkbox"
              className={styles.ruleCheckbox}
              checked={isSelected}
              onChange={() => onToggle(rule.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              data-testid={`rule-checkbox-${rule.id}`}
              aria-describedby={`rule-meta-${rule.id}`}
            />
            <div className={styles.ruleContent}>
              <div className={styles.ruleName}>{rule.name}</div>
              <div className={styles.ruleMeta} id={`rule-meta-${rule.id}`}>
                {conditionCount} condition{conditionCount !== 1 ? "s" : ""} / {actionCount} action{actionCount !== 1 ? "s" : ""}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
