"use client";

import { useRouter, useParams } from "next/navigation";
import { useTeam, type Team } from "@/lib/teams";
import { TeamCard } from "./TeamCard";
import { isPersonalTeam } from "../utils/team-utils";
import styles from "./TeamList.module.css";

export interface TeamListProps {
  /** Callback when user wants to leave a team */
  onLeaveTeam: (team: Team) => void;
}

/**
 * Loading skeleton for the team list
 */
function TeamListSkeleton() {
  return (
    <div data-testid="team-list-loading" className={styles.container}>
      <div className={styles.header}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonCount} />
      </div>
      <div className={styles.list} role="list">
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonInfo}>
              <div className={styles.skeletonName} />
              <div className={styles.skeletonMeta} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state for when user has no teams
 */
function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyText}>No teams found</p>
      <p className={styles.emptySubtext}>
        Create a team to get started
      </p>
    </div>
  );
}

/**
 * TeamList Component
 *
 * Displays a list of all teams the user belongs to.
 * Uses TeamContext for team data and selection state.
 * Updates URL when a team is selected.
 */
export function TeamList({ onLeaveTeam }: TeamListProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const { teams, currentTeam, setCurrentTeam, isLoading } = useTeam();

  const handleSelectTeam = (team: Team) => {
    setCurrentTeam(team);
    // Update URL with the selected team
    router.push(`/${locale}/settings/team?teamId=${team.id}`);
  };

  const handleLeaveTeam = (team: Team) => {
    onLeaveTeam(team);
  };

  if (isLoading) {
    return <TeamListSkeleton />;
  }

  if (teams.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Your Teams</h2>
        <span className={styles.count}>
          {teams.length} {teams.length === 1 ? "team" : "teams"}
        </span>
      </div>

      {/* Team List */}
      <div className={styles.list} role="list">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            isSelected={currentTeam?.id === team.id}
            isPersonal={isPersonalTeam(team)}
            onSelect={handleSelectTeam}
            onLeave={handleLeaveTeam}
          />
        ))}
      </div>
    </div>
  );
}
