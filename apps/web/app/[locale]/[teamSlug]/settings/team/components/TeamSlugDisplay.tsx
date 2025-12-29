/**
 * TeamSlugDisplay Component
 *
 * Read-only display for the team's URL slug with copy functionality.
 * Shows the full URL format and explains that slug is set at creation.
 */

"use client";

import { useState } from "react";
import { Copy, Check, Info } from "lucide-react";

interface TeamSlugDisplayProps {
  /** The team's URL slug */
  slug: string;
  /** Base URL for the app (default: app.dotoro.com) */
  baseUrl?: string;
  /** Additional CSS classes */
  className?: string;
}

const DEFAULT_BASE_URL = "app.dotoro.com";

/**
 * TeamSlugDisplay - Read-only slug display with copy button
 *
 * Features:
 * - Shows full URL format: baseUrl/{slug}
 * - Copy to clipboard with feedback
 * - Info tooltip explaining slug is set at creation
 * - Disabled input styling to indicate read-only
 *
 * @example
 * ```tsx
 * <TeamSlugDisplay slug="my-team" />
 * <TeamSlugDisplay slug="acme-corp" baseUrl="https://custom.domain.com" />
 * ```
 */
export function TeamSlugDisplay({
  slug,
  baseUrl = DEFAULT_BASE_URL,
  className = "",
}: TeamSlugDisplayProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = `https://${baseUrl}/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  return (
    <div data-testid="team-slug-display" className={`space-y-2 ${className}`}>
      {/* Label */}
      <label
        htmlFor="team-slug"
        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        Team URL
      </label>

      {/* URL Display */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <input
            id="team-slug"
            type="text"
            value={fullUrl}
            readOnly
            disabled
            data-testid="team-url"
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 opacity-50 cursor-not-allowed pr-10"
          />
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg transition-colors"
          aria-label={copied ? "Copied" : "Copy URL"}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Info Text */}
      <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
        <Info className="w-3.5 h-3.5" />
        The team URL slug is set when the team was created and cannot be changed.
      </p>
    </div>
  );
}
