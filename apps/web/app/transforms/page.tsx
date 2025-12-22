"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import styles from "./TransformList.module.css";
import { useTransforms } from "./hooks";
import { useUpdateTransform } from "./hooks/useUpdateTransform";
import { useDeleteTransform } from "./hooks/useDeleteTransform";
import { useExecuteTransform } from "./hooks/useExecuteTransform";
import type { Transform } from "./types";

export default function TransformsPage() {
  const { transforms, loading, error, refetch } = useTransforms();
  const { updateTransform } = useUpdateTransform();
  const { deleteTransform } = useDeleteTransform();
  const { executeTransform, loading: executing } = useExecuteTransform();

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleToggleEnabled = useCallback(
    async (transform: Transform) => {
      try {
        setActionError(null);
        await updateTransform(transform.id, { enabled: !transform.enabled });
        await refetch();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to update transform"
        );
      }
    },
    [updateTransform, refetch]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        setActionError(null);
        await deleteTransform(id);
        setDeleteConfirm(null);
        await refetch();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to delete transform"
        );
      }
    },
    [deleteTransform, refetch]
  );

  const handleExecute = useCallback(
    async (id: string) => {
      try {
        setActionError(null);
        setExecutingId(id);
        await executeTransform(id);
        await refetch();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to execute transform"
        );
      } finally {
        setExecutingId(null);
      }
    },
    [executeTransform, refetch]
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getGroupByDisplay = (groupBy: string | string[]): string => {
    if (Array.isArray(groupBy)) {
      return groupBy.join(", ");
    }
    return groupBy;
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading transforms...</span>
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
          <button onClick={refetch} className={styles.retryButton}>
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
          <h1 className={styles.title}>Transforms</h1>
          <p className={styles.subtitle}>
            Group and aggregate your data sources
          </p>
        </div>
        <Link href="/transforms/builder" className={styles.createButton}>
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
          New Transform
        </Link>
      </header>

      {actionError && (
        <div className={styles.actionError}>
          <p>{actionError}</p>
          <button onClick={() => setActionError(null)}>Dismiss</button>
        </div>
      )}

      {transforms.length === 0 ? (
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
                d="M8 12H40M8 24H40M8 36H40"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M24 8V40"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 4"
              />
            </svg>
          </div>
          <h2>No transforms yet</h2>
          <p>
            Create your first transform to aggregate and group your data
          </p>
          <Link href="/transforms/builder" className={styles.emptyButton}>
            Create Your First Transform
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {transforms.map((transform) => (
            <article key={transform.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.enabledToggle}>
                  <button
                    className={`${styles.toggleButton} ${transform.enabled ? styles.toggleEnabled : styles.toggleDisabled}`}
                    onClick={() => handleToggleEnabled(transform)}
                    title={
                      transform.enabled
                        ? "Disable transform"
                        : "Enable transform"
                    }
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
                <span className={styles.date}>
                  {formatDate(transform.updatedAt)}
                </span>
              </div>

              <h2 className={styles.cardTitle}>{transform.name}</h2>

              {transform.description && (
                <p className={styles.cardDescription}>{transform.description}</p>
              )}

              <div className={styles.flowVisualization}>
                <div className={styles.flowBox}>
                  <span className={styles.flowLabel}>Source</span>
                  <span className={styles.flowId}>
                    {transform.sourceDataSourceId.slice(0, 8)}...
                  </span>
                </div>
                <div className={styles.flowArrow}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 12H19M19 12L13 6M19 12L13 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className={styles.flowBox}>
                  <span className={styles.flowLabel}>Output</span>
                  <span className={styles.flowId}>
                    {transform.outputDataSourceId.slice(0, 8)}...
                  </span>
                </div>
              </div>

              <div className={styles.cardStats}>
                <span className={styles.stat}>
                  <span className={styles.statLabel}>Group by:</span>{" "}
                  {getGroupByDisplay(transform.config.groupBy)}
                </span>
                <span className={styles.stat}>
                  {transform.config.aggregations.length} aggregation
                  {transform.config.aggregations.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className={styles.cardActions}>
                <Link
                  href={`/transforms/builder/${transform.id}`}
                  className={styles.actionButton}
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleExecute(transform.id)}
                  className={styles.executeButton}
                  disabled={executing || executingId === transform.id}
                >
                  {executingId === transform.id ? "Running..." : "Execute"}
                </button>
                {deleteConfirm === transform.id ? (
                  <div className={styles.deleteConfirm}>
                    <button
                      onClick={() => handleDelete(transform.id)}
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
                    onClick={() => setDeleteConfirm(transform.id)}
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
