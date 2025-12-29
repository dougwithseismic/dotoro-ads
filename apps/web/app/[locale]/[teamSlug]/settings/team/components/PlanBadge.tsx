/**
 * PlanBadge Component
 *
 * Visual badge for displaying team plan tier (Free/Pro/Enterprise)
 * with distinct colors and optional icons per tier.
 */

import { Sparkles, Crown } from "lucide-react";
import type { TeamPlan } from "@/lib/teams";

type BadgeSize = "sm" | "md" | "lg";

interface PlanBadgeProps {
  /** The team's current plan */
  plan: TeamPlan;
  /** Whether to show the plan icon */
  showIcon?: boolean;
  /** Size variant for the badge */
  size?: BadgeSize;
  /** Additional CSS classes */
  className?: string;
}

const PLAN_LABELS: Record<TeamPlan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

const PLAN_STYLES: Record<TeamPlan, string> = {
  free: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  pro: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  enterprise:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-0.5 text-xs",
  lg: "px-2.5 py-1 text-sm",
};

const ICON_SIZES: Record<BadgeSize, string> = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
};

/**
 * PlanBadge - Visual indicator for team plan tier
 *
 * Features:
 * - Distinct colors for each plan tier
 * - Optional icons (Sparkle for Pro, Crown for Enterprise)
 * - Size variants (sm, md, lg)
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <PlanBadge plan="pro" showIcon />
 * <PlanBadge plan="enterprise" size="lg" />
 * <PlanBadge plan="free" />
 * ```
 */
export function PlanBadge({
  plan,
  showIcon = false,
  size = "md",
  className = "",
}: PlanBadgeProps) {
  const label = PLAN_LABELS[plan];
  const IconComponent =
    plan === "pro" ? Sparkles : plan === "enterprise" ? Crown : null;

  return (
    <span
      data-testid="plan-badge"
      data-plan={plan}
      aria-label={`${label} plan`}
      className={`
        inline-flex items-center gap-1 font-medium rounded-full
        ${PLAN_STYLES[plan]}
        ${SIZE_STYLES[size]}
        ${className}
      `}
    >
      {showIcon && IconComponent && (
        <IconComponent
          data-testid="plan-icon"
          className={ICON_SIZES[size]}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}
