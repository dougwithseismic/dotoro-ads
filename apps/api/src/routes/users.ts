import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { eq, and, count, sql, ne, asc } from "drizzle-orm";
import {
  updateUserSchema,
  userResponseSchema,
  deletionPreviewResponseSchema,
  deleteAccountSchema,
} from "../schemas/users.js";
import { errorResponseSchema } from "../schemas/common.js";
import { ApiException, ErrorCode } from "../lib/errors.js";
import { validateSession } from "../middleware/auth.js";
import { db, user, teams, teamMemberships } from "../services/db.js";

// ============================================================================
// Create the OpenAPI Hono app
// ============================================================================

export const usersApp = new OpenAPIHono();

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get authenticated user from request headers
 */
async function getAuthenticatedUser(headers: Headers) {
  return validateSession(headers);
}

// ============================================================================
// Route Definitions
// ============================================================================

const updateCurrentUserRoute = createRoute({
  method: "patch",
  path: "/api/users/me",
  tags: ["Users"],
  summary: "Update current user profile",
  description: "Update the authenticated user's profile information (display name).",
  request: {
    body: {
      content: {
        "application/json": {
          schema: updateUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "User profile updated successfully",
      content: {
        "application/json": {
          schema: userResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request - validation error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - authentication required",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const getDeletionPreviewRoute = createRoute({
  method: "get",
  path: "/api/users/me/deletion-preview",
  tags: ["Users"],
  summary: "Get account deletion preview",
  description:
    "Get a preview of what will happen when the user deletes their account. " +
    "Returns teams categorized into: teams that will be deleted (solo teams), " +
    "teams where ownership will be transferred, and teams the user will leave.",
  responses: {
    200: {
      description: "Deletion preview with team categorization",
      content: {
        "application/json": {
          schema: deletionPreviewResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - authentication required",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const deleteCurrentUserRoute = createRoute({
  method: "delete",
  path: "/api/users/me",
  tags: ["Users"],
  summary: "Delete current user account",
  description:
    "Permanently delete the authenticated user's account. " +
    "Requires email confirmation matching the user's email. " +
    "Solo teams will be deleted, shared team ownership will be transferred, " +
    "and the user will be removed from all teams they're a member of.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: deleteAccountSchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "Account deleted successfully",
    },
    400: {
      description: "Invalid request - email confirmation does not match",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - authentication required",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

usersApp.openapi(updateCurrentUserRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  // The name is already validated and trimmed by Zod schema
  const { name } = c.req.valid("json");

  // Update user in database
  const [updated] = await db
    .update(user)
    .set({ name })
    .where(eq(user.id, auth.user.id))
    .returning();

  if (!updated) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to update user");
  }

  return c.json(
    {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      emailVerified: updated.emailVerified,
      image: updated.image,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
    200
  );
});

// ============================================================================
// Deletion Preview Types
// ============================================================================

interface TeamToDelete {
  id: string;
  name: string;
  slug: string;
  memberCount: 1;
}

interface NewOwner {
  id: string;
  email: string;
  currentRole: "admin" | "editor" | "viewer";
}

interface TeamToTransfer {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  newOwner: NewOwner;
}

interface TeamToLeave {
  id: string;
  name: string;
  slug: string;
}

interface DeletionPreview {
  teamsToDelete: TeamToDelete[];
  teamsToTransfer: TeamToTransfer[];
  teamsToLeave: TeamToLeave[];
}

// ============================================================================
// Deletion Preview Helper
// ============================================================================

/**
 * Get the deletion preview for a user
 * Categorizes teams into: teamsToDelete, teamsToTransfer, teamsToLeave
 */
async function getDeletionPreview(userId: string): Promise<DeletionPreview> {
  // Step 1: Get all teams where user is a member with their role
  const userTeams = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      teamSlug: teams.slug,
      role: teamMemberships.role,
    })
    .from(teamMemberships)
    .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
    .where(eq(teamMemberships.userId, userId));

  if (userTeams.length === 0) {
    return {
      teamsToDelete: [],
      teamsToTransfer: [],
      teamsToLeave: [],
    };
  }

  // Step 2: Get member counts for each team
  const teamIds = userTeams.map((t) => t.teamId);
  const memberCounts = await db
    .select({
      teamId: teamMemberships.teamId,
      memberCount: count(teamMemberships.id),
    })
    .from(teamMemberships)
    .where(
      sql`${teamMemberships.teamId} IN (${sql.join(
        teamIds.map((id) => sql`${id}`),
        sql`,`
      )})`
    )
    .groupBy(teamMemberships.teamId);

  const countMap = new Map(memberCounts.map((c) => [c.teamId, c.memberCount]));

  // Step 3: Categorize teams
  const teamsToDelete: TeamToDelete[] = [];
  const teamsToTransfer: TeamToTransfer[] = [];
  const teamsToLeave: TeamToLeave[] = [];

  for (const team of userTeams) {
    const memberCount = countMap.get(team.teamId) || 0;

    // If user is owner and solo member, team will be deleted
    if (memberCount === 1 && team.role === "owner") {
      teamsToDelete.push({
        id: team.teamId,
        name: team.teamName,
        slug: team.teamSlug,
        memberCount: 1,
      });
    }
    // If user is owner with other members, ownership will be transferred
    else if (team.role === "owner" && memberCount > 1) {
      // Find the best candidate for new owner
      // Priority: admin > editor > viewer, then by earliest acceptedAt
      const candidates = await db
        .select({
          userId: teamMemberships.userId,
          email: user.email,
          role: teamMemberships.role,
          acceptedAt: teamMemberships.acceptedAt,
        })
        .from(teamMemberships)
        .innerJoin(user, eq(user.id, teamMemberships.userId))
        .where(
          and(
            eq(teamMemberships.teamId, team.teamId),
            ne(teamMemberships.userId, userId),
            ne(teamMemberships.role, "owner")
          )
        )
        .orderBy(
          // Order by role priority (admin first), then by acceptedAt (earliest first)
          sql`CASE
            WHEN ${teamMemberships.role} = 'admin' THEN 1
            WHEN ${teamMemberships.role} = 'editor' THEN 2
            WHEN ${teamMemberships.role} = 'viewer' THEN 3
            ELSE 4
          END`,
          asc(teamMemberships.acceptedAt)
        );

      if (candidates.length > 0) {
        const newOwner = candidates[0];
        teamsToTransfer.push({
          id: team.teamId,
          name: team.teamName,
          slug: team.teamSlug,
          memberCount,
          newOwner: {
            id: newOwner.userId,
            email: newOwner.email,
            currentRole: newOwner.role as "admin" | "editor" | "viewer",
          },
        });
      }
    }
    // If user is not owner, they will just leave the team
    else if (team.role !== "owner") {
      teamsToLeave.push({
        id: team.teamId,
        name: team.teamName,
        slug: team.teamSlug,
      });
    }
  }

  return {
    teamsToDelete,
    teamsToTransfer,
    teamsToLeave,
  };
}

// ============================================================================
// Deletion Preview Handler
// ============================================================================

usersApp.openapi(getDeletionPreviewRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const preview = await getDeletionPreview(auth.user.id);

  return c.json(preview, 200);
});

// ============================================================================
// Delete Account Handler
// ============================================================================

usersApp.openapi(deleteCurrentUserRoute, async (c) => {
  const auth = await getAuthenticatedUser(c.req.raw.headers);

  if (!auth) {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { confirmEmail } = c.req.valid("json");

  // Validate email confirmation (case-insensitive)
  if (confirmEmail.toLowerCase() !== auth.user.email.toLowerCase()) {
    throw new ApiException(
      400,
      ErrorCode.VALIDATION_ERROR,
      "Email confirmation does not match your account email"
    );
  }

  // Get deletion preview to know what operations to perform
  const preview = await getDeletionPreview(auth.user.id);

  // Perform deletion in a transaction
  await db.transaction(async (tx) => {
    // Step 1: Transfer ownership for shared teams
    for (const team of preview.teamsToTransfer) {
      // Update new owner's role to 'owner'
      await tx
        .update(teamMemberships)
        .set({ role: "owner" })
        .where(
          and(
            eq(teamMemberships.teamId, team.id),
            eq(teamMemberships.userId, team.newOwner.id)
          )
        );
    }

    // Step 2: Delete solo teams (cascade will handle memberships)
    for (const team of preview.teamsToDelete) {
      await tx.delete(teams).where(eq(teams.id, team.id));
    }

    // Step 3: Remove user from all remaining teams
    // (memberships are auto-deleted when user is deleted, but do it explicitly for clarity)
    await tx
      .delete(teamMemberships)
      .where(eq(teamMemberships.userId, auth.user.id));

    // Step 4: Delete the user (cascade will handle sessions, accounts)
    await tx.delete(user).where(eq(user.id, auth.user.id));
  });

  return c.body(null, 204);
});

// ============================================================================
// Error Handler
// ============================================================================

usersApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  console.error("Users route error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default usersApp;
