/**
 * Tests for Creative Asset Analysis Functions
 *
 * Note: The analyze functions (analyzeImage, analyzeVideo) require DOM APIs
 * and are designed to run in a browser environment. These tests focus on
 * the pure utility functions that can run in Node.
 */

import { describe, it, expect } from "vitest";
import {
  calculateAspectRatio,
  mimeToFormat,
  formatFileSize,
  formatDuration,
  isImageMimeType,
  isVideoMimeType,
} from "../analyze.js";

describe("calculateAspectRatio", () => {
  describe("common ratios", () => {
    it("returns 1:1 for square images", () => {
      expect(calculateAspectRatio(1000, 1000)).toBe("1:1");
      expect(calculateAspectRatio(800, 800)).toBe("1:1");
      expect(calculateAspectRatio(100, 100)).toBe("1:1");
    });

    it("returns 1:1 for nearly square images (within tolerance)", () => {
      // 1.005 ratio - should still be treated as 1:1
      expect(calculateAspectRatio(1005, 1000)).toBe("1:1");
      expect(calculateAspectRatio(1000, 1005)).toBe("1:1");
    });

    it("returns 16:9 for widescreen images", () => {
      expect(calculateAspectRatio(1920, 1080)).toBe("16:9");
      expect(calculateAspectRatio(1280, 720)).toBe("16:9");
    });

    it("returns 16:9 for nearly 16:9 images (within tolerance)", () => {
      // 1.78 is 16:9, tolerance is 0.05
      expect(calculateAspectRatio(1780, 1000)).toBe("16:9");
    });

    it("returns 1.91:1 for Facebook landscape images", () => {
      expect(calculateAspectRatio(1200, 628)).toBe("1.91:1");
      expect(calculateAspectRatio(1910, 1000)).toBe("1.91:1");
    });

    it("returns 4:5 for portrait images", () => {
      expect(calculateAspectRatio(1080, 1350)).toBe("4:5");
      expect(calculateAspectRatio(800, 1000)).toBe("4:5");
    });

    it("returns 9:16 for vertical video", () => {
      expect(calculateAspectRatio(1080, 1920)).toBe("9:16");
      expect(calculateAspectRatio(720, 1280)).toBe("9:16");
    });

    it("returns 4:3 for standard images", () => {
      expect(calculateAspectRatio(1024, 768)).toBe("4:3");
      expect(calculateAspectRatio(800, 600)).toBe("4:3");
    });
  });

  describe("custom ratios", () => {
    it("returns simplified ratio for non-standard dimensions", () => {
      expect(calculateAspectRatio(1000, 500)).toBe("2:1");
      expect(calculateAspectRatio(300, 100)).toBe("3:1");
    });

    it("returns simplified ratio using GCD", () => {
      // 1200x900 simplifies to 4:3
      expect(calculateAspectRatio(1200, 900)).toBe("4:3");
      // 2400x1800 simplifies to 4:3
      expect(calculateAspectRatio(2400, 1800)).toBe("4:3");
    });

    it("handles prime number dimensions", () => {
      expect(calculateAspectRatio(7, 3)).toBe("7:3");
      expect(calculateAspectRatio(11, 5)).toBe("11:5");
    });
  });

  describe("edge cases", () => {
    it("handles very small dimensions", () => {
      expect(calculateAspectRatio(1, 1)).toBe("1:1");
      expect(calculateAspectRatio(2, 1)).toBe("2:1");
    });

    it("handles very large dimensions", () => {
      expect(calculateAspectRatio(10000, 10000)).toBe("1:1");
      expect(calculateAspectRatio(7680, 4320)).toBe("16:9");
    });
  });
});

