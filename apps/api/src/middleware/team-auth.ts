import type { Context, Next, MiddlewareHandler } from "hono";
import { eq, and } from "drizzle-orm";
import { validateSession } from "./auth.js";
import { db, teams, teamMemberships } from "../services/db.js";
import { ErrorCode } from "../lib/errors.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Team role hierarchy (highest to lowest permission)
 */
export type TeamRole = "owner" | "admin" | "editor" | "viewer";

/**
 * Role hierarchy levels for permission checks
 * Higher number = more permissions
 */
const ROLE_HIERARCHY: Record<TeamRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Team context attached by team auth middleware
 */
export interface TeamContext {
  team: {
    id: string;
    name: string;
    slug: string;
  };
  role: TeamRole;
}

/**
 * Context variables added by team auth middleware
 */
export interface TeamAuthVariables {
  teamContext: TeamContext;
}

const TEAM_ID_HEADER = "x-team-id";
const TEAM_ID_QUERY = "teamId";

// ============================================================================
// UUID Validation
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Middleware that requires team authentication
 *
 * Extracts team ID from:
 * 1. X-Team-Id header (preferred)
 * 2. teamId query parameter
 *
 * Verifies that the authenticated user is a member of the team.
 * Attaches team and role to request context.
 *
 * @example
 * ```ts
 * app.use("/api/team-resources/*", requireTeamAuth());
 *
 * app.get("/api/team-resources", (c) => {
 *   const { team, role } = getTeamContext(c);
 *   return c.json({ teamId: team.id, userRole: role });
 * });
 * ```
 */
export function requireTeamAuth(): MiddlewareHandler<{
  Variables: TeamAuthVariables;
}> {
  return async (c: Context, next: Next) => {
    // 1. Verify user authentication
    const authResult = await validateSession(c.req.raw.headers);

    if (!authResult) {
      return c.json(
        {
          error: "Authentication required",
          code: ErrorCode.UNAUTHORIZED,
        },
        401
      );
    }

    // 2. Extract team ID from header or query
    const headerTeamId = c.req.header(TEAM_ID_HEADER);
    const queryTeamId = c.req.query(TEAM_ID_QUERY);
    const teamId = headerTeamId || queryTeamId;

    if (!teamId) {
      return c.json(
        {
          error: "Team ID required. Provide X-Team-Id header or teamId query parameter.",
          code: ErrorCode.VALIDATION_ERROR,
        },
        400
      );
    }

    if (!isValidUUID(teamId)) {
      return c.json(
        {
          error: "Invalid team ID format. Must be a valid UUID.",
          code: ErrorCode.VALIDATION_ERROR,
        },
        400
      );
    }

    // 3. Verify user is a member of the team
    const result = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        role: teamMemberships.role,
      })
      .from(teams)
      .innerJoin(teamMemberships, eq(teamMemberships.teamId, teams.id))
      .where(and(eq(teams.id, teamId), eq(teamMemberships.userId, authResult.user.id)))
      .limit(1);

    const membership = result[0];

    if (!membership) {
      return c.json(
        {
          error: "Not a member of this team",
          code: ErrorCode.FORBIDDEN,
        },
        403
      );
    }

    // 4. Attach team context
    const teamContext: TeamContext = {
      team: {
        id: membership.id,
        name: membership.name,
        slug: membership.slug,
      },
      role: membership.role as TeamRole,
    };

    c.set("teamContext", teamContext);

    await next();
  };
}

/**
 * Middleware that requires a minimum team role
 * Must be used after requireTeamAuth middleware.
 *
 * Role hierarchy (highest to lowest):
 * - owner: Full access, can delete team, manage billing
 * - admin: Manage members, all CRUD operations
 * - editor: Create/edit campaigns, templates, data sources
 * - viewer: Read-only access to all resources
 *
 * @param minimumRole - The minimum role required to access the resource
 *
 * @example
 * ```ts
 * app.use("/api/admin/*", requireTeamAuth(), requireTeamRole("admin"));
 *
 * app.delete("/api/admin/users/:id", (c) => {
 *   // Only admins and owners can reach here
 *   return c.json({ ok: true });
 * });
 * ```
 */
export function requireTeamRole(minimumRole: TeamRole): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const teamContext = c.get("teamContext") as TeamContext | undefined;

    if (!teamContext) {
      return c.json(
        {
          error: "Team context not found. Ensure requireTeamAuth middleware is applied.",
          code: ErrorCode.INTERNAL_ERROR,
        },
        500
      );
    }

    const userRoleLevel = ROLE_HIERARCHY[teamContext.role];
    const requiredRoleLevel = ROLE_HIERARCHY[minimumRole];

    if (userRoleLevel < requiredRoleLevel) {
      return c.json(
        {
          error: `Insufficient permissions. Required role: ${minimumRole}. Your role: ${teamContext.role}.`,
          code: ErrorCode.FORBIDDEN,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Helper to get team context from request context
 * Throws if team auth middleware was not applied.
 *
 * @param c - Hono context
 * @returns Team context with team info and user's role
 *
 * @example
 * ```ts
 * app.get("/resource", (c) => {
 *   const { team, role } = getTeamContext(c);
 *   console.log(`User has ${role} role in team ${team.name}`);
 *   return c.json({ teamId: team.id });
 * });
 * ```
 */
export function getTeamContext(c: Context): TeamContext {
  const teamContext = c.get("teamContext") as TeamContext | undefined;

  if (!teamContext) {
    throw new Error(
      "Team context not found in request context. Did you forget to use requireTeamAuth middleware?"
    );
  }

  return teamContext;
}

/**
 * Helper to check if user has at least a specific role
 * Does not throw - returns boolean for conditional checks.
 *
 * @param c - Hono context
 * @param minimumRole - The minimum role to check for
 * @returns true if user has the required role or higher
 *
 * @example
 * ```ts
 * app.get("/resource", (c) => {
 *   const canEdit = hasTeamRole(c, "editor");
 *   if (canEdit) {
 *     // Show edit buttons
 *   }
 *   return c.json({ canEdit });
 * });
 * ```
 */
export function hasTeamRole(c: Context, minimumRole: TeamRole): boolean {
  const teamContext = c.get("teamContext") as TeamContext | undefined;

  if (!teamContext) {
    return false;
  }

  const userRoleLevel = ROLE_HIERARCHY[teamContext.role];
  const requiredRoleLevel = ROLE_HIERARCHY[minimumRole];

  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Check if the user can manage the team (admin or owner)
 *
 * @param c - Hono context
 * @returns true if user is admin or owner
 */
export function canManageTeam(c: Context): boolean {
  return hasTeamRole(c, "admin");
}

/**
 * Check if the user is the team owner
 *
 * @param c - Hono context
 * @returns true if user is owner
 */
export function isTeamOwner(c: Context): boolean {
  return hasTeamRole(c, "owner");
}
