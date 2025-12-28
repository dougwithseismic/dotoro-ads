/**
 * Users API Client
 * Provides functions for user profile management operations
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ============================================================================
// Types
// ============================================================================

/**
 * Input for updating user profile
 */
export interface UpdateProfileInput {
  name: string;
}

/**
 * User profile response from API
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * API error response structure
 */
interface ApiErrorResponse {
  error: string;
  code?: string;
}

// ============================================================================
// Account Deletion Types
// ============================================================================

/**
 * Team that will be deleted (user is sole member)
 */
export interface TeamToDelete {
  id: string;
  name: string;
  slug: string;
  memberCount: 1;
}

/**
 * New owner info for ownership transfer
 */
export interface NewOwner {
  id: string;
  email: string;
  currentRole: "admin" | "editor" | "viewer";
}

/**
 * Team where ownership will be transferred to another member
 */
export interface TeamToTransfer {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  newOwner: NewOwner;
}

/**
 * Team user will leave (not an owner)
 */
export interface TeamToLeave {
  id: string;
  name: string;
  slug: string;
}

/**
 * Account deletion preview response
 * Shows what will happen to each team when the account is deleted
 */
export interface DeletionPreview {
  teamsToDelete: TeamToDelete[];
  teamsToTransfer: TeamToTransfer[];
  teamsToLeave: TeamToLeave[];
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Update the current user's profile
 *
 * @param input - Profile update data (name)
 * @returns Updated user profile
 * @throws Error with message from API or generic error
 *
 * @example
 * ```ts
 * try {
 *   const user = await updateProfile({ name: "New Name" });
 *   console.log("Updated:", user.name);
 * } catch (err) {
 *   console.error("Failed:", err.message);
 * }
 * ```
 */
export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/api/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      error: "Failed to update profile",
    }));
    throw new Error(errorData.error || "Failed to update profile");
  }

  return response.json();
}

// ============================================================================
// Account Deletion API Functions
// ============================================================================

/**
 * Fetch deletion preview for the current user
 *
 * Returns information about what will happen to each team when
 * the user's account is deleted:
 * - Teams to be deleted (user is sole member)
 * - Teams where ownership will be transferred
 * - Teams user will leave (not an owner)
 *
 * @returns Deletion preview with team categorization
 * @throws Error with message from API or generic error
 *
 * @example
 * ```ts
 * try {
 *   const preview = await fetchDeletionPreview();
 *   console.log("Teams to delete:", preview.teamsToDelete.length);
 * } catch (err) {
 *   console.error("Failed:", err.message);
 * }
 * ```
 */
export async function fetchDeletionPreview(): Promise<DeletionPreview> {
  const response = await fetch(`${API_BASE}/api/users/me/deletion-preview`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      error: "Failed to fetch deletion preview",
    }));
    throw new Error(errorData.error || "Failed to fetch deletion preview");
  }

  return response.json();
}

/**
 * Delete the current user's account
 *
 * This action is permanent and cannot be undone. It will:
 * - Delete teams where the user is the sole member
 * - Transfer ownership of teams to other members
 * - Remove user from teams they are members of
 * - Delete all user sessions and OAuth accounts
 * - Permanently delete the user record
 *
 * @param confirmEmail - User's email for confirmation (must match account email)
 * @throws Error with message from API or generic error
 *
 * @example
 * ```ts
 * try {
 *   await deleteAccount("user@example.com");
 *   // User is deleted, redirect to login
 * } catch (err) {
 *   console.error("Failed:", err.message);
 * }
 * ```
 */
export async function deleteAccount(confirmEmail: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/users/me`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ confirmEmail }),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      error: "Failed to delete account",
    }));
    throw new Error(errorData.error || "Failed to delete account");
  }

  // 204 No Content - no response body expected
}
