import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, and, count, asc } from "drizzle-orm";
import {
  generatedCampaignSchema,
  campaignListResponseSchema,
  campaignQuerySchema,
  generateCampaignsRequestSchema,
  generateCampaignsResponseSchema,
  syncRequestSchema,
  syncResponseSchema,
  syncRecordSchema,
  diffResponseSchema,
  previewRequestSchema,
  previewResponseSchema,
  generateFromConfigRequestSchema,
  generateFromConfigResponseSchema,
  previewWithConfigRequestSchema,
  previewWithConfigResponseSchema,
} from "../schemas/campaigns.js";
import { platformSchema } from "../schemas/templates.js";
import { idParamSchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";
import { PreviewService, PreviewError } from "../services/preview-service.js";
import { ConfigPreviewService, ConfigPreviewError } from "../services/config-preview-service.js";
import {
  db,
  generatedCampaigns,
  syncRecords,
  campaignTemplates,
  dataSources,
  dataRows,
  rules,
} from "../services/db.js";
import { hasStoredData, getStoredRows } from "../services/data-ingestion.js";

// Create the OpenAPI Hono app
export const campaignsApp = new OpenAPIHono();

// ============================================================================
// Shared Dependency Factory
// ============================================================================

/**
 * Factory function to create shared database dependencies for preview services.
 * Eliminates code duplication between PreviewService and ConfigPreviewService.
 */
function createSharedDependencies() {
  const getDataSource = async (id: string) => {
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, id))
      .limit(1);

    if (!dataSource) return undefined;
    return {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
    };
  };

  const getDataRows = async (dataSourceId: string) => {
    // Try stored data first (from CSV upload)
    if (hasStoredData(dataSourceId)) {
      const { rows } = getStoredRows(dataSourceId, 1, 10000);
      return rows;
    }

    // Get from database
    const rows = await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, dataSourceId))
      .orderBy(asc(dataRows.rowIndex));

    return rows.map((row) => row.rowData as Record<string, unknown>);
  };

  const getRule = async (id: string) => {
    const [rule] = await db
      .select()
      .from(rules)
      .where(eq(rules.id, id))
      .limit(1);

    if (!rule) return undefined;
    return {
      id: rule.id,
      name: rule.name,
      description: undefined,
      enabled: rule.enabled,
      priority: rule.priority,
      conditionGroup: {
        id: "root",
        logic: "AND" as const,
        conditions: rule.conditions.map((cond, i) => ({
          id: `c${i}`,
          field: cond.field,
          operator: cond.operator,
          value: cond.value,
        })),
      },
      actions: rule.actions.map((action, i) => ({
        id: `a${i}`,
        type: action.type,
        ...(action.target && { field: action.target }),
        ...(action.value !== undefined && { value: action.value }),
      })),
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  };

  return { getDataSource, getDataRows, getRule };
}

const sharedDeps = createSharedDependencies();

// Create preview service with database dependencies
const previewService = new PreviewService({
  getTemplate: async (id: string) => {
    const [template] = await db
      .select()
      .from(campaignTemplates)
      .where(eq(campaignTemplates.id, id))
      .limit(1);

    if (!template) return undefined;
    return {
      id: template.id,
      name: template.name,
      platform: template.platform,
      structure: template.structure,
    };
  },
  ...sharedDeps,
});

// Create config preview service with shared database dependencies
const configPreviewService = new ConfigPreviewService(sharedDeps);

// ============================================================================
// Route Definitions
// ============================================================================

