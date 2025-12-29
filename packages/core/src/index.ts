// Re-export all services
export * from "./services/index.js";

// Re-export data utilities
export * from "./data/index.js";

// Re-export validators
export * from "./validators/index.js";

// Re-export rule engine
export * from "./rules/index.js";

// Re-export sync engine
export * from "./sync/index.js";

// Re-export generation engine
export * from "./generation/index.js";

// Re-export utilities
export * from "./utils/index.js";

// Re-export transform engine
export * from "./transforms/index.js";

// Re-export keywords
export * from "./keywords/index.js";

// Re-export shared types
export type { ValidationResult } from "./shared/index.js";

// Re-export ad types (with explicit exports to avoid conflicts)
export {
  AdTypeRegistry,
  adTypeRegistry,
  GOOGLE_AD_TYPES,
  REDDIT_AD_TYPES,
  FACEBOOK_AD_TYPES,
  validateAdData,
  validateField,
  validateAdType,
  getCharacterCount,
  extractVariables,
  initializeAdTypeRegistry,
  isAdTypeRegistryInitialized,
} from "./ad-types/index.js";
export type {
  Platform,
  ContentCategory as AdContentCategory,
  ValidationResult as AdValidationResult,
  AdData,
  FieldType,
  FieldOption,
  AdFieldDefinition,
  CreativeType as AdCreativeType,
  CreativeSpecs as AdCreativeSpecs,
  CreativeRequirement,
  AdConstraints,
  AdTypeFeatures,
  AdTypeDefinition,
} from "./ad-types/index.js";

// Re-export budget (with explicit exports to avoid conflicts)
export {
  BIDDING_STRATEGIES,
  getBiddingStrategies,
  getBiddingStrategy,
  isValidStrategyForPlatform,
  getStrategiesRequiringTargetCpa,
  getStrategiesRequiringTargetRoas,
  getStrategiesSupportingAdjustments,
  validateBudgetConfig,
  validateBiddingConfig,
  validateScheduleConfig,
} from "./budget/index.js";
export type {
  BudgetType,
  BudgetCaps,
  BudgetConfig,
  DayOfWeek,
  TimeRange,
  DaySchedule,
  DayPartingConfig,
  ScheduleConfig,
  BiddingStrategy,
  BidAdjustmentType,
  BidAdjustment,
  BiddingConfig,
  CampaignBudgetConfig,
  PlatformBudgetOverrides,
  BudgetWithOverrides,
  BiddingStrategyDefinition,
  ValidationResult as BudgetValidationResult,
} from "./budget/index.js";

// Re-export creatives (with explicit exports to avoid conflicts)
export type {
  CreativeType,
  AssetSource,
  AssetSourceBlob,
  AssetSourceRemote,
  AssetSourceVariable,
  AssetSourceStored,
  AssetMetadata,
  ValidationError as CreativeValidationError,
  ValidationWarning as CreativeValidationWarning,
  AssetValidation,
  CreativeAsset,
  CarouselSlide,
  CarouselAsset,
  CarouselConfig,
  CreativeSpecs,
  StorageProvider,
  StorageConfig,
  UploadResult,
  ImageAnalysisResult,
  VideoAnalysisResult,
} from "./creatives/index.js";

// Re-export content types (with explicit exports to avoid conflicts)
export type {
  ContentCategory,
  PersonaRole,
  PersonaTone,
  PersonaExpertise,
  AuthorPersona,
  RedditPostType,
  RedditPostConfig,
  CommentDefinition,
  RedditCommentConfig,
  RedditThreadDefinition,
  SocialPlatform,
  MediaConfig,
  ScheduleType,
  SocialPostSchedule,
  SocialPostContent,
  SocialPostDefinition,
  ArticlePlatform,
  ArticleContent,
  ArticleSeo,
  ArticleDefinition,
  ContentValidationResult,
  GeneratedContent,
  ContentGenerationContext,
} from "./content-types/index.js";

// Re-export targeting (with explicit exports to avoid conflicts)
export {
  validateTargetingConfig,
  validateLocationTarget,
  validateLocationTargets,
  validateDemographicTarget,
  validateDeviceTarget,
  validateAudienceTarget,
  validateAudienceTargets,
  validatePlacementTarget,
  COUNTRIES,
  US_STATES,
  CA_PROVINCES,
  UK_REGIONS,
  COMMON_LANGUAGES,
  searchLocations,
  getCountryByCode,
  getStatesByCountry,
  getLanguageByCode,
  isValidCountryCode,
  isValidLanguageCode,
} from "./targeting/index.js";
export type {
  TargetingType,
  LocationTargetType,
  LocationTarget,
  LocationOption,
  Gender,
  DemographicTarget,
  InterestCategory,
  AudienceType,
  AudienceTarget,
  DeviceType,
  OperatingSystem,
  Browser,
  DeviceTarget,
  PlacementTarget,
  TargetingConfig,
  PlatformTargetingOverrides,
  TargetingWithOverrides,
  TargetingReachEstimate,
  LanguageOption,
} from "./targeting/index.js";

// Re-export carousel templates (with explicit exports to avoid conflicts)
export {
  CAROUSEL_PLATFORM_CONSTRAINTS,
  isDataDrivenMode,
  isManualMode,
  isValidCarouselPlatform,
  createCarouselTemplate,
  createEmptyCanvasJson,
  createCarouselCard,
  generateCardId,
  fabricObjectJsonSchema,
  fabricCanvasJsonSchema,
  carouselModeSchema,
  carouselPlatformSchema,
  carouselPlatformConstraintsSchema,
  carouselCardSchema,
  carouselTemplateSchema,
  validateCarousel,
  validateCardCount,
  validateCard,
  validateCardDimensions,
  validateCardOrder,
  getCarouselConstraints,
  canAddCard,
  canRemoveCard,
  validateDataRowSelection,
} from "./templates/index.js";
export type {
  CarouselMode,
  CarouselPlatform,
  CarouselPlatformConstraints,
  CarouselCard,
  CarouselTemplate,
  CarouselValidationError,
  CarouselValidationResult,
  CarouselOutput,
  CarouselOutputCard,
  FacebookCarouselFormat,
  RedditCarouselFormat,
  FabricCanvasJson,
  FabricObjectJson,
} from "./templates/index.js";

// Re-export campaign set types
export type {
  // Status types
  CampaignSetStatus,
  CampaignSetSyncStatus,
  EntityStatus,
  CampaignStatus,
  KeywordMatchType,
  // Supporting types
  BudgetInfo,
  AdGroupSettings,
  AdAssets,
  HierarchyConfigSnapshot,
  InlineRule,
  // Config types
  CampaignSetConfig,
  // Main entity types
  CampaignSet,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  // DTO types
  CreateCampaignSetInput,
  UpdateCampaignSetInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateAdGroupInput,
  UpdateAdGroupInput,
  CreateAdInput,
  UpdateAdInput,
  CreateKeywordInput,
  UpdateKeywordInput,
  // Utility types
  CampaignSetWithRelations,
  CampaignSetSummary,
  SyncResult,
} from "./campaign-set/index.js";
