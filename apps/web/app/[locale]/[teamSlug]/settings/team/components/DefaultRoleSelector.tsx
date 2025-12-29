/**
 * DefaultRoleSelector Component
 *
 * Dropdown for selecting the default role assigned to new team invitations.
 * Admin/owner only editability with descriptions for each role.
 */

"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";

type InviteRole = "viewer" | "editor" | "admin";

interface RoleOption {
  value: InviteRole;
  label: string;
  description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: "viewer", label: "Viewer", description: "View only access to team resources" },
  { value: "editor", label: "Editor", description: "Can edit campaigns, templates, and data" },
  { value: "admin", label: "Admin", description: "Full management access including team settings" },
];

interface DefaultRoleSelectorProps {
  /** Current default role for new invites */
  currentRole: InviteRole;
  /** Callback when role is changed */
  onRoleChange: (role: InviteRole) => Promise<void>;
  /** Whether the current user can edit (admin/owner) */
  canEdit: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DefaultRoleSelector - Dropdown for default invitation role
 *
 * Features:
 * - Select from viewer, editor, admin roles
 * - Does not include owner role
 * - Shows description for each role
 * - Admin/owner only editing
 * - Loading state during save
 * - Error handling
 *
 * @example
 * ```tsx
 * <DefaultRoleSelector
 *   currentRole="viewer"
 *   onRoleChange={async (role) => await updateTeamSettings({ defaultMemberRole: role })}
 *   canEdit={isAdminOrOwner}
 * />
 * ```
 */
export function DefaultRoleSelector({
  currentRole,
  onRoleChange,
  canEdit,
  className = "",
}: DefaultRoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listboxId = useId();

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleRoleSelect = async (role: InviteRole) => {
    if (role === currentRole) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    setIsSaving(true);
    setError(null);

    try {
      await onRoleChange(role);
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const currentRoleOption = ROLE_OPTIONS.find((r) => r.value === currentRole);

  return (
    <div
      data-testid="default-role-selector"
      className={`space-y-2 ${className}`}
      ref={dropdownRef}
    >
      {/* Label */}
      <label
        id={labelId}
        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        Default role for new invites
      </label>

      {/* Dropdown */}
      <div className="relative max-w-sm">
        <button
          type="button"
          role="combobox"
          aria-labelledby={labelId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          disabled={!canEdit || isSaving}
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full flex items-center justify-between px-3 py-2 rounded-lg border
            ${
              canEdit
                ? "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                : "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50"
            }
            text-neutral-900 dark:text-neutral-100
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <span className="capitalize">{currentRoleOption?.label || currentRole}</span>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span
                data-testid="role-saving"
                className="w-4 h-4 border-2 border-neutral-400/30 border-t-neutral-400 rounded-full animate-spin"
              />
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-neutral-200 dark:border-zinc-700 py-1 overflow-hidden"
          >
            {ROLE_OPTIONS.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === currentRole}
                tabIndex={0}
                onClick={() => handleRoleSelect(option.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRoleSelect(option.value);
                  }
                }}
                className={`
                  px-3 py-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-zinc-800
                  ${option.value === currentRole ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {option.label}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {option.description}
                    </div>
                  </div>
                  {option.value === currentRole && (
                    <Check className="w-4 h-4 text-blue-500" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Helper Text */}
      {!canEdit && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Only admins and owners can change the default invitation role.
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
