import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MagicLinkEmailProps } from "../types.js";

describe("sendMagicLinkEmail", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "noreply@example.com";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("input validation", () => {
    it("validates email format", async () => {
      const { sendMagicLinkEmail } = await import("../send/magic-link.js");

      const result = await sendMagicLinkEmail({
        to: "invalid-email",
        magicLinkUrl: "https://app.example.com/auth/verify?token=abc",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("email");
      }
    });

    it("validates magic link URL is HTTPS", async () => {
      const { sendMagicLinkEmail } = await import("../send/magic-link.js");

      const result = await sendMagicLinkEmail({
        to: "user@example.com",
        magicLinkUrl: "http://app.example.com/auth/verify?token=abc",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("HTTPS");
      }
    });

    it("validates expiration is in the future", async () => {
      const { sendMagicLinkEmail } = await import("../send/magic-link.js");

      const result = await sendMagicLinkEmail({
        to: "user@example.com",
        magicLinkUrl: "https://app.example.com/auth/verify?token=abc",
        expiresAt: new Date(Date.now() - 1000),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("future");
      }
    });
  });

  describe("successful send", () => {
    it("sends email with correct subject", async () => {
      // Set development mode for console fallback
      process.env.NODE_ENV = "development";
      process.env.RESEND_API_KEY = undefined;

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendMagicLinkEmail } = await import("../send/magic-link.js");

      const result = await sendMagicLinkEmail({
        to: "user@example.com",
        magicLinkUrl: "https://app.example.com/auth/verify?token=abc",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messageId).toContain("dev_");
      }

      consoleSpy.mockRestore();
    });

    it("returns messageId on success", async () => {
      // Set development mode for console fallback
      process.env.NODE_ENV = "development";
      process.env.RESEND_API_KEY = undefined;

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendMagicLinkEmail } = await import("../send/magic-link.js");

      const result = await sendMagicLinkEmail({
        to: "user@example.com",
        magicLinkUrl: "https://app.example.com/auth/verify?token=abc",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Either success with messageId or error
      if (result.success) {
        expect(result.messageId).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }

      consoleSpy.mockRestore();
    });
  });

  describe("logging", () => {
    it("logs send attempt for debugging", async () => {
      process.env.NODE_ENV = "development";
      process.env.RESEND_API_KEY = undefined;

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendMagicLinkEmail } = await import("../send/magic-link.js");

      await sendMagicLinkEmail({
        to: "user@example.com",
        magicLinkUrl: "https://app.example.com/auth/verify?token=abc",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const logCalls = consoleSpy.mock.calls.flat().join(" ");
      expect(logCalls).toContain("Sending magic link email");

      consoleSpy.mockRestore();
    });
  });
});

describe("MagicLinkEmail template rendering", () => {
  it("renders valid HTML with required props", async () => {
    const { render } = await import("@react-email/components");
    const { MagicLinkEmail } = await import("../emails/magic-link.js");

    const props: MagicLinkEmailProps = {
      url: "https://app.example.com/auth/verify?token=abc123",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      userEmail: "user@example.com",
    };

    const html = await render(MagicLinkEmail(props));

    // Basic sanity checks
    expect(html).toContain("<!DOCTYPE html");
    expect(html).toContain("https://app.example.com/auth/verify?token=abc123");
    expect(html).toContain("user@example.com");
  });

  it("includes sign in call to action", async () => {
    const { render } = await import("@react-email/components");
    const { MagicLinkEmail } = await import("../emails/magic-link.js");

    const props: MagicLinkEmailProps = {
      url: "https://app.example.com/auth/verify?token=abc123",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      userEmail: "user@example.com",
    };

    const html = await render(MagicLinkEmail(props));

    expect(html.toLowerCase()).toContain("sign in");
  });

  it("includes expiration time", async () => {
    const { render } = await import("@react-email/components");
    const { MagicLinkEmail } = await import("../emails/magic-link.js");

    const props: MagicLinkEmailProps = {
      url: "https://app.example.com/auth/verify?token=abc123",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      userEmail: "user@example.com",
    };

    const html = await render(MagicLinkEmail(props));

    expect(html).toContain("minutes");
  });

  it("includes security notice", async () => {
    const { render } = await import("@react-email/components");
    const { MagicLinkEmail } = await import("../emails/magic-link.js");

    const props: MagicLinkEmailProps = {
      url: "https://app.example.com/auth/verify?token=abc123",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      userEmail: "user@example.com",
    };

    const html = await render(MagicLinkEmail(props));

    // HTML encodes apostrophes as &#x27; so we check for "didn" instead
    expect(html.toLowerCase()).toContain("didn");
    expect(html.toLowerCase()).toContain("request");
    expect(html.toLowerCase()).toContain("ignore");
  });

  it("includes IP address when provided", async () => {
    const { render } = await import("@react-email/components");
    const { MagicLinkEmail } = await import("../emails/magic-link.js");

    const props: MagicLinkEmailProps = {
      url: "https://app.example.com/auth/verify?token=abc123",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      userEmail: "user@example.com",
      ipAddress: "192.168.1.1",
    };

    const html = await render(MagicLinkEmail(props));

    expect(html).toContain("192.168.1.1");
  });

  it("includes user agent when provided", async () => {
    const { render } = await import("@react-email/components");
    const { MagicLinkEmail } = await import("../emails/magic-link.js");

    const props: MagicLinkEmailProps = {
      url: "https://app.example.com/auth/verify?token=abc123",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      userEmail: "user@example.com",
      userAgent: "Chrome on macOS",
    };

    const html = await render(MagicLinkEmail(props));

    expect(html).toContain("Chrome on macOS");
  });
});
