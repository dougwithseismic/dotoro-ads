import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { errorResponseSchema } from "../schemas/common.js";

/**
 * OpenAPI configuration
 */
export const openApiConfig = {
  openapi: "3.1.0" as const,
  info: {
    title: "Dotoro API",
    version: "1.0.0",
    description:
      "Programmatic Ad Campaign Builder API - Create, manage, and deploy ad campaigns across multiple platforms",
    contact: {
      name: "Dotoro Team",
    },
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Development server",
    },
  ],
  tags: [
    {
      name: "Data Sources",
      description: "Manage data sources (CSV uploads, API connections)",
    },
    {
      name: "Templates",
      description: "Campaign template management",
    },
    {
      name: "Rules",
      description: "Rule engine for data transformation and filtering",
    },
    {
      name: "Transforms",
      description: "Data aggregation and grouping transforms",
    },
    {
      name: "Campaigns",
      description: "Generated campaigns and platform sync",
    },
    {
      name: "Accounts",
      description: "Ad platform account connections",
    },
  ],
};

/**
 * Common OpenAPI responses for errors
 * Uses errorResponseSchema from schemas/common.ts to avoid duplication
 */
export const commonResponses = {
  400: {
    description: "Bad Request - Invalid input",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  401: {
    description: "Unauthorized - Authentication required",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  403: {
    description: "Forbidden - Insufficient permissions",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  404: {
    description: "Not Found - Resource does not exist",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  500: {
    description: "Internal Server Error",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
} as const;

/**
 * Create a typed OpenAPI Hono app
 */
export const createOpenAPIApp = () => {
  const app = new OpenAPIHono();
  return app;
};

/**
 * Register OpenAPI documentation endpoints
 */
export const registerOpenAPIEndpoints = (app: OpenAPIHono) => {
  // OpenAPI JSON specification
  app.doc("/api/v1/openapi.json", openApiConfig);

  // Swagger UI
  app.get("/api/v1/docs", swaggerUI({ url: "/api/v1/openapi.json" }));

  return app;
};

/**
 * Type-safe pagination helper
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const createPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

/**
 * Create a paginated response
 */
export const createPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): { data: T[] } & PaginationMeta => ({
  data,
  ...createPaginationMeta(total, page, limit),
});
