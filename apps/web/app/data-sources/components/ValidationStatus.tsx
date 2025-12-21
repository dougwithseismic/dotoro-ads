"use client";

import type { DataSource } from "../types";
import styles from "./ValidationStatus.module.css";

interface ValidationStatusProps {
  status: DataSource["status"];
  errorMessage?: string;
}

const STATUS_CONFIG: Record<
  DataSource["status"],
  { label: string; icon: React.ReactNode }
> = {
  ready: {
    label: "Ready",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 8L6.5 11.5L13 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  processing: {
    label: "Processing",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.spinnerIcon}
      >
        <path
          d="M8 2V4M8 12V14M4 8H2M14 8H12M5.17 5.17L3.76 3.76M12.24 12.24L10.83 10.83M5.17 10.83L3.76 12.24M12.24 3.76L10.83 5.17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  error: {
    label: "Error",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 5V8M8 11H8.01M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
};

export function ValidationStatus({
  status,
  errorMessage,
}: ValidationStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={styles.container}>
      <div className={`${styles.badge} ${styles[status]}`}>
        <span className={styles.icon}>{config.icon}</span>
        <span className={styles.label}>{config.label}</span>
      </div>

      {status === "error" && errorMessage && (
        <p className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
