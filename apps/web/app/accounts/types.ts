import type { Platform } from "@/types/platform";

export type { Platform };

export type HealthStatus = "healthy" | "warning" | "error";

export interface TokenInfo {
  expiresAt?: Date;
  isExpired: boolean;
  daysUntilExpiry?: number;
}

export interface SyncHistoryEntry {
  id: string;
  timestamp: Date;
  status: "success" | "failed";
  campaignsSynced?: number;
  errorMessage?: string;
}

export interface AdAccount {
  id: string;
  platform: Platform;
  accountId: string;
  accountName: string;
  email?: string;
  status: "connected" | "token_expired" | "error";
  healthStatus: HealthStatus;
  lastSyncedAt?: Date;
  createdAt: Date;
  campaignCount: number;
  tokenInfo?: TokenInfo;
  errorDetails?: string;
  syncHistory?: SyncHistoryEntry[];
}

export interface PlatformConfig {
  platform: Platform;
  name: string;
  icon: string;
  available: boolean;
  oauthUrl?: string;
}

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    platform: "reddit",
    name: "Reddit Ads",
    icon: "reddit",
    available: true,
    oauthUrl: "/api/auth/reddit",
  },
  {
    platform: "google",
    name: "Google Ads",
    icon: "google",
    available: false,
  },
  {
    platform: "facebook",
    name: "Facebook Ads",
    icon: "facebook",
    available: false,
  },
];

export const PLATFORM_COLORS: Record<AdAccount["platform"], string> = {
  reddit: "#ff4500",
  google: "#4285f4",
  facebook: "#1877f2",
};

export const STATUS_CONFIG: Record<
  AdAccount["status"],
  { label: string; color: string }
> = {
  connected: { label: "Connected", color: "#22c55e" },
  token_expired: { label: "Token Expired", color: "#f59e0b" },
  error: { label: "Error", color: "#ef4444" },
};

export const HEALTH_CONFIG: Record<
  HealthStatus,
  { label: string; color: string; icon: "check" | "warning" | "error" }
> = {
  healthy: { label: "Healthy", color: "#22c55e", icon: "check" },
  warning: { label: "Warning", color: "#f59e0b", icon: "warning" },
  error: { label: "Error", color: "#ef4444", icon: "error" },
};
