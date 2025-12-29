"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getTeams } from "@/lib/teams/api";
import {
  getStoredTeamId,
  setStoredTeamId,
  clearStoredTeamId,
  setStoredTeamSlug,
} from "@/lib/teams/storage";
import { replaceTeamSlug } from "@/lib/navigation/team-routes";
import type { Team } from "./types";

/**
 * TeamContext value interface
 */
export interface TeamContextValue {
  /** The currently selected team */
  currentTeam: Team | null;
  /** All teams the user belongs to */
  teams: Team[];
  /** Set the current team (also updates URL) */
  setCurrentTeam: (team: Team) => void;
  /** Loading state for initial teams fetch */
  isLoading: boolean;
  /** Error message if teams failed to load */
  error: string | null;
  /** Refetch teams from the API */
  refetchTeams: () => Promise<void>;
  /** The team slug from the URL (may differ from currentTeam.slug during loading) */
  urlTeamSlug: string | null;
}

/**
 * Team Context
 * Provides team state management across the application
 */
const TeamContext = createContext<TeamContextValue | null>(null);

/**
 * useTeam hook
 * Access the team context from any component
 * @throws Error if used outside of TeamProvider
 */
export function useTeam(): TeamContextValue {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}

/**
 * TeamProvider Props
 */
interface TeamProviderProps {
  children: ReactNode;
  /** Optional: Pre-set team slug from server-side layout */
  initialTeamSlug?: string;
}

/**
 * TeamProvider Component
 *
 * Wraps the application and provides team context including:
 * - Current team state synced with URL
 * - Team list
 * - Team switching functionality with URL navigation
 * - localStorage and cookie persistence
 */
export function TeamProvider({ children, initialTeamSlug }: TeamProviderProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  // Get team slug from URL params
  const urlTeamSlug = (params?.teamSlug as string) || initialTeamSlug || null;

  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track current team in callbacks without causing re-renders
  const currentTeamRef = useRef<Team | null>(null);
  currentTeamRef.current = currentTeam;

  // Track if we've synced from URL
  const hasSyncedFromUrl = useRef(false);

  /**
   * Select a team from the list based on URL slug, stored ID, or fallback to first
   */
  const selectTeamFromList = useCallback(
    (teamsList: Team[], urlSlug: string | null, currentTeamId: string | null) => {
      if (teamsList.length === 0) {
        setCurrentTeamState(null);
        return null;
      }

      // Priority 1: Match team by URL slug
      if (urlSlug) {
        const urlTeam = teamsList.find((t) => t.slug === urlSlug);
        if (urlTeam) {
          setCurrentTeamState(urlTeam);
          setStoredTeamId(urlTeam.id);
          setStoredTeamSlug(urlTeam.slug);
          return urlTeam;
        }
      }

      // Priority 2: Keep current team if it exists in list
      if (currentTeamId) {
        const existingTeam = teamsList.find((t) => t.id === currentTeamId);
        if (existingTeam) {
          setCurrentTeamState(existingTeam);
          return existingTeam;
        }
      }

      // Priority 3: Try stored team ID
      const storedId = getStoredTeamId();
      if (storedId) {
        const storedTeam = teamsList.find((t) => t.id === storedId);
        if (storedTeam) {
          setCurrentTeamState(storedTeam);
          setStoredTeamSlug(storedTeam.slug);
          return storedTeam;
        }
        // Stored team not found, clear it
        clearStoredTeamId();
      }

      // Priority 4: Fallback to first team
      const firstTeam = teamsList[0];
      if (firstTeam) {
        setCurrentTeamState(firstTeam);
        setStoredTeamId(firstTeam.id);
        setStoredTeamSlug(firstTeam.slug);
        return firstTeam;
      }

      return null;
    },
    []
  );

  /**
   * Fetch teams from the API
   */
  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getTeams();
      const teamsList = response.data;
      setTeams(teamsList);

      // Select team based on URL, stored value, or default
      const selectedTeam = selectTeamFromList(
        teamsList,
        urlTeamSlug,
        currentTeamRef.current?.id || null
      );

      // If URL has a team slug but it doesn't match any team, show error
      if (urlTeamSlug && !teamsList.find((t) => t.slug === urlTeamSlug)) {
        setError(`Team "${urlTeamSlug}" not found`);
      }

      // If we selected a team but URL doesn't have the slug, update URL
      if (selectedTeam && !urlTeamSlug && pathname) {
        // This will be handled by middleware redirect
      }

      hasSyncedFromUrl.current = true;
    } catch (err) {
      console.error("Failed to load teams:", err);
      setError("Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }, [selectTeamFromList, urlTeamSlug, pathname]);

  /**
   * Set the current team, update storage, and navigate to new team URL
   */
  const setCurrentTeam = useCallback(
    (team: Team) => {
      setCurrentTeamState(team);
      setStoredTeamId(team.id);
      setStoredTeamSlug(team.slug);

      // If we have a pathname and the team is different, navigate
      if (pathname && currentTeamRef.current?.slug !== team.slug) {
        const newPath = replaceTeamSlug(pathname, team.slug);
        router.push(newPath);
      }
    },
    [pathname, router]
  );

  /**
   * Refetch teams from the API
   */
  const refetchTeams = useCallback(async () => {
    await fetchTeams();
  }, [fetchTeams]);

  /**
   * Load teams on mount when authenticated
   */
  useEffect(() => {
    // Don't load if auth is still loading or user is not authenticated
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    fetchTeams();
  }, [isAuthenticated, authLoading, fetchTeams]);

  /**
   * Sync team when URL changes (e.g., direct navigation to a team URL)
   */
  useEffect(() => {
    if (!hasSyncedFromUrl.current || teams.length === 0 || !urlTeamSlug) {
      return;
    }

    const urlTeam = teams.find((t) => t.slug === urlTeamSlug);
    if (urlTeam && urlTeam.id !== currentTeam?.id) {
      setCurrentTeamState(urlTeam);
      setStoredTeamId(urlTeam.id);
      setStoredTeamSlug(urlTeam.slug);
    }
  }, [urlTeamSlug, teams, currentTeam?.id]);

  const value: TeamContextValue = {
    currentTeam,
    teams,
    setCurrentTeam,
    isLoading,
    error,
    refetchTeams,
    urlTeamSlug,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}
