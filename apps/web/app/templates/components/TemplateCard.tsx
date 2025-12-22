"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./TemplateCard.module.css";
import type { Platform } from "@/types/platform";

interface TemplateStructure {
  objective?: string;
  budget?: {
    type: "daily" | "lifetime";
    amount: number;
    currency: string;
  };
  targeting?: Record<string, unknown>;
}

export interface CampaignTemplate {
  id: string;
  userId?: string | null;
  name: string;
  platform: Platform;
  structure: TemplateStructure | null;
  variableCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCardProps {
  template: CampaignTemplate;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  reddit: "Reddit",
  google: "Google",
  facebook: "Facebook",
};

const PLATFORM_COLORS: Record<Platform, string> = {
  reddit: "#ff4500",
  google: "#4285f4",
  facebook: "#1877f2",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function TemplateCard({
  template,
  onDelete,
  onDuplicate,
}: TemplateCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(template.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleDuplicate = () => {
    onDuplicate?.(template.id);
  };

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <span
          className={styles.platform}
          style={
            {
              "--platform-color": PLATFORM_COLORS[template.platform],
            } as React.CSSProperties
          }
        >
          {PLATFORM_LABELS[template.platform]}
        </span>
        <span className={styles.date}>{formatDate(template.createdAt)}</span>
      </div>

      <h2 className={styles.cardTitle}>{template.name}</h2>

      {template.structure?.objective && (
        <p className={styles.cardObjective}>
          Objective: {template.structure.objective}
        </p>
      )}

      {template.structure?.budget && (
        <p className={styles.cardBudget}>
          {template.structure.budget.type === "daily" ? "Daily" : "Lifetime"}{" "}
          Budget: {template.structure.budget.currency}{" "}
          {template.structure.budget.amount}
        </p>
      )}

      {template.variableCount !== undefined && template.variableCount > 0 && (
        <p className={styles.cardVariables}>
          {template.variableCount} variable
          {template.variableCount === 1 ? "" : "s"}
        </p>
      )}

      <div className={styles.cardActions}>
        <Link
          href={"/templates/" + template.id + "/edit"}
          className={styles.actionButton}
        >
          Edit
        </Link>
        {onDuplicate && (
          <button
            type="button"
            onClick={handleDuplicate}
            className={styles.actionButton}
          >
            Duplicate
          </button>
        )}
        {showDeleteConfirm ? (
          <div className={styles.deleteConfirm}>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className={styles.deleteConfirmYes}
              aria-label={`Confirm delete template ${template.name}`}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={handleCancelDelete}
              className={styles.deleteConfirmNo}
              aria-label="Cancel delete"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDeleteClick}
            className={styles.deleteButton}
            aria-label={`Delete template ${template.name}`}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
