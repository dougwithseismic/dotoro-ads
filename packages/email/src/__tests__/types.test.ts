import { describe, it, expect } from "vitest";
import {
  type EmailTemplate,
  type SendEmailOptions,
  type EmailResult,
  type MagicLinkEmailProps,
  isValidEmail,
  isValidUrl,
} from "../types.js";

describe("type guards and validators", () => {
  describe("isValidEmail", () => {
    it("returns true for valid email addresses", () => {
      const validEmails = [
        "user@example.com",
        "user.name@example.com",
        "user+tag@example.com",
        "user@subdomain.example.com",
        "user@example.co.uk",
      ];

      for (const email of validEmails) {
        expect(isValidEmail(email)).toBe(true);
      }
    });

    it("returns false for invalid email addresses", () => {
      const invalidEmails = [
        "not-an-email",
        "user@",
        "@example.com",
        "user@.com",
        "user@example",
        "",
        "user name@example.com",
      ];

      for (const email of invalidEmails) {
        expect(isValidEmail(email)).toBe(false);
      }
    });

    it("handles edge cases", () => {
      expect(isValidEmail(null as unknown as string)).toBe(false);
      expect(isValidEmail(undefined as unknown as string)).toBe(false);
      expect(isValidEmail(123 as unknown as string)).toBe(false);
    });
  });

  describe("isValidUrl", () => {
    it("returns true for valid HTTPS URLs", () => {
      const validUrls = [
        "https://example.com",
        "https://example.com/path",
        "https://example.com/path?query=value",
        "https://subdomain.example.com",
        "https://example.com:8080/path",
      ];

      for (const url of validUrls) {
        expect(isValidUrl(url, { requireHttps: true })).toBe(true);
      }
    });

    it("returns true for valid HTTP URLs when HTTPS not required", () => {
      expect(isValidUrl("http://example.com", { requireHttps: false })).toBe(true);
    });

    it("returns false for HTTP URLs when HTTPS required", () => {
      expect(isValidUrl("http://example.com", { requireHttps: true })).toBe(false);
    });

    it("returns false for invalid URLs", () => {
      const invalidUrls = [
        "not-a-url",
        "ftp://example.com",
        "//example.com",
        "",
      ];

      for (const url of invalidUrls) {
        expect(isValidUrl(url)).toBe(false);
      }
    });

    it("handles edge cases", () => {
      expect(isValidUrl(null as unknown as string)).toBe(false);
      expect(isValidUrl(undefined as unknown as string)).toBe(false);
    });
  });
});

describe("type definitions", () => {
  it("EmailResult success type has messageId", () => {
    const successResult: EmailResult = {
      success: true,
      messageId: "msg_123",
    };

    expect(successResult.success).toBe(true);
    expect(successResult.messageId).toBe("msg_123");
  });

  it("EmailResult failure type has error", () => {
    const failureResult: EmailResult = {
      success: false,
      error: "Something went wrong",
    };

    expect(failureResult.success).toBe(false);
    expect(failureResult.error).toBe("Something went wrong");
  });

  it("SendEmailOptions requires to and subject", () => {
    const options: SendEmailOptions = {
      to: "user@example.com",
      subject: "Test",
      html: "<p>Content</p>",
    };

    expect(options.to).toBe("user@example.com");
    expect(options.subject).toBe("Test");
  });

  it("SendEmailOptions supports multiple recipients", () => {
    const options: SendEmailOptions = {
      to: ["user1@example.com", "user2@example.com"],
      subject: "Test",
      html: "<p>Content</p>",
    };

    expect(Array.isArray(options.to)).toBe(true);
    expect(options.to).toHaveLength(2);
  });

  it("MagicLinkEmailProps has required fields", () => {
    const props: MagicLinkEmailProps = {
      url: "https://example.com/verify",
      expiresAt: new Date(),
      userEmail: "user@example.com",
    };

    expect(props.url).toBeDefined();
    expect(props.expiresAt).toBeInstanceOf(Date);
    expect(props.userEmail).toBeDefined();
  });

  it("MagicLinkEmailProps has optional security fields", () => {
    const props: MagicLinkEmailProps = {
      url: "https://example.com/verify",
      expiresAt: new Date(),
      userEmail: "user@example.com",
      ipAddress: "192.168.1.1",
      userAgent: "Chrome",
    };

    expect(props.ipAddress).toBe("192.168.1.1");
    expect(props.userAgent).toBe("Chrome");
  });
});
