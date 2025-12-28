/**
 * useCreateTeam Hook
 *
 * Provides team creation functionality with loading and error state management.
 * Wraps the createTeam API function for use in React components.
 */

import { useState, useCallback } from "react";
import { createTeam as createTeamApi } from "@/lib/teams/api";
import type { CreateTeamInput, TeamDetail } from "@/lib/teams/types";

interface UseCreateTeamReturn {
  /** Create a new team. Returns the created team data on success, throws on error. */
  createTeam: (input: CreateTeamInput) => Promise<TeamDetail>;
  /** Whether a team creation is currently in progress */
  isLoading: boolean;
  /** Error message from the last failed creation attempt, or null */
  error: string | null;
  /** Reset error and loading states */
  reset: () => void;
}

/**
 * Hook for creating a new team with managed loading and error states.
 *
 * @example
 * ```tsx
 * const { createTeam, isLoading, error, reset } = useCreateTeam();
 *
 * const handleSubmit = async (data: CreateTeamInput) => {
 *   try {
 *     const team = await createTeam(data);
 *     console.log('Team created:', team.name);
 *   } catch (err) {
 *     // Error is already stored in `error` state
 *   }
 * };
 * ```
 */
export function useCreateTeam(): UseCreateTeamReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTeam = useCallback(async (input: CreateTeamInput): Promise<TeamDetail> => {
    setIsLoading(true);
    setError(null);

    try {
      const team = await createTeamApi(input);
      setIsLoading(false);
      return team;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create team";
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    createTeam,
    isLoading,
    error,
    reset,
  };
}
