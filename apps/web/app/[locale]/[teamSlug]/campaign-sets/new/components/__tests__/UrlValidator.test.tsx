import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UrlValidator, validateUrl, validateDisplayUrl } from "../UrlValidator";

describe("UrlValidator", () => {
  describe("validateUrl function (for finalUrl)", () => {
    it("returns valid for HTTPS URLs", () => {
      const result = validateUrl("https://example.com");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error for HTTP URLs (not HTTPS)", () => {
      const result = validateUrl("http://example.com");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("URL must use HTTPS protocol");
    });

    it("returns error for URLs without protocol", () => {
      const result = validateUrl("example.com");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("URL must use HTTPS protocol");
    });

    it("returns error for invalid URL format", () => {
      const result = validateUrl("not a url");
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes("invalid"))).toBe(true);
    });

    it("returns valid for empty string (optional field)", () => {
      const result = validateUrl("");
      expect(result.valid).toBe(true);
    });

    it("returns valid for variable patterns like {url}", () => {
      const result = validateUrl("{final_url}");
      expect(result.valid).toBe(true);
    });

    it("returns valid for URL with variable: https://example.com/{path}", () => {
      const result = validateUrl("https://example.com/{path}");
      expect(result.valid).toBe(true);
    });

    it("validates HTTPS URLs with paths and query strings", () => {
      const result = validateUrl("https://example.com/path/to/page?query=value&foo=bar");
      expect(result.valid).toBe(true);
    });

    it("validates HTTPS URLs with ports", () => {
      const result = validateUrl("https://example.com:8080/path");
      expect(result.valid).toBe(true);
    });

    it("validates HTTPS URLs with subdomains", () => {
      const result = validateUrl("https://shop.example.com/products");
      expect(result.valid).toBe(true);
    });
  });

  describe("validateDisplayUrl function", () => {
    it("returns valid for short display URLs", () => {
      const result = validateDisplayUrl("example.com", 25);
      expect(result.valid).toBe(true);
    });

    it("returns error when exceeding character limit", () => {
      const result = validateDisplayUrl("verylongsubdomain.example.com/products", 25);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("character"))).toBe(true);
    });

    it("does not require HTTPS prefix for display URLs", () => {
      // Display URLs are shown without protocol
      const result = validateDisplayUrl("example.com/shop", 30);
      expect(result.valid).toBe(true);
    });

    it("returns valid for empty string (optional field)", () => {
      const result = validateDisplayUrl("", 25);
      expect(result.valid).toBe(true);
    });

    it("returns valid for variable patterns", () => {
      const result = validateDisplayUrl("{display_url}", 25);
      expect(result.valid).toBe(true);
    });

    it("validates against Reddit limit (25 chars)", () => {
      const url = "example.com/long-path"; // 21 chars
      const result = validateDisplayUrl(url, 25);
      expect(result.valid).toBe(true);
    });

    it("validates against Google limit (30 chars)", () => {
      const url = "example.com/products/category"; // 30 chars
      const result = validateDisplayUrl(url, 30);
      expect(result.valid).toBe(true);
    });
  });

  describe("UrlValidator component", () => {
    describe("finalUrl validation", () => {
      it("shows no error for valid HTTPS URL", () => {
        render(<UrlValidator value="https://example.com" type="finalUrl" />);

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });

      it("shows error message for HTTP URL", () => {
        render(<UrlValidator value="http://example.com" type="finalUrl" />);

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/https/i)).toBeInTheDocument();
      });

      it("shows error for invalid URL format", () => {
        render(<UrlValidator value="not-a-valid-url" type="finalUrl" />);

        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      it("shows no error for empty value", () => {
        render(<UrlValidator value="" type="finalUrl" />);

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });

      it("shows no error for variable pattern", () => {
        render(<UrlValidator value="{landing_page}" type="finalUrl" />);

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    describe("displayUrl validation", () => {
      it("shows no error for valid display URL within limit", () => {
        render(
          <UrlValidator value="example.com/shop" type="displayUrl" limit={25} />
        );

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });

      it("shows error when exceeding character limit", () => {
        render(
          <UrlValidator
            value="verylongsubdomain.example.com/products/category/subcategory"
            type="displayUrl"
            limit={25}
          />
        );

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/character/i)).toBeInTheDocument();
      });

      it("shows no error for empty value", () => {
        render(<UrlValidator value="" type="displayUrl" limit={25} />);

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    describe("Accessibility", () => {
      it("has aria-live for dynamic error announcements", () => {
        render(<UrlValidator value="http://example.com" type="finalUrl" />);

        const alert = screen.getByRole("alert");
        expect(alert).toHaveAttribute("aria-live", "polite");
      });

      it("uses proper role=alert for error messages", () => {
        render(<UrlValidator value="invalid" type="finalUrl" />);

        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });
});
