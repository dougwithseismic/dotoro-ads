/**
 * SettingsSection Component
 *
 * A reusable section wrapper for grouping related settings
 * with consistent styling, title, and optional description.
 */

import { ReactNode } from "react";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  variant?: "default" | "danger";
  className?: string;
  headingLevel?: HeadingLevel;
}

/**
 * SettingsSection - Grouped section for related settings
 *
 * Features:
 * - Consistent padding and borders
 * - Optional description text
 * - Danger variant for destructive settings
 * - Configurable heading level for accessibility
 *
 * @example
 * ```tsx
 * <SettingsSection
 *   title="Account Information"
 *   description="Manage your account details."
 * >
 *   <FormField label="Email" ... />
 * </SettingsSection>
 *
 * <SettingsSection title="Delete Account" variant="danger">
 *   <DeleteAccountForm />
 * </SettingsSection>
 * ```
 */
export function SettingsSection({
  title,
  description,
  children,
  variant = "default",
  className = "",
  headingLevel = 2,
}: SettingsSectionProps) {
  const HeadingTag = `h${headingLevel}` as const;

  const variantStyles = {
    default: "border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900",
    danger: "border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20",
  };

  return (
    <section
      data-testid="settings-section"
      className={`
        border rounded-lg p-6
        ${variantStyles[variant]}
        ${className}
      `}
    >
      <HeadingTag
        className={`
          text-lg font-medium mb-2
          ${
            variant === "danger"
              ? "text-red-700 dark:text-red-400"
              : "text-neutral-900 dark:text-neutral-100"
          }
        `}
      >
        {title}
      </HeadingTag>

      {description && (
        <p
          className={`
            text-sm mb-4
            ${
              variant === "danger"
                ? "text-red-600 dark:text-red-400/80"
                : "text-neutral-600 dark:text-neutral-400"
            }
          `}
        >
          {description}
        </p>
      )}

      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}
