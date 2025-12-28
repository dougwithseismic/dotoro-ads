/**
 * User Agent Parsing Utility Tests
 *
 * Tests for parsing user agent strings to extract browser, OS,
 * and device type information for session management display.
 */
import { describe, it, expect } from "vitest";
import {
  parseUserAgent,
  maskIpAddress,
  type UserAgentInfo,
  type DeviceType,
} from "../user-agent";

describe("parseUserAgent", () => {
  describe("browser detection", () => {
    it("detects Chrome browser", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const result = parseUserAgent(ua);

      expect(result.browser).toBe("Chrome");
      expect(result.browserVersion).toBe("120");
    });

    it("detects Firefox browser", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
      const result = parseUserAgent(ua);

      expect(result.browser).toBe("Firefox");
      expect(result.browserVersion).toBe("121");
    });

    it("detects Safari browser", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
      const result = parseUserAgent(ua);

      expect(result.browser).toBe("Safari");
      expect(result.browserVersion).toBe("17");
    });

    it("detects Edge browser", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      const result = parseUserAgent(ua);

      expect(result.browser).toBe("Edge");
      expect(result.browserVersion).toBe("120");
    });

    it("detects Opera browser", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0";
      const result = parseUserAgent(ua);

      expect(result.browser).toBe("Opera");
      expect(result.browserVersion).toBe("106");
    });

    it("returns Unknown for unrecognized browser", () => {
      const ua = "SomeRandomBot/1.0";
      const result = parseUserAgent(ua);

      expect(result.browser).toBe("Unknown");
    });
  });

  describe("OS detection", () => {
    it("detects Windows OS", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const result = parseUserAgent(ua);

      expect(result.os).toBe("Windows");
      expect(result.osVersion).toBe("10");
    });

    it("detects macOS", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
      const result = parseUserAgent(ua);

      expect(result.os).toBe("macOS");
      expect(result.osVersion).toBe("10.15.7");
    });

    it("detects Linux OS", () => {
      const ua =
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const result = parseUserAgent(ua);

      expect(result.os).toBe("Linux");
    });

    it("detects iOS", () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      const result = parseUserAgent(ua);

      expect(result.os).toBe("iOS");
      expect(result.osVersion).toBe("17.2");
    });

    it("detects Android OS", () => {
      const ua =
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
      const result = parseUserAgent(ua);

      expect(result.os).toBe("Android");
      expect(result.osVersion).toBe("14");
    });

    it("returns Unknown for unrecognized OS", () => {
      const ua = "SomeRandomBot/1.0";
      const result = parseUserAgent(ua);

      expect(result.os).toBe("Unknown");
    });
  });

  describe("device type detection", () => {
    it("detects mobile device from iPhone user agent", () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      const result = parseUserAgent(ua);

      expect(result.deviceType).toBe("mobile");
    });

    it("detects mobile device from Android mobile user agent", () => {
      const ua =
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
      const result = parseUserAgent(ua);

      expect(result.deviceType).toBe("mobile");
    });

    it("detects tablet device from iPad user agent", () => {
      const ua =
        "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      const result = parseUserAgent(ua);

      expect(result.deviceType).toBe("tablet");
    });

    it("detects tablet device from Android tablet user agent", () => {
      const ua =
        "Mozilla/5.0 (Linux; Android 14; SM-T970) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const result = parseUserAgent(ua);

      expect(result.deviceType).toBe("tablet");
    });

    it("detects desktop device from Windows user agent", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const result = parseUserAgent(ua);

      expect(result.deviceType).toBe("desktop");
    });

    it("detects desktop device from macOS user agent", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
      const result = parseUserAgent(ua);

      expect(result.deviceType).toBe("desktop");
    });

    it("defaults to desktop for unknown device type", () => {
      const ua = "SomeRandomBot/1.0";
      const result = parseUserAgent(ua);

      expect(result.deviceType).toBe("desktop");
    });
  });

  describe("display string generation", () => {
    it("generates human-readable display string", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const result = parseUserAgent(ua);

      expect(result.displayString).toBe("Chrome on Windows");
    });

    it("generates display string for mobile Safari on iOS", () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      const result = parseUserAgent(ua);

      expect(result.displayString).toBe("Safari on iOS");
    });

    it("handles unknown browser and OS gracefully", () => {
      const ua = "SomeRandomBot/1.0";
      const result = parseUserAgent(ua);

      expect(result.displayString).toBe("Unknown on Unknown");
    });
  });

  describe("edge cases", () => {
    it("handles null user agent", () => {
      const result = parseUserAgent(null);

      expect(result.browser).toBe("Unknown");
      expect(result.os).toBe("Unknown");
      expect(result.deviceType).toBe("desktop");
      expect(result.displayString).toBe("Unknown on Unknown");
    });

    it("handles undefined user agent", () => {
      const result = parseUserAgent(undefined);

      expect(result.browser).toBe("Unknown");
      expect(result.os).toBe("Unknown");
      expect(result.deviceType).toBe("desktop");
    });

    it("handles empty string user agent", () => {
      const result = parseUserAgent("");

      expect(result.browser).toBe("Unknown");
      expect(result.os).toBe("Unknown");
      expect(result.deviceType).toBe("desktop");
    });
  });
});

