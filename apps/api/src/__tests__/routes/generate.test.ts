/**
 * Generate Routes Tests
 *
 * Tests for the creative generation API endpoints:
 * - Preview generation
 * - Single image generation
 * - Batch job creation and management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testClient } from "hono/testing";
import { generateApp } from "../../routes/generate.js";

// Mock the creative generation service
vi.mock("../../services/creative-generation.js", () => ({
  getCreativeGenerationService: vi.fn(() => ({
    generatePreview: vi.fn().mockResolvedValue({
      dataUrl: "data:image/png;base64,mockdata",
      width: 1080,
      height: 1080,
      renderDurationMs: 150,
    }),
    generateSingle: vi.fn().mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000001",
      teamId: "00000000-0000-0000-0000-000000000010",
      templateId: "00000000-0000-0000-0000-000000000100",
      variantId: null,
      dataSourceId: "00000000-0000-0000-0000-000000001000",
      dataRowId: "00000000-0000-0000-0000-000000010000",
      variableValues: { text: { name: "Test" } },
      storageKey: "generated/team/job/creative.png",
      cdnUrl: "https://cdn.example.com/generated/team/job/creative.png",
      width: 1080,
      height: 1080,
      fileSize: 50000,
      format: "png",
      generationBatchId: null,
      status: "completed",
      errorMessage: null,
      renderDurationMs: 200,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    }),
    startBatchJob: vi.fn().mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000002",
      teamId: "00000000-0000-0000-0000-000000000010",
      templateId: "00000000-0000-0000-0000-000000000100",
      dataSourceId: "00000000-0000-0000-0000-000000001000",
      aspectRatios: [{ width: 1080, height: 1080 }],
      rowFilter: null,
      outputFormat: "png",
      quality: 90,
      status: "pending",
      totalItems: 10,
      processedItems: 0,
      failedItems: 0,
      outputCreativeIds: [],
      errorLog: [],
      startedAt: null,
      completedAt: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    }),
    listJobs: vi.fn().mockResolvedValue({
      data: [
        {
          id: "00000000-0000-0000-0000-000000000002",
          teamId: "00000000-0000-0000-0000-000000000010",
          templateId: "00000000-0000-0000-0000-000000000100",
          dataSourceId: "00000000-0000-0000-0000-000000001000",
          aspectRatios: [{ width: 1080, height: 1080 }],
          rowFilter: null,
          outputFormat: "png",
          quality: 90,
          status: "completed",
          totalItems: 10,
          processedItems: 10,
          failedItems: 0,
          outputCreativeIds: [],
          errorLog: [],
          startedAt: new Date("2024-01-01T00:00:00Z"),
          completedAt: new Date("2024-01-01T00:01:00Z"),
          createdAt: new Date("2024-01-01T00:00:00Z"),
        },
      ],
      total: 1,
    }),
    getJob: vi.fn().mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000002",
      teamId: "00000000-0000-0000-0000-000000000010",
      templateId: "00000000-0000-0000-0000-000000000100",
      dataSourceId: "00000000-0000-0000-0000-000000001000",
      aspectRatios: [{ width: 1080, height: 1080 }],
      rowFilter: null,
      outputFormat: "png",
      quality: 90,
      status: "completed",
      totalItems: 10,
      processedItems: 10,
      failedItems: 0,
      outputCreativeIds: [],
      errorLog: [],
      startedAt: new Date("2024-01-01T00:00:00Z"),
      completedAt: new Date("2024-01-01T00:01:00Z"),
      createdAt: new Date("2024-01-01T00:00:00Z"),
    }),
    getJobResults: vi.fn().mockResolvedValue({
      data: [],
      total: 0,
    }),
    cancelJob: vi.fn().mockResolvedValue(true),
  })),
}));

// Mock the job queue
vi.mock("../../jobs/queue.js", () => ({
  getJobQueueReady: vi.fn().mockResolvedValue({
    send: vi.fn().mockResolvedValue("mock-job-id"),
  }),
}));

// Mock the job handler constant
vi.mock("../../jobs/handlers/generate-creatives.js", () => ({
  GENERATE_CREATIVES_JOB: "generate-creatives",
}));

const client = testClient(generateApp);

describe("Generate Routes", () => {
  const validTeamId = "00000000-0000-0000-0000-000000000010";
  const validTemplateId = "00000000-0000-0000-0000-000000000100";
  const validDataSourceId = "00000000-0000-0000-0000-000000001000";
  const validDataRowId = "00000000-0000-0000-0000-000000010000";
  const validJobId = "00000000-0000-0000-0000-000000000002";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/generate/preview", () => {
    it("should require x-team-id header", async () => {
      const res = await client.api.v1.generate.preview.$post({
        json: {
          templateId: validTemplateId,
          variableData: { name: "Test" },
          aspectRatio: { width: 1080, height: 1080 },
        },
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("should validate templateId is UUID", async () => {
      const res = await client.api.v1.generate.preview.$post({
        json: {
          templateId: "not-a-uuid",
          variableData: { name: "Test" },
          aspectRatio: { width: 1080, height: 1080 },
        },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(400);
    });

    it("should validate aspect ratio dimensions", async () => {
      const res = await client.api.v1.generate.preview.$post({
        json: {
          templateId: validTemplateId,
          variableData: { name: "Test" },
          aspectRatio: { width: 0, height: 1080 },
        },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(400);
    });

    it("should generate preview successfully", async () => {
      const res = await client.api.v1.generate.preview.$post({
        json: {
          templateId: validTemplateId,
          variableData: { name: "Test" },
          aspectRatio: { width: 1080, height: 1080 },
        },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("dataUrl");
      expect(body).toHaveProperty("width", 1080);
      expect(body).toHaveProperty("height", 1080);
      expect(body).toHaveProperty("renderDurationMs");
    });
  });

  describe("POST /api/v1/generate/single", () => {
    it("should require x-team-id header", async () => {
      const res = await client.api.v1.generate.single.$post({
        json: {
          templateId: validTemplateId,
          dataSourceId: validDataSourceId,
          dataRowId: validDataRowId,
          aspectRatio: { width: 1080, height: 1080 },
          format: "png",
          quality: 90,
        },
      });

      expect(res.status).toBe(400);
    });

    it("should generate single image successfully", async () => {
      const res = await client.api.v1.generate.single.$post({
        json: {
          templateId: validTemplateId,
          dataSourceId: validDataSourceId,
          dataRowId: validDataRowId,
          aspectRatio: { width: 1080, height: 1080 },
          format: "png",
          quality: 90,
        },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("cdnUrl");
      expect(body).toHaveProperty("status", "completed");
    });

    it("should accept jpeg format", async () => {
      const res = await client.api.v1.generate.single.$post({
        json: {
          templateId: validTemplateId,
          dataSourceId: validDataSourceId,
          dataRowId: validDataRowId,
          aspectRatio: { width: 1200, height: 628 },
          format: "jpeg",
          quality: 80,
        },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/v1/generate/batch", () => {
    it("should require x-team-id header", async () => {
      const res = await client.api.v1.generate.batch.$post({
        json: {
          templateId: validTemplateId,
          dataSourceId: validDataSourceId,
          aspectRatios: [{ width: 1080, height: 1080 }],
          format: "png",
          quality: 90,
        },
      });

      expect(res.status).toBe(400);
    });

    it("should create batch job successfully", async () => {
      const res = await client.api.v1.generate.batch.$post({
        json: {
          templateId: validTemplateId,
          dataSourceId: validDataSourceId,
          aspectRatios: [{ width: 1080, height: 1080 }],
          format: "png",
          quality: 90,
        },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body).toHaveProperty("jobId");
      expect(body).toHaveProperty("status", "queued");
      expect(body).toHaveProperty("totalItems");
    });

    it("should accept multiple aspect ratios", async () => {
      const res = await client.api.v1.generate.batch.$post({
        json: {
          templateId: validTemplateId,
          dataSourceId: validDataSourceId,
          aspectRatios: [
            { width: 1080, height: 1080 },
            { width: 1200, height: 628 },
            { width: 1080, height: 1920 },
          ],
          format: "png",
          quality: 90,
        },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(202);
    });

    it("should reject empty aspect ratios array", async () => {
      const res = await client.api.v1.generate.batch.$post({
        json: {
          templateId: validTemplateId,
          dataSourceId: validDataSourceId,
          aspectRatios: [],
          format: "png",
          quality: 90,
        },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/generate/jobs", () => {
    it("should require x-team-id header", async () => {
      const res = await client.api.v1.generate.jobs.$get({
        query: {},
      });

      expect(res.status).toBe(400);
    });

    it("should list jobs successfully", async () => {
      const res = await client.api.v1.generate.jobs.$get({
        query: {},
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("page");
      expect(body).toHaveProperty("limit");
    });

    it("should accept pagination parameters", async () => {
      const res = await client.api.v1.generate.jobs.$get({
        query: {
          page: 2,
          limit: 10,
        },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(200);
    });

    it("should filter by status", async () => {
      const res = await client.api.v1.generate.jobs.$get({
        query: {
          status: "completed",
        },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/v1/generate/jobs/:id", () => {
    it("should require x-team-id header", async () => {
      const res = await client.api.v1.generate.jobs[":id"].$get({
        param: { id: validJobId },
      });

      expect(res.status).toBe(400);
    });

    it("should get job details successfully", async () => {
      const res = await client.api.v1.generate.jobs[":id"].$get({
        param: { id: validJobId },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("id", validJobId);
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("totalItems");
      expect(body).toHaveProperty("processedItems");
    });
  });

  describe("GET /api/v1/generate/jobs/:id/results", () => {
    it("should require x-team-id header", async () => {
      const res = await client.api.v1.generate.jobs[":id"].results.$get({
        param: { id: validJobId },
        query: {},
      });

      expect(res.status).toBe(400);
    });

    it("should get job results successfully", async () => {
      const res = await client.api.v1.generate.jobs[":id"].results.$get({
        param: { id: validJobId },
        query: {},
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("total");
    });
  });

  describe("DELETE /api/v1/generate/jobs/:id", () => {
    it("should require x-team-id header", async () => {
      const res = await client.api.v1.generate.jobs[":id"].$delete({
        param: { id: validJobId },
      });

      expect(res.status).toBe(400);
    });

    it("should cancel job successfully", async () => {
      const res = await client.api.v1.generate.jobs[":id"].$delete({
        param: { id: validJobId },
        header: {
          "x-team-id": validTeamId,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("success", true);
    });
  });
});
