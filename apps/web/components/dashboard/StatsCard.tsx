import type { StatsCardProps } from "./types";
import styles from "./StatsCard.module.css";

export function StatsCard({
  title,
  value,
  icon,
  trend,
  warning = false,
}: StatsCardProps) {
  const formattedValue = value.toLocaleString();

  return (
    <div
      className={`${styles.card} ${warning ? styles.warning : ""}`}
      data-testid="stats-card"
      data-warning={warning ? "true" : "false"}
    >
      <div className={styles.header}>
        {icon && <div className={styles.icon}>{icon}</div>}
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.content}>
        <span className={styles.value}>{formattedValue}</span>
        {trend && (
          <span
            className={styles.trend}
            data-testid="trend-indicator"
            data-trend={trend.isPositive ? "positive" : "negative"}
          >
            {trend.isPositive ? "+" : "-"}
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}
