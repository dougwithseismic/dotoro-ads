"use client";

import Link from "next/link";
import { TemplateCard, type CampaignTemplate } from "./TemplateCard";
import styles from "./TemplateGrid.module.css";

export interface TemplateGridProps {
  templates: CampaignTemplate[];
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function TemplateGrid({
  templates,
  onDelete,
  onDuplicate,
}: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="8"
              y="8"
              width="32"
              height="32"
              rx="4"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <path
              d="M24 18V30M18 24H30"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h2>No templates yet</h2>
        <p>Create your first campaign template to get started</p>
        <Link href="/templates/editor" className={styles.emptyButton}>
          Create Your First Template
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  );
}
