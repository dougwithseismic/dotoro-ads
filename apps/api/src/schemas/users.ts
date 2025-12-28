import { z } from "@hono/zod-openapi";

/**
 * Users Schema Definitions
 * Used for user profile management
 */

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Update user profile - PATCH /api/users/me
 *
 * Validates and transforms the name field:
 * - Required: name cannot be empty
 * - Max length: 50 characters
 * - Trimmed: whitespace is removed from both ends
 * - After trim, must still have at least 1 character
 */
export const updateUserSchema = z
  .object({
    name: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(1, "Name is required")
          .max(50, "Name must be 50 characters or less")
      ),
  })
  .openapi("UpdateUserRequest");

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * User profile response
 * Contains public user information returned after profile updates
 */
export const userResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("UserResponse");

export type UserResponse = z.infer<typeof userResponseSchema>;

// ============================================================================
// Account Deletion Schemas
// ============================================================================

/**
 * Team info for deletion preview - shows what will happen to each team
 */
const teamToDeleteSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  memberCount: z.literal(1),
});

const newOwnerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  currentRole: z.enum(["admin", "editor", "viewer"]),
});

const teamToTransferSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  memberCount: z.number().int().min(2),
  newOwner: newOwnerSchema,
});

const teamToLeaveSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

/**
 * Account deletion preview response
 * Shows consequences of account deletion before confirmation
 */
export const deletionPreviewResponseSchema = z
  .object({
    teamsToDelete: z.array(teamToDeleteSchema),
    teamsToTransfer: z.array(teamToTransferSchema),
    teamsToLeave: z.array(teamToLeaveSchema),
  })
  .openapi("DeletionPreviewResponse");

export type DeletionPreviewResponse = z.infer<typeof deletionPreviewResponseSchema>;

/**
 * Account deletion request
 * Requires email confirmation to prevent accidental deletion
 */
export const deleteAccountSchema = z
  .object({
    confirmEmail: z
      .string()
      .email("Invalid email format")
      .transform((val) => val.toLowerCase().trim()),
  })
  .openapi("DeleteAccountRequest");

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
