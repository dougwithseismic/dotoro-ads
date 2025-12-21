import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
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
} from "../schemas/campaigns.js";
import { platformSchema } from "../schemas/templates.js";
import { idParamSchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";

// In-memory mock data store
export const mockCampaigns = new Map<string, z.infer<typeof generatedCampaignSchema>>();
export const mockSyncRecords = new Map<string, z.infer<typeof syncRecordSchema>[]>();

// Function to reset and seed mock data
export function seedMockCampaigns() {
  mockCampaigns.clear();
  mockSyncRecords.clear();

  const seedId = "880e8400-e29b-41d4-a716-446655440000";
  mockCampaigns.set(seedId, {
    id: seedId,
    userId: null,
    templateId: "660e8400-e29b-41d4-a716-446655440000",
    dataRowId: "550e8400-e29b-41d4-a716-446655440001",
    campaignData: {
      name: "Electronics Sale Q1 - Product 1",
      objective: "CONVERSIONS",
      budget: {
        type: "daily",
        amount: 50,
        currency: "USD",
      },
      adGroups: [
        {
          name: "Product 1 AdGroup",
          ads: [
            {
              headline: "Get Product 1 for $99.99",
              description: "Limited time offer!",
            },
          ],
        },
      ],
    },
    status: "draft",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  });
  mockSyncRecords.set(seedId, []);

  const seedId2 = "880e8400-e29b-41d4-a716-446655440001";
  mockCampaigns.set(seedId2, {
    id: seedId2,
    userId: null,
    templateId: "660e8400-e29b-41d4-a716-446655440000",
    dataRowId: "550e8400-e29b-41d4-a716-446655440002",
    campaignData: {
      name: "Electronics Sale Q1 - Product 2",
      objective: "CONVERSIONS",
      budget: {
        type: "daily",
        amount: 50,
        currency: "USD",
      },
    },
    status: "active",
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
  });
  mockSyncRecords.set(seedId2, [
    {
      id: "sync-001",
      generatedCampaignId: seedId2,
      platform: "reddit",
      platformId: "reddit_camp_12345",
      syncStatus: "synced",
      lastSyncedAt: "2025-01-02T12:00:00.000Z",
      errorLog: null,
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T12:00:00.000Z",
    },
  ]);
}

// Initial seed
seedMockCampaigns();

// Create the OpenAPI Hono app
export const campaignsApp = new OpenAPIHono();

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

// ============================================================================
// Route Handlers
// ============================================================================

campaignsApp.openapi(listCampaignsRoute, async (c) => {
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  let campaigns = Array.from(mockCampaigns.values());

  // Filter by status if provided
  if (query.status) {
    campaigns = campaigns.filter((c) => c.status === query.status);
  }

  // Filter by templateId if provided
  if (query.templateId) {
    campaigns = campaigns.filter((c) => c.templateId === query.templateId);
  }

  const total = campaigns.length;
  const start = (page - 1) * limit;
  const data = campaigns.slice(start, start + limit);

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

campaignsApp.openapi(generateCampaignsRoute, async (c) => {
  const body = c.req.valid("json");

  // Mock campaign generation
  const generatedCampaigns: z.infer<typeof generatedCampaignSchema>[] = [];

  // Generate 2 mock campaigns
  for (let i = 0; i < 2; i++) {
    const newCampaign: z.infer<typeof generatedCampaignSchema> = {
      id: crypto.randomUUID(),
      userId: null,
      templateId: body.templateId,
      dataRowId: crypto.randomUUID(), // Mock data row ID
      campaignData: {
        name: `Generated Campaign ${i + 1}`,
        objective: "CONVERSIONS",
        budget: {
          type: "daily",
          amount: 50,
          currency: "USD",
        },
      },
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCampaigns.set(newCampaign.id, newCampaign);
    mockSyncRecords.set(newCampaign.id, []);
    generatedCampaigns.push(newCampaign);
  }

  return c.json(
    {
      generatedCount: generatedCampaigns.length,
      campaigns: generatedCampaigns,
      warnings: [],
    },
    201
  );
});

campaignsApp.openapi(getCampaignRoute, async (c) => {
  const { id } = c.req.valid("param");

  const campaign = mockCampaigns.get(id);
  if (!campaign) {
    throw createNotFoundError("Campaign", id);
  }

  return c.json(campaign, 200);
});

campaignsApp.openapi(syncCampaignRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const campaign = mockCampaigns.get(id);
  if (!campaign) {
    throw createNotFoundError("Campaign", id);
  }

  // Create mock sync record
  const syncRecord: z.infer<typeof syncRecordSchema> = {
    id: crypto.randomUUID(),
    generatedCampaignId: id,
    platform: body.platform,
    platformId: `${body.platform}_camp_${Date.now()}`,
    syncStatus: "synced",
    lastSyncedAt: new Date().toISOString(),
    errorLog: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const records = mockSyncRecords.get(id) ?? [];
  records.push(syncRecord);
  mockSyncRecords.set(id, records);

  // Update campaign status
  campaign.status = "active";
  campaign.updatedAt = new Date().toISOString();
  mockCampaigns.set(id, campaign);

  return c.json(
    {
      campaignId: id,
      syncRecord,
      message: "Campaign synced successfully",
    },
    200
  );
});

campaignsApp.openapi(diffCampaignRoute, async (c) => {
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");

  const campaign = mockCampaigns.get(id);
  if (!campaign) {
    throw createNotFoundError("Campaign", id);
  }

  // Mock diff response
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
