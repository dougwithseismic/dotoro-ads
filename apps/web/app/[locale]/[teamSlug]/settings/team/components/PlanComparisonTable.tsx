/**
 * PlanComparisonTable Component
 *
 * Displays a feature comparison table across Free, Pro, and Enterprise plans.
 * Highlights the current plan and shows feature limits with check/x icons for boolean features.
 */

import { Check, X } from "lucide-react";
import type { TeamPlan } from "@/lib/teams";

interface PlanComparisonTableProps {
  /** The team's current plan for highlighting */
  currentPlan: TeamPlan;
  /** Additional CSS classes */
  className?: string;
}

type FeatureValue = string | number | boolean;

interface PlanFeature {
  id: string;
  label: string;
  free: FeatureValue;
  pro: FeatureValue;
  enterprise: FeatureValue;
}

const FEATURES: PlanFeature[] = [
  {
    id: "members",
    label: "Team members",
    free: 3,
    pro: 25,
    enterprise: "Unlimited",
  },
  {
    id: "campaigns",
    label: "Campaign sets",
    free: 5,
    pro: 50,
    enterprise: "Unlimited",
  },
  {
    id: "data-sources",
    label: "Data sources",
    free: 2,
    pro: 10,
    enterprise: "Unlimited",
  },
  {
    id: "api",
    label: "API access",
    free: false,
    pro: true,
    enterprise: "Priority",
  },
  {
    id: "support",
    label: "Support level",
    free: "Community",
    pro: "Email",
    enterprise: "Dedicated",
  },
];

const PLANS: TeamPlan[] = ["free", "pro", "enterprise"];

const PLAN_NAMES: Record<TeamPlan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

/**
 * Renders a feature value cell based on the type
 */
function FeatureCell({ value }: { value: FeatureValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check
        data-testid="feature-check-icon"
        className="w-5 h-5 text-green-500 mx-auto"
        aria-label="Included"
      />
    ) : (
      <X
        data-testid="feature-x-icon"
        className="w-5 h-5 text-neutral-400 mx-auto"
        aria-label="Not included"
      />
    );
  }

  return (
    <span className="text-neutral-900 dark:text-neutral-100">{value}</span>
  );
}

/**
 * PlanComparisonTable - Feature comparison across all plan tiers
 *
 * Features:
 * - Compare all three plans side by side
 * - Highlights current plan column
 * - Shows numeric limits and boolean features with icons
 * - Horizontally scrollable on mobile
 * - Proper table accessibility semantics
 *
 * @example
 * ```tsx
 * <PlanComparisonTable currentPlan="pro" />
 * ```
 */
export function PlanComparisonTable({
  currentPlan,
  className = "",
}: PlanComparisonTableProps) {
  return (
    <div
      data-testid="plan-comparison-wrapper"
      className={`overflow-x-auto -mx-2 px-2 ${className}`}
    >
      <table
        data-testid="plan-comparison-table"
        className="w-full min-w-[500px] border-collapse"
      >
        <thead>
          <tr>
            {/* Feature column header */}
            <th
              scope="col"
              className="text-left py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-zinc-700"
            >
              Feature
            </th>

            {/* Plan column headers */}
            {PLANS.map((plan) => {
              const isCurrent = plan === currentPlan;
              return (
                <th
                  key={plan}
                  scope="col"
                  data-testid={`plan-column-${plan}`}
                  data-current={isCurrent}
                  className={`
                    text-center py-3 px-4 text-sm font-medium
                    border-b border-neutral-200 dark:border-zinc-700
                    ${
                      isCurrent
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "text-neutral-700 dark:text-neutral-300"
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold">{PLAN_NAMES[plan]}</span>
                    {isCurrent && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {FEATURES.map((feature) => (
            <tr
              key={feature.id}
              data-testid={`feature-row-${feature.id}`}
              className="border-b border-neutral-100 dark:border-zinc-800 last:border-b-0"
            >
              {/* Feature label */}
              <td className="py-3 px-4 text-sm text-neutral-700 dark:text-neutral-300">
                {feature.label}
              </td>

              {/* Plan values */}
              {PLANS.map((plan) => {
                const isCurrent = plan === currentPlan;
                const value = feature[plan];

                return (
                  <td
                    key={plan}
                    className={`
                      py-3 px-4 text-center text-sm
                      ${
                        isCurrent
                          ? "bg-blue-50/50 dark:bg-blue-900/10"
                          : ""
                      }
                    `}
                  >
                    <FeatureCell value={value} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
