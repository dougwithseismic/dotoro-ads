export interface AdAccount {
  id: string;
  platform: "reddit" | "google" | "facebook";
  accountId: string;
  accountName: string;
  status: "connected" | "token_expired" | "error";
  lastSyncedAt?: Date;
  createdAt: Date;
}

export interface PlatformConfig {
  platform: "reddit" | "google" | "facebook";
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
