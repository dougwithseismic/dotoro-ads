import { StatsGrid } from "../../components/dashboard/StatsGrid";
import { ActivityFeed } from "../../components/dashboard/ActivityFeed";
import { QuickActions } from "../../components/dashboard/QuickActions";
import type {
  DashboardStats,
  ActivityItem,
  QuickAction,
} from "../../components/dashboard/types";
import styles from "./Dashboard.module.css";

// TODO: Replace with actual API calls
async function getStats(): Promise<DashboardStats> {
  // Simulated data - in production, fetch from API
  return {
    activeCampaigns: 12,
    activeCampaignsTrend: { value: 8, isPositive: true },
    pendingSyncs: 3,
    recentUploads: 8,
    lastUploadDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    totalDataRows: 45678,
    totalDataRowsTrend: { value: 15, isPositive: true },
  };
}

async function getRecentActivity(): Promise<ActivityItem[]> {
  // Simulated data - in production, fetch from API
  return [
    {
      id: "1",
      type: "upload",
      title: "Uploaded product catalog (2,500 rows)",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: "2",
      type: "template_created",
      title: "Created new ad template: Summer Sale",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
    {
      id: "3",
      type: "campaign_synced",
      title: "Synced with Reddit Ads - 15 ads updated",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: "4",
      type: "rule_created",
      title: "Created pricing rule: Discount > 20%",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      id: "5",
      type: "upload",
      title: "Uploaded inventory update",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  ];
}

const UploadIcon = () => (
  <svg
    width="20"
    height="20"
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

const TemplateIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
);

const GenerateIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v3m6.36-.64l-2.12 2.12M21 12h-3m.64 6.36l-2.12-2.12M12 21v-3m-6.36.64l2.12-2.12M3 12h3m-.64-6.36l2.12 2.12" />
  </svg>
);

const quickActions: QuickAction[] = [
  {
    id: "upload",
    label: "Upload Data Source",
    href: "/data-sources",
    icon: <UploadIcon />,
    description: "Import your product catalog or data files",
  },
  {
    id: "template",
    label: "Create Template",
    href: "/templates/editor",
    icon: <TemplateIcon />,
    description: "Design a new ad template with variables",
  },
  {
    id: "create-set",
    label: "Create Campaign Set",
    href: "/campaign-sets/new",
    icon: <GenerateIcon />,
    description: "Create a campaign set from your data",
  },
];

export default async function DashboardPage() {
  const [stats, activities] = await Promise.all([
    getStats(),
    getRecentActivity(),
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>
          Overview of your campaigns, syncs, and recent activity
        </p>
      </header>

      <section className={styles.section}>
        <StatsGrid stats={stats} />
      </section>

      <div className={styles.columns}>
        <section className={styles.activitySection}>
          <ActivityFeed
            activities={activities}
            maxItems={5}
            viewAllHref="/activity"
          />
        </section>

        <aside className={styles.actionsSection}>
          <QuickActions actions={quickActions} />
        </aside>
      </div>
    </div>
  );
}
