"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Plus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getTeams, createTeam, type Team } from "@/lib/teams";

interface TeamSwitcherProps {
  currentTeamId?: string;
  onTeamChange?: (team: Team) => void;
}

/**
 * Role badge component for displaying team roles
 */
function RoleBadge({ role }: { role: Team["role"] }) {
  const roleStyles: Record<Team["role"], string> = {
    owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    editor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    viewer: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  };

  const roleLabels: Record<Team["role"], string> = {
    owner: "Owner",
    admin: "Admin",
    editor: "Editor",
    viewer: "Viewer",
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${roleStyles[role]}`}
    >
      {roleLabels[role]}
    </span>
  );
}

/**
 * Create Team Dialog
 */
function CreateTeamDialog({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreate(name.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-team-title"
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="create-team-title"
          className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4"
        >
          Create a new team
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="team-name"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Team name
            </label>
            <input
              ref={inputRef}
              id="team-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * TeamSwitcher Component
 * Dropdown for switching between teams
 */
export function TeamSwitcher({ currentTeamId, onTeamChange }: TeamSwitcherProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine current team
  const currentTeam = currentTeamId
    ? teams.find((t) => t.id === currentTeamId)
    : teams[0];

  // Load teams
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const loadTeams = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getTeams();
        setTeams(response.data);
      } catch (err) {
        setError("Failed to load teams");
        console.error("Failed to load teams:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeams();
  }, [isAuthenticated, authLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle team selection
  const handleSelectTeam = (team: Team) => {
    if (team.id !== currentTeam?.id) {
      onTeamChange?.(team);
    }
    setIsOpen(false);
  };

  // Handle create team
  const handleCreateTeam = async (name: string) => {
    try {
      const newTeam = await createTeam({ name });
      setTeams((prev) => [...prev, newTeam]);
      onTeamChange?.(newTeam);
    } catch (err) {
      console.error("Failed to create team:", err);
      throw err;
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="team-switcher-loading"
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 animate-pulse"
      >
        <div className="w-6 h-6 rounded-md bg-zinc-700" />
        <div className="w-24 h-4 rounded bg-zinc-700" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-400">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
        aria-label="Switch team"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="w-6 h-6 rounded-md bg-zinc-700 flex items-center justify-center">
          <span className="text-xs font-medium text-zinc-300">
            {currentTeam?.name.charAt(0).toUpperCase() || "T"}
          </span>
        </div>
        <span className="text-sm font-medium text-zinc-100 max-w-[150px] truncate">
          {currentTeam?.name || "Select Team"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 mt-1 w-72 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-neutral-200 dark:border-zinc-700 py-1 z-50"
        >
          {/* Team options */}
          {teams.map((team) => (
            <div
              key={team.id}
              role="option"
              aria-selected={team.id === currentTeam?.id}
              onClick={() => handleSelectTeam(team)}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-zinc-800 ${
                team.id === currentTeam?.id
                  ? "bg-neutral-50 dark:bg-zinc-800/50"
                  : ""
              }`}
            >
              {/* Team avatar */}
              <div className="w-8 h-8 rounded-md bg-zinc-700 flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-zinc-300">
                  {team.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Team info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {team.name}
                  </span>
                  <RoleBadge role={team.role} />
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <Users className="w-3 h-3" />
                  <span>{team.memberCount} members</span>
                </div>
              </div>

              {/* Selected indicator */}
              {team.id === currentTeam?.id && (
                <Check className="w-4 h-4 text-blue-500 shrink-0" />
              )}
            </div>
          ))}

          {/* Divider */}
          <div className="my-1 border-t border-neutral-200 dark:border-zinc-700" />

          {/* Create new team option */}
          <div
            role="option"
            aria-selected={false}
            onClick={() => {
              setIsOpen(false);
              setIsCreateDialogOpen(true);
            }}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-zinc-800"
          >
            <div className="w-8 h-8 rounded-md border border-dashed border-neutral-300 dark:border-zinc-600 flex items-center justify-center">
              <Plus className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </div>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Create new team
            </span>
          </div>
        </div>
      )}

      {/* Create Team Dialog */}
      <CreateTeamDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateTeam}
      />
    </div>
  );
}
