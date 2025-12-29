/**
 * AdvancedTab Component
 *
 * Advanced settings tab for team configuration including
 * default invitation role, timezone, and notification preferences.
 */

"use client";

import { useState } from "react";
import type { TeamDetail, TeamSettings } from "@/lib/teams";
import { canManageTeam } from "@/lib/teams/permissions";
import { SettingsSection } from "../../components/SettingsSection";
import { DefaultRoleSelector } from "./DefaultRoleSelector";
import { TimezoneSelector } from "./TimezoneSelector";
import { NotificationPreferences } from "./NotificationPreferences";
import { showError, showSuccess, getErrorMessage } from "@/lib/toast";

interface AdvancedTabProps {
  /** The team details including settings */
  team: TeamDetail;
  /** Callback when settings are updated */
  onUpdateSettings: (settings: Partial<TeamSettings>) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AdvancedTab - Advanced team settings
 *
 * Features:
 * - Default invitation role selector
 * - Team timezone picker
 * - Notification preferences (email digest, Slack webhook)
 * - Uses SettingsSection for grouping
 * - Admin/owner only editability
 *
 * @example
 * ```tsx
 * <AdvancedTab
 *   team={teamData}
 *   onUpdateSettings={async (settings) => await updateTeam({ settings: { ...team.settings, ...settings } })}
 * />
 * ```
 */
export function AdvancedTab({
  team,
  onUpdateSettings,
  className = "",
}: AdvancedTabProps) {
  const canEdit = canManageTeam(team.role);

  // Parse settings with defaults (team.settings is now properly typed)
  const settings = team.settings || {};
  const timezone = settings.timezone || "";
  const defaultMemberRole = settings.defaultMemberRole || "viewer";
  const notifications = settings.notifications || {};
  const emailDigest = notifications.emailDigest || false;
  const slackWebhook = notifications.slackWebhook || "";

  // Handlers for each setting with error handling
  const handleRoleChange = async (role: "viewer" | "editor" | "admin") => {
    try {
      await onUpdateSettings({ defaultMemberRole: role });
      showSuccess("Default role updated");
    } catch (err) {
      console.error("Failed to update default role:", err);
      showError("Failed to update default role", getErrorMessage(err, "Please try again"));
    }
  };

  const handleTimezoneChange = async (tz: string) => {
    try {
      await onUpdateSettings({ timezone: tz });
      showSuccess("Timezone updated");
    } catch (err) {
      console.error("Failed to update timezone:", err);
      showError("Failed to update timezone", getErrorMessage(err, "Please try again"));
    }
  };

  const handleEmailDigestChange = async (enabled: boolean) => {
    try {
      await onUpdateSettings({
        notifications: {
          ...notifications,
          emailDigest: enabled,
        },
      });
      showSuccess(enabled ? "Email digest enabled" : "Email digest disabled");
    } catch (err) {
      console.error("Failed to update email digest setting:", err);
      showError("Failed to update email digest", getErrorMessage(err, "Please try again"));
    }
  };

  const handleSlackWebhookChange = async (url: string) => {
    try {
      await onUpdateSettings({
        notifications: {
          ...notifications,
          slackWebhook: url,
        },
      });
      showSuccess(url ? "Slack webhook saved" : "Slack webhook removed");
    } catch (err) {
      console.error("Failed to update Slack webhook:", err);
      showError("Failed to update Slack webhook", getErrorMessage(err, "Please try again"));
    }
  };

  return (
    <div data-testid="advanced-tab" className={`space-y-6 ${className}`}>
      {/* Invitation Defaults Section */}
      <SettingsSection
        title="Invitation Defaults"
        description="Set the default role for new team members."
      >
        <DefaultRoleSelector
          currentRole={defaultMemberRole}
          onRoleChange={handleRoleChange}
          canEdit={canEdit}
        />
      </SettingsSection>

      {/* Time & Locale Section */}
      <SettingsSection
        title="Time & Locale"
        description="Configure your team's timezone for scheduling and reporting."
      >
        <TimezoneSelector
          currentTimezone={timezone}
          onTimezoneChange={handleTimezoneChange}
          canEdit={canEdit}
        />
      </SettingsSection>

      {/* Notifications Section */}
      <SettingsSection
        title="Notifications"
        description="Manage how your team receives updates and alerts."
      >
        <NotificationPreferences
          emailDigest={emailDigest}
          slackWebhook={slackWebhook}
          onEmailDigestChange={handleEmailDigestChange}
          onSlackWebhookChange={handleSlackWebhookChange}
          canEdit={canEdit}
        />
      </SettingsSection>
    </div>
  );
}
