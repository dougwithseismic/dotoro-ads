import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  campaignTemplateSchema,
  createCampaignTemplateSchema,
  updateCampaignTemplateSchema,
  templateListResponseSchema,
  templateQuerySchema,
  templatePreviewRequestSchema,
  templatePreviewResponseSchema,
  previewAdSchema,
  extractVariablesRequestSchema,
  extractVariablesResponseSchema,
  validateTemplateRequestSchema,
  validateTemplateResponseSchema,
  substituteVariablesRequestSchema,
  substituteVariablesResponseSchema,
  previewWithDataRequestSchema,
  previewWithDataResponseSchema,
} from "../schemas/templates.js";
import { idParamSchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";
import { templateService } from "../services/template-service.js";

// In-memory mock data store
export const mockTemplates = new Map<string, z.infer<typeof campaignTemplateSchema>>();

// Function to reset and seed mock data
export function seedMockTemplates() {
  mockTemplates.clear();

  const seedId = "660e8400-e29b-41d4-a716-446655440000";
  mockTemplates.set(seedId, {
    id: seedId,
    userId: null,
    name: "Reddit Product Ads",
    platform: "reddit",
    structure: {
      objective: "CONVERSIONS",
      budget: {
        type: "daily",
        amount: 50,
        currency: "USD",
      },
      targeting: { subreddits: ["technology", "gadgets"] },
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  });

  const seedId2 = "660e8400-e29b-41d4-a716-446655440001";
  mockTemplates.set(seedId2, {
    id: seedId2,
    userId: null,
    name: "Google Search Ads",
    platform: "google",
    structure: {
      objective: "AWARENESS",
      budget: {
        type: "lifetime",
        amount: 1000,
        currency: "USD",
      },
    },
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
  });
}

// Initial seed
seedMockTemplates();

// Create the OpenAPI Hono app
export const templatesApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

const listTemplatesRoute = createRoute({
  method: "get",
  path: "/api/v1/templates",
  tags: ["Templates"],
  summary: "List all templates",
  description: "Returns a paginated list of campaign templates",
  request: {
    query: templateQuerySchema,
  },
  responses: {
    200: {
      description: "List of templates",
      content: {
        "application/json": {
          schema: templateListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const createTemplateRoute = createRoute({
  method: "post",
  path: "/api/v1/templates",
  tags: ["Templates"],
  summary: "Create a new template",
  description: "Creates a new campaign template",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createCampaignTemplateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Template created successfully",
      content: {
        "application/json": {
          schema: campaignTemplateSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getTemplateRoute = createRoute({
  method: "get",
  path: "/api/v1/templates/{id}",
  tags: ["Templates"],
  summary: "Get a template by ID",
  description: "Returns the details of a specific template",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Template details",
      content: {
        "application/json": {
          schema: campaignTemplateSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const updateTemplateRoute = createRoute({
  method: "put",
  path: "/api/v1/templates/{id}",
  tags: ["Templates"],
  summary: "Update a template",
  description: "Updates an existing template",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateCampaignTemplateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Template updated successfully",
      content: {
        "application/json": {
          schema: campaignTemplateSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const deleteTemplateRoute = createRoute({
  method: "delete",
  path: "/api/v1/templates/{id}",
  tags: ["Templates"],
  summary: "Delete a template",
  description: "Deletes a campaign template",
  request: {
    params: idParamSchema,
  },
  responses: {
    204: {
      description: "Template deleted successfully",
    },
    ...commonResponses,
  },
});

const previewTemplateRoute = createRoute({
  method: "post",
  path: "/api/v1/templates/{id}/preview",
  tags: ["Templates"],
  summary: "Preview generated ads",
  description: "Returns a preview of ads that would be generated from this template",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: templatePreviewRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Preview of generated ads",
      content: {
        "application/json": {
          schema: templatePreviewResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

templatesApp.openapi(listTemplatesRoute, async (c) => {
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  let templates = Array.from(mockTemplates.values());

  // Filter by platform if provided
  if (query.platform) {
    templates = templates.filter((t) => t.platform === query.platform);
  }

  const total = templates.length;
  const start = (page - 1) * limit;
  const data = templates.slice(start, start + limit);

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

templatesApp.openapi(createTemplateRoute, async (c) => {
  const body = c.req.valid("json");

  const newTemplate: z.infer<typeof campaignTemplateSchema> = {
    id: crypto.randomUUID(),
    userId: null,
    name: body.name,
    platform: body.platform,
    structure: body.structure ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockTemplates.set(newTemplate.id, newTemplate);

  return c.json(newTemplate, 201);
});

templatesApp.openapi(getTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");

  const template = mockTemplates.get(id);
  if (!template) {
    throw createNotFoundError("Template", id);
  }

  return c.json(template, 200);
});

templatesApp.openapi(updateTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const template = mockTemplates.get(id);
  if (!template) {
    throw createNotFoundError("Template", id);
  }

  const updatedTemplate: z.infer<typeof campaignTemplateSchema> = {
    ...template,
    ...(body.name && { name: body.name }),
    ...(body.platform && { platform: body.platform }),
    ...(body.structure !== undefined && { structure: body.structure ?? null }),
    updatedAt: new Date().toISOString(),
  };

  mockTemplates.set(id, updatedTemplate);

  return c.json(updatedTemplate, 200);
});

templatesApp.openapi(deleteTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");

  const template = mockTemplates.get(id);
  if (!template) {
    throw createNotFoundError("Template", id);
  }

  mockTemplates.delete(id);

  return c.body(null, 204);
});

templatesApp.openapi(previewTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const template = mockTemplates.get(id);
  if (!template) {
    throw createNotFoundError("Template", id);
  }

  // Mock preview generation
  const previewAds: z.infer<typeof previewAdSchema>[] = [
    {
      headline: `${template.name} - Preview Ad 1`,
      description: "This is a preview of how the ad would look",
      sourceRow: { product_name: "Sample Product", price: 99.99 },
    },
    {
      headline: `${template.name} - Preview Ad 2`,
      description: "Another preview variation",
      sourceRow: { product_name: "Another Product", price: 149.99 },
    },
  ].slice(0, body.limit);

  return c.json(
    {
      templateId: id,
      dataSourceId: body.dataSourceId,
      previewAds,
      totalRows: 100, // Mock total
      warnings: [],
    },
    200
  );
});

// ============================================================================
// Variable Engine Routes
// ============================================================================

const extractVariablesRoute = createRoute({
  method: "post",
  path: "/api/v1/templates/variables/extract",
  tags: ["Templates", "Variables"],
  summary: "Extract variables from template",
  description: "Extracts all variable placeholders from a template",
  request: {
    body: {
      content: {
        "application/json": {
          schema: extractVariablesRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "List of extracted variables",
      content: {
        "application/json": {
          schema: extractVariablesResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const validateTemplateRoute = createRoute({
  method: "post",
  path: "/api/v1/templates/validate",
  tags: ["Templates", "Validation"],
  summary: "Validate template",
  description: "Validates a template against platform-specific rules with optional sample data",
  request: {
    body: {
      content: {
        "application/json": {
          schema: validateTemplateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Validation result",
      content: {
        "application/json": {
          schema: validateTemplateResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const substituteVariablesRoute = createRoute({
  method: "post",
  path: "/api/v1/templates/variables/substitute",
  tags: ["Templates", "Variables"],
  summary: "Substitute variables in template",
  description: "Substitutes variables in a template string with provided data",
  request: {
    body: {
      content: {
        "application/json": {
          schema: substituteVariablesRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Substitution result with details",
      content: {
        "application/json": {
          schema: substituteVariablesResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const previewWithDataRoute = createRoute({
  method: "post",
  path: "/api/v1/templates/preview",
  tags: ["Templates", "Preview"],
  summary: "Preview ads with sample data",
  description: "Generates preview ads by substituting variables with provided data rows",
  request: {
    body: {
      content: {
        "application/json": {
          schema: previewWithDataRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Preview of generated ads",
      content: {
        "application/json": {
          schema: previewWithDataResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// Variable Engine Route Handlers

templatesApp.openapi(extractVariablesRoute, async (c) => {
  const body = c.req.valid("json");
  const variables = templateService.extractVariables(body.template);
  return c.json({ variables }, 200);
});

templatesApp.openapi(validateTemplateRoute, async (c) => {
  const body = c.req.valid("json");
  const result = templateService.validateTemplate(
    body.template,
    body.platform,
    body.sampleData
  );
  return c.json(result, 200);
});

templatesApp.openapi(substituteVariablesRoute, async (c) => {
  const body = c.req.valid("json");
  const result = templateService.previewFieldSubstitution(body.template, body.data);
  return c.json(
    {
      text: result.text,
      success: result.success,
      warnings: result.warnings,
      substitutions: result.substitutions,
    },
    200
  );
});

templatesApp.openapi(previewWithDataRoute, async (c) => {
  const body = c.req.valid("json");
  const result = templateService.previewAds(
    body.template,
    body.dataRows,
    body.platform,
    body.limit
  );
  return c.json(result, 200);
});

// Error handler for API exceptions
templatesApp.onError((err, c) => {
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

export default templatesApp;
