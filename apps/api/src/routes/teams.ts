import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, and, count, sql } from "drizzle-orm";
import {
  createTeamSchema,
  updateTeamSchema,
  updateMemberRoleSchema,
  teamSchema,
  teamDetailSchema,
  teamListResponseSchema,
  memberListResponseSchema,
  teamMemberSchema,
  teamIdParamSchema,
  memberIdParamSchema,
} from "../schemas/teams.js";
import { errorResponseSchema } from "../schemas/common.js";
import { commonResponses } from "../lib/openapi.js";
import { ApiException, ErrorCode } from "../lib/errors.js";
import { validateSession } from "../middleware/auth.js";
import {
  db,
  teams,
  teamMemberships,
  user,
} from "../services/db.js";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate URL-friendly slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

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
      description: teams.description,
      avatarUrl: teams.avatarUrl,
      settings: teams.settings,
      billingEmail: teams.billingEmail,
      plan: teams.plan,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
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

// ============================================================================
// Create the OpenAPI Hono app
// ============================================================================

export const teamsApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

const listTeamsRoute = createRoute({
  method: "get",
  path: "/api/teams",
  tags: ["Teams"],
  summary: "List user teams",
  description: "Get all teams the authenticated user is a member of.",
  responses: {
    200: {
      description: "List of teams",
      content: {
        "application/json": {
          schema: teamListResponseSchema,
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
    ...commonResponses,
  },
});

const createTeamRoute = createRoute({
  method: "post",
  path: "/api/teams",
  tags: ["Teams"],
  summary: "Create team",
  description: "Create a new team. The authenticated user becomes the owner.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTeamSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Team created",
      content: {
        "application/json": {
          schema: teamDetailSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
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
    ...commonResponses,
  },
});

const getTeamRoute = createRoute({
  method: "get",
  path: "/api/teams/{id}",
  tags: ["Teams"],
  summary: "Get team details",
  description: "Get details of a specific team.",
  request: {
    params: teamIdParamSchema,
  },
  responses: {
    200: {
      description: "Team details",
      content: {
        "application/json": {
          schema: teamDetailSchema,
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
      description: "Forbidden - not a team member",
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

const updateTeamRoute = createRoute({
  method: "patch",
  path: "/api/teams/{id}",
  tags: ["Teams"],
  summary: "Update team",
  description: "Update team details. Requires admin or owner role.",
  request: {
    params: teamIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateTeamSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Team updated",
      content: {
        "application/json": {
          schema: teamDetailSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
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

const deleteTeamRoute = createRoute({
  method: "delete",
  path: "/api/teams/{id}",
  tags: ["Teams"],
  summary: "Delete team",
  description: "Delete a team. Requires owner role.",
  request: {
    params: teamIdParamSchema,
  },
  responses: {
    204: {
      description: "Team deleted",
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
      description: "Forbidden - requires owner role",
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

const listMembersRoute = createRoute({
  method: "get",
  path: "/api/teams/{id}/members",
  tags: ["Teams"],
  summary: "List team members",
  description: "Get all members of a team.",
  request: {
    params: teamIdParamSchema,
  },
  responses: {
    200: {
      description: "List of team members",
      content: {
        "application/json": {
          schema: memberListResponseSchema,
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
      description: "Forbidden - not a team member",
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

const updateMemberRoleRoute = createRoute({
  method: "patch",
  path: "/api/teams/{id}/members/{userId}",
  tags: ["Teams"],
  summary: "Update member role",
  description: "Update a team member's role. Requires admin or owner role.",
  request: {
    params: memberIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateMemberRoleSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Member role updated",
      content: {
        "application/json": {
          schema: teamMemberSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
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
      description: "Team or member not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const removeMemberRoute = createRoute({
  method: "delete",
  path: "/api/teams/{id}/members/{userId}",
  tags: ["Teams"],
  summary: "Remove team member",
  description:
    "Remove a member from the team. Requires admin/owner role, or the user can remove themselves.",
  request: {
    params: memberIdParamSchema,
  },
  responses: {
    204: {
      description: "Member removed",
    },
    400: {
      description: "Cannot remove last owner",
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
      description: "Forbidden",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: "Team or member not found",
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

teamsApp.openapi(listTeamsRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const userTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      description: teams.description,
      avatarUrl: teams.avatarUrl,
      plan: teams.plan,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      role: teamMemberships.role,
    })
    .from(teams)
    .innerJoin(teamMemberships, eq(teamMemberships.teamId, teams.id))
    .where(eq(teamMemberships.userId, auth.user.id));

  // Get member counts for each team
  const teamIds = userTeams.map((t) => t.id);
  const memberCounts = teamIds.length
    ? await db
        .select({
          teamId: teamMemberships.teamId,
          count: count(teamMemberships.id),
        })
        .from(teamMemberships)
        .where(sql`${teamMemberships.teamId} IN (${sql.join(teamIds.map((id) => sql`${id}`), sql`,`)})`)
        .groupBy(teamMemberships.teamId)
    : [];

  const countMap = new Map(memberCounts.map((c) => [c.teamId, c.count]));

  const data = userTeams.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    avatarUrl: t.avatarUrl,
    plan: t.plan,
    memberCount: countMap.get(t.id) || 0,
    role: t.role,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return c.json({ data }, 200);
});

teamsApp.openapi(createTeamRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { name, slug: providedSlug, description } = c.req.valid("json");
  const slug = providedSlug || generateSlug(name);

  // Check if slug is already taken
  const existing = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    throw new ApiException(400, ErrorCode.VALIDATION_ERROR, "Team slug is already taken");
  }

  // Create team
  const [newTeam] = await db
    .insert(teams)
    .values({
      name,
      slug,
      description: description || null,
    })
    .returning();

  if (!newTeam) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to create team");
  }

  // Add creator as owner
  await db.insert(teamMemberships).values({
    teamId: newTeam.id,
    userId: auth.user.id,
    role: "owner",
    acceptedAt: new Date(),
  });

  return c.json(
    {
      id: newTeam.id,
      name: newTeam.name,
      slug: newTeam.slug,
      description: newTeam.description,
      avatarUrl: newTeam.avatarUrl,
      settings: newTeam.settings,
      billingEmail: newTeam.billingEmail,
      plan: newTeam.plan,
      memberCount: 1,
      role: "owner" as const,
      createdAt: newTeam.createdAt.toISOString(),
      updatedAt: newTeam.updatedAt.toISOString(),
    },
    201
  );
});

teamsApp.openapi(getTeamRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { id } = c.req.valid("param");
  const teamWithMembership = await getUserTeamMembership(auth.user.id, id);

  if (!teamWithMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Team not found");
  }

  // Get member count
  const memberCountResult = await db
    .select({ count: count(teamMemberships.id) })
    .from(teamMemberships)
    .where(eq(teamMemberships.teamId, id));
  const memberCount = memberCountResult[0]?.count ?? 0;

  return c.json(
    {
      id: teamWithMembership.id,
      name: teamWithMembership.name,
      slug: teamWithMembership.slug,
      description: teamWithMembership.description,
      avatarUrl: teamWithMembership.avatarUrl,
      settings: teamWithMembership.settings,
      billingEmail: teamWithMembership.billingEmail,
      plan: teamWithMembership.plan,
      memberCount,
      role: teamWithMembership.role,
      createdAt: teamWithMembership.createdAt.toISOString(),
      updatedAt: teamWithMembership.updatedAt.toISOString(),
    },
    200
  );
});

teamsApp.openapi(updateTeamRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { id } = c.req.valid("param");
  const teamWithMembership = await getUserTeamMembership(auth.user.id, id);

  if (!teamWithMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Team not found");
  }

  if (!canManageTeam(teamWithMembership.role)) {
    throw new ApiException(403, ErrorCode.FORBIDDEN, "Admin or owner role required");
  }

  const updates = c.req.valid("json");

  const [updated] = await db
    .update(teams)
    .set(updates)
    .where(eq(teams.id, id))
    .returning();

  if (!updated) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to update team");
  }

  // Get member count
  const memberCountResult = await db
    .select({ count: count(teamMemberships.id) })
    .from(teamMemberships)
    .where(eq(teamMemberships.teamId, id));
  const memberCount = memberCountResult[0]?.count ?? 0;

  return c.json(
    {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      avatarUrl: updated.avatarUrl,
      settings: updated.settings,
      billingEmail: updated.billingEmail,
      plan: updated.plan,
      memberCount,
      role: teamWithMembership.role,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
    200
  );
});

teamsApp.openapi(deleteTeamRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { id } = c.req.valid("param");
  const teamWithMembership = await getUserTeamMembership(auth.user.id, id);

  if (!teamWithMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Team not found");
  }

  if (teamWithMembership.role !== "owner") {
    throw new ApiException(403, ErrorCode.FORBIDDEN, "Owner role required to delete team");
  }

  await db.delete(teams).where(eq(teams.id, id));

  return c.body(null, 204);
});

teamsApp.openapi(listMembersRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { id } = c.req.valid("param");
  const teamWithMembership = await getUserTeamMembership(auth.user.id, id);

  if (!teamWithMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Team not found");
  }

  const members = await db
    .select({
      id: teamMemberships.id,
      userId: teamMemberships.userId,
      email: user.email,
      role: teamMemberships.role,
      invitedAt: teamMemberships.invitedAt,
      acceptedAt: teamMemberships.acceptedAt,
      createdAt: teamMemberships.createdAt,
    })
    .from(teamMemberships)
    .innerJoin(user, eq(user.id, teamMemberships.userId))
    .where(eq(teamMemberships.teamId, id));

  const data = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    email: m.email,
    role: m.role,
    invitedAt: m.invitedAt?.toISOString() ?? null,
    acceptedAt: m.acceptedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  }));

  return c.json({ data, total: data.length }, 200);
});

teamsApp.openapi(updateMemberRoleRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { id: teamId, userId: targetUserId } = c.req.valid("param");
  const { role: newRole } = c.req.valid("json");

  const teamWithMembership = await getUserTeamMembership(auth.user.id, teamId);

  if (!teamWithMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Team not found");
  }

  if (!canManageTeam(teamWithMembership.role)) {
    throw new ApiException(403, ErrorCode.FORBIDDEN, "Admin or owner role required");
  }

  // Get target membership
  const [targetMembership] = await db
    .select()
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, targetUserId)))
    .limit(1);

  if (!targetMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Member not found");
  }

  // Only owner can change to/from owner role
  if (
    (targetMembership.role === "owner" || newRole === "owner") &&
    teamWithMembership.role !== "owner"
  ) {
    throw new ApiException(403, ErrorCode.FORBIDDEN, "Only owner can change owner roles");
  }

  // Don't allow removing last owner
  if (targetMembership.role === "owner" && newRole !== "owner") {
    const ownerCountResult = await db
      .select({ count: count(teamMemberships.id) })
      .from(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.role, "owner")));
    const ownerCount = ownerCountResult[0]?.count ?? 0;

    if (ownerCount <= 1) {
      throw new ApiException(400, ErrorCode.VALIDATION_ERROR, "Cannot remove last owner");
    }
  }

  const [updated] = await db
    .update(teamMemberships)
    .set({ role: newRole })
    .where(eq(teamMemberships.id, targetMembership.id))
    .returning();

  if (!updated) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to update member role");
  }

  // Get user email
  const [foundUser] = await db.select({ email: user.email }).from(user).where(eq(user.id, targetUserId));

  if (!foundUser) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "User not found");
  }

  return c.json(
    {
      id: updated.id,
      userId: updated.userId,
      email: foundUser.email,
      role: updated.role,
      invitedAt: updated.invitedAt?.toISOString() ?? null,
      acceptedAt: updated.acceptedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    },
    200
  );
});

teamsApp.openapi(removeMemberRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { id: teamId, userId: targetUserId } = c.req.valid("param");

  const teamWithMembership = await getUserTeamMembership(auth.user.id, teamId);

  if (!teamWithMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Team not found");
  }

  // User can remove themselves, or admin/owner can remove others
  const isSelf = auth.user.id === targetUserId;
  if (!isSelf && !canManageTeam(teamWithMembership.role)) {
    throw new ApiException(403, ErrorCode.FORBIDDEN, "Cannot remove other members without admin role");
  }

  // Get target membership
  const [targetMembership] = await db
    .select()
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, targetUserId)))
    .limit(1);

  if (!targetMembership) {
    throw new ApiException(404, ErrorCode.NOT_FOUND, "Member not found");
  }

  // Don't allow removing last owner
  if (targetMembership.role === "owner") {
    const ownerCountResult = await db
      .select({ count: count(teamMemberships.id) })
      .from(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.role, "owner")));
    const ownerCount = ownerCountResult[0]?.count ?? 0;

    if (ownerCount <= 1) {
      throw new ApiException(400, ErrorCode.VALIDATION_ERROR, "Cannot remove last owner");
    }
  }

  await db.delete(teamMemberships).where(eq(teamMemberships.id, targetMembership.id));

  return c.body(null, 204);
});

// Error handler for API exceptions
teamsApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  console.error("Teams route error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default teamsApp;
