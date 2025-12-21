export interface DataSource {
  id: string;
  name: string;
  type: "csv" | "api";
  rowCount: number;
  createdAt: Date;
  updatedAt: Date;
  status: "processing" | "ready" | "error";
  columns?: string[];
  errorMessage?: string;
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
