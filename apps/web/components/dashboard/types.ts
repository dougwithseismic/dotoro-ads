export interface TrendData {
  value: number;
  isPositive: boolean;
}

export interface DashboardStats {
  activeCampaigns: number;
  activeCampaignsTrend?: TrendData;
  pendingSyncs: number;
  recentUploads: number;
  lastUploadDate?: Date;
  totalDataRows: number;
  totalDataRowsTrend?: TrendData;
}

export type ActivityType =
  | "upload"
  | "template_created"
  | "campaign_synced"
  | "rule_created";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface StatsCardProps {
  title: string;
  value: number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  warning?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  description?: string;
}
