import { sendEmail, createEmailClient } from "../client.js";
import { isValidEmail, isValidUrl, type EmailResult } from "../types.js";
import { TeamInvitationEmail, type TeamInvitationEmailProps } from "../emails/team-invitation.js";

/**
 * Options for sending a team invitation email
 */
export interface SendTeamInvitationOptions {
  /** Recipient email address */
  to: string;
  /** Name of the team */
  teamName: string;
  /** Email of the person sending the invitation */
  inviterEmail: string;
  /** Optional name of the inviter */
  inviterName?: string;
  /** Role assigned to the invitee */
  role: "admin" | "editor" | "viewer";
  /** The invitation token (used to construct URL) */
  inviteToken: string;
  /** When the invitation expires */
  expiresAt: Date;
}

/**
 * Validates team invitation send options
 * @returns null if valid, error message if invalid
 */
function validateTeamInvitationOptions(options: SendTeamInvitationOptions): string | null {
  // Check for APP_URL environment variable
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return "APP_URL environment variable is required for team invitation emails";
  }

  // Construct and validate invite URL
  const inviteUrl = `${appUrl}/invite/${options.inviteToken}`;
  if (!isValidUrl(inviteUrl, { requireHttps: true })) {
    return "Invite URL must be HTTPS. Check your APP_URL environment variable.";
  }

  // Validate recipient email
  if (!isValidEmail(options.to)) {
    return `Invalid recipient email address: ${options.to}`;
  }

  // Validate inviter email
  if (!isValidEmail(options.inviterEmail)) {
    return `Invalid inviter email address: ${options.inviterEmail}`;
  }

  // Validate team name is not empty
  if (!options.teamName || options.teamName.trim() === "") {
    return "Team name is required";
  }

  // Validate invite token is not empty
  if (!options.inviteToken || options.inviteToken.trim() === "") {
    return "Invite token is required";
  }

  // Validate expiration is in the future
  if (options.expiresAt.getTime() <= Date.now()) {
    return "Expiration time must be in the future";
  }

  return null;
}

/**
 * Sends a team invitation email
 *
 * Constructs the invitation URL from APP_URL environment variable and the provided token.
 * Validates all inputs before sending.
 *
 * @param options - Team invitation email options
 * @returns EmailResult with success status and messageId or error
 *
 * @example
 * ```ts
 * const result = await sendTeamInvitationEmail({
 *   to: 'newmember@example.com',
 *   teamName: 'Acme Corp',
 *   inviterEmail: 'admin@acme.com',
 *   inviterName: 'John Doe',
 *   role: 'editor',
 *   inviteToken: 'abc123xyz',
 *   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
 * });
 *
 * if (result.success) {
 *   console.log('Invitation sent:', result.messageId);
 * } else {
 *   console.error('Failed to send:', result.error);
 * }
 * ```
 */
export async function sendTeamInvitationEmail(
  options: SendTeamInvitationOptions
): Promise<EmailResult> {
  // Log send attempt for debugging (development only)
  if (process.env.NODE_ENV !== "production") {
    console.log(`Sending team invitation email to: ${options.to}`);
  }

  // Validate options
  const validationError = validateTeamInvitationOptions(options);
  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  // Construct invite URL
  const appUrl = process.env.APP_URL!;
  const inviteUrl = `${appUrl}/invite/${options.inviteToken}`;

  // Prepare template props
  const templateProps: TeamInvitationEmailProps = {
    teamName: options.teamName,
    inviterEmail: options.inviterEmail,
    inviterName: options.inviterName,
    role: options.role,
    inviteUrl,
    expiresAt: options.expiresAt,
    recipientEmail: options.to,
  };

  // Get email client
  const client = createEmailClient();

  // Compose subject line
  const subject = `You're invited to join ${options.teamName} on Dotoro`;

  // Send email
  try {
    return await sendEmail(
      {
        to: options.to,
        subject,
        react: TeamInvitationEmail(templateProps),
      },
      client
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Team invitation email send failed:", {
      error: message,
      to: options.to,
      teamName: options.teamName,
      inviterEmail: options.inviterEmail,
      role: options.role,
      // Don't log token for security
      expiresAt: options.expiresAt.toISOString(),
    });
    return {
      success: false,
      error: message,
    };
  }
}

// Re-export types for convenience
export type { TeamInvitationEmailProps } from "../emails/team-invitation.js";
