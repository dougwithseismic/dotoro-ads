import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, and, isNull, gt } from "drizzle-orm";
import * as crypto from "crypto";
import {
  sendInvitationSchema,
  invitationSchema,
  invitationListResponseSchema,
  invitationDetailsSchema,
  invitationActionResponseSchema,
  teamIdParamSchema,
  invitationIdParamSchema,
  invitationTokenParamSchema,
} from "../schemas/teams.js";
import { errorResponseSchema } from "../schemas/common.js";
import { commonResponses } from "../lib/openapi.js";
import { ApiException, ErrorCode } from "../lib/errors.js";
import { validateSession } from "../middleware/auth.js";
import {
  db,
  teams,
  teamMemberships,
  teamInvitations,
  user,
} from "../services/db.js";
import { sendTeamInvitationEmail } from "@repo/email";

// ============================================================================
// Constants
// ============================================================================

const INVITATION_EXPIRY_DAYS = 7;
const TOKEN_LENGTH = 64;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get authenticated user from request headers
 */
async function getAuthenticatedUser(headers: Headers) {
  return validateSession(headers);
}

/**
 * Get user's membership in a team
 */
async function getUserTeamMembership(userId: string, teamId: string) {
  const result = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      role: teamMemberships.role,
    })
    .from(teams)
    .innerJoin(teamMemberships, eq(teamMemberships.teamId, teams.id))
    .where(and(eq(teams.id, teamId), eq(teamMemberships.userId, userId)))
    .limit(1);

  return result[0] || null;
}

/**
 * Check if user has admin or owner role
 */
function canManageTeam(role: string): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH / 2).toString("hex");
}

// ============================================================================
// Create the OpenAPI Hono app
// ============================================================================

export const invitationsApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

