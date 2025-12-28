/**
 * CreateTeamAction Component
 *
 * A client-side quick action button that opens the CreateTeamDialog.
 * This component is designed to be used within the dashboard QuickActions area.
 */

"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import type { TeamDetail } from "@/lib/teams/types";
import styles from "./QuickActions.module.css";

const TeamIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

/**
 * CreateTeamAction - Quick action button to create a new team
 *
 * Renders as a button styled like the other QuickActions but opens a dialog
 * instead of navigating to a new page. On successful team creation, redirects
 * to the team settings page.
 */
export function CreateTeamAction() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || "en";
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSuccess = (team: TeamDetail) => {
    // Navigate to the new team's settings page
    router.push(`/${locale}/settings/team?teamId=${team.id}`);
  };

  return (
    <>
      <button
        type="button"
        className={styles.action}
        onClick={() => setIsDialogOpen(true)}
        data-testid="create-team-action"
      >
        <div className={styles.icon}>
          <TeamIcon />
        </div>
        <div className={styles.content}>
          <span className={styles.label}>Create Team</span>
          <span className={styles.description}>Start a new team workspace</span>
        </div>
        <svg
          className={styles.arrow}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

      <CreateTeamDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
