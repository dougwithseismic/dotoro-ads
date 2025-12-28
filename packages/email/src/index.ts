/**
 * @repo/email - Email infrastructure for the dotoro monorepo
 *
 * Provides email sending capabilities with Resend as the provider
 * and React Email for template rendering.
 *
 * @example
 * ```ts
 * // Send a magic link email
 * import { sendMagicLinkEmail } from '@repo/email';
 *
 * const result = await sendMagicLinkEmail({
 *   to: 'user@example.com',
 *   magicLinkUrl: 'https://app.dotoro.io/auth/verify?token=abc123',
 *   expiresAt: new Date(Date.now() + 15 * 60 * 1000),
 * });
 * ```
 *
 * @example
 * ```ts
 * // Send a custom email
 * import { sendEmail, createEmailClient } from '@repo/email';
 *
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to Dotoro</h1>',
 * });
 * ```
 */

// Client exports
export {
  createEmailClient,
  sendEmail,
  type EmailClient,
  type EmailClientOptions,
  type EmailResult,
  type SendEmailOptions,
} from "./client.js";

// Type exports
export {
  type EmailTemplate,
  type MagicLinkEmailProps,
  type SendMagicLinkOptions,
  isValidEmail,
  isValidUrl,
} from "./types.js";

// Send function exports
export { sendMagicLinkEmail } from "./send/magic-link.js";
export {
  sendTeamInvitationEmail,
  type SendTeamInvitationOptions,
  type TeamInvitationEmailProps,
} from "./send/team-invitation.js";