const sendInvitationRoute = createRoute({
  method: "post",
  path: "/api/teams/{id}/invitations",
  tags: ["Teams"],
  summary: "Send team invitation",
  description: "Send an invitation email to join the team. Requires admin or owner role.",
  request: {
    params: teamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: sendInvitationSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Invitation sent",
      content: {
        "application/json": {
          schema: invitationSchema,
        },
      },
    },
    400: {
      description: "Invalid request or user already a member",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden - requires admin or owner role",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Team not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const listInvitationsRoute = createRoute({
  method: "get",
  path: "/api/teams/{id}/invitations",
  tags: ["Teams"],
  summary: "List pending invitations",
  description: "Get all pending invitations for a team. Requires admin or owner role.",
  request: {
    params: teamIdParamSchema,
  },
  responses: {
    200: {
      description: "List of pending invitations",
      content: {
        "application/json": {
          schema: invitationListResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden - requires admin or owner role",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Team not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const revokeInvitationRoute = createRoute({
  method: "delete",
  path: "/api/teams/{id}/invitations/{invitationId}",
  tags: ["Teams"],
  summary: "Revoke invitation",
  description: "Revoke a pending invitation. Requires admin or owner role.",
  request: {
    params: invitationIdParamSchema,
  },
  responses: {
    204: {
      description: "Invitation revoked",
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden - requires admin or owner role",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Team or invitation not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getInvitationDetailsRoute = createRoute({
  method: "get",
  path: "/api/invitations/{token}",
  tags: ["Teams"],
  summary: "Get invitation details",
  description: "Get public details about an invitation. Does not require authentication.",
  request: {
    params: invitationTokenParamSchema,
  },
  responses: {
    200: {
      description: "Invitation details",
      content: {
        "application/json": {
          schema: invitationDetailsSchema,
        },
      },
    },
    404: {
      description: "Invitation not found or expired",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const acceptInvitationRoute = createRoute({
  method: "post",
  path: "/api/invitations/{token}/accept",
  tags: ["Teams"],
  summary: "Accept invitation",
  description: "Accept a team invitation. Requires authentication.",
  request: {
    params: invitationTokenParamSchema,
  },
  responses: {
    200: {
      description: "Invitation accepted",
      content: {
        "application/json": {
          schema: invitationActionResponseSchema,
        },
      },
    },
    400: {
      description: "Already a team member",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Invitation not found or expired",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const declineInvitationRoute = createRoute({
  method: "post",
  path: "/api/invitations/{token}/decline",
  tags: ["Teams"],
  summary: "Decline invitation",
  description: "Decline a team invitation. Does not require authentication.",
  request: {
    params: invitationTokenParamSchema,
  },
  responses: {
    200: {
      description: "Invitation declined",
      content: {
        "application/json": {
          schema: invitationActionResponseSchema,
        },
      },
    },
    404: {
      description: "Invitation not found or expired",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

invitationsApp.openapi(sendInvitationRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { id: teamId } = c.req.valid("param");
  const { email, role, message } = c.req.valid("json");

  // Check user's team membership
  const teamWithMembership = await getUserTeamMembership(auth.user.id, teamId);

  if (!teamWithMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Team not found");
  }

  if (!canManageTeam(teamWithMembership.role)) {
    throw new ApiException(403, ErrorCode.FORBIDDEN, "Admin or owner role required");
  }

  // Check if user is already a member
  const existingMember = await db
    .select({ id: teamMemberships.id })
    .from(teamMemberships)
    .innerJoin(user, eq(user.id, teamMemberships.userId))
    .where(and(eq(teamMemberships.teamId, teamId), eq(user.email, email)))
    .limit(1);

  if (existingMember.length > 0) {
    throw new ApiException(400, ErrorCode.VALIDATION_ERROR, "User is already a team member");
  }

  // Check for existing pending invitation
  const existingInvitation = await db
    .select({ id: teamInvitations.id })
    .from(teamInvitations)
    .where(
      and(
        eq(teamInvitations.teamId, teamId),
        eq(teamInvitations.email, email),
        isNull(teamInvitations.acceptedAt),
        gt(teamInvitations.expiresAt, new Date())
      )
    )
    .limit(1);

  if (existingInvitation.length > 0) {
    throw new ApiException(400, ErrorCode.VALIDATION_ERROR, "A pending invitation already exists for this email");
  }

  // Create invitation
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(teamInvitations)
    .values({
      teamId,
      email,
      role,
      token,
      invitedBy: auth.user.id,
      expiresAt,
    })
    .returning();

  // Send invitation email
  // Note: We don't fail the request if email sending fails - the invitation is still created
  // and the admin can share the link manually using the returned inviteLink
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const emailResult = await sendTeamInvitationEmail({
    to: email,
    teamName: teamWithMembership.name,
    inviterEmail: auth.user.email,
    inviterName: auth.user.name || undefined,
    role: role as "admin" | "editor" | "viewer",
    inviteToken: token,
    expiresAt,
  });

  if (!emailResult.success) {
    console.error("Failed to send invitation email:", {
      error: emailResult.error,
      recipientEmail: email,
      teamId,
      teamName: teamWithMembership.name,
      inviterId: auth.user.id,
      inviterEmail: auth.user.email,
    });
  }

  // Return email status so frontend can inform admin if email failed
  // Include invite link when email fails so admin can share manually
  return c.json(
    {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      inviterEmail: auth.user.email,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      emailSent: emailResult.success,
      emailError: emailResult.success ? undefined : emailResult.error,
      // Provide invite link when email fails so admin can share manually
      inviteLink: emailResult.success ? undefined : `${appUrl}/invite/${token}`,
    },
    201
  );
});

invitationsApp.openapi(listInvitationsRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { id: teamId } = c.req.valid("param");

  // Check user's team membership
  const teamWithMembership = await getUserTeamMembership(auth.user.id, teamId);

  if (!teamWithMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Team not found");
  }

  if (!canManageTeam(teamWithMembership.role)) {
    throw new ApiException(403, ErrorCode.FORBIDDEN, "Admin or owner role required to view invitations");
  }

  // Get pending invitations
  const pendingInvitations = await db
    .select({
      id: teamInvitations.id,
      email: teamInvitations.email,
      role: teamInvitations.role,
      invitedBy: teamInvitations.invitedBy,
      expiresAt: teamInvitations.expiresAt,
      createdAt: teamInvitations.createdAt,
      inviterEmail: user.email,
    })
    .from(teamInvitations)
    .innerJoin(user, eq(user.id, teamInvitations.invitedBy))
    .where(
      and(
        eq(teamInvitations.teamId, teamId),
        isNull(teamInvitations.acceptedAt),
        gt(teamInvitations.expiresAt, new Date())
      )
    );

  const data = pendingInvitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    inviterEmail: inv.inviterEmail,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));

  return c.json({ data, total: data.length }, 200);
});

invitationsApp.openapi(revokeInvitationRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { id: teamId, invitationId } = c.req.valid("param");

  // Check user's team membership
  const teamWithMembership = await getUserTeamMembership(auth.user.id, teamId);

  if (!teamWithMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Team not found");
  }

  if (!canManageTeam(teamWithMembership.role)) {
    throw new ApiException(403, ErrorCode.FORBIDDEN, "Admin or owner role required");
  }

  // Find and delete the invitation
  const [deleted] = await db
    .delete(teamInvitations)
    .where(and(eq(teamInvitations.id, invitationId), eq(teamInvitations.teamId, teamId)))
    .returning();

  if (!deleted) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Invitation not found");
  }

  return c.body(null, 204);
});

invitationsApp.openapi(getInvitationDetailsRoute, async (c) => {
  const { token } = c.req.valid("param");

  // Find the invitation
  const result = await db
    .select({
      id: teamInvitations.id,
      email: teamInvitations.email,
      role: teamInvitations.role,
      expiresAt: teamInvitations.expiresAt,
      acceptedAt: teamInvitations.acceptedAt,
      teamName: teams.name,
      teamSlug: teams.slug,
      inviterEmail: user.email,
    })
    .from(teamInvitations)
    .innerJoin(teams, eq(teams.id, teamInvitations.teamId))
    .innerJoin(user, eq(user.id, teamInvitations.invitedBy))
    .where(eq(teamInvitations.token, token))
    .limit(1);

  const invitation = result[0];

  if (!invitation) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Invitation not found");
  }

  if (invitation.acceptedAt) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Invitation has already been accepted");
  }

  if (invitation.expiresAt < new Date()) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Invitation has expired");
  }

  return c.json(
    {
      teamName: invitation.teamName,
      teamSlug: invitation.teamSlug,
      inviterEmail: invitation.inviterEmail,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    },
    200
  );
});

invitationsApp.openapi(acceptInvitationRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { token } = c.req.valid("param");

  // Find the invitation
  const result = await db
    .select({
      id: teamInvitations.id,
      teamId: teamInvitations.teamId,
      email: teamInvitations.email,
      role: teamInvitations.role,
      expiresAt: teamInvitations.expiresAt,
      acceptedAt: teamInvitations.acceptedAt,
      invitedBy: teamInvitations.invitedBy,
      teamSlug: teams.slug,
    })
    .from(teamInvitations)
    .innerJoin(teams, eq(teams.id, teamInvitations.teamId))
    .where(eq(teamInvitations.token, token))
    .limit(1);

  const invitation = result[0];

  if (!invitation) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Invitation not found");
  }

  if (invitation.acceptedAt) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Invitation has already been accepted");
  }

  if (invitation.expiresAt < new Date()) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Invitation has expired");
  }

  // Check if user is already a member
  const existingMembership = await db
    .select({ id: teamMemberships.id })
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, invitation.teamId), eq(teamMemberships.userId, auth.user.id)))
    .limit(1);

  if (existingMembership.length > 0) {
    throw new ApiException(400, ErrorCode.VALIDATION_ERROR, "You are already a member of this team");
  }

  // Create team membership
  await db.insert(teamMemberships).values({
    teamId: invitation.teamId,
    userId: auth.user.id,
    role: invitation.role,
    invitedBy: invitation.invitedBy,
    invitedAt: new Date(),
    acceptedAt: new Date(),
  });

  // Mark invitation as accepted
  await db
    .update(teamInvitations)
    .set({ acceptedAt: new Date() })
    .where(eq(teamInvitations.id, invitation.id));

  return c.json(
    {
      success: true as const,
      teamId: invitation.teamId,
      teamSlug: invitation.teamSlug,
    },
    200
  );
});

invitationsApp.openapi(declineInvitationRoute, async (c) => {
  const { token } = c.req.valid("param");

  // Find the invitation
  const result = await db
    .select({
      id: teamInvitations.id,
      expiresAt: teamInvitations.expiresAt,
      acceptedAt: teamInvitations.acceptedAt,
    })
    .from(teamInvitations)
    .where(eq(teamInvitations.token, token))
    .limit(1);

  const invitation = result[0];

  if (!invitation) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Invitation not found");
  }

  if (invitation.acceptedAt) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Invitation has already been accepted");
  }

  if (invitation.expiresAt < new Date()) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Invitation has expired");
  }

  // Delete the invitation
  await db.delete(teamInvitations).where(eq(teamInvitations.id, invitation.id));

  return c.json({ success: true as const }, 200);
});

// Error handler for API exceptions
invitationsApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  console.error("Invitations route error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default invitationsApp;
