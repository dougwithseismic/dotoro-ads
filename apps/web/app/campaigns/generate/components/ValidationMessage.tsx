"use client";

import styles from "../GenerateWizard.module.css";

interface ValidationMessageProps {
  message: string;
  type?: "error" | "warning" | "info";
}

type ValidationType = "error" | "warning" | "info";

const TYPE_CLASSES: Record<ValidationType, string | undefined> = {
  error: styles.validationMessageError,
  warning: styles.validationMessageWarning,
  info: styles.validationMessageInfo,
};

const TYPE_ICONS: Record<ValidationType, string> = {
  error: "!",
  warning: "!",
  info: "i",
};

export function ValidationMessage({
  message,
  type = "error",
}: ValidationMessageProps) {
  const typeClass = TYPE_CLASSES[type] ?? "";
  const icon = TYPE_ICONS[type] ?? "!";

  return (
    <div
      className={`${styles.validationMessage} ${typeClass}`.trim()}
      role="alert"
      aria-live="polite"
      data-testid="validation-message"
    >
      <span
        className={styles.validationIcon}
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: "50%",
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: "currentColor",
          color: "white",
          flexShrink: 0,
        }}
      >
        <span style={{ color: type === "error" ? "#dc3545" : type === "warning" ? "#856404" : "#0070f3", mixBlendMode: "difference" }}>
          {icon}
        </span>
      </span>
      <span>{message}</span>
    </div>
  );
}