describe("mimeToFormat", () => {
  describe("image formats", () => {
    it("converts image/jpeg to jpg", () => {
      expect(mimeToFormat("image/jpeg")).toBe("jpg");
    });

    it("converts image/jpg to jpg", () => {
      expect(mimeToFormat("image/jpg")).toBe("jpg");
    });

    it("converts image/png to png", () => {
      expect(mimeToFormat("image/png")).toBe("png");
    });

    it("converts image/gif to gif", () => {
      expect(mimeToFormat("image/gif")).toBe("gif");
    });

    it("converts image/webp to webp", () => {
      expect(mimeToFormat("image/webp")).toBe("webp");
    });

    it("converts image/svg+xml to svg", () => {
      expect(mimeToFormat("image/svg+xml")).toBe("svg");
    });
  });

  describe("video formats", () => {
    it("converts video/mp4 to mp4", () => {
      expect(mimeToFormat("video/mp4")).toBe("mp4");
    });

    it("converts video/quicktime to mov", () => {
      expect(mimeToFormat("video/quicktime")).toBe("mov");
    });

    it("converts video/webm to webm", () => {
      expect(mimeToFormat("video/webm")).toBe("webm");
    });

    it("converts video/x-msvideo to avi", () => {
      expect(mimeToFormat("video/x-msvideo")).toBe("avi");
    });
  });

  describe("unknown formats", () => {
    it("extracts subtype for unknown MIME types", () => {
      expect(mimeToFormat("image/bmp")).toBe("bmp");
      expect(mimeToFormat("video/mpeg")).toBe("mpeg");
      expect(mimeToFormat("application/pdf")).toBe("pdf");
    });

    it("returns unknown for empty or invalid MIME types", () => {
      expect(mimeToFormat("")).toBe("unknown");
      expect(mimeToFormat("invalid")).toBe("unknown");
    });
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(10240)).toBe("10 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
    expect(formatFileSize(5242880)).toBe("5 MB");
    expect(formatFileSize(1572864)).toBe("1.5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1 GB");
    expect(formatFileSize(2147483648)).toBe("2 GB");
  });

  it("handles decimal precision", () => {
    expect(formatFileSize(1536000)).toBe("1.46 MB");
    expect(formatFileSize(1234567)).toBe("1.18 MB");
  });
});

describe("formatDuration", () => {
  it("formats seconds under a minute", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(1)).toBe("1s");
    expect(formatDuration(30)).toBe("30s");
    expect(formatDuration(59)).toBe("59s");
  });

  it("formats exactly one minute", () => {
    expect(formatDuration(60)).toBe("1:00");
  });

  it("formats minutes with seconds", () => {
    expect(formatDuration(61)).toBe("1:01");
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(125)).toBe("2:05");
  });

  it("pads seconds with leading zero", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(121)).toBe("2:01");
    expect(formatDuration(189)).toBe("3:09");
  });

  it("handles longer durations", () => {
    expect(formatDuration(600)).toBe("10:00");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("handles fractional seconds by flooring", () => {
    expect(formatDuration(1.5)).toBe("1s");
    expect(formatDuration(90.9)).toBe("1:30");
  });
});

describe("isImageMimeType", () => {
  it("returns true for valid image MIME types", () => {
    expect(isImageMimeType("image/jpeg")).toBe(true);
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("image/gif")).toBe(true);
    expect(isImageMimeType("image/webp")).toBe(true);
  });

  it("returns false for video MIME types", () => {
    expect(isImageMimeType("video/mp4")).toBe(false);
    expect(isImageMimeType("video/webm")).toBe(false);
  });

  it("returns false for other MIME types", () => {
    expect(isImageMimeType("application/pdf")).toBe(false);
    expect(isImageMimeType("text/plain")).toBe(false);
  });

  it("returns false for empty or invalid input", () => {
    expect(isImageMimeType("")).toBe(false);
    expect(isImageMimeType("invalid")).toBe(false);
  });
});

describe("isVideoMimeType", () => {
  it("returns true for valid video MIME types", () => {
    expect(isVideoMimeType("video/mp4")).toBe(true);
    expect(isVideoMimeType("video/webm")).toBe(true);
    expect(isVideoMimeType("video/quicktime")).toBe(true);
  });

  it("returns false for image MIME types", () => {
    expect(isVideoMimeType("image/jpeg")).toBe(false);
    expect(isVideoMimeType("image/png")).toBe(false);
  });

  it("returns false for other MIME types", () => {
    expect(isVideoMimeType("application/pdf")).toBe(false);
    expect(isVideoMimeType("text/plain")).toBe(false);
  });

  it("returns false for empty or invalid input", () => {
    expect(isVideoMimeType("")).toBe(false);
    expect(isVideoMimeType("invalid")).toBe(false);
  });
});
