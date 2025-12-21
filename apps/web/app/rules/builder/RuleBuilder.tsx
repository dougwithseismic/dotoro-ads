"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConditionGroup from "../components/ConditionGroup";
import ActionEditor from "../components/ActionEditor";
import RulePreview from "../components/RulePreview";
import styles from "./RuleBuilder.module.css";
import type { Rule, ConditionGroup as ConditionGroupType, Action } from "../types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface RuleBuilderProps {
  initialRule?: Rule;
  ruleId?: string;
}

export default function RuleBuilder({ initialRule, ruleId }: RuleBuilderProps) {
  const router = useRouter();
  const isEditing = !!ruleId;

  const [rule, setRule] = useState<Rule>(
    initialRule || {
      name: "",
      description: "",
      enabled: true,
      priority: 0,
      conditionGroup: {
        id: generateId(),
        logic: "AND",
        conditions: [
          {
            id: generateId(),
            field: "",
            operator: "equals",
            value: "",
          },
        ],
      },
      actions: [],
    }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Sample fields - in a real app, these would come from the data source
  const sampleFields = [
    "product_name",
    "price",
    "category",
    "description",
    "stock",
    "brand",
    "sku",
  ];

  const handleSave = async () => {
    if (!rule.name.trim()) {
      setError("Rule name is required");
      return;
    }

    if (rule.actions.length === 0) {
      setError("At least one action is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = isEditing
        ? `${API_BASE}/api/v1/rules/${ruleId}`
        : `${API_BASE}/api/v1/rules`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rule.name,
          description: rule.description,
          enabled: rule.enabled,
          priority: rule.priority,
          conditionGroup: rule.conditionGroup,
          actions: rule.actions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save rule");
      }

      router.push("/rules");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const handleConditionGroupChange = (conditionGroup: ConditionGroupType) => {
    setRule({ ...rule, conditionGroup });
  };

  const handleActionsChange = (actions: Action[]) => {
    setRule({ ...rule, actions });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            {isEditing ? "Edit Rule" : "Create Rule"}
          </h1>
          <p className={styles.subtitle}>
            Define conditions and actions for data filtering and transformation
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.previewButton}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push("/rules")}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : isEditing ? "Update Rule" : "Create Rule"}
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.mainPanel}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Rule Details</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="rule-name" className={styles.label}>
                  Name *
                </label>
                <input
                  id="rule-name"
                  type="text"
                  className={styles.input}
                  value={rule.name}
                  onChange={(e) => setRule({ ...rule, name: e.target.value })}
                  placeholder="Enter rule name"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="rule-priority" className={styles.label}>
                  Priority
                </label>
                <input
                  id="rule-priority"
                  type="number"
                  className={styles.input}
                  value={rule.priority}
                  onChange={(e) =>
                    setRule({
                      ...rule,
                      priority: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  min={0}
                />
              </div>
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="rule-description" className={styles.label}>
                  Description
                </label>
                <textarea
                  id="rule-description"
                  className={styles.textarea}
                  value={rule.description || ""}
                  onChange={(e) =>
                    setRule({ ...rule, description: e.target.value })
                  }
                  placeholder="Describe what this rule does"
                  rows={2}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) =>
                      setRule({ ...rule, enabled: e.target.checked })
                    }
                  />
                  <span>Rule enabled</span>
                </label>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Conditions</h2>
            <p className={styles.sectionDescription}>
              Define when this rule should be applied
            </p>
            <ConditionGroup
              group={rule.conditionGroup}
              fields={sampleFields}
              onChange={handleConditionGroupChange}
              isRoot
            />
          </section>

          <section className={styles.section}>
            <ActionEditor
              actions={rule.actions}
              fields={sampleFields}
              onChange={handleActionsChange}
            />
          </section>
        </div>

        {showPreview && (
          <div className={styles.previewPanel}>
            <RulePreview rule={rule} />
          </div>
        )}
      </div>
    </div>
  );
}
