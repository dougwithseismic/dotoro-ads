"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./RuleList.module.css";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string | number | boolean | string[] | number[];
}

interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: (Condition | ConditionGroup)[];
}

interface Action {
  id: string;
  type: string;
  [key: string]: unknown;
}

interface Rule {
  id: string;
  userId: string | null;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditionGroup: ConditionGroup;
  actions: Action[];
  createdAt: string;
  updatedAt: string;
}

interface RuleListResponse {
  data: Rule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function countConditions(group: ConditionGroup): number {
  return group.conditions.reduce((count, item) => {
    if ("operator" in item) {
      return count + 1;
    } else {
      return count + countConditions(item);
    }
  }, 0);
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_BASE + "/api/v1/rules");
      if (!response.ok) {
        throw new Error("Failed to fetch rules");
      }
      const data: RuleListResponse = await response.json();
      setRules(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(API_BASE + "/api/v1/rules/" + id, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete rule");
      }
      setRules((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  };

  const handleToggleEnabled = async (rule: Rule) => {
    try {
      const response = await fetch(API_BASE + "/api/v1/rules/" + rule.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (!response.ok) {
        throw new Error("Failed to update rule");
      }
      const updated = await response.json();
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? updated : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading rules...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchRules} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Rules</h1>
          <p className={styles.subtitle}>
            Create rules to filter and transform your data
          </p>
        </div>
        <Link href="/rules/builder" className={styles.createButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 4V16M4 10H16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Create Rule
        </Link>
      </header>

      {rules.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 8H36C38.2091 8 40 9.79086 40 12V36C40 38.2091 38.2091 40 36 40H12C9.79086 40 8 38.2091 8 36V12C8 9.79086 9.79086 8 12 8Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M16 18H32M16 24H28M16 30H24"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2>No rules yet</h2>
          <p>Create your first rule to start filtering and transforming data</p>
          <Link href="/rules/builder" className={styles.emptyButton}>
            Create Your First Rule
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {rules.map((rule) => (
            <article key={rule.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.enabledToggle}>
                  <button
                    className={`${styles.toggleButton} ${rule.enabled ? styles.toggleEnabled : styles.toggleDisabled}`}
                    onClick={() => handleToggleEnabled(rule)}
                    title={rule.enabled ? "Disable rule" : "Enable rule"}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
                <span className={styles.priority}>Priority: {rule.priority}</span>
                <span className={styles.date}>{formatDate(rule.createdAt)}</span>
              </div>

              <h2 className={styles.cardTitle}>{rule.name}</h2>

              {rule.description && (
                <p className={styles.cardDescription}>{rule.description}</p>
              )}

              <div className={styles.cardStats}>
                <span className={styles.stat}>
                  {countConditions(rule.conditionGroup)} condition{countConditions(rule.conditionGroup) !== 1 ? "s" : ""}
                </span>
                <span className={styles.stat}>
                  {rule.actions.length} action{rule.actions.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className={styles.cardActions}>
                <Link
                  href={"/rules/builder/" + rule.id}
                  className={styles.actionButton}
                >
                  Edit
                </Link>
                {deleteConfirm === rule.id ? (
                  <div className={styles.deleteConfirm}>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className={styles.deleteConfirmYes}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className={styles.deleteConfirmNo}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(rule.id)}
                    className={styles.deleteButton}
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
