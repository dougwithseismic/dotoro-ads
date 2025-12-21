import { describe, it, expect, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import { dataSourcesApp, seedMockData } from "../../routes/data-sources.js";

describe("Data Sources API", () => {
  // Reset mock data before each test
  beforeEach(() => {
    seedMockData();
  });

  // Test data
  const mockDataSource = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    userId: null,
    name: "Test CSV Source",
    type: "csv" as const,
    config: { delimiter: "," },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  describe("GET /api/v1/data-sources", () => {
    it("should return a paginated list of data sources", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"].$get({
        query: { page: "1", limit: "10" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("total");
      expect(json).toHaveProperty("page");
      expect(json).toHaveProperty("limit");
      expect(json).toHaveProperty("totalPages");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should use default pagination when not provided", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"].$get({});

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.page).toBe(1);
      expect(json.limit).toBe(20);
    });
  });

  describe("POST /api/v1/data-sources", () => {
    it("should create a new data source with valid input", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "New Data Source",
          type: "csv",
          config: { delimiter: ";" },
        },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toHaveProperty("id");
      expect(json.name).toBe("New Data Source");
      expect(json.type).toBe("csv");
    });

    it("should return 400 for invalid input - missing name", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "",
          type: "csv",
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      // @hono/zod-openapi returns { success: false, error: { ... } } format
      expect(json.success).toBe(false);
      expect(json).toHaveProperty("error");
    });

    it("should return 400 for invalid type", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Test",
          type: "invalid_type" as unknown as "csv",
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/data-sources/:id", () => {
    it("should return a data source by id", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$get({
        param: { id: mockDataSource.id },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("id");
      expect(json).toHaveProperty("name");
      expect(json).toHaveProperty("type");
    });

    it("should return 404 for non-existent id", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$get({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toHaveProperty("error");
      expect(json.code).toBe("NOT_FOUND");
    });

    it("should return 400 for invalid UUID", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$get({
        param: { id: "not-a-uuid" },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/v1/data-sources/:id", () => {
    it("should update an existing data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$put({
        param: { id: mockDataSource.id },
        json: { name: "Updated Name" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Updated Name");
    });

    it("should handle empty update body gracefully", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$put({
        param: { id: mockDataSource.id },
        json: {},
      });

      // Empty body should succeed but only update the timestamp
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe(mockDataSource.name);
    });

    it("should return 404 when updating non-existent data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$put({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        json: { name: "Updated Name" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/data-sources/:id", () => {
    it("should delete an existing data source and return 204", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$delete({
        param: { id: mockDataSource.id },
      });

      expect(res.status).toBe(204);
    });

    it("should return 404 when deleting non-existent data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"].$delete({
        param: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/data-sources/:id/rows", () => {
    it("should return paginated data rows for a data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"]["rows"].$get(
        {
          param: { id: mockDataSource.id },
          query: { page: "1", limit: "20" },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("total");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should return 404 for non-existent data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"]["rows"].$get(
        {
          param: { id: "00000000-0000-0000-0000-000000000000" },
          query: {},
        }
      );

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/data-sources/:id/preview", () => {
    it("should return a preview of data rows", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"][
        "preview"
      ].$post({
        param: { id: mockDataSource.id },
        json: { limit: 5 },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should return 404 for non-existent data source", async () => {
      const client = testClient(dataSourcesApp);
      const res = await client["api"]["v1"]["data-sources"][":id"][
        "preview"
      ].$post({
        param: { id: "00000000-0000-0000-0000-000000000000" },
        json: { limit: 5 },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/data-sources/:id/upload", () => {
    it("should parse uploaded CSV and return analysis", async () => {
      const client = testClient(dataSourcesApp);

      // First create a data source
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Upload Test Source",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      // Create FormData with CSV content
      const csvContent = "name,email,age\nJohn,john@example.com,25\nJane,jane@example.com,30";
      const formData = new FormData();
      formData.append("file", new Blob([csvContent], { type: "text/csv" }), "test.csv");

      // Upload the CSV
      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toHaveProperty("dataSourceId");
      expect(json).toHaveProperty("headers");
      expect(json).toHaveProperty("columns");
      expect(json).toHaveProperty("rowCount");
      expect(json).toHaveProperty("preview");
      expect(json.headers).toEqual(["name", "email", "age"]);
      expect(json.rowCount).toBe(2);
      expect(json.columns).toHaveLength(3);
    });

    it("should detect column types correctly", async () => {
      const client = testClient(dataSourcesApp);

      // Create a data source
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Type Detection Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      // CSV with various data types
      const csvContent = `id,email,score,active,website,created_date
1,user1@test.com,85.5,true,https://example.com,2024-01-15
2,user2@test.com,92.3,false,https://test.org,2024-02-20
3,user3@test.com,78.0,true,https://demo.io,2024-03-10`;

      const formData = new FormData();
      formData.append("file", new Blob([csvContent], { type: "text/csv" }), "types.csv");

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.columns).toHaveLength(6);

      // Check type detection
      const columnsMap = new Map(
        json.columns.map((c: { originalName: string; detectedType: string }) => [c.originalName, c.detectedType])
      );
      expect(columnsMap.get("id")).toBe("number");
      expect(columnsMap.get("email")).toBe("email");
      expect(columnsMap.get("score")).toBe("number");
      expect(columnsMap.get("active")).toBe("boolean");
      expect(columnsMap.get("website")).toBe("url");
      expect(columnsMap.get("created_date")).toBe("date");
    });

    it("should return 400 for invalid CSV", async () => {
      const client = testClient(dataSourcesApp);

      // Create a data source
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Invalid CSV Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      // Empty file
      const formData = new FormData();
      formData.append("file", new Blob([""], { type: "text/csv" }), "empty.csv");

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toHaveProperty("error");
    });

    it("should return 400 when no file provided", async () => {
      const client = testClient(dataSourcesApp);

      // Create a data source
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "No File Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      // Empty form data
      const formData = new FormData();

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      expect(res.status).toBe(400);
    });

    it("should reject files with wrong extension even with correct MIME type", async () => {
      const client = testClient(dataSourcesApp);

      // Create a data source
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Wrong Extension Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      // Create file with .exe extension but text/csv MIME type
      const csvContent = "name,email\nJohn,john@test.com";
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([csvContent], { type: "application/octet-stream" }),
        "malicious.exe"
      );

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.details.providedName).toBe("malicious.exe");
    });

    it("should accept files with .csv extension and various MIME types", async () => {
      const client = testClient(dataSourcesApp);

      // Create a data source
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Various MIME Types Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      // Test with text/plain MIME type but .csv extension
      const csvContent = "name,email\nJohn,john@test.com";
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([csvContent], { type: "text/plain" }),
        "data.csv"
      );

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.headers).toEqual(["name", "email"]);
    });

    it("should accept files with valid MIME type regardless of extension case", async () => {
      const client = testClient(dataSourcesApp);

      // Create a data source
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Case Insensitive Extension Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      // Test with uppercase .CSV extension
      const csvContent = "name,value\nTest,123";
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([csvContent], { type: "application/octet-stream" }),
        "DATA.CSV"
      );

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      expect(res.status).toBe(201);
    });
  });

  describe("POST /api/v1/data-sources/preview-csv", () => {
    it("should return quick preview without full analysis", async () => {
      const res = await dataSourcesApp.request(
        "/api/v1/data-sources/preview-csv",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "name,email\nJohn,john@test.com\nJane,jane@test.com",
            rows: 5,
          }),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("headers");
      expect(json).toHaveProperty("preview");
      expect(json.headers).toEqual(["name", "email"]);
      expect(json.preview).toHaveLength(2);
    });

    it("should limit preview rows", async () => {
      const rows = Array.from(
        { length: 20 },
        (_, i) => `user${i},user${i}@test.com`
      ).join("\n");
      const csvContent = `name,email\n${rows}`;

      const res = await dataSourcesApp.request(
        "/api/v1/data-sources/preview-csv",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: csvContent,
            rows: 5,
          }),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.preview).toHaveLength(5);
    });
  });

  describe("GET /api/v1/data-sources/:id/rows - after upload", () => {
    it("should return paginated normalized rows", async () => {
      const client = testClient(dataSourcesApp);

      // Create data source
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Rows Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      // Upload data
      const csvContent = "name,value\nA,100\nB,200\nC,300\nD,400\nE,500";
      const formData = new FormData();
      formData.append("file", new Blob([csvContent], { type: "text/csv" }), "data.csv");

      await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      // Get rows with pagination
      const res = await client["api"]["v1"]["data-sources"][":id"]["rows"].$get(
        {
          param: { id: dataSource.id },
          query: { page: "1", limit: "2" },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(2);
      expect(json.total).toBe(5);
      expect(json.totalPages).toBe(3);
    });
  });

  describe("POST /api/v1/data-sources/:id/validate", () => {
    it("should validate data against rules", async () => {
      const client = testClient(dataSourcesApp);

      // Create data source and upload data
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Validate Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      const csvContent = "name,email,age\nJohn,john@test.com,25\n,invalid-email,";
      const formData = new FormData();
      formData.append("file", new Blob([csvContent], { type: "text/csv" }), "validate.csv");

      await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      // Validate
      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rules: [
              { field: "name", required: true },
              { field: "email", type: "email" },
              { field: "age", type: "number" },
            ],
          }),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("valid");
      expect(json).toHaveProperty("totalRows");
      expect(json).toHaveProperty("validRows");
      expect(json).toHaveProperty("invalidRows");
      expect(json).toHaveProperty("errors");
      expect(json.valid).toBe(false);
      expect(json.invalidRows).toBeGreaterThan(0);
    });

    it("should return 400 when no data uploaded", async () => {
      const client = testClient(dataSourcesApp);

      // Create data source without uploading data
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "No Data Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rules: [{ field: "name", required: true }],
          }),
        }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/data-sources/:id/analyze", () => {
    it("should return column analysis for uploaded data", async () => {
      const client = testClient(dataSourcesApp);

      // Create and upload data
      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "Analyze Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      const csvContent = "Product Name,Price,In Stock\nWidget,19.99,true\nGadget,29.99,false";
      const formData = new FormData();
      formData.append("file", new Blob([csvContent], { type: "text/csv" }), "products.csv");

      await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      // Analyze
      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/analyze`,
        {
          method: "POST",
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("columns");
      expect(json.columns).toHaveLength(3);

      // Check column analysis details
      const columns = json.columns;
      expect(columns[0].originalName).toBe("Product Name");
      expect(columns[0].suggestedName).toBe("product_name");
      expect(columns[1].detectedType).toBe("number");
      expect(columns[2].detectedType).toBe("boolean");
    });

    it("should return 400 when no data uploaded", async () => {
      const client = testClient(dataSourcesApp);

      const createRes = await client["api"]["v1"]["data-sources"].$post({
        json: {
          name: "No Data Analyze Test",
          type: "csv",
        },
      });
      const dataSource = await createRes.json();

      const res = await dataSourcesApp.request(
        `/api/v1/data-sources/${dataSource.id}/analyze`,
        {
          method: "POST",
        }
      );

      expect(res.status).toBe(400);
    });
  });
});
