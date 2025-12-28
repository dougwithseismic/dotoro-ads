/**
 * Database Service
 *
 * Exports the database client from @repo/database for use in API routes.
 * This provides a single point of access to the database connection.
 */

// Export database client
export { db, getDb, closeDb } from "@repo/database";
export type { Database } from "@repo/database";

// Export schema tables and types
export {
  // Data Sources
  dataSources,
  dataRows,
  columnMappings,

  // Campaign Templates
  campaignTemplates,
  adGroupTemplates,
  adTemplates,

  // Rules
  rules,
  templateRules,

  // Generated Campaigns
  generatedCampaigns,
  syncRecords,

  // Ad Accounts
  adAccounts,
  oauthTokens,

  // Creatives
  creatives,
  creativeTags,
  creativeTemplateLinks,

  // Transforms
  transforms,

  // Campaign Sets
  campaignSets,

  // Ad Groups
  adGroups,

  // Ads
  ads,

  // Keywords
  keywords,

  // User OAuth Tokens (for data source integrations)
  userOAuthTokens,

  // Better Auth (authentication)
  user,
  session,
  account,
  verification,

  // Teams
  teams,
  teamMemberships,
  teamInvitations,
} from "@repo/database";

// Export types
export type {
  // Data Sources
  DataSource,
  NewDataSource,
  DataRow,
  NewDataRow,
  ColumnMapping,
  NewColumnMapping,

  // Campaign Templates
  CampaignTemplate,
  NewCampaignTemplate,
  CampaignStructure,
  AdGroupTemplate,
  NewAdGroupTemplate,
  AdGroupSettings,
  AdTemplate,
  NewAdTemplate,
  AdTemplateVariables,

  // Rules
  Rule,
  NewRule,
  RuleCondition,
  RuleAction,
  TemplateRule,
  NewTemplateRule,

  // Generated Campaigns
  GeneratedCampaign,
  NewGeneratedCampaign,
  GeneratedCampaignData,
  SyncRecord,
  NewSyncRecord,

  // Ad Accounts
  AdAccount,
  NewAdAccount,
  OAuthToken,
  NewOAuthToken,

  // Creatives
  Creative,
  NewCreative,
  CreativeTag,
  NewCreativeTag,
  CreativeTemplateLink,
  NewCreativeTemplateLink,
  CreativeDimensions,
  CreativeMetadata,
  CreativeSelectionCondition,

  // Transforms
  Transform,
  NewTransform,
  TransformConfig,
  AggregationConfig,
  AggregationFunction,

  // Campaign Sets
  CampaignSet,
  NewCampaignSet,
  CampaignSetConfig,

  // Ad Groups
  AdGroup,
  NewAdGroup,

  // Ads
  Ad,
  NewAd,
  AdAssets,

  // Keywords
  Keyword,
  NewKeyword,

  // User OAuth Tokens
  UserOAuthToken,
  NewUserOAuthToken,

  // Better Auth (authentication)
  User,
  NewUser,
  Session,
  NewSession,
  Account,
  NewAccount,
  Verification,
  NewVerification,

  // Teams
  Team,
  NewTeam,
  TeamMembership,
  NewTeamMembership,
  TeamInvitation,
  NewTeamInvitation,
  TeamSettings,
  TeamRole,
  TeamPlan,
} from "@repo/database";
