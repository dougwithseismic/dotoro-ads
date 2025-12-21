"use client";

import styles from "./ValidationBadge.module.css";

interface ValidationBadgeProps {
  /** Current validation status */
  status: "valid" | "invalid" | "warning" | "pending";
  /** Optional message to display */
  message?: string;
  /** Show compact version (icon only) */
  compact?: boolean;
}

/**
 * Displays validation status with visual indicator.
 */
export function ValidationBadge({
  status,
  message,
  compact = false,
}: ValidationBadgeProps) {
  const getIcon = () => {
    switch (status) {
      case "valid":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M13.5 4.5L6 12L2.5 8.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "invalid":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "warning":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M8 5.5V8.5M8 11H8.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.86 2.572L1.215 12.285C1.07471 12.5286 1.00059 12.8029 1 13.0823C0.999406 13.3618 1.07238 13.6364 1.21166 13.8806C1.35094 14.1248 1.55178 14.3301 1.79405 14.4753C2.03632 14.6204 2.31188 14.7004 2.59146 14.707H13.4085C13.6881 14.7004 13.9637 14.6204 14.206 14.4753C14.4482 14.3301 14.6491 14.1248 14.7883 13.8806C14.9276 13.6364 15.0006 13.3618 15 13.0823C14.9994 12.8029 14.9253 12.5286 14.785 12.285L9.14 2.572C8.99656 2.33564 8.79437 2.14026 8.5529 2.00472C8.31143 1.86918 8.03876 1.79822 7.76146 1.79822C7.48416 1.79822 7.21149 1.86918 6.97002 2.00472C6.72855 2.14026 6.52636 2.33564 6.38293 2.572H6.86Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "pending":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className={styles.spinner}
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="25.1327"
              strokeDashoffset="12.5664"
              strokeLinecap="round"
            />
          </svg>
        );
    }
  };

  const getDefaultMessage = () => {
    switch (status) {
      case "valid":
        return "Valid";
      case "invalid":
        return "Invalid";
      case "warning":
        return "Warning";
      case "pending":
        return "Validating...";
    }
  };

  return (
    <div
      className={styles.badge}
      data-status={status}
      role="status"
      aria-label={message || getDefaultMessage()}
    >
      <span className={styles.icon}>{getIcon()}</span>
      {!compact && (
        <span className={styles.message}>{message || getDefaultMessage()}</span>
      )}
    </div>
  );
}
