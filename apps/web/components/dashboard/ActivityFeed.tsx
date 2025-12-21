import Link from "next/link";
import type { ActivityItem, ActivityType } from "./types";
import styles from "./ActivityFeed.module.css";

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  viewAllHref?: string;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return "just now";
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

function ActivityIcon({ type }: { type: ActivityType }) {
  const iconProps = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (type) {
    case "upload":
      return (
        <svg {...iconProps} data-testid="activity-icon-upload">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
      );
    case "template_created":
      return (
        <svg {...iconProps} data-testid="activity-icon-template_created">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      );
    case "campaign_synced":
      return (
        <svg {...iconProps} data-testid="activity-icon-campaign_synced">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
        </svg>
      );
    case "rule_created":
      return (
        <svg {...iconProps} data-testid="activity-icon-rule_created">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </svg>
      );
    default:
      return null;
  }
}

export function ActivityFeed({
  activities,
  maxItems,
  viewAllHref,
}: ActivityFeedProps) {
  const displayedActivities = maxItems
    ? activities.slice(0, maxItems)
    : activities;

  if (activities.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <h2 className={styles.heading}>Recent Activity</h2>
        </div>
        <div className={styles.empty}>
          <p>No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>Recent Activity</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className={styles.viewAll}>
            View all
          </Link>
        )}
      </div>
      <ul className={styles.feed}>
        {displayedActivities.map((activity) => (
          <li
            key={activity.id}
            className={styles.item}
            data-testid={`activity-item-${activity.id}`}
            data-type={activity.type}
          >
            <div className={styles.iconWrapper} data-type={activity.type}>
              <ActivityIcon type={activity.type} />
            </div>
            <div className={styles.content}>
              <span className={styles.title}>{activity.title}</span>
              <span className={styles.time}>
                {formatRelativeTime(activity.timestamp)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
