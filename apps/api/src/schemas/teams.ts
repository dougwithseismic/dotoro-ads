import { z } from "@hono/zod-openapi";

/**
 * Teams Schema Definitions
 * Used for team management and RBAC
 */

// ============================================================================
// Enums
// ============================================================================

export const teamRoleSchema = z.enum(["owner", "admin", "editor", "viewer"]);
export type TeamRole = z.infer<typeof teamRoleSchema>;

export const teamPlanSchema = z.enum(["free", "pro", "enterprise"]);
export type TeamPlan = z.infer<typeof teamPlanSchema>;

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create team - POST /api/teams
 */
export const createTeamSchema = z
  .object({
    name: z
      .string()
      .min(1, "Team name is required")
      .max(255, "Team name must be 255 characters or less"),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(
        /^[a-z0-9-]+$/,
        "Slug must contain only lowercase letters, numbers, and hyphens"
      )
      .optional(),
    description: z.string().max(1000).optional(),
  })
  .openapi("CreateTeamRequest");

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

/**
 * Update team - PATCH /api/teams/:id
 */
export const updateTeamSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    settings: z.record(z.unknown()).optional(),
    billingEmail: z.string().email().nullable().optional(),
  })
  .openapi("UpdateTeamRequest");

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

/**
 * Update member role - PATCH /api/teams/:id/members/:userId
 */
export const updateMemberRoleSchema = z
  .object({
    role: teamRoleSchema,
  })
  .openapi("UpdateMemberRoleRequest");

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/**
 * Send invitation - POST /api/teams/:id/invitations
 */
export const sendInvitationSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["admin", "editor", "viewer"]),
    message: z.string().max(500).optional(),
  })
  .openapi("SendInvitationRequest");

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Team member object
 */
export const teamMemberSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    email: z.string().email(),
    role: teamRoleSchema,
    invitedAt: z.string().datetime().nullable(),
    acceptedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi("TeamMember");

export type TeamMemberResponse = z.infer<typeof teamMemberSchema>;

/**
 * Team object returned in responses
 */
export const teamSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    plan: teamPlanSchema,
    memberCount: z.number().int(),
    role: teamRoleSchema, // Current user's role in this team
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Team");

export type TeamResponse = z.infer<typeof teamSchema>;

/**
 * Team detail object with settings
 */
export const teamDetailSchema = teamSchema
  .extend({
    settings: z.record(z.unknown()).nullable(),
    billingEmail: z.string().nullable(),
  })
  .openapi("TeamDetail");

export type TeamDetailResponse = z.infer<typeof teamDetailSchema>;

/**
 * Team list response
 */
export const teamListResponseSchema = z
  .object({
    data: z.array(teamSchema),
  })
  .openapi("TeamListResponse");

/**
 * Team members list response
 */
export const memberListResponseSchema = z
  .object({
    data: z.array(teamMemberSchema),
    total: z.number().int(),
  })
  .openapi("MemberListResponse");

/**
 * Pending invitation object
 */
export const invitationSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: teamRoleSchema,
    inviterEmail: z.string().email(),
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime(),
  })
  .openapi("Invitation");

export type InvitationResponse = z.infer<typeof invitationSchema>;

/**
 * Pending invitations list response
 */
export const invitationListResponseSchema = z
  .object({
    data: z.array(invitationSchema),
    total: z.number().int(),
  })
  .openapi("InvitationListResponse");

/**
 * Public invitation details (for accept/decline page)
 */
export const invitationDetailsSchema = z
  .object({
    teamName: z.string(),
    teamSlug: z.string(),
    inviterEmail: z.string().email(),
    role: teamRoleSchema,
    expiresAt: z.string().datetime(),
  })
  .openapi("InvitationDetails");

export type InvitationDetailsResponse = z.infer<typeof invitationDetailsSchema>;

/**
 * Invitation action response
 */
export const invitationActionResponseSchema = z
  .object({
    success: z.literal(true),
    teamId: z.string().uuid().optional(),
    teamSlug: z.string().optional(),
  })
  .openapi("InvitationActionResponse");

// ============================================================================
// Path Parameters
// ============================================================================

export const teamIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const memberIdParamSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

export const invitationIdParamSchema = z.object({
  id: z.string().uuid(),
  invitationId: z.string().uuid(),
});

export const invitationTokenParamSchema = z.object({
  token: z.string().min(1).max(64),
});
