import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export const EntityTypeSchema = z.enum(["campaign", "ad_group", "ad", "creative"]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

// ============================================================================
// Validation Schemas for Operations
// ============================================================================

const CampaignDataSchema = z.object({
  name: z.string().min(1).max(255),
  objective: z.string().min(1).optional(),
  status: z.string().optional(),
}).passthrough();

const CampaignUpdateDataSchema = CampaignDataSchema.partial();

const AdGroupDataSchema = z.object({
  name: z.string().min(1).max(255),
  campaign_id: z.string().min(1).optional(),
  status: z.string().optional(),
}).passthrough();

const AdGroupUpdateDataSchema = AdGroupDataSchema.partial();

const AdDataSchema = z.object({
  name: z.string().max(255).optional(),
  ad_group_id: z.string().min(1).optional(),
  headline: z.string().max(100).optional(),
  status: z.string().optional(),
}).passthrough();

const AdUpdateDataSchema = AdDataSchema.partial();

const CreativeDataSchema = z.object({
  name: z.string().min(1).max(255),
}).passthrough();

const CreativeUpdateDataSchema = CreativeDataSchema.partial();

interface EntitySchemas {
  create: z.ZodSchema;
  update: z.ZodSchema;
}

function getSchemasForEntityType(entityType: EntityType): EntitySchemas {
  switch (entityType) {
    case "campaign":
      return { create: CampaignDataSchema, update: CampaignUpdateDataSchema };
    case "ad_group":
      return { create: AdGroupDataSchema, update: AdGroupUpdateDataSchema };
    case "ad":
      return { create: AdDataSchema, update: AdUpdateDataSchema };
    case "creative":
      return { create: CreativeDataSchema, update: CreativeUpdateDataSchema };
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

export const OperationTypeSchema = z.enum(["create", "update", "delete"]);
export type OperationType = z.infer<typeof OperationTypeSchema>;

export interface LocalCampaign {
  id: string;
  platformId: string | null;
  name: string;
  objective: string;
  status: string;
  data: Record<string, unknown>;
}

export interface LocalAdGroup {
  id: string;
  platformId: string | null;
  campaignId: string;
  name: string;
  status: string;
  data: Record<string, unknown>;
}

export interface LocalAd {
  id: string;
  platformId: string | null;
  adGroupId: string;
  name: string;
  status: string;
  data: Record<string, unknown>;
}

export interface LocalState {
  campaigns: LocalCampaign[];
  adGroups: LocalAdGroup[];
  ads: LocalAd[];
}

export interface PlatformCampaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  data: Record<string, unknown>;
}

export interface PlatformAdGroup {
  id: string;
  campaignId: string;
  name: string;
  status: string;
  data: Record<string, unknown>;
}

export interface PlatformAd {
  id: string;
  adGroupId: string;
  name: string;
  status: string;
  data: Record<string, unknown>;
}

export interface PlatformState {
  campaigns: PlatformCampaign[];
  adGroups: PlatformAdGroup[];
  ads: PlatformAd[];
}

// Discriminated union for type-safe sync operations
export interface CreateSyncOperation {
  type: "create";
  entityType: EntityType;
  localId: string;
  data: Record<string, unknown>;
  parentId?: string;
}

export interface UpdateSyncOperation {
  type: "update";
  entityType: EntityType;
  localId: string;
  platformId: string;
  data: Record<string, unknown>;
  changes: string[];
}

export interface DeleteSyncOperation {
  type: "delete";
  entityType: EntityType;
  platformId: string;
}

export type SyncOperation = CreateSyncOperation | UpdateSyncOperation | DeleteSyncOperation;

export interface CreateDiff {
  type: EntityType;
  localId: string;
  data: Record<string, unknown>;
}

export interface UpdateDiff {
  type: EntityType;
  localId: string;
  platformId: string;
  changes: string[];
  newValues: Record<string, unknown>;
}

export interface DeleteDiff {
  type: EntityType;
  platformId: string;
}

export interface InSyncItem {
  type: EntityType;
  localId: string;
  platformId: string;
}

export interface DiffResult {
  creates: CreateDiff[];
  updates: UpdateDiff[];
  deletes: DeleteDiff[];
  inSync: InSyncItem[];
}

export interface DiffOptions {
  trackDeletions?: boolean;
}

export interface SyncOptions {
  transactionMode?: boolean;
  dryRun?: boolean;
}

export interface ExecutedOperation {
  operation: SyncOperation;
  platformId?: string;
  success: boolean;
  timestamp: Date;
}

export interface SyncError {
  operation: SyncOperation;
  message: string;
  details?: Record<string, unknown>;
}

export interface RollbackFailure {
  type: EntityType;
  platformId: string;
  error: string;
}

export interface SyncResult {
  success: boolean;
  executed: ExecutedOperation[];
  errors: SyncError[];
  rolledBack?: boolean;
  rollbackFailures?: RollbackFailure[];
  timestamp: Date;
}

export interface SyncHistoryEntry {
  id: string;
  timestamp: Date;
  operationsCount: number;
  success: boolean;
  duration: number;
  errors: SyncError[];
}

export interface PlatformAdapter {
  fetchCampaign(id: string): Promise<PlatformCampaign | null>;
  fetchAdGroup(id: string): Promise<PlatformAdGroup | null>;
  fetchAd(id: string): Promise<PlatformAd | null>;
  createCampaign(data: Record<string, unknown>): Promise<{ id: string }>;
  updateCampaign(id: string, data: Record<string, unknown>): Promise<void>;
  deleteCampaign(id: string): Promise<void>;
  createAdGroup(data: Record<string, unknown>): Promise<{ id: string }>;
  updateAdGroup(id: string, data: Record<string, unknown>): Promise<void>;
  deleteAdGroup(id: string): Promise<void>;
  createAd(data: Record<string, unknown>): Promise<{ id: string }>;
  updateAd(id: string, data: Record<string, unknown>): Promise<void>;
  deleteAd(id: string): Promise<void>;
}

// ============================================================================
// Sync Engine
// ============================================================================

const MAX_HISTORY_ENTRIES = 10;

export class SyncEngine {
  private readonly adapter: PlatformAdapter;
  private history: SyncHistoryEntry[] = [];

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
  }

  /**
   * Compare local state with platform state and generate diff
   */
  diff(
    localState: LocalState,
    platformState: PlatformState,
    options: DiffOptions = {}
  ): DiffResult {
    const creates: CreateDiff[] = [];
    const updates: UpdateDiff[] = [];
    const deletes: DeleteDiff[] = [];
    const inSync: InSyncItem[] = [];

    // Build platform lookup maps
    const platformCampaigns = new Map(
      platformState.campaigns.map((c) => [c.id, c])
    );
    const platformAdGroups = new Map(
      platformState.adGroups.map((ag) => [ag.id, ag])
    );
    const platformAds = new Map(platformState.ads.map((a) => [a.id, a]));

    // Track which platform items are matched
    const matchedCampaigns = new Set<string>();
    const matchedAdGroups = new Set<string>();
    const matchedAds = new Set<string>();

    // Process campaigns
    for (const local of localState.campaigns) {
      if (!local.platformId) {
        // New campaign - needs creation
        creates.push({
          type: "campaign",
          localId: local.id,
          data: { name: local.name, objective: local.objective, ...local.data },
        });
      } else {
        const platform = platformCampaigns.get(local.platformId);
        if (platform) {
          matchedCampaigns.add(local.platformId);
          const changes = this.detectChanges(local, platform);
          if (changes.length > 0) {
            updates.push({
              type: "campaign",
              localId: local.id,
              platformId: local.platformId,
              changes,
              newValues: this.extractChangedValues(local, changes),
            });
          } else {
            inSync.push({
              type: "campaign",
              localId: local.id,
              platformId: local.platformId,
            });
          }
        }
      }
    }

    // Process ad groups
    for (const local of localState.adGroups) {
      if (!local.platformId) {
        creates.push({
          type: "ad_group",
          localId: local.id,
          data: { name: local.name, campaign_id: local.campaignId, ...local.data },
        });
      } else {
        const platform = platformAdGroups.get(local.platformId);
        if (platform) {
          matchedAdGroups.add(local.platformId);
          const changes = this.detectChanges(local, platform);
          if (changes.length > 0) {
            updates.push({
              type: "ad_group",
              localId: local.id,
              platformId: local.platformId,
              changes,
              newValues: this.extractChangedValues(local, changes),
            });
          } else {
            inSync.push({
              type: "ad_group",
              localId: local.id,
              platformId: local.platformId,
            });
          }
        }
      }
    }

    // Process ads
    for (const local of localState.ads) {
      if (!local.platformId) {
        creates.push({
          type: "ad",
          localId: local.id,
          data: { name: local.name, ad_group_id: local.adGroupId, ...local.data },
        });
      } else {
        const platform = platformAds.get(local.platformId);
        if (platform) {
          matchedAds.add(local.platformId);
          const changes = this.detectChanges(local, platform);
          if (changes.length > 0) {
            updates.push({
              type: "ad",
              localId: local.id,
              platformId: local.platformId,
              changes,
              newValues: this.extractChangedValues(local, changes),
            });
          } else {
            inSync.push({
              type: "ad",
              localId: local.id,
              platformId: local.platformId,
            });
          }
        }
      }
    }

    // Track deletions if enabled
    if (options.trackDeletions) {
      for (const platform of platformState.campaigns) {
        if (!matchedCampaigns.has(platform.id)) {
          deletes.push({ type: "campaign", platformId: platform.id });
        }
      }
      for (const platform of platformState.adGroups) {
        if (!matchedAdGroups.has(platform.id)) {
          deletes.push({ type: "ad_group", platformId: platform.id });
        }
      }
      for (const platform of platformState.ads) {
        if (!matchedAds.has(platform.id)) {
          deletes.push({ type: "ad", platformId: platform.id });
        }
      }
    }

    return { creates, updates, deletes, inSync };
  }

  /**
   * Generate sync operations from a diff result
   */
  generateOperations(diff: DiffResult): SyncOperation[] {
    const operations: SyncOperation[] = [];

    // Creates
    for (const create of diff.creates) {
      operations.push({
        type: "create",
        entityType: create.type,
        localId: create.localId,
        data: create.data,
      });
    }

    // Updates
    for (const update of diff.updates) {
      operations.push({
        type: "update",
        entityType: update.type,
        localId: update.localId,
        platformId: update.platformId,
        data: update.newValues,
        changes: update.changes,
      });
    }

    // Deletes
    for (const del of diff.deletes) {
      operations.push({
        type: "delete",
        entityType: del.type,
        platformId: del.platformId,
      });
    }

    return operations;
  }

  /**
   * Execute sync operations
   */
  async executeSync(
    operations: SyncOperation[],
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const executed: ExecutedOperation[] = [];
    const errors: SyncError[] = [];
    let rolledBack = false;
    let rollbackFailures: RollbackFailure[] | undefined;

    // Sort operations: creates first (campaigns > ad_groups > ads), then updates, then deletes
    const sortedOps = this.sortOperations(operations);

    // Track created items for potential rollback
    const createdItems: { type: EntityType; platformId: string }[] = [];

    for (const operation of sortedOps) {
      if (options.dryRun) {
        executed.push({
          operation,
          success: true,
          timestamp: new Date(),
        });
        continue;
      }

      try {
        const platformId = await this.executeOperation(operation, createdItems);
        executed.push({
          operation,
          platformId,
          success: true,
          timestamp: new Date(),
        });

        if (operation.type === "create" && platformId) {
          createdItems.push({ type: operation.entityType, platformId });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        errors.push({
          operation,
          message: errorMessage,
          details: error instanceof Error ? { stack: error.stack } : undefined,
        });

        // If transaction mode, rollback
        if (options.transactionMode) {
          const rollbackResult = await this.rollback(createdItems);
          rolledBack = true;
          if (rollbackResult.failures.length > 0) {
            rollbackFailures = rollbackResult.failures;
          }
          break;
        }
      }
    }

    const success = errors.length === 0;
    const duration = Date.now() - startTime;

    // Record history
    this.recordHistory({
      operationsCount: operations.length,
      success,
      duration,
      errors,
    });

    return {
      success,
      executed,
      errors,
      rolledBack,
      rollbackFailures,
      timestamp: new Date(),
    };
  }

  /**
   * Get sync history
   */
  getSyncHistory(): SyncHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Execute a single operation
   * Uses type narrowing based on the discriminated union type
   */
  private async executeOperation(
    operation: SyncOperation,
    createdItems: { type: EntityType; platformId: string }[]
  ): Promise<string | undefined> {
    switch (operation.type) {
      case "create":
        return this.executeCreate(operation, createdItems);
      case "update":
        await this.executeUpdate(operation);
        return operation.platformId;
      case "delete":
        await this.executeDelete(operation);
        return undefined;
    }
  }

  /**
   * Execute create operation
   */
  private async executeCreate(
    operation: CreateSyncOperation,
    createdItems: { type: EntityType; platformId: string }[]
  ): Promise<string> {
    const data = { ...operation.data };

    // Validate input data before executing
    const schemas = getSchemasForEntityType(operation.entityType);
    const validationResult = schemas.create.safeParse(data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((e: { path: (string | number)[]; message: string }) =>
          `${e.path.join(".")}: ${e.message}`
        )
        .join(", ");
      throw new Error(
        `Validation failed for ${operation.entityType} create: ${errorMessages}`
      );
    }

    // Resolve parent ID for ad groups and ads
    if (operation.entityType === "ad_group" && operation.parentId) {
      const parentPlatformId = createdItems.find(
        (item) => item.type === "campaign"
      )?.platformId;
      if (parentPlatformId) {
        data.campaign_id = parentPlatformId;
      }
    }

    if (operation.entityType === "ad" && operation.parentId) {
      const parentPlatformId = createdItems.find(
        (item) => item.type === "ad_group"
      )?.platformId;
      if (parentPlatformId) {
        data.ad_group_id = parentPlatformId;
      }
    }

    let result: { id: string };
    switch (operation.entityType) {
      case "campaign":
        result = await this.adapter.createCampaign(data);
        break;
      case "ad_group":
        result = await this.adapter.createAdGroup(data);
        break;
      case "ad":
        result = await this.adapter.createAd(data);
        break;
      default:
        throw new Error(`Unsupported entity type: ${operation.entityType}`);
    }

    return result.id;
  }

  /**
   * Execute update operation
   */
  private async executeUpdate(operation: UpdateSyncOperation): Promise<void> {
    if (!operation.platformId) {
      throw new Error("Platform ID required for update operation");
    }

    const data = operation.data ?? {};

    // Validate input data before executing (partial validation for updates)
    const schemas = getSchemasForEntityType(operation.entityType);
    const validationResult = schemas.update.safeParse(data);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((e: { path: (string | number)[]; message: string }) =>
          `${e.path.join(".")}: ${e.message}`
        )
        .join(", ");
      throw new Error(
        `Validation failed for ${operation.entityType} update: ${errorMessages}`
      );
    }

    switch (operation.entityType) {
      case "campaign":
        await this.adapter.updateCampaign(operation.platformId, data);
        break;
      case "ad_group":
        await this.adapter.updateAdGroup(operation.platformId, data);
        break;
      case "ad":
        await this.adapter.updateAd(operation.platformId, data);
        break;
      default:
        throw new Error(`Unsupported entity type: ${operation.entityType}`);
    }
  }

  /**
   * Execute delete operation
   */
  private async executeDelete(operation: DeleteSyncOperation): Promise<void> {
    if (!operation.platformId) {
      throw new Error("Platform ID required for delete operation");
    }

    switch (operation.entityType) {
      case "campaign":
        await this.adapter.deleteCampaign(operation.platformId);
        break;
      case "ad_group":
        await this.adapter.deleteAdGroup(operation.platformId);
        break;
      case "ad":
        await this.adapter.deleteAd(operation.platformId);
        break;
      default:
        throw new Error(`Unsupported entity type: ${operation.entityType}`);
    }
  }

  /**
   * Rollback created items
   * Returns information about any failures during rollback
   */
  private async rollback(
    createdItems: { type: EntityType; platformId: string }[]
  ): Promise<{ success: boolean; failures: RollbackFailure[] }> {
    // Delete in reverse order: ads > ad_groups > campaigns
    const sorted = [...createdItems].reverse();
    const failures: RollbackFailure[] = [];

    for (const item of sorted) {
      try {
        switch (item.type) {
          case "campaign":
            await this.adapter.deleteCampaign(item.platformId);
            break;
          case "ad_group":
            await this.adapter.deleteAdGroup(item.platformId);
            break;
          case "ad":
            await this.adapter.deleteAd(item.platformId);
            break;
        }
      } catch (error) {
        // Track rollback failures but continue with other rollbacks
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to rollback ${item.type} ${item.platformId}: ${errorMessage}`);
        failures.push({
          type: item.type,
          platformId: item.platformId,
          error: errorMessage,
        });
      }
    }

    return {
      success: failures.length === 0,
      failures,
    };
  }

  /**
   * Sort operations for proper execution order
   */
  private sortOperations(operations: SyncOperation[]): SyncOperation[] {
    const order: Record<OperationType, number> = {
      create: 0,
      update: 1,
      delete: 2,
    };

    const entityOrder: Record<EntityType, number> = {
      campaign: 0,
      ad_group: 1,
      ad: 2,
      creative: 3,
    };

    return [...operations].sort((a, b) => {
      // First by operation type
      const opDiff = order[a.type] - order[b.type];
      if (opDiff !== 0) return opDiff;

      // Then by entity type (for creates) or reverse (for deletes)
      if (a.type === "delete") {
        return entityOrder[b.entityType] - entityOrder[a.entityType];
      }
      return entityOrder[a.entityType] - entityOrder[b.entityType];
    });
  }

  /**
   * Detect changes between local and platform state
   */
  private detectChanges(
    local: { name: string; status: string; data: Record<string, unknown> },
    platform: { name: string; status: string; data: Record<string, unknown> }
  ): string[] {
    const changes: string[] = [];

    if (local.name !== platform.name) {
      changes.push("name");
    }

    // Normalize status comparison
    if (local.status.toUpperCase() !== platform.status.toUpperCase()) {
      changes.push("status");
    }

    // Compare data fields
    for (const [key, value] of Object.entries(local.data)) {
      if (JSON.stringify(value) !== JSON.stringify(platform.data[key])) {
        changes.push(key);
      }
    }

    return changes;
  }

  /**
   * Extract changed values from local state
   */
  private extractChangedValues(
    local: { name: string; status: string; data: Record<string, unknown> },
    changes: string[]
  ): Record<string, unknown> {
    const values: Record<string, unknown> = {};

    for (const change of changes) {
      if (change === "name") {
        values.name = local.name;
      } else if (change === "status") {
        values.status = local.status;
      } else if (local.data[change] !== undefined) {
        values[change] = local.data[change];
      }
    }

    return values;
  }

  /**
   * Record sync history
   */
  private recordHistory(entry: Omit<SyncHistoryEntry, "id" | "timestamp">): void {
    const historyEntry: SyncHistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry,
    };

    this.history.unshift(historyEntry);

    // Limit history size
    if (this.history.length > MAX_HISTORY_ENTRIES) {
      this.history = this.history.slice(0, MAX_HISTORY_ENTRIES);
    }
  }
}
