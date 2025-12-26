/** Sync status for API and Google Sheets data sources */
export type SyncStatus = "synced" | "syncing" | "error";

/** Sync frequency options for scheduled data sources */
export type SyncFrequency = "manual" | "hourly" | "daily" | "weekly";

export interface DataSource {
  id: string;
  name: string;
  type: "csv" | "api" | "manual" | "google-sheets";
  rowCount: number;
  createdAt: Date;
  updatedAt: Date;
  status: "processing" | "ready" | "error";
  columns?: string[];
  errorMessage?: string;
  /** Configuration object - may contain isVirtual flag for transform outputs */
  config?: {
    isVirtual?: boolean;
    transformName?: string;
    sourceDataSourceId?: string;
    [key: string]: unknown;
  } | null;
  /** ID of the transform that created this data source (for virtual sources) */
  transformId?: string;
  /** Sync status for API and Google Sheets sources */
  syncStatus?: SyncStatus;
  /** Last time the data source was synced (for API/Google Sheets) */
  lastSyncedAt?: Date;
  /** How often the data source syncs (for API/Google Sheets) */
  syncFrequency?: SyncFrequency;
}

export interface ColumnMapping {
  sourceColumn: string;
  normalizedName: string;
  dataType: "string" | "number" | "date" | "url" | "currency";
}

export interface DataSourceListResponse {
  data: DataSource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DataSourceRow {
  [key: string]: string | number | null;
}

export interface ValidationError {
  column: string;
  row: number;
  message: string;
  severity: "error" | "warning";
  suggestion?: string;
}

export interface DataSourceDetail extends DataSource {
  data: DataSourceRow[];
  columnMappings: ColumnMapping[];
  validationErrors?: ValidationError[];
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  column: string;
  direction: SortDirection;
}
