import type { ReactElement } from "react";

/**
 * Supported email template names
 */
export type EmailTemplate = "magic-link" | "welcome" | "password-reset";

/**
 * Props for the magic link email template
 */
export interface MagicLinkEmailProps {
  /** The magic link URL the user will click */
  url: string;
  /** When the magic link expires */
  expiresAt: Date;
  /** The email address of the user */
  userEmail: string;
  /** Optional IP address for security context */
  ipAddress?: string;
  /** Optional user agent for security context */
  userAgent?: string;
}

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject line */
  subject: string;
  /** Sender email address (defaults to EMAIL_FROM env var) */
  from?: string;
  /** Reply-to address */
  replyTo?: string;
  /** HTML content of the email */
  html?: string;
  /** Plain text content of the email */
  text?: string;
  /** React Email component to render */
  react?: ReactElement;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Tags for email tracking */
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Result of sending an email - success case
 */
export interface EmailResultSuccess {
  success: true;
  messageId: string;
}

/**
 * Result of sending an email - failure case
 */
export interface EmailResultFailure {
  success: false;
  error: string;
}

/**
 * Result of sending an email
 */
export type EmailResult = EmailResultSuccess | EmailResultFailure;

/**
 * Options for creating an email client
 */
export interface EmailClientOptions {
  /** Resend API key (overrides RESEND_API_KEY env var) */
  apiKey?: string;
  /** Force creation of a new client instance */
  forceNew?: boolean;
}

/**
 * Email client interface
 */
export interface EmailClient {
  /** Send an email */
  send: (options: SendEmailOptions) => Promise<EmailResult>;
  /** Whether this is a console fallback client (development only) */
  isConsoleFallback?: boolean;
}

/**
 * Options for magic link email sending
 */
export interface SendMagicLinkOptions {
  /** Recipient email address */
  to: string;
  /** The magic link URL */
  magicLinkUrl: string;
  /** When the magic link expires */
  expiresAt: Date;
  /** Optional IP address for security context */
  ipAddress?: string;
  /** Optional user agent for security context */
  userAgent?: string;
}

/**
 * Validates an email address format
 * @param email - Email address to validate
 * @returns true if the email format is valid
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== "string" || !email) {
    return false;
  }

  // RFC 5322 simplified email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Options for URL validation
 */
export interface UrlValidationOptions {
  /** Whether to require HTTPS (default: true) */
  requireHttps?: boolean;
}

/**
 * Validates a URL
 * @param url - URL to validate
 * @param options - Validation options
 * @returns true if the URL is valid
 */
export function isValidUrl(
  url: unknown,
  options: UrlValidationOptions = {}
): boolean {
  const { requireHttps = true } = options;

  if (typeof url !== "string" || !url) {
    return false;
  }

  try {
    const parsed = new URL(url);

    if (requireHttps) {
      return parsed.protocol === "https:";
    }

    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
