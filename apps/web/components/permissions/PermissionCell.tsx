"use client";

import { useState } from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import styles from "./PermissionCell.module.css";

export interface PermissionCellProps {
  /** Whether the permission is allowed */
  allowed: boolean;
  /** Tooltip text to display on hover */
  tooltip: string;
  /** Whether this is a dangerous permission */
  dangerous?: boolean;
}

/**
 * PermissionCell Component
 *
 * Displays a single permission state in the matrix with:
 * - Green check for allowed
 * - Gray X for denied
 * - Amber warning for dangerous allowed permissions
 * - Hover tooltip with description
 */
export function PermissionCell({
  allowed,
  tooltip,
  dangerous = false,
}: PermissionCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Determine accessible label
  let ariaLabel: string;
  if (dangerous && allowed) {
    ariaLabel = `Warning - Dangerous permission allowed: ${tooltip}`;
  } else if (allowed) {
    ariaLabel = `Allowed: ${tooltip}`;
  } else {
    ariaLabel = `Denied: ${tooltip}`;
  }

  // Determine CSS classes
  const cellClasses = [
    styles.cell,
    allowed ? styles.allowed : styles.denied,
    dangerous && allowed ? styles.dangerous : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Render the appropriate icon
  const renderIcon = () => {
    if (dangerous && allowed) {
      return (
        <AlertTriangle
          className={styles.icon}
          data-testid="warning-icon"
          aria-hidden="true"
        />
      );
    }

    if (allowed) {
      return (
        <Check
          className={styles.icon}
          data-testid="check-icon"
          aria-hidden="true"
        />
      );
    }

    return (
      <X className={styles.icon} data-testid="x-icon" aria-hidden="true" />
    );
  };

  return (
    <div className={styles.tooltipContainer}>
      <div
        className={cellClasses}
        data-testid="permission-cell"
        data-allowed={allowed}
        data-dangerous={dangerous && allowed}
        aria-label={ariaLabel}
        role="cell"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={0}
      >
        {renderIcon()}
      </div>

      {showTooltip && (
        <div className={styles.tooltip} role="tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
}
