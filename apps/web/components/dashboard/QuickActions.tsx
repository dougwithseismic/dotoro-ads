import Link from "next/link";
import type { QuickAction } from "./types";
import styles from "./QuickActions.module.css";

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Quick Actions</h2>
      <div className={styles.grid} data-testid="quick-actions-grid">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className={styles.action}
          >
            {action.icon && <div className={styles.icon}>{action.icon}</div>}
            <div className={styles.content}>
              <span className={styles.label}>{action.label}</span>
              {action.description && (
                <span className={styles.description}>{action.description}</span>
              )}
            </div>
            <svg
              className={styles.arrow}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
