/**
 * useInvitation Hook
 *
 * Fetches and manages invitation details for team invitations.
 * Handles loading, success, and error states with typed error detection.
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "../api-client";

/**
 * Invitation details returned from the API
 */
export interface InvitationDetails {
  teamName: string;
  teamSlug: string;
  inviterEmail: string;
  inviteeEmail: string;
  role: "owner" | "admin" | "editor" | "viewer";
  expiresAt: string;
}

/**
 * Error type classification for invitation errors
 */
export type InvitationErrorType =
  | "not_found"
  | "expired"
  | "already_accepted"
  | "network"
  | "server"
  | "invalid_token"
  | "unknown";

/**
 * Extended error with status and message
 */
export interface InvitationError {
  message: string;
  status?: number;
  data?: unknown;
}

/**
 * Return type for the useInvitation hook
 */
export interface UseInvitationResult {
  /** The invitation details if successfully fetched */
  invitation: InvitationDetails | null;
  /** Whether the request is currently loading */
  isLoading: boolean;
  /** Error object if the request failed */
  error: InvitationError | null;
  /** Classified error type for UI handling */
  errorType: InvitationErrorType | null;
  /** Function to manually refetch the invitation */
  refetch: () => Promise<void>;
}

/**
 * Determines the error type from the error object
 */
function classifyError(error: unknown): InvitationErrorType {
  // Network errors (TypeError: Failed to fetch)
  if (error instanceof TypeError) {
    return "network";
  }

  // Check if error has status property
  const errorWithStatus = error as { status?: number; message?: string; data?: { message?: string } };
  const status = errorWithStatus.status;
  const message = errorWithStatus.message || "";
  const dataMessage = (errorWithStatus.data as { message?: string })?.message || "";
  const fullMessage = `${message} ${dataMessage}`.toLowerCase();

  if (status === 404) {
    if (fullMessage.includes("expired")) {
      return "expired";
    }
    if (fullMessage.includes("accepted")) {
      return "already_accepted";
    }
    return "not_found";
  }

  if (status && status >= 500) {
    return "server";
  }

  return "unknown";
}

/**
 * Hook to fetch invitation details by token
 *
 * @param token - The invitation token from the URL
 * @returns Object containing invitation data, loading state, and error handling
 *
 * @example
 * ```tsx
 * const { invitation, isLoading, error, errorType, refetch } = useInvitation(token);
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (error) {
 *   switch (errorType) {
 *     case "expired": return <ExpiredMessage />;
 *     case "not_found": return <NotFoundMessage />;
 *     default: return <ErrorMessage />;
 *   }
 * }
 *
 * return <InvitationCard invitation={invitation} />;
 * ```
 */
export function useInvitation(token: string): UseInvitationResult {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<InvitationError | null>(null);
  const [errorType, setErrorType] = useState<InvitationErrorType | null>(null);

  const fetchInvitation = useCallback(async () => {
    // Validate token
    if (!token || token.trim() === "") {
      setIsLoading(false);
      setError({ message: "Invalid invitation token" });
      setErrorType("invalid_token");
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorType(null);

    try {
      const data = await api.get<InvitationDetails>(`/api/invitations/${token}`);
      setInvitation(data);
      setError(null);
      setErrorType(null);
    } catch (err) {
      const errorObj = err as { message?: string; status?: number; data?: unknown };

      setInvitation(null);
      setError({
        message: errorObj.message || "Failed to fetch invitation",
        status: errorObj.status,
        data: errorObj.data,
      });
      setErrorType(classifyError(err));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch on mount and when token changes
  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  return {
    invitation,
    isLoading,
    error,
    errorType,
    refetch: fetchInvitation,
  };
}
