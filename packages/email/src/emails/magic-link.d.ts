import type { MagicLinkEmailProps } from "../src/types.js";
/**
 * Magic Link Email Template
 *
 * Used for passwordless authentication. Includes:
 * - Clear call-to-action button with magic link URL
 * - Expiration notice
 * - Plain-text link fallback
 * - Security notice
 */
export declare function MagicLinkEmail({ url, expiresAt, userEmail, ipAddress, userAgent, }: MagicLinkEmailProps): import("react/jsx-runtime").JSX.Element;
export default MagicLinkEmail;
//# sourceMappingURL=magic-link.d.ts.map