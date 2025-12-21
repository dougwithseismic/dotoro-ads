import { describe, it, expect } from "vitest";
import { testClient } from "hono/testing";
import app from "../app.js";

describe("App", () => {
  describe("Health Check", () => {
    it("GET /health should return status ok", async () => {
      const client = testClient(app);
      const res = await client["health"].$get();

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json).toHaveProperty("timestamp");
      expect(json).toHaveProperty("version");
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await app.request("/unknown-route");

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toHaveProperty("error");
      expect(json.code).toBe("NOT_FOUND");
    });
  });

  describe("OpenAPI", () => {
    it("GET /api/v1/openapi.json should return OpenAPI spec", async () => {
      const res = await app.request("/api/v1/openapi.json");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("openapi");
      expect(json).toHaveProperty("info");
      expect(json.info.title).toBe("Dotoro API");
    });

    it("GET /api/v1/docs should return Swagger UI", async () => {
      const res = await app.request("/api/v1/docs");

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("swagger");
    });
  });

  describe("CORS", () => {
    it("should include CORS headers", async () => {
      const res = await app.request("/health", {
        headers: {
          Origin: "http://localhost:3000",
        },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
    });
  });
});
