/**
 * BillingTab Component
 *
 * Complete billing and plan management tab for team settings.
 * Composes PlanBadge, PlanComparisonTable, BillingEmailForm, and usage placeholder.
 */

"use client";

import { Sparkles, Crown, Clock } from "lucide-react";
import type { TeamDetail } from "@/lib/teams";
import { SettingsSection } from "../../components/SettingsSection";
import { PlanBadge } from "./PlanBadge";
import { PlanComparisonTable } from "./PlanComparisonTable";
import { BillingEmailForm } from "./BillingEmailForm";

interface BillingTabProps {
  /** The team details including plan and billing email */
  team: TeamDetail;
  /** Callback when billing email is updated */
  onUpdateBillingEmail: (email: string) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * BillingTab - Full billing management tab
 *
 * Features:
 * - Current plan display with PlanBadge
 * - Upgrade CTA button (placeholder)
 * - Plan comparison table
 * - Billing email form (owner only)
 * - Usage stats placeholder
 * - Owner-only access check
 *
 * @example
 * ```tsx
 * <BillingTab
 *   team={teamData}
 *   onUpdateBillingEmail={async (email) => await updateTeam({ billingEmail: email })}
 * />
 * ```
 */
export function BillingTab({
  team,
  onUpdateBillingEmail,
  className = "",
}: BillingTabProps) {
  const isOwner = team.role === "owner";
  const showUpgrade = team.plan !== "enterprise";

  const handleUpgradeClick = () => {
    // Placeholder for future Stripe integration
    console.log("Upgrade clicked - Stripe integration pending");
    // In the future, this will redirect to Stripe checkout or pricing page
  };

  return (
    <div data-testid="billing-tab" className={`space-y-6 ${className}`}>
      {/* Current Plan Section */}
      <SettingsSection
        title="Current Plan"
        description="Your team's subscription plan and features."
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <PlanBadge plan={team.plan} showIcon size="lg" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {team.plan === "free" && "Basic features for small teams"}
              {team.plan === "pro" && "Advanced features for growing teams"}
              {team.plan === "enterprise" && "Full access with priority support"}
            </span>
          </div>

          {showUpgrade && (
            <button
              onClick={handleUpgradeClick}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              {team.plan === "free" ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Upgrade to Pro
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  Upgrade to Enterprise
                </>
              )}
            </button>
          )}
        </div>
      </SettingsSection>

      {/* Plan Comparison Section */}
      <SettingsSection
        title="Compare Plans"
        description="See what's included in each plan."
      >
        <PlanComparisonTable currentPlan={team.plan} />
      </SettingsSection>

      {/* Usage Stats Placeholder */}
      <SettingsSection
        title="Usage"
        description="Track your team's resource usage."
      >
        <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <Clock className="w-5 h-5 text-neutral-400" />
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Coming soon
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Usage analytics and resource tracking will be available in a future update.
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Billing Email Section */}
      {isOwner ? (
        <SettingsSection
          title="Billing Email"
          description="Manage where billing notifications are sent."
        >
          <BillingEmailForm
            currentEmail={team.billingEmail}
            onSave={onUpdateBillingEmail}
            isOwner={isOwner}
          />
        </SettingsSection>
      ) : (
        <SettingsSection
          title="Billing"
          description="Billing settings are restricted."
        >
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Only the team owner can manage billing settings and update the billing email.
          </p>
        </SettingsSection>
      )}
    </div>
  );
}
