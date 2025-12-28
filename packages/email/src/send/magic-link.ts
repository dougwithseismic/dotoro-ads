import { sendEmail, createEmailClient } from "../client.js";
import { isValidEmail, isValidUrl, type EmailResult, type SendMagicLinkOptions, type MagicLinkEmailProps } from "../types.js";
import { MagicLinkEmail } from "../emails/magic-link.js";

// Re-export the props type for convenience
export type { MagicLinkEmailProps } from "../types.js";

/**
 * Validates magic link send options
 * @returns null if valid, error message if invalid
 */
function validateMagicLinkOptions(options: SendMagicLinkOptions): string | null {
  // Validate email
  if (!isValidEmail(options.to)) {
    return `Invalid email address: ${options.to}`;
  }

  // Validate URL is HTTPS
  if (!isValidUrl(options.magicLinkUrl, { requireHttps: true })) {
    return "Magic link URL must be a valid HTTPS URL";
  }

  // Validate expiration is in the future
  if (options.expiresAt.getTime() <= Date.now()) {
    return "Expiration time must be in the future";
  }

  return null;
}

/**
 * Sends a magic link authentication email
 *
 * @param options - Magic link email options
 * @returns EmailResult with success status and messageId or error
 *
 * @example
 * ```ts
 * const result = await sendMagicLinkEmail({
 *   to: 'user@example.com',
 *   magicLinkUrl: 'https://app.dotoro.io/auth/verify?token=abc123',
 *   expiresAt: new Date(Date.now() + 15 * 60 * 1000),
 * });
 *
 * if (result.success) {
 *   console.log('Magic link sent:', result.messageId);
 * } else {
 *   console.error('Failed to send:', result.error);
 * }
 * ```
 */
export async function sendMagicLinkEmail(
  options: SendMagicLinkOptions
): Promise<EmailResult> {
  // Log send attempt for debugging (development only)
  if (process.env.NODE_ENV !== "production") {
    console.log(`Sending magic link email to: ${options.to}`);
  }

  // Validate options
  const validationError = validateMagicLinkOptions(options);
  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  // Prepare template props
  const templateProps: MagicLinkEmailProps = {
    url: options.magicLinkUrl,
    expiresAt: options.expiresAt,
    userEmail: options.to,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  };

  // Get email client
  const client = createEmailClient();

  // Send email
  try {
    return await sendEmail(
      {
        to: options.to,
        subject: "Sign in to Dotoro",
        react: MagicLinkEmail(templateProps),
      },
      client
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
    };
  }
}
