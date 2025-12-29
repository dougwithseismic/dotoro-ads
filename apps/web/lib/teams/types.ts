/**
 * Team Types for Dotoro Web App
 */

/**
 * Team role enum
 */
export type TeamRole = "owner" | "admin" | "editor" | "viewer";

/**
 * Team plan enum
 */
export type TeamPlan = "free" | "pro" | "enterprise";

/**
 * Team settings notification preferences
 */
export interface TeamNotificationSettings {
  /** Whether to send daily/weekly email digest */
  emailDigest?: boolean;
  /** Slack webhook URL for notifications */
  slackWebhook?: string;
}

/**
 * Team settings feature flags
 */
export interface TeamFeatureSettings {
  /** Enable advanced analytics dashboard */
  advancedAnalytics?: boolean;
  /** Enable custom branding options */
  customBranding?: boolean;
}

/**
 * Typed team settings schema
 *
 * Replaces Record<string, unknown> with properly typed interface
 * to enable compile-time type checking and better IDE support.
 */
export interface TeamSettings {
  /** Default role for new team members (cannot be 'owner') */
  defaultMemberRole?: Exclude<TeamRole, "owner">;
  /** Team's timezone for scheduling and reporting */
  timezone?: string;
  /** Notification preferences */
  notifications?: TeamNotificationSettings;
  /** Feature flags */
  features?: TeamFeatureSettings;
}

/**
 * Team object returned from the API
 */
export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  plan: TeamPlan;
  memberCount: number;
  role: TeamRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * Team detail with settings
 */
export interface TeamDetail extends Team {
  settings: TeamSettings | null;
  billingEmail: string | null;
}

/**
 * Team member object
 */
export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  role: TeamRole;
  invitedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

/**
 * Email status discriminated union for invitations
 *
 * Uses discriminated union pattern to prevent invalid state combinations:
 * - If sent is true, no error or inviteLink fields exist
 * - If sent is false, error is optional and inviteLink is required
 */
export type InvitationEmailStatus =
  | { sent: true }
  | { sent: false; error?: string; inviteLink: string };

/**
 * Base invitation fields (always present)
 */
export interface InvitationBase {
  id: string;
  email: string;
  role: TeamRole;
  inviterEmail: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Pending invitation object
 *
 * The emailStatus field is only present on create/resend operations.
 * When listing invitations, emailStatus may be undefined.
 */
export interface Invitation extends InvitationBase {
  /** Email delivery status - only present on create/resend response */
  emailStatus?: InvitationEmailStatus;
  /**
   * @deprecated Use emailStatus?.sent instead. Kept for backward compatibility.
   * Whether the invitation email was sent successfully (only present on create/resend)
   */
  emailSent?: boolean;
  /**
   * @deprecated Use emailStatus?.error instead. Kept for backward compatibility.
   * Error message if email sending failed (only present when emailSent is false)
   */
  emailError?: string;
  /**
   * @deprecated Use emailStatus?.inviteLink instead. Kept for backward compatibility.
   * Manual invite link to share if email failed (only present when emailSent is false)
   */
  inviteLink?: string;
}

/**
 * Public invitation details (for accept/decline page)
 */
export interface InvitationDetails {
  teamName: string;
  teamSlug: string;
  inviterEmail: string;
  role: TeamRole;
  expiresAt: string;
}

/**
 * Team list response
 */
export interface TeamListResponse {
  data: Team[];
}

/**
 * Team members list response
 */
export interface MemberListResponse {
  data: TeamMember[];
  total: number;
}

/**
 * Invitations list response
 */
export interface InvitationListResponse {
  data: Invitation[];
  total: number;
}

/**
 * Invitation action response
 */
export interface InvitationActionResponse {
  success: true;
  teamId?: string;
  teamSlug?: string;
}

/**
 * Resend invitation response
 */
export interface ResendInvitationResponse {
  success: boolean;
  emailSent: boolean;
  emailError?: string;
  inviteLink?: string;
}

/**
 * Create team input
 */
export interface CreateTeamInput {
  name: string;
  slug?: string;
  description?: string;
}

/**
 * Update team input
 */
export interface UpdateTeamInput {
  name?: string;
  description?: string | null;
  avatarUrl?: string | null;
  settings?: Partial<TeamSettings>;
  billingEmail?: string | null;
}

/**
 * Send invitation input
 */
export interface SendInvitationInput {
  email: string;
  role: "admin" | "editor" | "viewer";
  message?: string;
}
