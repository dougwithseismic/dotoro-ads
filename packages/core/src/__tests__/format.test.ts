import { describe, it, expect } from "vitest";
import { formatBytes } from "../utils/format.js";

describe("formatBytes", () => {
  describe("valid inputs", () => {
    it("returns '0 Bytes' for zero", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
    });

    it("formats bytes correctly", () => {
      expect(formatBytes(100)).toBe("100 Bytes");
      expect(formatBytes(1023)).toBe("1023 Bytes");
    });

    it("formats kilobytes correctly", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1024 * 500)).toBe("500 KB");
    });

    it("formats megabytes correctly", () => {
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1024 * 1024 * 5)).toBe("5 MB");
      expect(formatBytes(1024 * 1024 * 20)).toBe("20 MB");
    });

    it("formats gigabytes correctly", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
      expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe("2.5 GB");
    });

    it("formats terabytes correctly", () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1 TB");
    });

    it("formats petabytes correctly", () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1024)).toBe("1 PB");
    });
  });

  describe("edge cases", () => {
    it("returns 'Invalid size' for negative numbers", () => {
      expect(formatBytes(-1)).toBe("Invalid size");
      expect(formatBytes(-1024)).toBe("Invalid size");
    });

    it("returns 'Invalid size' for Infinity", () => {
      expect(formatBytes(Infinity)).toBe("Invalid size");
      expect(formatBytes(-Infinity)).toBe("Invalid size");
    });

    it("returns 'Invalid size' for NaN", () => {
      expect(formatBytes(NaN)).toBe("Invalid size");
    });

    it("handles very large numbers without array out of bounds", () => {
      // 1 Exabyte (larger than PB)
      const exabyte = 1024 * 1024 * 1024 * 1024 * 1024 * 1024;
      // Should cap at PB and not crash
      const result = formatBytes(exabyte);
      expect(result).toContain("PB");
      expect(result).not.toBe("undefined");
    });
  });

  describe("decimal formatting", () => {
    it("rounds to 2 decimal places", () => {
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1024 * 1024 * 1.33333)).toBe("1.33 MB");
    });

    it("removes unnecessary trailing zeros", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(2048)).toBe("2 KB");
    });
  });
});
