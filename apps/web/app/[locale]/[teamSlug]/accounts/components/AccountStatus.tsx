import type { AdAccount } from "../types";
import { STATUS_CONFIG } from "../types";
import styles from "./AccountStatus.module.css";

interface AccountStatusProps {
  status: AdAccount["status"];
}

function StatusIcon({ status }: { status: AdAccount["status"] }) {
  if (status === "connected") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2.5 6L5 8.5L9.5 3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (status === "token_expired") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 3.5V6.5M6 8.5V8.51"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // error status
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AccountStatus({ status }: AccountStatusProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: "var(--color-gray-500)",
  };

  return (
    <span
      className={styles.status}
      data-status={status}
      role="status"
      aria-label={`Account status: ${config.label}`}
      style={{ "--status-color": config.color } as React.CSSProperties}
    >
      <StatusIcon status={status} />
      <span className={styles.label}>{config.label}</span>
    </span>
  );
}
