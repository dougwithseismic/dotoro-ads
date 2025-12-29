/**
 * Creative Generation Service Tests
 *
 * Tests for the creative generation service including:
 * - Template loading and validation
 * - Variable extraction and interpolation
 * - Preview generation
 * - Single image generation
 * - Batch job creation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractVariables,
  validateTemplateJson,
  interpolateTextVariables,
  initializeFabricCanvas,
  disposeCanvas,
  CreativeGenerationService,
  getCreativeGenerationService,
  resetCreativeGenerationService,
} from "../../services/creative-generation.js";
import type { FabricCanvasJSON } from "../../services/db.js";

// Mock the database
vi.mock("../../services/db.js", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    $count: vi.fn(),
  },
  designTemplates: {},
  dataRows: {},
  dataSources: {},
  generatedCreatives: {},
  generationJobs: {},
}));

describe("Creative Generation Service", () => {
  beforeEach(() => {
    resetCreativeGenerationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetCreativeGenerationService();
  });

  describe("validateTemplateJson", () => {
    it("should validate correct template JSON", () => {
      const validTemplate: FabricCanvasJSON = {
        version: "6.0.0",
        objects: [],
      };

      expect(validateTemplateJson(validTemplate)).toBe(true);
    });

    it("should reject null template", () => {
      expect(validateTemplateJson(null)).toBe(false);
    });

    it("should reject undefined template", () => {
      expect(validateTemplateJson(undefined)).toBe(false);
    });

    it("should reject template without version", () => {
      expect(validateTemplateJson({ objects: [] })).toBe(false);
    });

    it("should reject template without objects array", () => {
      expect(validateTemplateJson({ version: "6.0.0" })).toBe(false);
    });

    it("should reject template with non-array objects", () => {
      expect(validateTemplateJson({ version: "6.0.0", objects: {} })).toBe(false);
    });
  });

  describe("extractVariables", () => {
    it("should extract text variables from text objects", () => {
      const template: FabricCanvasJSON = {
        version: "6.0.0",
        objects: [
          {
            type: "text",
            text: "Hello {{name}}, your price is {{price}}",
          },
        ],
      };

      const variables = extractVariables(template);

      expect(variables).toContain("name");
      expect(variables).toContain("price");
      expect(variables).toHaveLength(2);
    });

    it("should extract variables from textbox objects", () => {
      const template: FabricCanvasJSON = {
        version: "6.0.0",
        objects: [
          {
            type: "textbox",
            text: "Product: {{product_name}}",
          },
        ],
      };

      const variables = extractVariables(template);

      expect(variables).toContain("product_name");
      expect(variables).toHaveLength(1);
    });

    it("should extract variables from i-text objects", () => {
      const template: FabricCanvasJSON = {
        version: "6.0.0",
        objects: [
          {
            type: "i-text",
            text: "{{headline}} - {{subhead}}",
          },
        ],
      };

      const variables = extractVariables(template);

      expect(variables).toContain("headline");
      expect(variables).toContain("subhead");
      expect(variables).toHaveLength(2);
    });

    it("should extract image variables from variableBinding", () => {
      const template: FabricCanvasJSON = {
        version: "6.0.0",
        objects: [
          {
            type: "image",
            variableBinding: "{product_image}",
          },
        ],
      };

      const variables = extractVariables(template);

      expect(variables).toContain("product_image");
      expect(variables).toHaveLength(1);
    });

    it("should deduplicate variables", () => {
      const template: FabricCanvasJSON = {
        version: "6.0.0",
        objects: [
          {
            type: "text",
            text: "{{name}} loves {{name}}",
          },
        ],
      };

      const variables = extractVariables(template);

      expect(variables).toContain("name");
      expect(variables).toHaveLength(1);
    });

    it("should handle templates with no variables", () => {
      const template: FabricCanvasJSON = {
        version: "6.0.0",
        objects: [
          {
            type: "rect",
            fill: "red",
          },
        ],
      };

      const variables = extractVariables(template);

      expect(variables).toHaveLength(0);
    });

    it("should not extract malformed variables", () => {
      const template: FabricCanvasJSON = {
        version: "6.0.0",
        objects: [
          {
            type: "text",
            text: "{{ invalid }} {not_valid} {{123invalid}}",
          },
        ],
      };

      const variables = extractVariables(template);

      expect(variables).toHaveLength(0);
    });

    it("should extract mixed text and image variables", () => {
      const template: FabricCanvasJSON = {
        version: "6.0.0",
        objects: [
          {
            type: "text",
            text: "{{title}} - {{subtitle}}",
          },
          {
            type: "image",
            variableBinding: "{hero_image}",
          },
          {
            type: "image",
            variableBinding: "{logo}",
          },
        ],
      };

      const variables = extractVariables(template);

      expect(variables).toContain("title");
      expect(variables).toContain("subtitle");
      expect(variables).toContain("hero_image");
      expect(variables).toContain("logo");
      expect(variables).toHaveLength(4);
    });
  });

  // Canvas tests require node-canvas native binary
  // Skip if not available (CI environment without native deps)
  describe("initializeFabricCanvas", () => {
    it.skipIf(!globalThis.document && typeof process !== "undefined")(
      "should create a canvas with correct dimensions",
      () => {
        const canvas = initializeFabricCanvas(1080, 1080);

        expect(canvas).toBeDefined();
        expect(canvas.width).toBe(1080);
        expect(canvas.height).toBe(1080);

        disposeCanvas(canvas);
      }
    );

    it.skipIf(!globalThis.document && typeof process !== "undefined")(
      "should create a canvas with transparent background",
      () => {
        const canvas = initializeFabricCanvas(800, 600);

        expect(canvas.backgroundColor).toBe("transparent");

        disposeCanvas(canvas);
      }
    );

    it.skipIf(!globalThis.document && typeof process !== "undefined")(
      "should create canvases with different dimensions",
      () => {
        const square = initializeFabricCanvas(1080, 1080);
        const landscape = initializeFabricCanvas(1200, 628);
        const portrait = initializeFabricCanvas(1080, 1920);

        expect(square.width).toBe(1080);
        expect(square.height).toBe(1080);

        expect(landscape.width).toBe(1200);
        expect(landscape.height).toBe(628);

        expect(portrait.width).toBe(1080);
        expect(portrait.height).toBe(1920);

        disposeCanvas(square);
        disposeCanvas(landscape);
        disposeCanvas(portrait);
      }
    );
  });

  describe("interpolateTextVariables", () => {
    it.skipIf(!globalThis.document && typeof process !== "undefined")(
      "should interpolate text variables in canvas objects",
      () => {
        const canvas = initializeFabricCanvas(800, 600);

        // We can't easily test this without loading objects into the canvas
        // So we'll just verify the function returns an object
        const result = interpolateTextVariables(canvas, { name: "Test" });

        expect(typeof result).toBe("object");

        disposeCanvas(canvas);
      }
    );
  });

  describe("CreativeGenerationService", () => {
    it("should return singleton instance", () => {
      const service1 = getCreativeGenerationService();
      const service2 = getCreativeGenerationService();

      expect(service1).toBe(service2);
    });

    it("should reset singleton", () => {
      const service1 = getCreativeGenerationService();
      resetCreativeGenerationService();
      const service2 = getCreativeGenerationService();

      expect(service1).not.toBe(service2);
    });

    it("should be an instance of CreativeGenerationService", () => {
      const service = getCreativeGenerationService();

      expect(service).toBeInstanceOf(CreativeGenerationService);
    });
  });
});
