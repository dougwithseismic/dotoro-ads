import type { Platform } from "@/types/platform";

export type { Platform };

export type CampaignSyncStatus =
  | "draft"
  | "pending_sync"
  | "synced"
  | "sync_error";

export interface AdGroup {
  id: string;
  name: string;
  adCount: number;
}

export interface GeneratedCampaign {
  id: string;
  templateId: string;
  templateName: string;
  dataRowId: string;
  name: string;
  platform: Platform;
  status: CampaignSyncStatus;
  paused: boolean;
  adCount: number;
  adGroups?: AdGroup[];
  platformId?: string;
  lastSyncedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface CampaignFilters {
  status?: CampaignSyncStatus[];
  platform?: Platform;
  templateId?: string;
  dateRange?: { start?: Date; end?: Date };
}
