/**
 * User Agent Parsing Utility
 *
 * Parses user agent strings to extract browser, OS, and device type
 * information for display in session management UI.
 *
 * @example
 * ```ts
 * import { parseUserAgent } from "@/lib/user-agent";
 *
 * const info = parseUserAgent(session.userAgent);
 * // { browser: "Chrome", os: "Windows", deviceType: "desktop", displayString: "Chrome on Windows" }
 * ```
 */

/**
 * Device types for session display
 */
export type DeviceType = "desktop" | "mobile" | "tablet";

/**
 * Parsed user agent information
 */
export interface UserAgentInfo {
  /** Browser name (e.g., "Chrome", "Firefox", "Safari") */
  browser: string;
  /** Browser major version (e.g., "120") */
  browserVersion: string | null;
  /** Operating system name (e.g., "Windows", "macOS", "iOS") */
  os: string;
  /** OS version (e.g., "10", "10.15.7", "17.2") */
  osVersion: string | null;
  /** Device type for icon display */
  deviceType: DeviceType;
  /** Human-readable display string (e.g., "Chrome on Windows") */
  displayString: string;
}

/**
 * Browser detection patterns
 * Order matters - more specific browsers should be checked first
 */
const BROWSER_PATTERNS: Array<{
  pattern: RegExp;
  name: string;
  versionGroup: number;
}> = [
  // Edge must be before Chrome (Edge contains "Chrome" in UA)
  { pattern: /Edg(?:e)?\/(\d+)/, name: "Edge", versionGroup: 1 },
  // Opera must be before Chrome (Opera contains "Chrome" in UA)
  { pattern: /OPR\/(\d+)/, name: "Opera", versionGroup: 1 },
  { pattern: /Opera\/(\d+)/, name: "Opera", versionGroup: 1 },
  // Firefox
  { pattern: /Firefox\/(\d+)/, name: "Firefox", versionGroup: 1 },
  // Safari must be before Chrome for accurate Safari detection
  // But Safari on non-Apple devices may show Chrome first
  // Chrome
  { pattern: /Chrome\/(\d+)/, name: "Chrome", versionGroup: 1 },
  // Safari (check for Version/ which indicates actual Safari, not Chrome)
  { pattern: /Version\/(\d+).+Safari\//, name: "Safari", versionGroup: 1 },
  // Generic Safari fallback
  { pattern: /Safari\/(\d+)/, name: "Safari", versionGroup: 1 },
];

/**
 * OS detection patterns
 */
const OS_PATTERNS: Array<{
  pattern: RegExp;
  name: string;
  versionExtractor?: (match: RegExpMatchArray) => string | null;
}> = [
  // iOS must be before Mac OS X
  {
    pattern: /iPhone|iPad|iPod/,
    name: "iOS",
    versionExtractor: (match: RegExpMatchArray) => {
      const versionMatch = match.input?.match(/OS (\d+[_\.]\d+)/);
      return versionMatch ? versionMatch[1].replace(/_/g, ".") : null;
    },
  },
  // Android
  {
    pattern: /Android (\d+(?:\.\d+)?)/,
    name: "Android",
    versionExtractor: (match: RegExpMatchArray) => match[1] || null,
  },
  // macOS
  {
    pattern: /Mac OS X (\d+[_\.]\d+(?:[_\.]\d+)?)/,
    name: "macOS",
    versionExtractor: (match: RegExpMatchArray) =>
      match[1]?.replace(/_/g, ".") || null,
  },
  // Windows
  {
    pattern: /Windows NT (\d+(?:\.\d+)?)/,
    name: "Windows",
    versionExtractor: (match: RegExpMatchArray) => {
      const version = match[1];
      // Map NT versions to Windows versions
      const versionMap: Record<string, string> = {
        "10.0": "10",
        "6.3": "8.1",
        "6.2": "8",
        "6.1": "7",
        "6.0": "Vista",
        "5.1": "XP",
      };
      return versionMap[version] || version;
    },
  },
  // Linux (generic)
  { pattern: /Linux/, name: "Linux" },
  // Chrome OS
  { pattern: /CrOS/, name: "Chrome OS" },
];

/**
 * Device type detection patterns
 */
const MOBILE_PATTERNS = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i;
const TABLET_PATTERNS = /iPad|Android(?!.*Mobile)|Tablet/i;

/**
 * Parse a user agent string to extract browser, OS, and device info
 *
 * @param userAgent - The user agent string to parse (can be null/undefined)
 * @returns Parsed user agent information
 */
export function parseUserAgent(
  userAgent: string | null | undefined
): UserAgentInfo {
  const defaultResult: UserAgentInfo = {
    browser: "Unknown",
    browserVersion: null,
    os: "Unknown",
    osVersion: null,
    deviceType: "desktop",
    displayString: "Unknown on Unknown",
  };

  if (!userAgent) {
    return defaultResult;
  }

  // Detect browser
  let browser = "Unknown";
  let browserVersion: string | null = null;

  for (const { pattern, name, versionGroup } of BROWSER_PATTERNS) {
    const match = userAgent.match(pattern);
    if (match) {
      browser = name;
      browserVersion = match[versionGroup] || null;
      break;
    }
  }

  // Detect OS
  let os = "Unknown";
  let osVersion: string | null = null;

  for (const { pattern, name, versionExtractor } of OS_PATTERNS) {
    const match = userAgent.match(pattern);
    if (match) {
      os = name;
      if (versionExtractor) {
        osVersion = versionExtractor(match);
      }
      break;
    }
  }

  // Detect device type
  let deviceType: DeviceType = "desktop";

  if (MOBILE_PATTERNS.test(userAgent)) {
    deviceType = "mobile";
  } else if (TABLET_PATTERNS.test(userAgent)) {
    deviceType = "tablet";
  }

  // Generate display string
  const displayString = `${browser} on ${os}`;

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    displayString,
  };
}

/**
 * Mask an IP address for privacy (show first octets only)
 *
 * @param ipAddress - The IP address to mask
 * @returns Masked IP address (e.g., "192.168.xxx.xxx")
 */
export function maskIpAddress(ipAddress: string | null | undefined): string {
  if (!ipAddress) {
    return "Unknown";
  }

  // Handle IPv4
  if (ipAddress.includes(".")) {
    const parts = ipAddress.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
  }

  // Handle IPv6 (show first 4 groups)
  if (ipAddress.includes(":")) {
    const parts = ipAddress.split(":");
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(":")}:****`;
    }
  }

  return ipAddress;
}
