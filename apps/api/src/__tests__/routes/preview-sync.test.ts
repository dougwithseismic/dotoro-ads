import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { testClient } from "hono/testing";
import type { Context } from "hono";

const mockCampaignSetId = "660e8400-e29b-41d4-a716-446655440000";
const mockTeamId = "990e8400-e29b-41d4-a716-446655440000";
const mockCampaignId = "770e8400-e29b-41d4-a716-446655440001";
const mockAdGroupId = "880e8400-e29b-41d4-a716-446655440002";
const mockAdId = "990e8400-e29b-41d4-a716-446655440003";

// Mock team data for team auth context
const mockTeam = {
  id: mockTeamId,
  name: "Test Team",
  slug: "test-team",
};

// Mock the database module
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    campaignSets: { id: "id", teamId: "team_id" },
    generatedCampaigns: { id: "id", campaignSetId: "campaign_set_id" },
    adGroups: { id: "id", campaignId: "campaign_id" },
    ads: { id: "id", adGroupId: "ad_group_id" },
    keywords: { id: "id", adGroupId: "ad_group_id" },
    syncRecords: { id: "id" },
    adAccounts: { id: "id" },
    dataSources: { id: "id" },
    oauthTokens: { id: "id" },
  };
});

// Mock the team auth middleware
vi.mock("../../middleware/team-auth.js", () => ({
  requireTeamAuth: vi.fn(() => async (c: Context, next: () => Promise<void>) => {
    const teamIdHeader = c.req.header("x-team-id");
    if (!teamIdHeader) {
      return c.json({ error: "Team ID required", code: "VALIDATION_ERROR" }, 400);
    }
    c.set("teamContext", {
      team: mockTeam,
      role: "owner",
    });
    await next();
  }),
  getTeamContext: vi.fn((c: Context) => c.get("teamContext")),
  requireTeamRole: vi.fn(() => async (c: Context, next: () => Promise<void>) => {
    await next();
  }),
}));

// Mock the repository
const mockGetCampaignSetWithRelations = vi.fn();
vi.mock("../../repositories/campaign-set-repository.js", () => {
  return {
    DrizzleCampaignSetRepository: vi.fn().mockImplementation(() => ({
      getCampaignSetWithRelations: mockGetCampaignSetWithRelations,
    })),
  };
});

// Mock the validation service
const mockValidateCampaignSet = vi.fn();
vi.mock("@repo/core/campaign-set", () => ({
  getSyncValidationService: vi.fn(() => ({
    validateCampaignSet: mockValidateCampaignSet,
  })),
}));

// Mock the job queue
vi.mock("../../jobs/queue.js", () => ({
  getJobQueueReady: vi.fn().mockResolvedValue({
    send: vi.fn().mockResolvedValue("job-id-123"),
    getJobById: vi.fn().mockResolvedValue(null),
  }),
}));

// Import the app after mocks
import { campaignSetsApp } from "../../routes/campaign-sets.js";
import { db } from "../../services/db.js";

// Helper function to create campaign set data
function createMockCampaignSet(overrides: Partial<{
  config: Record<string, unknown>;
  campaigns: Array<{
    id: string;
    name: string;
    adGroups: Array<{
      id: string;
      name: string;
      ads: Array<{ id: string; headline: string | null }>;
      keywords: unknown[];
    }>;
  }>;
}> = {}) {
  return {
    id: mockCampaignSetId,
    teamId: mockTeamId,
    name: "Test Campaign Set",
    status: "draft",
    syncStatus: "pending",
    config: {
      selectedPlatforms: ["reddit"],
      fallbackStrategy: "skip",
      ...overrides.config,
    },
    campaigns: overrides.campaigns ?? [
      {
        id: mockCampaignId,
        name: "Campaign 1",
        adGroups: [
          {
            id: mockAdGroupId,
            name: "Ad Group 1",
            ads: [
              { id: mockAdId, headline: "Test Headline" },
            ],
            keywords: [],
          },
        ],
      },
    ],
  };
}

