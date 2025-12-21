// Common schemas
export * from "./common.js";

// Data Sources schemas
export {
  dataSourceTypeSchema,
  dataSourceSchema,
  createDataSourceSchema,
  updateDataSourceSchema,
  dataSourceListResponseSchema,
  dataRowSchema,
  dataRowsQuerySchema,
  dataRowsListResponseSchema,
  columnMappingSchema,
  csvPreviewRequestSchema,
  csvPreviewResponseSchema,
  columnTypeSchema,
  type DataSourceType,
  type DataSource,
  type CreateDataSource,
  type UpdateDataSource,
  type DataRow,
  type ColumnMapping,
  type CsvPreviewRequest,
  type ColumnType,
  // Rename to avoid conflict with other preview schemas
  previewRequestSchema as dataSourcePreviewRequestSchema,
  type PreviewRequest as DataSourcePreviewRequest,
} from "./data-sources.js";

// Templates schemas
export {
  campaignTemplateSchema,
  createCampaignTemplateSchema,
  updateCampaignTemplateSchema,
  templateListResponseSchema,
  templateQuerySchema,
  templatePreviewRequestSchema,
  templatePreviewResponseSchema,
  extractVariablesRequestSchema,
  extractVariablesResponseSchema,
  validateTemplateRequestSchema,
  validateTemplateResponseSchema,
  substituteVariablesRequestSchema,
  substituteVariablesResponseSchema,
  previewWithDataRequestSchema,
  previewWithDataResponseSchema,
  platformSchema,
  adTemplateConfigSchema,
  type CampaignTemplate,
  type TemplatePreviewRequest,
  type TemplatePreviewResponse,
  // Rename to avoid conflict with campaigns schema
  previewAdSchema as templatePreviewAdSchema,
  type PreviewAd as TemplatePreviewAd,
} from "./templates.js";

// Rules schemas
export * from "./rules.js";

// Campaigns schemas
export {
  campaignStatusSchema,
  syncStatusSchema,
  generatedCampaignDataSchema,
  generatedCampaignSchema,
  syncRecordSchema,
  campaignWithSyncSchema,
  generateCampaignsRequestSchema,
  generateCampaignsResponseSchema,
  syncRequestSchema,
  syncResponseSchema,
  diffItemSchema,
  diffResponseSchema,
  campaignListResponseSchema,
  campaignQuerySchema,
  generatedAdPreviewSchema,
  generatedAdGroupPreviewSchema,
  generatedCampaignPreviewSchema,
  previewMetadataSchema,
  previewRequestSchema,
  previewResponseSchema,
  type CampaignStatus,
  type SyncStatus,
  type GeneratedCampaignData,
  type GeneratedCampaign,
  type SyncRecord,
  type CampaignWithSync,
  type GenerateCampaignsRequest,
  type GenerateCampaignsResponse,
  type SyncRequest,
  type SyncResponse,
  type DiffItem,
  type DiffResponse,
  type CampaignListResponse,
  type CampaignQuery,
  type PreviewMetadata,
  type PreviewRequest,
  type PreviewResponse,
} from "./campaigns.js";

// Accounts schemas
export * from "./accounts.js";

// Creatives schemas
export * from "./creatives.js";
