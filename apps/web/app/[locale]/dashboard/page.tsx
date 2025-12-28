import { Suspense } from "react";
import { DashboardStatsContainer } from "@/components/dashboard/DashboardStatsContainer";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardActions } from "@/components/dashboard/DashboardActions";
import { DataSourceHealthContainer } from "@/components/dashboard/DataSourceHealthContainer";
import { PlatformDistributionContainer } from "@/components/dashboard/PlatformDistributionContainer";
import { RecentCampaignSets } from "@/components/dashboard/RecentCampaignSets";
import { CampaignHealthContainer } from "@/components/dashboard/CampaignHealthContainer";
import { SyncStatusMonitor } from "@/components/sync-monitor";
import type { ActivityItem, QuickAction, PlatformStats } from "@/components/dashboard/types";
import styles from "./Dashboard.module.css";

// TODO: Replace with actual API calls when platform distribution endpoint is implemented
async function getPlatformDistribution(): Promise<PlatformStats[]> {
  // Simulated data - in production, fetch from API
  return [
    {
      platform: "reddit",
      totalCampaigns: 45,
      percentage: 42,
      statusBreakdown: {
        draft: 10,
        pending_sync: 5,
        synced: 25,
        sync_error: 5,
      },
    },
    {
      platform: "google",
      totalCampaigns: 35,
      percentage: 32,
      statusBreakdown: {
        draft: 8,
        pending_sync: 2,
        synced: 25,
        sync_error: 0,
      },
    },
    {
      platform: "facebook",
      totalCampaigns: 28,
      percentage: 26,
      statusBreakdown: {
        draft: 5,
        pending_sync: 3,
        synced: 18,
        sync_error: 2,
      },
    },
  ];
}

// TODO: Replace with actual API calls when activity feed endpoint is implemented
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

/**
 * Loading fallback for stats section
 * Shows skeleton cards while data is loading
 */
function StatsLoadingFallback() {
  return (
    <div className={styles.skeleton}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={styles.skeletonCard} />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const [activities, platformDistribution] = await Promise.all([
    getRecentActivity(),
    getPlatformDistribution(),
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
        <Suspense fallback={<StatsLoadingFallback />}>
          <DashboardStatsContainer />
        </Suspense>
      </section>

      <section className={styles.section}>
        <PlatformDistributionContainer data={platformDistribution} />
      </section>

      <section className={styles.section}>
        <CampaignHealthContainer />
      </section>

      {/* SyncStatusMonitor renders null when no sync activity */}
      <section className={styles.section}>
        <SyncStatusMonitor />
      </section>

      <div className={styles.columns}>
        <section className={styles.activitySection}>
          <ActivityFeed
            activities={activities}
            maxItems={5}
            viewAllHref="/activity"
          />
          <div className={styles.sectionSpacer} />
          <RecentCampaignSets maxItems={5} viewAllHref="/campaign-sets" />
        </section>

        <aside className={styles.actionsSection}>
          <DashboardActions actions={quickActions} />
          <DataSourceHealthContainer limit={5} />
        </aside>
      </div>
    </div>
  );
}