describe("maskIpAddress", () => {
  describe("IPv4 addresses", () => {
    it("masks the last two octets of a valid IPv4 address", () => {
      const result = maskIpAddress("192.168.1.100");
      expect(result).toBe("192.168.*.*");
    });

    it("masks another valid IPv4 address", () => {
      const result = maskIpAddress("10.0.0.1");
      expect(result).toBe("10.0.*.*");
    });

    it("masks public IPv4 address", () => {
      const result = maskIpAddress("203.45.167.89");
      expect(result).toBe("203.45.*.*");
    });
  });

  describe("IPv6 addresses", () => {
    it("masks an IPv6 address showing first 4 groups", () => {
      const result = maskIpAddress("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
      expect(result).toBe("2001:0db8:85a3:0000:****");
    });

    it("masks a shortened IPv6 address", () => {
      const result = maskIpAddress("fe80:0:0:0:1:2:3:4");
      expect(result).toBe("fe80:0:0:0:****");
    });

    it("masks localhost IPv6 address", () => {
      const result = maskIpAddress("::1");
      // Short IPv6 that doesn't have 4 parts returns as-is
      expect(result).toBe("::1");
    });
  });

  describe("null and undefined handling", () => {
    it("returns Unknown for null input", () => {
      const result = maskIpAddress(null);
      expect(result).toBe("Unknown");
    });

    it("returns Unknown for undefined input", () => {
      const result = maskIpAddress(undefined);
      expect(result).toBe("Unknown");
    });
  });

  describe("empty and malformed inputs", () => {
    it("returns Unknown for empty string", () => {
      const result = maskIpAddress("");
      expect(result).toBe("Unknown");
    });

    it("returns malformed IPv4 as-is when not 4 octets", () => {
      const result = maskIpAddress("192.168.1");
      // Only 3 parts, not a valid IPv4, returned as-is
      expect(result).toBe("192.168.1");
    });

    it("returns malformed IPv4 with too many octets as-is", () => {
      const result = maskIpAddress("192.168.1.100.50");
      // 5 parts, not a valid IPv4, returned as-is
      expect(result).toBe("192.168.1.100.50");
    });

    it("returns single octet as-is", () => {
      const result = maskIpAddress("192");
      expect(result).toBe("192");
    });

    it("returns non-IP string as-is", () => {
      const result = maskIpAddress("not-an-ip");
      expect(result).toBe("not-an-ip");
    });

    it("returns random text as-is", () => {
      const result = maskIpAddress("hello world");
      expect(result).toBe("hello world");
    });
  });
});
