/**
 * Tests for Creative Asset Validation Functions
 */

import { describe, it, expect } from "vitest";
import {
  validateAsset,
  isAspectRatioMatch,
} from "../validation.js";
import type { AssetMetadata, CreativeSpecs } from "../types.js";

describe("validateAsset", () => {
  describe("dimension validation", () => {
    it("validates width above minimum", () => {
      const metadata: AssetMetadata = {
        width: 800,
        height: 600,
      };
      const specs: CreativeSpecs = {
        minWidth: 400,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects width below minimum", () => {
      const metadata: AssetMetadata = {
        width: 300,
        height: 600,
      };
      const specs: CreativeSpecs = {
        minWidth: 400,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("MIN_WIDTH");
      expect(result.errors[0].field).toBe("width");
    });

    it("validates width below maximum", () => {
      const metadata: AssetMetadata = {
        width: 3000,
        height: 2000,
      };
      const specs: CreativeSpecs = {
        maxWidth: 4000,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
    });

    it("rejects width above maximum", () => {
      const metadata: AssetMetadata = {
        width: 5000,
        height: 3000,
      };
      const specs: CreativeSpecs = {
        maxWidth: 4000,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("MAX_WIDTH");
    });

    it("validates height above minimum", () => {
      const metadata: AssetMetadata = {
        width: 800,
        height: 600,
      };
      const specs: CreativeSpecs = {
        minHeight: 300,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
    });

    it("rejects height below minimum", () => {
      const metadata: AssetMetadata = {
        width: 800,
        height: 200,
      };
      const specs: CreativeSpecs = {
        minHeight: 300,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("MIN_HEIGHT");
      expect(result.errors[0].field).toBe("height");
    });

    it("rejects height above maximum", () => {
      const metadata: AssetMetadata = {
        width: 2000,
        height: 4000,
      };
      const specs: CreativeSpecs = {
        maxHeight: 3000,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("MAX_HEIGHT");
    });
  });

  describe("recommended dimensions warnings", () => {
    it("adds warning when below recommended size", () => {
      const metadata: AssetMetadata = {
        width: 800,
        height: 400,
      };
      const specs: CreativeSpecs = {
        recommendedWidth: 1200,
        recommendedHeight: 628,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe("BELOW_RECOMMENDED");
      expect(result.warnings[0].suggestion).toContain("1200x628");
    });

    it("no warning when at or above recommended size", () => {
      const metadata: AssetMetadata = {
        width: 1200,
        height: 628,
      };
      const specs: CreativeSpecs = {
        recommendedWidth: 1200,
        recommendedHeight: 628,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("aspect ratio validation", () => {
    it("validates correct aspect ratio", () => {
      const metadata: AssetMetadata = {
        width: 1920,
        height: 1080,
        aspectRatio: "16:9",
      };
      const specs: CreativeSpecs = {
        aspectRatios: ["16:9", "1:1"],
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
    });

    it("rejects invalid aspect ratio", () => {
      const metadata: AssetMetadata = {
        width: 800,
        height: 600,
        aspectRatio: "4:3",
      };
      const specs: CreativeSpecs = {
        aspectRatios: ["16:9", "1:1"],
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_ASPECT_RATIO");
      expect(result.errors[0].message).toContain("4:3");
    });

    it("accepts any ratio when no aspectRatios specified", () => {
      const metadata: AssetMetadata = {
        width: 800,
        height: 600,
        aspectRatio: "4:3",
      };
      const specs: CreativeSpecs = {};

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
    });
  });

  describe("file size validation", () => {
    it("validates file under size limit", () => {
      const metadata: AssetMetadata = {
        fileSize: 3 * 1024 * 1024, // 3MB
      };
      const specs: CreativeSpecs = {
        maxFileSize: 5 * 1024 * 1024, // 5MB
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
    });

    it("rejects file over size limit", () => {
      const metadata: AssetMetadata = {
        fileSize: 6_000_000, // 6MB
      };
      const specs: CreativeSpecs = {
        maxFileSize: 5_000_000, // 5MB
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("FILE_TOO_LARGE");
      expect(result.errors[0].message).toContain("6.0MB");
      expect(result.errors[0].message).toContain("5.0MB");
    });

    it("accepts exact limit", () => {
      const metadata: AssetMetadata = {
        fileSize: 5 * 1024 * 1024, // 5MB
      };
      const specs: CreativeSpecs = {
        maxFileSize: 5 * 1024 * 1024, // 5MB
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
    });
  });

  describe("format validation", () => {
    it("validates allowed format", () => {
      const metadata: AssetMetadata = {
        mimeType: "image/jpeg",
      };
      const specs: CreativeSpecs = {
        allowedFormats: ["jpg", "png", "gif"],
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
    });

    it("rejects disallowed format", () => {
      const metadata: AssetMetadata = {
        mimeType: "image/webp",
      };
      const specs: CreativeSpecs = {
        allowedFormats: ["jpg", "png", "gif"],
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_FORMAT");
      expect(result.errors[0].message).toContain("webp");
    });
  });

  describe("video duration validation", () => {
    it("validates duration above minimum", () => {
      const metadata: AssetMetadata = {
        duration: 10, // 10 seconds
      };
      const specs: CreativeSpecs = {
        minDuration: 5,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
    });

    it("rejects duration below minimum", () => {
      const metadata: AssetMetadata = {
        duration: 3, // 3 seconds
      };
      const specs: CreativeSpecs = {
        minDuration: 5,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("VIDEO_TOO_SHORT");
    });

    it("validates duration below maximum", () => {
      const metadata: AssetMetadata = {
        duration: 30, // 30 seconds
      };
      const specs: CreativeSpecs = {
        maxDuration: 60,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
    });

    it("rejects duration above maximum", () => {
      const metadata: AssetMetadata = {
        duration: 120, // 120 seconds
      };
      const specs: CreativeSpecs = {
        maxDuration: 60,
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("VIDEO_TOO_LONG");
    });
  });

  describe("multiple validations", () => {
    it("collects all errors", () => {
      const metadata: AssetMetadata = {
        width: 300, // Too small
        height: 200, // Too small
        fileSize: 10 * 1024 * 1024, // Too large
        mimeType: "image/webp", // Not allowed
      };
      const specs: CreativeSpecs = {
        minWidth: 400,
        minHeight: 300,
        maxFileSize: 5 * 1024 * 1024,
        allowedFormats: ["jpg", "png"],
      };

      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it("handles missing optional metadata gracefully", () => {
      const metadata: AssetMetadata = {};
      const specs: CreativeSpecs = {
        minWidth: 400,
        minHeight: 300,
      };

      // Should not throw, just skip validations for missing fields
      const result = validateAsset(metadata, specs);
      expect(result.isValid).toBe(true);
    });
  });
});

describe("isAspectRatioMatch", () => {
  it("matches exact ratios", () => {
    expect(isAspectRatioMatch("16:9", "16:9")).toBe(true);
    expect(isAspectRatioMatch("1:1", "1:1")).toBe(true);
    expect(isAspectRatioMatch("4:5", "4:5")).toBe(true);
  });

  it("matches equivalent ratios", () => {
    // 16:9 = 1.777... and both should match
    expect(isAspectRatioMatch("16:9", "1.78:1")).toBe(true);
  });

  it("matches within 2% tolerance", () => {
    // 1.91:1 should match with slight variations
    expect(isAspectRatioMatch("1.91:1", "1.92:1")).toBe(true);
    expect(isAspectRatioMatch("1.91:1", "1.90:1")).toBe(true);
  });

  it("rejects ratios outside tolerance", () => {
    expect(isAspectRatioMatch("16:9", "4:3")).toBe(false);
    expect(isAspectRatioMatch("1:1", "4:5")).toBe(false);
  });

  it("handles edge cases", () => {
    expect(isAspectRatioMatch("1:1", "1:1")).toBe(true);
    expect(isAspectRatioMatch("2:1", "2:1")).toBe(true);
  });
});
