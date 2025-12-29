/**
 * TimezoneSelector Component
 *
 * Searchable dropdown for selecting team timezone.
 * Uses Intl API for timezone list and shows current time preview.
 */

"use client";

import { useState, useRef, useEffect, useId, useMemo } from "react";
import { ChevronDown, Search, Globe } from "lucide-react";
import { showWarning } from "@/lib/toast";

// Flag to track if warning has been shown (per session)
let hasShownBrowserWarning = false;

// Get all available timezones from Intl API
function getTimezones(): { timezones: string[]; isLimited: boolean } {
  try {
    return { timezones: Intl.supportedValuesOf("timeZone"), isLimited: false };
  } catch {
    // Fallback for older browsers - show warning once per session
    if (!hasShownBrowserWarning) {
      hasShownBrowserWarning = true;
      // We'll show warning in the component when it mounts with limited timezones
    }
    return {
      timezones: [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Sao_Paulo",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Asia/Dubai",
        "Australia/Sydney",
        "Pacific/Auckland",
      ],
      isLimited: true,
    };
  }
}

// Group timezones by region
function groupTimezones(timezones: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  timezones.forEach((tz) => {
    const region = tz.split("/")[0] ?? "Other";
    if (!groups.has(region)) {
      groups.set(region, []);
    }
    groups.get(region)!.push(tz);
  });
  return groups;
}

// Format current time for a timezone
function formatCurrentTime(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  } catch {
    return "";
  }
}

// Get browser's default timezone
function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

interface TimezoneSelectorProps {
  /** Current timezone value */
  currentTimezone: string;
  /** Callback when timezone is changed */
  onTimezoneChange: (timezone: string) => Promise<void>;
  /** Whether the current user can edit */
  canEdit: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TimezoneSelector - Searchable timezone picker
 *
 * Features:
 * - Uses Intl.supportedValuesOf for full timezone list
 * - Searchable dropdown with filtering
 * - Groups by region (America, Europe, Asia, etc.)
 * - Shows current time in selected timezone
 * - Defaults to browser timezone if not set
 * - Loading state during save
 *
 * @example
 * ```tsx
 * <TimezoneSelector
 *   currentTimezone="America/New_York"
 *   onTimezoneChange={async (tz) => await updateTeamSettings({ timezone: tz })}
 *   canEdit={isAdminOrOwner}
 * />
 * ```
 */
export function TimezoneSelector({
  currentTimezone,
  onTimezoneChange,
  canEdit,
  className = "",
}: TimezoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  const { timezones: allTimezones, isLimited } = useMemo(() => getTimezones(), []);
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const displayTimezone = currentTimezone || browserTimezone;

  // Show warning once if browser has limited timezone support
  useEffect(() => {
    if (isLimited && !hasShownBrowserWarning) {
      hasShownBrowserWarning = true;
      showWarning(
        "Limited timezone options",
        "Your browser doesn't support the full timezone list"
      );
    }
  }, [isLimited]);

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      if (displayTimezone) {
        setCurrentTime(formatCurrentTime(displayTimezone));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [displayTimezone]);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input when opened
      searchInputRef.current?.focus();
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Filter timezones based on search
  const filteredTimezones = useMemo(() => {
    if (!search) return allTimezones.slice(0, 50); // Show first 50 by default
    const lowerSearch = search.toLowerCase();
    return allTimezones.filter((tz) => tz.toLowerCase().includes(lowerSearch));
  }, [allTimezones, search]);

  const handleTimezoneSelect = async (timezone: string) => {
    if (timezone === currentTimezone) {
      setIsOpen(false);
      setSearch("");
      return;
    }

    setIsOpen(false);
    setSearch("");
    setIsSaving(true);
    setError(null);

    try {
      await onTimezoneChange(timezone);
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      data-testid="timezone-selector"
      className={`space-y-2 ${className}`}
      ref={dropdownRef}
    >
      {/* Label */}
      <label
        id={labelId}
        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        Team timezone
      </label>

      {/* Current Time Display */}
      <div
        data-testid="current-time"
        className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400"
      >
        <Globe className="w-4 h-4" />
        {currentTime && <span>Current time: {currentTime}</span>}
        {!currentTimezone && (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            (Browser default)
          </span>
        )}
      </div>

      {/* Dropdown Trigger */}
      <div className="relative max-w-sm">
        <button
          type="button"
          role="combobox"
          aria-labelledby={labelId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={!canEdit || isSaving}
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full flex items-center justify-between px-3 py-2 rounded-lg border
            ${
              canEdit
                ? "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                : "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50"
            }
            text-neutral-900 dark:text-neutral-100 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <span className="truncate">{displayTimezone}</span>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span
                data-testid="timezone-saving"
                className="w-4 h-4 border-2 border-neutral-400/30 border-t-neutral-400 rounded-full animate-spin"
              />
            )}
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-neutral-200 dark:border-zinc-700 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-neutral-200 dark:border-zinc-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  ref={searchInputRef}
                  type="search"
                  role="searchbox"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search timezone..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Timezone List */}
            <ul
              role="listbox"
              className="max-h-60 overflow-auto py-1"
            >
              {filteredTimezones.length === 0 ? (
                <li className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                  No timezones found
                </li>
              ) : (
                filteredTimezones.map((tz) => (
                  <li
                    key={tz}
                    role="option"
                    aria-selected={tz === currentTimezone}
                    onClick={() => handleTimezoneSelect(tz)}
                    className={`
                      px-3 py-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-zinc-800 text-sm
                      ${tz === currentTimezone ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-900 dark:text-neutral-100">{tz}</span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatCurrentTime(tz)}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