const listCampaignsRoute = createRoute({
  method: "get",
  path: "/api/v1/campaigns",
  tags: ["Campaigns"],
  summary: "List generated campaigns",
  description: "Returns a paginated list of generated campaigns",
  request: {
    query: campaignQuerySchema,
  },
  responses: {
    200: {
      description: "List of campaigns",
      content: {
        "application/json": {
          schema: campaignListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const generateCampaignsRoute = createRoute({
  method: "post",
  path: "/api/v1/campaigns/generate",
  tags: ["Campaigns"],
  summary: "Generate campaigns from template",
  description: "Generates campaigns by combining a template with data source rows",
  request: {
    body: {
      content: {
        "application/json": {
          schema: generateCampaignsRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Campaigns generated successfully",
      content: {
        "application/json": {
          schema: generateCampaignsResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getCampaignRoute = createRoute({
  method: "get",
  path: "/api/v1/campaigns/{id}",
  tags: ["Campaigns"],
  summary: "Get campaign details",
  description: "Returns the details of a specific generated campaign",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Campaign details",
      content: {
        "application/json": {
          schema: generatedCampaignSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const syncCampaignRoute = createRoute({
  method: "post",
  path: "/api/v1/campaigns/{id}/sync",
  tags: ["Campaigns"],
  summary: "Sync campaign to platform",
  description: "Syncs a campaign to the specified ad platform",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: syncRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Sync initiated successfully",
      content: {
        "application/json": {
          schema: syncResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const diffCampaignRoute = createRoute({
  method: "get",
  path: "/api/v1/campaigns/{id}/diff",
  tags: ["Campaigns"],
  summary: "Get diff with platform state",
  description: "Compares local campaign state with the platform state",
  request: {
    params: idParamSchema,
    query: z.object({
      platform: platformSchema,
    }),
  },
  responses: {
    200: {
      description: "Diff result",
      content: {
        "application/json": {
          schema: diffResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const previewCampaignsRoute = createRoute({
  method: "post",
  path: "/api/v1/campaigns/preview",
  tags: ["Campaigns"],
  summary: "Preview campaign generation from stored resources",
  description:
    "Generates a preview of campaigns using template ID, data source ID, and rule IDs. Fetches the resources, applies rules to filter/transform data, and validates against platform constraints. Returns paginated preview with counts and warnings.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: previewRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Campaign preview generated successfully",
      content: {
        "application/json": {
          schema: previewResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const generateFromConfigRoute = createRoute({
  method: "post",
  path: "/api/v1/campaigns/generate-from-config",
  tags: ["Campaigns"],
  summary: "Generate campaigns from configuration",
  description:
    "Generates campaigns using a campaign-first configuration with variable patterns. Uses HierarchicalGrouper to transform flat data rows into hierarchical campaign structures.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: generateFromConfigRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Campaigns generated successfully",
      content: {
        "application/json": {
          schema: generateFromConfigResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const previewFromConfigRoute = createRoute({
  method: "post",
  path: "/api/v1/campaigns/preview-from-config",
  tags: ["Campaigns"],
  summary: "Preview campaign generation from configuration",
  description:
    "Generates a preview of campaigns using config-based generation. Returns campaign counts and sample data without persisting.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: previewWithConfigRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Campaign preview generated successfully",
      content: {
        "application/json": {
          schema: previewWithConfigResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

campaignsApp.openapi(listCampaignsRoute, async (c) => {
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];

  if (query.status) {
    conditions.push(eq(generatedCampaigns.status, query.status));
  }
  if (query.templateId) {
    conditions.push(eq(generatedCampaigns.templateId, query.templateId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countQuery = db.select({ count: count() }).from(generatedCampaigns);
  if (whereClause) {
    countQuery.where(whereClause);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count ?? 0;

  // Get paginated data
  const selectQuery = db.select().from(generatedCampaigns);
  if (whereClause) {
    selectQuery.where(whereClause);
  }
  const campaigns = await selectQuery
    .limit(limit)
    .offset(offset)
    .orderBy(generatedCampaigns.createdAt);

  // Convert to API format
  const data = campaigns.map((campaign) => ({
    id: campaign.id,
    userId: campaign.userId,
    templateId: campaign.templateId,
    dataRowId: campaign.dataRowId,
    campaignData: campaign.campaignData,
    status: campaign.status,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  }));

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

campaignsApp.openapi(generateCampaignsRoute, async (c) => {
  const body = c.req.valid("json");

  // Get template
  const [template] = await db
    .select()
    .from(campaignTemplates)
    .where(eq(campaignTemplates.id, body.templateId))
    .limit(1);

  if (!template) {
    throw createNotFoundError("Template", body.templateId);
  }

  // Get data rows
  let rowData: { id: string; data: Record<string, unknown> }[] = [];

  if (hasStoredData(body.dataSourceId)) {
    const { rows } = getStoredRows(body.dataSourceId, 1, 10000);
    rowData = rows.map((row, i) => ({
      id: crypto.randomUUID(),
      data: row,
    }));
  } else {
    const rows = await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, body.dataSourceId))
      .orderBy(asc(dataRows.rowIndex));

    rowData = rows.map((row) => ({
      id: row.id,
      data: row.rowData as Record<string, unknown>,
    }));
  }

  if (rowData.length === 0) {
    return c.json(
      {
        generatedCount: 0,
        campaigns: [],
        warnings: ["No data rows found in data source"],
      },
      201
    );
  }

  // Generate campaigns
  const generatedCampaignsList: z.infer<typeof generatedCampaignSchema>[] = [];

  for (const row of rowData) {
    const [newCampaign] = await db
      .insert(generatedCampaigns)
      .values({
        templateId: body.templateId,
        dataRowId: row.id,
        campaignData: {
          name: `${template.name} - ${row.data.product_name ?? `Row ${rowData.indexOf(row) + 1}`}`,
          objective: (template.structure as { objective?: string } | null)?.objective,
          budget: (template.structure as { budget?: { type: "daily" | "lifetime"; amount: number; currency: string } } | null)?.budget,
        },
        status: "draft",
      })
      .returning();

    if (!newCampaign) {
      throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to create campaign");
    }

    generatedCampaignsList.push({
      id: newCampaign.id,
      userId: newCampaign.userId,
      templateId: newCampaign.templateId,
      dataRowId: newCampaign.dataRowId,
      campaignData: newCampaign.campaignData,
      status: newCampaign.status,
      createdAt: newCampaign.createdAt.toISOString(),
      updatedAt: newCampaign.updatedAt.toISOString(),
    });
  }

  return c.json(
    {
      generatedCount: generatedCampaignsList.length,
      campaigns: generatedCampaignsList,
      warnings: [],
    },
    201
  );
});

campaignsApp.openapi(getCampaignRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [campaign] = await db
    .select()
    .from(generatedCampaigns)
    .where(eq(generatedCampaigns.id, id))
    .limit(1);

  if (!campaign) {
    throw createNotFoundError("Campaign", id);
  }

  return c.json(
    {
      id: campaign.id,
      userId: campaign.userId,
      templateId: campaign.templateId,
      dataRowId: campaign.dataRowId,
      campaignData: campaign.campaignData,
      status: campaign.status,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    },
    200
  );
});

campaignsApp.openapi(syncCampaignRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const [campaign] = await db
    .select()
    .from(generatedCampaigns)
    .where(eq(generatedCampaigns.id, id))
    .limit(1);

  if (!campaign) {
    throw createNotFoundError("Campaign", id);
  }

  // Create sync record
  const [newSyncRecord] = await db
    .insert(syncRecords)
    .values({
      generatedCampaignId: id,
      platform: body.platform,
      platformId: `${body.platform}_camp_${Date.now()}`,
      syncStatus: "synced",
      lastSyncedAt: new Date(),
    })
    .returning();

  if (!newSyncRecord) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to create sync record");
  }

  // Update campaign status
  await db
    .update(generatedCampaigns)
    .set({ status: "active" })
    .where(eq(generatedCampaigns.id, id));

  return c.json(
    {
      campaignId: id,
      syncRecord: {
        id: newSyncRecord.id,
        generatedCampaignId: newSyncRecord.generatedCampaignId,
        platform: newSyncRecord.platform,
        platformId: newSyncRecord.platformId,
        syncStatus: newSyncRecord.syncStatus,
        lastSyncedAt: newSyncRecord.lastSyncedAt?.toISOString() ?? null,
        errorLog: newSyncRecord.errorLog,
        createdAt: newSyncRecord.createdAt.toISOString(),
        updatedAt: newSyncRecord.updatedAt.toISOString(),
      },
      message: "Campaign synced successfully",
    },
    200
  );
});

campaignsApp.openapi(diffCampaignRoute, async (c) => {
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");

  const [campaign] = await db
    .select()
    .from(generatedCampaigns)
    .where(eq(generatedCampaigns.id, id))
    .limit(1);

  if (!campaign) {
    throw createNotFoundError("Campaign", id);
  }

  // Mock diff response - in production this would compare with platform state
  return c.json(
    {
      campaignId: id,
      platform: query.platform,
      status: "in_sync" as const,
      differences: [],
      lastChecked: new Date().toISOString(),
    },
    200
  );
});

campaignsApp.openapi(previewCampaignsRoute, async (c) => {
  const body = c.req.valid("json");

  try {
    const result = await previewService.generatePreview(body);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof PreviewError) {
      if (error.code === "TEMPLATE_NOT_FOUND") {
        throw createNotFoundError("Template", body.template_id);
      }
      if (error.code === "DATA_SOURCE_NOT_FOUND") {
        throw createNotFoundError("Data source", body.data_source_id);
      }
    }
    console.error("Unexpected error in previewCampaignsRoute:", {
      templateId: body.template_id,
      dataSourceId: body.data_source_id,
      error,
    });
    throw error;
  }
});

campaignsApp.openapi(generateFromConfigRoute, async (c) => {
  const body = c.req.valid("json");

  try {
    const result = await configPreviewService.generateFromConfig(body);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof ConfigPreviewError) {
      if (error.code === "DATA_SOURCE_NOT_FOUND") {
        throw createNotFoundError("Data source", body.dataSourceId);
      }
    }
    console.error("Unexpected error in generateFromConfigRoute:", {
      dataSourceId: body.dataSourceId,
      error,
    });
    throw error;
  }
});

campaignsApp.openapi(previewFromConfigRoute, async (c) => {
  const body = c.req.valid("json");

  try {
    const result = await configPreviewService.generatePreview(body);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof ConfigPreviewError) {
      if (error.code === "DATA_SOURCE_NOT_FOUND") {
        throw createNotFoundError("Data source", body.dataSourceId);
      }
    }
    console.error("Unexpected error in previewFromConfigRoute:", {
      dataSourceId: body.dataSourceId,
      error,
    });
    throw error;
  }
});

// Error handler for API exceptions
campaignsApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  console.error("Unexpected error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default campaignsApp;
