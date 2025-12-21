export type CampaignSyncStatus =
  | "draft"
  | "pending_sync"
  | "synced"
  | "sync_error";

export interface GeneratedCampaign {
  id: string;
  templateId: string;
  templateName: string;
  dataRowId: string;
  name: string;
  status: CampaignSyncStatus;
  platformId?: string;
  lastSyncedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface CampaignFilters {
  status?: CampaignSyncStatus[];
  templateId?: string;
  dateRange?: { start?: Date; end?: Date };
}
