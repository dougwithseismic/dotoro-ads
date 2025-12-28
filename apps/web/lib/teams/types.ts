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
  settings: Record<string, unknown> | null;
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
 * Pending invitation object
 */
export interface Invitation {
  id: string;
  email: string;
  role: TeamRole;
  inviterEmail: string;
  expiresAt: string;
  createdAt: string;
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
  settings?: Record<string, unknown>;
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
