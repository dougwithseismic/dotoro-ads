import { describe, it, expect } from "vitest";
import { OAUTH_PROVIDERS, isValidOAuthProvider, type OAuthProvider } from "../oauth.js";

describe("OAuth types", () => {
  describe("OAUTH_PROVIDERS", () => {
    it("includes google", () => {
      expect(OAUTH_PROVIDERS).toContain("google");
    });
  });

  describe("isValidOAuthProvider", () => {
    it("returns true for valid providers", () => {
      expect(isValidOAuthProvider("google")).toBe(true);
    });

    it("returns false for invalid providers", () => {
      expect(isValidOAuthProvider("googel")).toBe(false);
      expect(isValidOAuthProvider("microsoft")).toBe(false);
      expect(isValidOAuthProvider("")).toBe(false);
    });
  });

  describe("OAuthProvider type", () => {
    it("allows google as a value", () => {
      const provider: OAuthProvider = "google";
      expect(provider).toBe("google");
    });
  });
});