// Helper function to create validation result
function createMockValidationResult(overrides: Partial<{
  isValid: boolean;
  totalErrors: number;
  campaigns: Array<{
    entityId: string;
    entityName: string;
    isValid: boolean;
    errors: Array<{
      entityType: string;
      entityId: string;
      entityName: string;
      field: string;
      message: string;
      code: string;
      value?: unknown;
      expected?: string;
    }>;
    adGroups: Array<{
      entityId: string;
      entityName: string;
      isValid: boolean;
      errors: unknown[];
      ads: Array<{
        entityId: string;
        entityName: string;
        isValid: boolean;
        errors: Array<{
          entityType: string;
          entityId: string;
          entityName: string;
          field: string;
          message: string;
          code: string;
          value?: unknown;
          expected?: string;
        }>;
      }>;
      keywords: unknown[];
    }>;
  }>;
}> = {}) {
  return {
    isValid: overrides.isValid ?? true,
    campaignSetId: mockCampaignSetId,
    totalErrors: overrides.totalErrors ?? 0,
    campaigns: overrides.campaigns ?? [
      {
        entityId: mockCampaignId,
        entityName: "Campaign 1",
        isValid: true,
        errors: [],
        adGroups: [
          {
            entityId: mockAdGroupId,
            entityName: "Ad Group 1",
            isValid: true,
            errors: [],
            ads: [
              {
                entityId: mockAdId,
                entityName: "Test Headline",
                isValid: true,
                errors: [],
              },
            ],
            keywords: [],
          },
        ],
      },
    ],
    summary: {
      campaignsValidated: 1,
      adGroupsValidated: 1,
      adsValidated: 1,
      keywordsValidated: 0,
      campaignsWithErrors: 0,
      adGroupsWithErrors: 0,
      adsWithErrors: 0,
      keywordsWithErrors: 0,
    },
    validationTimeMs: 10,
  };
}

