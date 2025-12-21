import { describe, it, expect, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import { accountsApp, seedMockAccounts } from "../../routes/accounts.js";

describe("Accounts API", () => {
  // Reset mock data before each test
  beforeEach(() => {
    seedMockAccounts();
  });

  const mockAccountId = "990e8400-e29b-41d4-a716-446655440000";

  describe("GET /api/v1/accounts", () => {
    it("should return a paginated list of accounts", async () => {
      const client = testClient(accountsApp);
      const res = await client["api"]["v1"]["accounts"].$get({
        query: { page: "1", limit: "10" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("total");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should filter accounts by platform", async () => {
      const client = testClient(accountsApp);
      const res = await client["api"]["v1"]["accounts"].$get({
        query: { platform: "reddit" },
      });

      expect(res.status).toBe(200);
    });

    it("should filter accounts by status", async () => {
      const client = testClient(accountsApp);
      const res = await client["api"]["v1"]["accounts"].$get({
        query: { status: "active" },
      });

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/v1/accounts/connect", () => {
    it("should initiate OAuth flow", async () => {
      const client = testClient(accountsApp);
      const res = await client["api"]["v1"]["accounts"]["connect"].$post({
        json: {
          platform: "reddit",
          redirectUri: "https://example.com/callback",
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("authorizationUrl");
      expect(json).toHaveProperty("state");
      expect(json.authorizationUrl).toContain("https://");
    });

    it("should return 400 for invalid redirectUri", async () => {
      const client = testClient(accountsApp);
      const res = await client["api"]["v1"]["accounts"]["connect"].$post({
        json: {
          platform: "reddit",
          redirectUri: "not-a-url",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for unsupported platform", async () => {
      const client = testClient(accountsApp);
      const res = await client["api"]["v1"]["accounts"]["connect"].$post({
        json: {
          // @ts-expect-error - testing invalid platform
          platform: "tiktok",
          redirectUri: "https://example.com/callback",
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      // Zod validation returns { success: false, error: { ... } } format
      expect(json.success).toBe(false);
      expect(json).toHaveProperty("error");
    });
  });

  describe("DELETE /api/v1/accounts/:id", () => {
    it("should disconnect an account and return 204", async () => {
      const client = testClient(accountsApp);
      const res = await client["api"]["v1"]["accounts"][":id"].$delete({
        param: { id: mockAccountId },
      });

      expect(res.status).toBe(204);
    });

    it("should return 404 for non-existent account", async () => {
      const client = testClient(accountsApp);
      const res = await client["api"]["v1"]["accounts"][":id"].$delete({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/accounts/:id/status", () => {
    it("should return account status", async () => {
      const client = testClient(accountsApp);
      const res = await client["api"]["v1"]["accounts"][":id"]["status"].$get({
        param: { id: mockAccountId },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("accountId");
      expect(json).toHaveProperty("platform");
      expect(json).toHaveProperty("status");
      expect(json).toHaveProperty("isConnected");
    });

    it("should return 404 for non-existent account", async () => {
      const client = testClient(accountsApp);
      const res = await client["api"]["v1"]["accounts"][":id"]["status"].$get({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
    });
  });
});
