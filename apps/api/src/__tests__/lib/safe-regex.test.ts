import { describe, it, expect } from "vitest";
import { isSafeRegex, validateRegex } from "../../lib/safe-regex.js";

describe("isSafeRegex", () => {
  describe("safe patterns", () => {
    it("should accept simple patterns", () => {
      expect(isSafeRegex("hello")).toBe(true);
      expect(isSafeRegex("^hello$")).toBe(true);
      expect(isSafeRegex("[a-z]+")).toBe(true);
      expect(isSafeRegex("\\d{3}-\\d{4}")).toBe(true);
    });

    it("should accept patterns with single quantifiers", () => {
      expect(isSafeRegex("a+")).toBe(true);
      expect(isSafeRegex("a*")).toBe(true);
      expect(isSafeRegex("a?")).toBe(true);
      expect(isSafeRegex("a{1,3}")).toBe(true);
    });

    it("should accept common use cases", () => {
      expect(isSafeRegex("^[a-zA-Z0-9_]+$")).toBe(true);
      expect(isSafeRegex("\\w+@\\w+\\.\\w+")).toBe(true);
      expect(isSafeRegex("^https?://")).toBe(true);
    });
  });

  describe("unsafe patterns - nested quantifiers (ReDoS)", () => {
    it("should reject (a+)+ pattern", () => {
      expect(isSafeRegex("(a+)+")).toBe(false);
    });

    it("should reject (a*)*  pattern", () => {
      expect(isSafeRegex("(a*)*")).toBe(false);
    });

    it("should reject ([a-z]+)+ pattern", () => {
      expect(isSafeRegex("([a-z]+)+")).toBe(false);
    });

    it("should reject (.*?)* pattern", () => {
      expect(isSafeRegex("(.*?)*")).toBe(false);
    });
  });

  describe("pattern length limits", () => {
    it("should accept patterns at max length", () => {
      const pattern = "a".repeat(100);
      expect(isSafeRegex(pattern)).toBe(true);
    });

    it("should reject patterns over 100 characters", () => {
      const pattern = "a".repeat(101);
      expect(isSafeRegex(pattern)).toBe(false);
    });
  });

  describe("invalid regex syntax", () => {
    it("should reject invalid regex syntax", () => {
      expect(isSafeRegex("[")).toBe(false);
      expect(isSafeRegex("(")).toBe(false);
      expect(isSafeRegex("\\")).toBe(false);
      expect(isSafeRegex("*")).toBe(false);
    });
  });
});

describe("validateRegex", () => {
  describe("valid patterns", () => {
    it("should return valid: true for safe patterns", () => {
      expect(validateRegex("hello")).toEqual({ valid: true });
      expect(validateRegex("^[a-z]+$")).toEqual({ valid: true });
      expect(validateRegex("\\d{3}-\\d{4}")).toEqual({ valid: true });
    });
  });

  describe("pattern length errors", () => {
    it("should return specific error for patterns over 100 characters", () => {
      const pattern = "a".repeat(101);
      const result = validateRegex(pattern);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("Pattern exceeds maximum length of 100 characters");
      }
    });
  });

  describe("nested quantifier errors", () => {
    it("should return specific error for nested quantifiers", () => {
      const result = validateRegex("(a+)+");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("Pattern contains nested quantifiers which could cause performance issues");
      }
    });
  });

  describe("syntax errors", () => {
    it("should return specific error for invalid regex syntax", () => {
      const result = validateRegex("[");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("Invalid regex syntax:");
      }
    });

    it("should include original error message in syntax errors", () => {
      const result = validateRegex("(");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Invalid regex syntax:/);
      }
    });
  });
});
