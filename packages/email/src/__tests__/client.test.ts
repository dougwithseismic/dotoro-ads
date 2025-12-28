import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to re-import after resetting modules
let createEmailClient: typeof import("../client.js").createEmailClient;
let sendEmail: typeof import("../client.js").sendEmail;

describe("createEmailClient", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Re-import after resetting modules to get fresh singleton
    const module = await import("../client.js");
    createEmailClient = module.createEmailClient;
    sendEmail = module.sendEmail;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("environment validation", () => {
    it("throws error when RESEND_API_KEY is not set in production mode", async () => {
      process.env.RESEND_API_KEY = undefined;
      process.env.NODE_ENV = "production";

      // Re-import to get fresh module state
      const { createEmailClient: freshClient } = await import("../client.js");

      expect(() => freshClient({ forceNew: true })).toThrow(
        "RESEND_API_KEY environment variable is required"
      );
    });

    it("creates client successfully when RESEND_API_KEY is set", async () => {
      process.env.RESEND_API_KEY = "re_test_123";

      const { createEmailClient: freshClient } = await import("../client.js");
      const client = freshClient({ forceNew: true });

      expect(client).toBeDefined();
      expect(client.send).toBeDefined();
    });

    it("creates console fallback client in development without API key", async () => {
      process.env.RESEND_API_KEY = undefined;
      process.env.NODE_ENV = "development";

      const { createEmailClient: freshClient } = await import("../client.js");
      const client = freshClient({ forceNew: true });

      expect(client).toBeDefined();
      expect(client.isConsoleFallback).toBe(true);
    });

    it("uses provided API key over environment variable", async () => {
      process.env.RESEND_API_KEY = "re_env_key";

      const { createEmailClient: freshClient } = await import("../client.js");
      const client = freshClient({ apiKey: "re_custom_key", forceNew: true });

      expect(client).toBeDefined();
      expect(client.isConsoleFallback).toBe(false);
    });
  });

  describe("singleton pattern", () => {
    it("returns same client instance when called multiple times", async () => {
      process.env.RESEND_API_KEY = "re_test_123";

      const { createEmailClient: freshClient } = await import("../client.js");
      // First call creates the singleton, second call should return the same instance
      const client1 = freshClient();
      const client2 = freshClient();

      expect(client1).toBe(client2);
    });

    it("creates new instance when forceNew option is true", async () => {
      process.env.RESEND_API_KEY = "re_test_123";

      const { createEmailClient: freshClient } = await import("../client.js");
      const client1 = freshClient({ forceNew: true });
      const client2 = freshClient({ forceNew: true });

      expect(client1).not.toBe(client2);
    });
  });
});

describe("sendEmail", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.RESEND_API_KEY = "re_test_123";
    const module = await import("../client.js");
    createEmailClient = module.createEmailClient;
    sendEmail = module.sendEmail;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("input validation", () => {
    it("validates email format for 'to' field", async () => {
      const { sendEmail: freshSend } = await import("../client.js");
      const result = await freshSend({
        to: "invalid-email",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid email");
      }
    });

    it("validates subject is not empty", async () => {
      const { sendEmail: freshSend } = await import("../client.js");
      const result = await freshSend({
        to: "user@example.com",
        subject: "",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("subject");
      }
    });

    it("requires either html or react content", async () => {
      const { sendEmail: freshSend } = await import("../client.js");
      const result = await freshSend({
        to: "user@example.com",
        subject: "Test",
      } as Parameters<typeof freshSend>[0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("content");
      }
    });

    it("validates multiple 'to' addresses", async () => {
      const { sendEmail: freshSend } = await import("../client.js");
      const result = await freshSend({
        to: ["user1@example.com", "invalid-email", "user2@example.com"],
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid email");
      }
    });
  });

  describe("successful send with mock client", () => {
    it("returns success result with messageId", async () => {
      const { sendEmail: freshSend } = await import("../client.js");

      // Create a mock client
      const mockClient = {
        send: vi.fn().mockResolvedValue({
          success: true,
          messageId: "msg_123",
        }),
        isConsoleFallback: false,
      };

      const result = await freshSend(
        {
          to: "user@example.com",
          subject: "Test Subject",
          html: "<p>Hello</p>",
        },
        mockClient
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messageId).toBe("msg_123");
      }
    });

    it("passes from address to client", async () => {
      const { sendEmail: freshSend } = await import("../client.js");

      const mockClient = {
        send: vi.fn().mockResolvedValue({
          success: true,
          messageId: "msg_123",
        }),
        isConsoleFallback: false,
      };

      await freshSend(
        {
          to: "user@example.com",
          from: "custom@example.com",
          subject: "Test",
          html: "<p>Test</p>",
        },
        mockClient
      );

      expect(mockClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "custom@example.com",
        })
      );
    });
  });

  describe("error handling", () => {
    it("handles client errors gracefully", async () => {
      const { sendEmail: freshSend } = await import("../client.js");

      const mockClient = {
        send: vi.fn().mockResolvedValue({
          success: false,
          error: "Rate limit exceeded",
        }),
        isConsoleFallback: false,
      };

      const result = await freshSend(
        {
          to: "user@example.com",
          subject: "Test",
          html: "<p>Test</p>",
        },
        mockClient
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Rate limit exceeded");
      }
    });

    it("handles thrown errors gracefully", async () => {
      const { sendEmail: freshSend } = await import("../client.js");

      const mockClient = {
        send: vi.fn().mockRejectedValue(new Error("Network error")),
        isConsoleFallback: false,
      };

      const result = await freshSend(
        {
          to: "user@example.com",
          subject: "Test",
          html: "<p>Test</p>",
        },
        mockClient
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Network error");
      }
    });
  });
});

describe("console fallback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("logs email to console in development mode", async () => {
    process.env.NODE_ENV = "development";
    process.env.RESEND_API_KEY = undefined;

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { createEmailClient: freshClient, sendEmail: freshSend } =
      await import("../client.js");
    const client = freshClient({ forceNew: true });

    const result = await freshSend(
      {
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Hello</p>",
      },
      client
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.messageId).toContain("dev_");
    }
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("includes all email details in console output", async () => {
    process.env.NODE_ENV = "development";
    process.env.RESEND_API_KEY = undefined;

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { createEmailClient: freshClient, sendEmail: freshSend } =
      await import("../client.js");
    const client = freshClient({ forceNew: true });

    await freshSend(
      {
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Hello</p>",
      },
      client
    );

    const logCalls = consoleSpy.mock.calls.flat().join(" ");
    expect(logCalls).toContain("user@example.com");
    expect(logCalls).toContain("Test Subject");

    consoleSpy.mockRestore();
  });
});