describe("Preview Sync Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock db.select chain for campaign set ownership check
    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: mockCampaignSetId, teamId: mockTeamId }]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockSelectChain);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/campaign-sets/:setId/preview-sync", () => {
    it("should return 400 if team ID header is missing", async () => {
      const client = testClient(campaignSetsApp);
      const response = await client["api"]["v1"]["campaign-sets"][":setId"]["preview-sync"].$post(
        { param: { setId: mockCampaignSetId } },
        {}
      );

      expect(response.status).toBe(400);
    });

    it("should return 404 if campaign set not found", async () => {
      // Mock campaign set not found
      mockGetCampaignSetWithRelations.mockResolvedValue(null);

      const client = testClient(campaignSetsApp);
      const response = await client["api"]["v1"]["campaign-sets"][":setId"]["preview-sync"].$post(
        { param: { setId: mockCampaignSetId } },
        { headers: { "x-team-id": mockTeamId } }
      );

      expect(response.status).toBe(404);
    });

    it("should return preview with all valid ads when no validation errors", async () => {
      const mockCampaignSet = createMockCampaignSet();
      const mockValidation = createMockValidationResult();

      mockGetCampaignSetWithRelations.mockResolvedValue(mockCampaignSet);
      mockValidateCampaignSet.mockReturnValue(mockValidation);

      const client = testClient(campaignSetsApp);
      const response = await client["api"]["v1"]["campaign-sets"][":setId"]["preview-sync"].$post(
        { param: { setId: mockCampaignSetId } },
        { headers: { "x-team-id": mockTeamId } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.campaignSetId).toBe(mockCampaignSetId);
      expect(body.totalAds).toBe(1);
      expect(body.breakdown.valid).toBe(1);
      expect(body.breakdown.fallback).toBe(0);
      expect(body.breakdown.skipped).toBe(0);
      expect(body.canProceed).toBe(true);
      expect(body.validAds).toHaveLength(1);
      expect(body.skippedAds).toHaveLength(0);
      expect(body.fallbackAds).toHaveLength(0);
    });

    it("should classify ads as skipped when validation errors exist and fallback is skip", async () => {
      const mockCampaignSet = createMockCampaignSet({
        config: { fallbackStrategy: "skip" },
      });

      const mockValidation = createMockValidationResult({
        isValid: false,
        totalErrors: 1,
        campaigns: [
          {
            entityId: mockCampaignId,
            entityName: "Campaign 1",
            isValid: false,
            errors: [],
            adGroups: [
              {
                entityId: mockAdGroupId,
                entityName: "Ad Group 1",
                isValid: false,
                errors: [],
                ads: [
                  {
                    entityId: mockAdId,
                    entityName: "Test Headline",
                    isValid: false,
                    errors: [
                      {
                        entityType: "ad",
                        entityId: mockAdId,
                        entityName: "Test Headline",
                        field: "headline",
                        message: "Headline exceeds maximum length of 100 characters",
                        code: "FIELD_TOO_LONG",
                        value: "A".repeat(150),
                        expected: "100 characters max",
                      },
                    ],
                  },
                ],
                keywords: [],
              },
            ],
          },
        ],
      });

      mockGetCampaignSetWithRelations.mockResolvedValue(mockCampaignSet);
      mockValidateCampaignSet.mockReturnValue(mockValidation);

      const client = testClient(campaignSetsApp);
      const response = await client["api"]["v1"]["campaign-sets"][":setId"]["preview-sync"].$post(
        { param: { setId: mockCampaignSetId } },
        { headers: { "x-team-id": mockTeamId } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.breakdown.valid).toBe(0);
      expect(body.breakdown.skipped).toBe(1);
      expect(body.canProceed).toBe(false);
      expect(body.skippedAds).toHaveLength(1);
      expect(body.skippedAds[0].errorCode).toBe("FIELD_TOO_LONG");
      expect(body.skippedAds[0].field).toBe("headline");
    });

    it("should classify ads as fallback when errors are FIELD_TOO_LONG and strategy is truncate", async () => {
      const mockCampaignSet = createMockCampaignSet({
        config: { fallbackStrategy: "truncate" },
      });

      const mockValidation = createMockValidationResult({
        isValid: false,
        totalErrors: 1,
        campaigns: [
          {
            entityId: mockCampaignId,
            entityName: "Campaign 1",
            isValid: false,
            errors: [],
            adGroups: [
              {
                entityId: mockAdGroupId,
                entityName: "Ad Group 1",
                isValid: false,
                errors: [],
                ads: [
                  {
                    entityId: mockAdId,
                    entityName: "Test Headline",
                    isValid: false,
                    errors: [
                      {
                        entityType: "ad",
                        entityId: mockAdId,
                        entityName: "Test Headline",
                        field: "headline",
                        message: "Headline exceeds maximum length",
                        code: "FIELD_TOO_LONG",
                      },
                    ],
                  },
                ],
                keywords: [],
              },
            ],
          },
        ],
      });

      mockGetCampaignSetWithRelations.mockResolvedValue(mockCampaignSet);
      mockValidateCampaignSet.mockReturnValue(mockValidation);

      const client = testClient(campaignSetsApp);
      const response = await client["api"]["v1"]["campaign-sets"][":setId"]["preview-sync"].$post(
        { param: { setId: mockCampaignSetId } },
        { headers: { "x-team-id": mockTeamId } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.breakdown.valid).toBe(0);
      expect(body.breakdown.fallback).toBe(1);
      expect(body.breakdown.skipped).toBe(0);
      expect(body.canProceed).toBe(true);
      expect(body.fallbackAds).toHaveLength(1);
      expect(body.fallbackAds[0].reason).toContain("truncated");
    });

    it("should generate warning when skip rate exceeds 20%", async () => {
      // Create 5 ads, 2 will be skipped (40% skip rate)
      const mockCampaignSet = createMockCampaignSet({
        campaigns: [
          {
            id: mockCampaignId,
            name: "Campaign 1",
            adGroups: [
              {
                id: mockAdGroupId,
                name: "Ad Group 1",
                ads: [
                  { id: "ad-1", headline: "Good Ad 1" },
                  { id: "ad-2", headline: "Good Ad 2" },
                  { id: "ad-3", headline: "Good Ad 3" },
                  { id: "ad-4", headline: "Bad Ad 4" },
                  { id: "ad-5", headline: "Bad Ad 5" },
                ],
                keywords: [],
              },
            ],
          },
        ],
      });

      const mockValidation = createMockValidationResult({
        isValid: false,
        totalErrors: 2,
        campaigns: [
          {
            entityId: mockCampaignId,
            entityName: "Campaign 1",
            isValid: false,
            errors: [],
            adGroups: [
              {
                entityId: mockAdGroupId,
                entityName: "Ad Group 1",
                isValid: false,
                errors: [],
                ads: [
                  { entityId: "ad-1", entityName: "Good Ad 1", isValid: true, errors: [] },
                  { entityId: "ad-2", entityName: "Good Ad 2", isValid: true, errors: [] },
                  { entityId: "ad-3", entityName: "Good Ad 3", isValid: true, errors: [] },
                  {
                    entityId: "ad-4",
                    entityName: "Bad Ad 4",
                    isValid: false,
                    errors: [
                      {
                        entityType: "ad",
                        entityId: "ad-4",
                        entityName: "Bad Ad 4",
                        field: "finalUrl",
                        message: "Invalid URL",
                        code: "INVALID_URL",
                      },
                    ],
                  },
                  {
                    entityId: "ad-5",
                    entityName: "Bad Ad 5",
                    isValid: false,
                    errors: [
                      {
                        entityType: "ad",
                        entityId: "ad-5",
                        entityName: "Bad Ad 5",
                        field: "finalUrl",
                        message: "Invalid URL",
                        code: "INVALID_URL",
                      },
                    ],
                  },
                ],
                keywords: [],
              },
            ],
          },
        ],
      });

      mockGetCampaignSetWithRelations.mockResolvedValue(mockCampaignSet);
      mockValidateCampaignSet.mockReturnValue(mockValidation);

      const client = testClient(campaignSetsApp);
      const response = await client["api"]["v1"]["campaign-sets"][":setId"]["preview-sync"].$post(
        { param: { setId: mockCampaignSetId } },
        { headers: { "x-team-id": mockTeamId } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.breakdown.valid).toBe(3);
      expect(body.breakdown.skipped).toBe(2);
      expect(body.warnings).toHaveLength(1);
      expect(body.warnings[0]).toContain("High skip rate");
      expect(body.warnings[0]).toContain("40");
    });

    it("should set canProceed to false when no valid or fallback ads", async () => {
      const mockCampaignSet = createMockCampaignSet();
      const mockValidation = createMockValidationResult({
        isValid: false,
        totalErrors: 1,
        campaigns: [
          {
            entityId: mockCampaignId,
            entityName: "Campaign 1",
            isValid: false,
            errors: [],
            adGroups: [
              {
                entityId: mockAdGroupId,
                entityName: "Ad Group 1",
                isValid: false,
                errors: [],
                ads: [
                  {
                    entityId: mockAdId,
                    entityName: "Test Headline",
                    isValid: false,
                    errors: [
                      {
                        entityType: "ad",
                        entityId: mockAdId,
                        entityName: "Test Headline",
                        field: "finalUrl",
                        message: "Invalid URL",
                        code: "INVALID_URL",
                      },
                    ],
                  },
                ],
                keywords: [],
              },
            ],
          },
        ],
      });

      mockGetCampaignSetWithRelations.mockResolvedValue(mockCampaignSet);
      mockValidateCampaignSet.mockReturnValue(mockValidation);

      const client = testClient(campaignSetsApp);
      const response = await client["api"]["v1"]["campaign-sets"][":setId"]["preview-sync"].$post(
        { param: { setId: mockCampaignSetId } },
        { headers: { "x-team-id": mockTeamId } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.canProceed).toBe(false);
      expect(body.breakdown.valid).toBe(0);
      expect(body.breakdown.skipped).toBe(1);
    });

    it("should include validationTimeMs in response", async () => {
      const mockCampaignSet = createMockCampaignSet();
      const mockValidation = createMockValidationResult();

      mockGetCampaignSetWithRelations.mockResolvedValue(mockCampaignSet);
      mockValidateCampaignSet.mockReturnValue(mockValidation);

      const client = testClient(campaignSetsApp);
      const response = await client["api"]["v1"]["campaign-sets"][":setId"]["preview-sync"].$post(
        { param: { setId: mockCampaignSetId } },
        { headers: { "x-team-id": mockTeamId } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(typeof body.validationTimeMs).toBe("number");
      expect(body.validationTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
