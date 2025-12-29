/**
 * Teams API Client
 * Provides functions for team management operations
 */

import type {
  Team,
  TeamDetail,
  TeamMember,
  Invitation,
  InvitationDetails,
  TeamListResponse,
  MemberListResponse,
  InvitationListResponse,
  InvitationActionResponse,
  ResendInvitationResponse,
  CreateTeamInput,
  UpdateTeamInput,
  SendInvitationInput,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Base fetch wrapper with credentials
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================================================
// Teams
// ============================================================================

/**
 * Get all teams the current user belongs to
 */
export async function getTeams(): Promise<TeamListResponse> {
  return fetchWithAuth<TeamListResponse>("/api/teams");
}

/**
 * Get a specific team by ID
 */
export async function getTeam(teamId: string): Promise<TeamDetail> {
  return fetchWithAuth<TeamDetail>(`/api/teams/${teamId}`);
}

/**
 * Create a new team
 */
export async function createTeam(input: CreateTeamInput): Promise<TeamDetail> {
  return fetchWithAuth<TeamDetail>("/api/teams", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: string,
  input: UpdateTeamInput
): Promise<TeamDetail> {
  return fetchWithAuth<TeamDetail>(`/api/teams/${teamId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  await fetchWithAuth<void>(`/api/teams/${teamId}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Team Members
// ============================================================================

/**
 * Get all members of a team
 */
export async function getTeamMembers(teamId: string): Promise<MemberListResponse> {
  return fetchWithAuth<MemberListResponse>(`/api/teams/${teamId}/members`);
}

/**
 * Update a team member's role
 */
export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: string
): Promise<TeamMember> {
  return fetchWithAuth<TeamMember>(`/api/teams/${teamId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

/**
 * Remove a member from a team
 */
export async function removeMember(teamId: string, userId: string): Promise<void> {
  await fetchWithAuth<void>(`/api/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
  });
}

/**
 * Leave a team (remove self from team membership)
 * The current user removes themselves from the team.
 */
export async function leaveTeam(teamId: string): Promise<void> {
  await fetchWithAuth<void>(`/api/teams/${teamId}/members/me`, {
    method: "DELETE",
  });
}

// ============================================================================
// Invitations
// ============================================================================

/**
 * Get pending invitations for a team
 */
export async function getTeamInvitations(
  teamId: string
): Promise<InvitationListResponse> {
  return fetchWithAuth<InvitationListResponse>(`/api/teams/${teamId}/invitations`);
}

/**
 * Send an invitation to join a team
 */
export async function sendInvitation(
  teamId: string,
  input: SendInvitationInput
): Promise<Invitation> {
  return fetchWithAuth<Invitation>(`/api/teams/${teamId}/invitations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Revoke a pending invitation
 */
export async function revokeInvitation(
  teamId: string,
  invitationId: string
): Promise<void> {
  await fetchWithAuth<void>(`/api/teams/${teamId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

/**
 * Resend invitation email
 * Re-sends the invitation email for a pending invitation.
 * Requires admin or owner role.
 */
export async function resendInvitation(
  teamId: string,
  invitationId: string
): Promise<ResendInvitationResponse> {
  return fetchWithAuth<ResendInvitationResponse>(
    `/api/teams/${teamId}/invitations/${invitationId}/resend`,
    { method: "POST" }
  );
}

/**
 * Get public invitation details (no auth required)
 */
export async function getInvitationDetails(
  token: string
): Promise<InvitationDetails> {
  const response = await fetch(`${API_BASE}/api/invitations/${token}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Invitation not found or expired");
  }

  return response.json();
}

/**
 * Accept an invitation (requires auth)
 */
export async function acceptInvitation(
  token: string
): Promise<InvitationActionResponse> {
  return fetchWithAuth<InvitationActionResponse>(
    `/api/invitations/${token}/accept`,
    { method: "POST" }
  );
}

/**
 * Decline an invitation
 */
export async function declineInvitation(
  token: string
): Promise<InvitationActionResponse> {
  const response = await fetch(`${API_BASE}/api/invitations/${token}/decline`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Failed to decline invitation");
  }

  return response.json();
}
