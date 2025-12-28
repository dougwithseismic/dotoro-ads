import { describe, it, expect, vi, beforeEach } from "vitest";
import { testClient } from "hono/testing";

// Mock the auth service
vi.mock("../../services/auth-service.js", () => ({
  createMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
  validateSession: vi.fn(),
  revokeSessionByToken: vi.fn(),
  hashToken: vi.fn((token: string) => `hashed_${token}`),
  MAGIC_LINK_EXPIRY_MS: 15 * 60 * 1000,
  SESSION_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
}));

// Mock the email service
vi.mock("@repo/email", () => ({
  sendMagicLinkEmail: vi.fn().mockResolvedValue({ success: true, messageId: "msg-123" }),
}));

// Import app after mocking
import { authApp } from "../../routes/auth.js";
import * as authService from "../../services/auth-service.js";
import { sendMagicLinkEmail } from "@repo/email";

describe("Auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/magic-link/request", () => {
    it("should accept valid email and return success", async () => {
      const mockCreateMagicLink = authService.createMagicLink as ReturnType<typeof vi.fn>;
      mockCreateMagicLink.mockResolvedValue({
        success: true,
        magicLinkUrl: "https://app.test.com/verify?token=abc123",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isNewUser: false,
      });

      const client = testClient(authApp);
      const res = await client["api"]["auth"]["magic-link"]["request"].$post({
        json: {
          email: "test@example.com",
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe("If an account exists, a magic link has been sent");
    });

    it("should normalize email to lowercase", async () => {
      const mockCreateMagicLink = authService.createMagicLink as ReturnType<typeof vi.fn>;
      mockCreateMagicLink.mockResolvedValue({
        success: true,
        magicLinkUrl: "https://app.test.com/verify?token=abc123",
        expiresAt: new Date(),
        isNewUser: false,
      });

      const client = testClient(authApp);
      await client["api"]["auth"]["magic-link"]["request"].$post({
        json: {
          email: "TEST@EXAMPLE.COM",
        },
      });

      expect(mockCreateMagicLink).toHaveBeenCalledWith(
        "test@example.com",
        expect.any(String)
      );
    });

    it("should return 400 for invalid email format", async () => {
      const client = testClient(authApp);
      const res = await client["api"]["auth"]["magic-link"]["request"].$post({
        json: {
          email: "not-an-email",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for empty email", async () => {
      const client = testClient(authApp);
      const res = await client["api"]["auth"]["magic-link"]["request"].$post({
        json: {
          email: "",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should always return success to prevent email enumeration", async () => {
      // Even if magic link creation fails, we return success
      const mockCreateMagicLink = authService.createMagicLink as ReturnType<typeof vi.fn>;
      mockCreateMagicLink.mockResolvedValue({
        success: false,
        error: "Database error",
      });

      const client = testClient(authApp);
      const res = await client["api"]["auth"]["magic-link"]["request"].$post({
        json: {
          email: "test@example.com",
        },
      });

      // Still returns 200 to prevent enumeration
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should send email with magic link", async () => {
      const mockCreateMagicLink = authService.createMagicLink as ReturnType<typeof vi.fn>;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      mockCreateMagicLink.mockResolvedValue({
        success: true,
        magicLinkUrl: "https://app.test.com/verify?token=abc123",
        expiresAt,
        isNewUser: false,
      });

      const client = testClient(authApp);
      await client["api"]["auth"]["magic-link"]["request"].$post({
        json: {
          email: "test@example.com",
        },
      });

      expect(sendMagicLinkEmail).toHaveBeenCalledWith({
        to: "test@example.com",
        magicLinkUrl: "https://app.test.com/verify?token=abc123",
        expiresAt,
        ipAddress: undefined,
        userAgent: undefined,
      });
    });
  });

  describe("POST /api/auth/magic-link/verify", () => {
    it("should verify valid token and set session cookie", async () => {
      const mockVerifyMagicLink = authService.verifyMagicLink as ReturnType<typeof vi.fn>;
      mockVerifyMagicLink.mockResolvedValue({
        success: true,
        user: {
          id: "user-id",
          email: "test@example.com",
          emailVerified: true,
        },
        sessionToken: "a".repeat(64),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const client = testClient(authApp);
      const res = await client["api"]["auth"]["magic-link"]["verify"].$post({
        json: {
          token: "a".repeat(64),
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user).toBeDefined();
      expect(json.user.id).toBe("user-id");
      expect(json.user.email).toBe("test@example.com");
      expect(json.expiresAt).toBeDefined();

      // Check session cookie was set
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("session=");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=Lax");
    });

    it("should return 400 for invalid token", async () => {
      const mockVerifyMagicLink = authService.verifyMagicLink as ReturnType<typeof vi.fn>;
      mockVerifyMagicLink.mockResolvedValue({
        success: false,
        error: "Invalid or expired token",
      });

      const client = testClient(authApp);
      const res = await client["api"]["auth"]["magic-link"]["verify"].$post({
        json: {
          token: "a".repeat(64),
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid or expired token");
    });

    it("should return 400 for token already used", async () => {
      const mockVerifyMagicLink = authService.verifyMagicLink as ReturnType<typeof vi.fn>;
      mockVerifyMagicLink.mockResolvedValue({
        success: false,
        error: "Token has already been used",
      });

      const client = testClient(authApp);
      const res = await client["api"]["auth"]["magic-link"]["verify"].$post({
        json: {
          token: "a".repeat(64),
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Token has already been used");
    });

    it("should return 400 for incorrectly formatted token", async () => {
      const client = testClient(authApp);
      const res = await client["api"]["auth"]["magic-link"]["verify"].$post({
        json: {
          token: "too-short",
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/auth/session", () => {
    it("should return user when authenticated", async () => {
      const mockValidateSession = authService.validateSession as ReturnType<typeof vi.fn>;
      mockValidateSession.mockResolvedValue({
        session: {
          id: "session-id",
          userId: "user-id",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        user: {
          id: "user-id",
          email: "test@example.com",
          emailVerified: true,
        },
      });

      const client = testClient(authApp);
      const res = await client["api"]["auth"]["session"].$get(
        {},
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user).toBeDefined();
      expect(json.user?.id).toBe("user-id");
    });

    it("should return null user when not authenticated", async () => {
      const mockValidateSession = authService.validateSession as ReturnType<typeof vi.fn>;
      mockValidateSession.mockResolvedValue(null);

      const client = testClient(authApp);
      const res = await client["api"]["auth"]["session"].$get({});

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user).toBeNull();
      expect(json.expiresAt).toBeNull();
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should clear session cookie and revoke session", async () => {
      const mockValidateSession = authService.validateSession as ReturnType<typeof vi.fn>;
      mockValidateSession.mockResolvedValue({
        session: {
          id: "session-id",
          userId: "user-id",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        user: {
          id: "user-id",
          email: "test@example.com",
          emailVerified: true,
        },
      });

      const mockRevokeSessionByToken = authService.revokeSessionByToken as ReturnType<typeof vi.fn>;
      mockRevokeSessionByToken.mockResolvedValue(undefined);

      const client = testClient(authApp);
      const res = await client["api"]["auth"]["logout"].$post(
        {},
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Check session cookie was cleared
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("session=");
      expect(setCookie).toContain("Max-Age=0");
    });

    it("should return success even without session cookie", async () => {
      const client = testClient(authApp);
      const res = await client["api"]["auth"]["logout"].$post({});

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
