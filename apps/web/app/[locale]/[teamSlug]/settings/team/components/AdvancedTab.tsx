/**
 * AdvancedTab Component
 *
 * Advanced settings tab for team configuration including
 * default invitation role, timezone, and notification preferences.
 */

"use client";

import type { TeamDetail } from "@/lib/teams";
import { SettingsSection } from "../../components/SettingsSection";
import { DefaultRoleSelector } from "./DefaultRoleSelector";
import { TimezoneSelector } from "./TimezoneSelector";
import { NotificationPreferences } from "./NotificationPreferences";

// Type for team settings
interface TeamSettings {
  timezone?: string;
  defaultMemberRole?: "viewer" | "editor" | "admin";
  notifications?: {
    emailDigest?: boolean;
    slackWebhook?: string;
  };
}

interface AdvancedTabProps {
  /** The team details including settings */
  team: TeamDetail;
  /** Callback when settings are updated */
  onUpdateSettings: (settings: TeamSettings) => Promise<void>;
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
  const canEdit = team.role === "owner" || team.role === "admin";

  // Parse settings with defaults
  const settings = (team.settings as TeamSettings) || {};
  const timezone = settings.timezone || "";
  const defaultMemberRole = settings.defaultMemberRole || "viewer";
  const notifications = settings.notifications || {};
  const emailDigest = notifications.emailDigest || false;
  const slackWebhook = notifications.slackWebhook || "";

  // Handlers for each setting
  const handleRoleChange = async (role: "viewer" | "editor" | "admin") => {
    await onUpdateSettings({ defaultMemberRole: role });
  };

  const handleTimezoneChange = async (tz: string) => {
    await onUpdateSettings({ timezone: tz });
  };

  const handleEmailDigestChange = async (enabled: boolean) => {
    await onUpdateSettings({
      notifications: {
        ...notifications,
        emailDigest: enabled,
      },
    });
  };

  const handleSlackWebhookChange = async (url: string) => {
    await onUpdateSettings({
      notifications: {
        ...notifications,
        slackWebhook: url,
      },
    });
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
