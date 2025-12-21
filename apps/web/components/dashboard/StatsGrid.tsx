import { StatsCard } from "./StatsCard";
import type { DashboardStats } from "./types";
import styles from "./StatsGrid.module.css";

interface StatsGridProps {
  stats: DashboardStats;
}

const CampaignIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const SyncIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
  </svg>
);

const UploadIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);

const DataIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className={styles.grid}>
      <StatsCard
        title="Active Campaigns"
        value={stats.activeCampaigns}
        icon={<CampaignIcon />}
        trend={stats.activeCampaignsTrend}
      />
      <StatsCard
        title="Pending Syncs"
        value={stats.pendingSyncs}
        icon={<SyncIcon />}
        warning={stats.pendingSyncs > 0}
      />
      <StatsCard
        title="Recent Uploads"
        value={stats.recentUploads}
        icon={<UploadIcon />}
      />
      <StatsCard
        title="Total Data Rows"
        value={stats.totalDataRows}
        icon={<DataIcon />}
        trend={stats.totalDataRowsTrend}
      />
    </div>
  );
}
