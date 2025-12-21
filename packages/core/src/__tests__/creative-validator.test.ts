import { describe, it, expect } from "vitest";
import {
  CreativeValidator,
  Platform,
  CreativeType,
  ValidationResult,
} from "../validators/creative-validator.js";

describe("CreativeValidator", () => {
  const validator = new CreativeValidator();

  describe("validateMimeType", () => {
    describe("IMAGE type", () => {
      it("accepts valid image MIME types", () => {
        expect(validator.validateMimeType("image/jpeg", CreativeType.IMAGE).valid).toBe(true);
        expect(validator.validateMimeType("image/png", CreativeType.IMAGE).valid).toBe(true);
        expect(validator.validateMimeType("image/gif", CreativeType.IMAGE).valid).toBe(true);
      });

      it("rejects invalid image MIME types", () => {
        const result = validator.validateMimeType("video/mp4", CreativeType.IMAGE);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe("INVALID_MIME_TYPE");
      });

      it("rejects unsupported image formats", () => {
        const result = validator.validateMimeType("image/webp", CreativeType.IMAGE);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.message).toContain("Allowed types");
      });
    });

    describe("VIDEO type", () => {
      it("accepts valid video MIME types", () => {
        expect(validator.validateMimeType("video/mp4", CreativeType.VIDEO).valid).toBe(true);
        expect(validator.validateMimeType("video/quicktime", CreativeType.VIDEO).valid).toBe(true);
      });

      it("rejects invalid video MIME types", () => {
        const result = validator.validateMimeType("image/png", CreativeType.VIDEO);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe("INVALID_MIME_TYPE");
      });
    });

    describe("CAROUSEL type", () => {
      it("accepts valid image MIME types for carousel", () => {
        expect(validator.validateMimeType("image/jpeg", CreativeType.CAROUSEL).valid).toBe(true);
        expect(validator.validateMimeType("image/png", CreativeType.CAROUSEL).valid).toBe(true);
        expect(validator.validateMimeType("image/gif", CreativeType.CAROUSEL).valid).toBe(true);
      });

      it("rejects video MIME types for carousel", () => {
        const result = validator.validateMimeType("video/mp4", CreativeType.CAROUSEL);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe("INVALID_MIME_TYPE");
      });
    });
  });

  describe("validateFileSize", () => {
    describe("IMAGE type", () => {
      it("accepts files under 20MB limit", () => {
        // 10MB
        expect(validator.validateFileSize(10 * 1024 * 1024, CreativeType.IMAGE).valid).toBe(true);
        // 20MB exactly
        expect(validator.validateFileSize(20 * 1024 * 1024, CreativeType.IMAGE).valid).toBe(true);
      });

      it("rejects files over 20MB limit", () => {
        const result = validator.validateFileSize(21 * 1024 * 1024, CreativeType.IMAGE);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe("FILE_TOO_LARGE");
        expect(result.errors[0]?.limit).toBe(20 * 1024 * 1024);
      });
    });

    describe("VIDEO type", () => {
      it("accepts files under 500MB limit", () => {
        // 100MB
        expect(validator.validateFileSize(100 * 1024 * 1024, CreativeType.VIDEO).valid).toBe(true);
        // 500MB exactly
        expect(validator.validateFileSize(500 * 1024 * 1024, CreativeType.VIDEO).valid).toBe(true);
      });

      it("rejects files over 500MB limit", () => {
        const result = validator.validateFileSize(501 * 1024 * 1024, CreativeType.VIDEO);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe("FILE_TOO_LARGE");
        expect(result.errors[0]?.limit).toBe(500 * 1024 * 1024);
      });
    });

    it("rejects zero or negative file sizes", () => {
      expect(validator.validateFileSize(0, CreativeType.IMAGE).valid).toBe(false);
      expect(validator.validateFileSize(-100, CreativeType.IMAGE).valid).toBe(false);
    });

    describe("CAROUSEL type", () => {
      it("uses image limits (20MB) for carousel type", () => {
        // 10MB - should pass
        expect(validator.validateFileSize(10 * 1024 * 1024, CreativeType.CAROUSEL).valid).toBe(true);
        // 20MB exactly - should pass
        expect(validator.validateFileSize(20 * 1024 * 1024, CreativeType.CAROUSEL).valid).toBe(true);
      });

      it("rejects files over image limit for carousel", () => {
        const result = validator.validateFileSize(21 * 1024 * 1024, CreativeType.CAROUSEL);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe("FILE_TOO_LARGE");
        expect(result.errors[0]?.limit).toBe(20 * 1024 * 1024);
      });
    });
  });

  describe("validateImageDimensions", () => {
    describe("Reddit platform", () => {
      it("accepts valid dimensions within Reddit constraints", () => {
        // Standard valid dimensions
        const result = validator.validateImageDimensions(800, 600, Platform.REDDIT);
        expect(result.valid).toBe(true);
      });

      it("rejects dimensions below minimum (400x300)", () => {
        const widthResult = validator.validateImageDimensions(300, 600, Platform.REDDIT);
        expect(widthResult.valid).toBe(false);
        expect(widthResult.errors[0]?.code).toBe("DIMENSIONS_TOO_SMALL");

        const heightResult = validator.validateImageDimensions(800, 200, Platform.REDDIT);
        expect(heightResult.valid).toBe(false);
      });

      it("rejects dimensions above maximum (4000x3000)", () => {
        const widthResult = validator.validateImageDimensions(4500, 2000, Platform.REDDIT);
        expect(widthResult.valid).toBe(false);
        expect(widthResult.errors[0]?.code).toBe("DIMENSIONS_TOO_LARGE");

        const heightResult = validator.validateImageDimensions(2000, 3500, Platform.REDDIT);
        expect(heightResult.valid).toBe(false);
      });

      it("rejects aspect ratios outside 1:1 to 4:3 range", () => {
        // Too wide (16:9 is outside 4:3)
        const wideResult = validator.validateImageDimensions(1600, 900, Platform.REDDIT);
        expect(wideResult.valid).toBe(false);
        expect(wideResult.errors[0]?.code).toBe("INVALID_ASPECT_RATIO");

        // Too tall (1:2 is outside 1:1)
        const tallResult = validator.validateImageDimensions(500, 1000, Platform.REDDIT);
        expect(tallResult.valid).toBe(false);
      });

      it("accepts valid aspect ratios (1:1 to 4:3)", () => {
        // 1:1 (square)
        expect(validator.validateImageDimensions(800, 800, Platform.REDDIT).valid).toBe(true);
        // 4:3
        expect(validator.validateImageDimensions(800, 600, Platform.REDDIT).valid).toBe(true);
        // Between 1:1 and 4:3
        expect(validator.validateImageDimensions(800, 700, Platform.REDDIT).valid).toBe(true);
      });
    });
  });

  describe("validateVideoLength", () => {
    describe("Reddit platform", () => {
      it("accepts video length within 5-180 seconds", () => {
        expect(validator.validateVideoLength(30, Platform.REDDIT).valid).toBe(true);
        expect(validator.validateVideoLength(5, Platform.REDDIT).valid).toBe(true);
        expect(validator.validateVideoLength(180, Platform.REDDIT).valid).toBe(true);
      });

      it("rejects videos shorter than 5 seconds", () => {
        const result = validator.validateVideoLength(3, Platform.REDDIT);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe("VIDEO_TOO_SHORT");
        expect(result.errors[0]?.limit).toBe(5);
      });

      it("rejects videos longer than 180 seconds", () => {
        const result = validator.validateVideoLength(200, Platform.REDDIT);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe("VIDEO_TOO_LONG");
        expect(result.errors[0]?.limit).toBe(180);
      });

      it("rejects zero or negative duration", () => {
        expect(validator.validateVideoLength(0, Platform.REDDIT).valid).toBe(false);
        expect(validator.validateVideoLength(-10, Platform.REDDIT).valid).toBe(false);
      });
    });
  });

  describe("validateCreative (full validation)", () => {
    it("validates a complete image creative", () => {
      const result = validator.validateCreative({
        type: CreativeType.IMAGE,
        mimeType: "image/jpeg",
        fileSize: 5 * 1024 * 1024,
        width: 800,
        height: 600,
        platform: Platform.REDDIT,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates a complete video creative", () => {
      const result = validator.validateCreative({
        type: CreativeType.VIDEO,
        mimeType: "video/mp4",
        fileSize: 100 * 1024 * 1024,
        durationSeconds: 30,
        platform: Platform.REDDIT,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("collects all validation errors", () => {
      const result = validator.validateCreative({
        type: CreativeType.IMAGE,
        mimeType: "video/mp4", // Wrong type
        fileSize: 50 * 1024 * 1024, // Too large
        width: 100, // Too small
        height: 100, // Too small
        platform: Platform.REDDIT,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it("adds warnings for borderline cases", () => {
      // File size close to limit
      const result = validator.validateCreative({
        type: CreativeType.IMAGE,
        mimeType: "image/jpeg",
        fileSize: 19 * 1024 * 1024, // Close to 20MB limit
        width: 800,
        height: 600,
        platform: Platform.REDDIT,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("validates a complete carousel creative", () => {
      const result = validator.validateCreative({
        type: CreativeType.CAROUSEL,
        mimeType: "image/png",
        fileSize: 5 * 1024 * 1024,
        width: 800,
        height: 600,
        platform: Platform.REDDIT,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects carousel with video MIME type", () => {
      const result = validator.validateCreative({
        type: CreativeType.CAROUSEL,
        mimeType: "video/mp4",
        fileSize: 5 * 1024 * 1024,
        width: 800,
        height: 600,
        platform: Platform.REDDIT,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_MIME_TYPE")).toBe(true);
    });

    it("validates carousel dimensions like images", () => {
      // Too small dimensions for carousel
      const result = validator.validateCreative({
        type: CreativeType.CAROUSEL,
        mimeType: "image/jpeg",
        fileSize: 5 * 1024 * 1024,
        width: 100, // Too small
        height: 100, // Too small
        platform: Platform.REDDIT,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "DIMENSIONS_TOO_SMALL")).toBe(true);
    });
  });

  describe("getFileSizeLimits", () => {
    it("returns correct limits for each type", () => {
      const limits = validator.getFileSizeLimits();
      expect(limits.image).toBe(20 * 1024 * 1024);
      expect(limits.video).toBe(500 * 1024 * 1024);
    });
  });

  describe("getAllowedMimeTypes", () => {
    it("returns allowed MIME types for images", () => {
      const types = validator.getAllowedMimeTypes(CreativeType.IMAGE);
      expect(types).toContain("image/jpeg");
      expect(types).toContain("image/png");
      expect(types).toContain("image/gif");
    });

    it("returns allowed MIME types for videos", () => {
      const types = validator.getAllowedMimeTypes(CreativeType.VIDEO);
      expect(types).toContain("video/mp4");
      expect(types).toContain("video/quicktime");
    });

    it("returns allowed MIME types for carousel (same as images)", () => {
      const types = validator.getAllowedMimeTypes(CreativeType.CAROUSEL);
      expect(types).toContain("image/jpeg");
      expect(types).toContain("image/png");
      expect(types).toContain("image/gif");
      expect(types).not.toContain("video/mp4");
    });
  });

  describe("getPlatformConstraints", () => {
    it("returns Reddit image constraints", () => {
      const constraints = validator.getPlatformConstraints(Platform.REDDIT, CreativeType.IMAGE);
      expect(constraints).toEqual({
        minWidth: 400,
        minHeight: 300,
        maxWidth: 4000,
        maxHeight: 3000,
        minAspectRatio: 1, // 1:1
        maxAspectRatio: 4 / 3, // 4:3
      });
    });

    it("returns Reddit video constraints", () => {
      const constraints = validator.getPlatformConstraints(Platform.REDDIT, CreativeType.VIDEO);
      expect(constraints).toEqual({
        minDurationSeconds: 5,
        maxDurationSeconds: 180,
        maxFileSize: 500 * 1024 * 1024,
      });
    });

    it("returns Reddit image constraints for carousel type", () => {
      const constraints = validator.getPlatformConstraints(Platform.REDDIT, CreativeType.CAROUSEL);
      expect(constraints).toEqual({
        minWidth: 400,
        minHeight: 300,
        maxWidth: 4000,
        maxHeight: 3000,
        minAspectRatio: 1, // 1:1
        maxAspectRatio: 4 / 3, // 4:3
      });
    });
  });
});
