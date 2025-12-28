import { describe, it, expect } from "vitest";
import {
  requestMagicLinkSchema,
  verifyMagicLinkSchema,
  userSchema,
  sessionResponseSchema,
  magicLinkRequestedResponseSchema,
} from "../../schemas/auth.js";

describe("Auth Schemas", () => {
  describe("requestMagicLinkSchema", () => {
    it("should accept valid email", () => {
      const result = requestMagicLinkSchema.safeParse({
        email: "user@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const result = requestMagicLinkSchema.safeParse({
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty email", () => {
      const result = requestMagicLinkSchema.safeParse({
        email: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject email longer than 255 characters", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      const result = requestMagicLinkSchema.safeParse({
        email: longEmail,
      });
      expect(result.success).toBe(false);
    });

    it("should normalize email to lowercase", () => {
      const result = requestMagicLinkSchema.safeParse({
        email: "User@EXAMPLE.com",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
      }
    });

    it("should trim whitespace from email", () => {
      const result = requestMagicLinkSchema.safeParse({
        email: "  user@example.com  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
      }
    });
  });

  describe("verifyMagicLinkSchema", () => {
    it("should accept valid 64-character hex token", () => {
      const result = verifyMagicLinkSchema.safeParse({
        token: "a".repeat(64),
      });
      expect(result.success).toBe(true);
    });

    it("should reject token shorter than 64 characters", () => {
      const result = verifyMagicLinkSchema.safeParse({
        token: "a".repeat(63),
      });
      expect(result.success).toBe(false);
    });

    it("should reject token longer than 64 characters", () => {
      const result = verifyMagicLinkSchema.safeParse({
        token: "a".repeat(65),
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty token", () => {
      const result = verifyMagicLinkSchema.safeParse({
        token: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("userSchema", () => {
    it("should accept valid user object", () => {
      const result = userSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com",
        emailVerified: true,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID for id", () => {
      const result = userSchema.safeParse({
        id: "not-a-uuid",
        email: "user@example.com",
        emailVerified: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("sessionResponseSchema", () => {
    it("should accept valid session response", () => {
      const result = sessionResponseSchema.safeParse({
        user: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "user@example.com",
          emailVerified: true,
        },
        expiresAt: "2025-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept session response with null user (not authenticated)", () => {
      const result = sessionResponseSchema.safeParse({
        user: null,
        expiresAt: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid expiresAt format", () => {
      const result = sessionResponseSchema.safeParse({
        user: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "user@example.com",
          emailVerified: true,
        },
        expiresAt: "not-a-date",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("magicLinkRequestedResponseSchema", () => {
    it("should accept success response", () => {
      const result = magicLinkRequestedResponseSchema.safeParse({
        success: true,
        message: "If an account exists, a magic link has been sent",
      });
      expect(result.success).toBe(true);
    });
  });
});
