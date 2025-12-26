// Data Sources
export {
  dataSources,
  dataRows,
  columnMappings,
  dataSourcesRelations,
  dataRowsRelations,
  columnMappingsRelations,
  dataSourceTypeEnum,
} from "./data-sources.js";
export type {
  DataSource,
  NewDataSource,
  DataRow,
  NewDataRow,
  ColumnMapping,
  NewColumnMapping,
} from "./data-sources.js";

// Campaign Templates
export {
  campaignTemplates,
  adGroupTemplates,
  adTemplates,
  campaignTemplatesRelations,
  adGroupTemplatesRelations,
  adTemplatesRelations,
  platformEnum,
} from "./campaign-templates.js";
export type {
  CampaignTemplate,
  NewCampaignTemplate,
  CampaignStructure,
  AdGroupTemplate,
  NewAdGroupTemplate,
  AdGroupSettings,
  AdTemplate,
  NewAdTemplate,
  AdTemplateVariables,
} from "./campaign-templates.js";

// Rules
export {
  rules,
  templateRules,
  rulesRelations,
  templateRulesRelations,
  ruleTypeEnum,
} from "./rules.js";
export type {
  Rule,
  NewRule,
  RuleCondition,
  RuleAction,
  TemplateRule,
  NewTemplateRule,
} from "./rules.js";

// Generated Campaigns
export {
  generatedCampaigns,
  syncRecords,
  generatedCampaignsRelations,
  syncRecordsRelations,
  campaignStatusEnum,
  syncStatusEnum,
} from "./generated-campaigns.js";
export type {
  GeneratedCampaign,
  NewGeneratedCampaign,
  GeneratedCampaignData,
  SyncRecord,
  NewSyncRecord,
} from "./generated-campaigns.js";

// Ad Accounts
export {
  adAccounts,
  oauthTokens,
  adAccountsRelations,
  oauthTokensRelations,
  accountStatusEnum,
} from "./ad-accounts.js";
export type {
  AdAccount,
  NewAdAccount,
  OAuthToken,
  NewOAuthToken,
} from "./ad-accounts.js";

// Creatives
export {
  creatives,
  creativeTags,
  creativeTemplateLinks,
  creativesRelations,
  creativeTagsRelations,
  creativeTemplateLinksRelations,
  creativeTypeEnum,
  creativeStatusEnum,
} from "./creatives.js";
export type {
  Creative,
  NewCreative,
  CreativeTag,
  NewCreativeTag,
  CreativeTemplateLink,
  NewCreativeTemplateLink,
  CreativeDimensions,
  CreativeMetadata,
  CreativeSelectionCondition,
} from "./creatives.js";

// Transforms
export { transforms, transformsRelations } from "./transforms.js";
export type {
  Transform,
  NewTransform,
  TransformConfig,
  AggregationConfig,
  AggregationFunction,
} from "./transforms.js";

// Campaign Sets
export {
  campaignSets,
  campaignSetsRelations,
  campaignSetStatusEnum,
  campaignSetSyncStatusEnum,
} from "./campaign-sets.js";
export type {
  CampaignSet,
  NewCampaignSet,
  CampaignSetConfig,
} from "./campaign-sets.js";

// Ad Groups (normalized from JSONB)
export {
  adGroups,
  adGroupsRelations,
  adGroupStatusEnum,
} from "./ad-groups.js";
export type {
  AdGroup,
  NewAdGroup,
  AdGroupSettings as NormalizedAdGroupSettings,
} from "./ad-groups.js";

// Ads
export { ads, adsRelations, adStatusEnum } from "./ads.js";
export type { Ad, NewAd, AdAssets } from "./ads.js";

// Keywords
export {
  keywords,
  keywordsRelations,
  keywordMatchTypeEnum,
  keywordStatusEnum,
} from "./keywords.js";
export type { Keyword, NewKeyword } from "./keywords.js";
