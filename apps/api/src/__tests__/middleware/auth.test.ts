import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testClient } from "hono/testing";

// Mock the Better Auth lib
vi.mock("../../lib/auth.js", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Import after mocking
import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { auth } from "../../lib/auth.js";

describe("Auth Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuth", () => {
    it("should allow access with valid session", async () => {
      const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;
      mockGetSession.mockResolvedValue({
        session: {
          id: "session-id",
          userId: "user-id",
          expiresAt: new Date(Date.now() + 86400000),
        },
        user: {
          id: "user-id",
          email: "test@example.com",
          emailVerified: true,
        },
      });

      const app = new Hono();
      app.use("*", requireAuth());
      app.get("/protected", (c) => {
        const user = c.get("user");
        return c.json({ userId: user.id });
      });

      const client = testClient(app);
      const res = await client.protected.$get(
        {},
        {
          headers: {
            cookie: "better-auth.session_token=test-token",
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.userId).toBe("user-id");
    });

    it("should reject access without session", async () => {
      const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;
      mockGetSession.mockResolvedValue(null);

      const app = new Hono();
      app.use("*", requireAuth());
      app.get("/protected", (c) => c.json({ ok: true }));

      const client = testClient(app);
      const res = await client.protected.$get({});

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Authentication required");
    });

    it("should reject access with invalid session", async () => {
      const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;
      mockGetSession.mockResolvedValue(null);

      const app = new Hono();
      app.use("*", requireAuth());
      app.get("/protected", (c) => c.json({ ok: true }));

      const client = testClient(app);
      const res = await client.protected.$get(
        {},
        {
          headers: {
            cookie: "better-auth.session_token=invalid-token",
          },
        }
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Authentication required");
    });

    it("should attach user and session to context", async () => {
      const mockUser = {
        id: "user-id",
        email: "test@example.com",
        emailVerified: true,
      };
      const mockSession = {
        id: "session-id",
        userId: "user-id",
        expiresAt: new Date(Date.now() + 86400000),
      };

      const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;
      mockGetSession.mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });

      const app = new Hono();
      app.use("*", requireAuth());
      app.get("/protected", (c) => {
        const user = c.get("user");
        const session = c.get("session");
        return c.json({
          userId: user.id,
          userEmail: user.email,
          sessionId: session.id,
        });
      });

      const client = testClient(app);
      const res = await client.protected.$get(
        {},
        {
          headers: {
            cookie: "better-auth.session_token=test-token",
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.userId).toBe("user-id");
      expect(json.userEmail).toBe("test@example.com");
      expect(json.sessionId).toBe("session-id");
    });
  });

  describe("optionalAuth", () => {
    it("should allow access without session (user is null)", async () => {
      const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;
      mockGetSession.mockResolvedValue(null);

      const app = new Hono();
      app.use("*", optionalAuth());
      app.get("/public", (c) => {
        const user = c.get("user");
        return c.json({ authenticated: user !== null });
      });

      const client = testClient(app);
      const res = await client.public.$get({});

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.authenticated).toBe(false);
    });

    it("should attach user when session is valid", async () => {
      const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;
      mockGetSession.mockResolvedValue({
        session: {
          id: "session-id",
          userId: "user-id",
          expiresAt: new Date(Date.now() + 86400000),
        },
        user: {
          id: "user-id",
          email: "test@example.com",
          emailVerified: true,
        },
      });

      const app = new Hono();
      app.use("*", optionalAuth());
      app.get("/public", (c) => {
        const user = c.get("user");
        return c.json({
          authenticated: user !== null,
          userId: user?.id,
        });
      });

      const client = testClient(app);
      const res = await client.public.$get(
        {},
        {
          headers: {
            cookie: "better-auth.session_token=test-token",
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.authenticated).toBe(true);
      expect(json.userId).toBe("user-id");
    });

    it("should allow access when session cookie is missing", async () => {
      const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;
      mockGetSession.mockResolvedValue(null);

      const app = new Hono();
      app.use("*", optionalAuth());
      app.get("/public", (c) => {
        const user = c.get("user");
        return c.json({ user });
      });

      const client = testClient(app);
      const res = await client.public.$get({});

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user).toBeNull();
    });
  });
});
