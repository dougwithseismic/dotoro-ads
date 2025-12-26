"use client";

import { useCallback, useState } from "react";
import type { AdTypeDefinition } from "@repo/core/ad-types";
import styles from "./AdTypeCard.module.css";

export type SelectionMode = "single" | "multi";

export interface AdTypeCardProps {
  /** The ad type definition to display */
  adType: AdTypeDefinition;
  /** Whether this ad type is currently selected */
  isSelected: boolean;
  /** Callback when the ad type is selected/deselected */
  onSelect: (adTypeId: string) => void;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Whether to show details on hover */
  showDetailsOnHover?: boolean;
  /** Selection mode - single (radio) or multi (checkbox) */
  selectionMode?: SelectionMode;
}

/**
 * Formats the category name for display
 */
function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Gets the icon element for an ad type
 * Icons can be emoji or icon names - for now we'll use simple text mapping
 */
function getIconElement(icon: string): string {
  const iconMap: Record<string, string> = {
    search: "🔍",
    image: "🖼️",
    video: "📹",
    link: "🔗",
    chat: "💬",
    carousel: "🎠",
    rocket: "🚀",
    shopping: "🛍️",
  };
  return iconMap[icon] || icon || "📄";
}

/**
 * AdTypeCard component displays a single ad type as a selectable card.
 * Supports both checkbox (multi-select) and radio (single-select) modes.
 *
 * @example
 * <AdTypeCard
 *   adType={responsiveSearchAd}
 *   isSelected={selectedAdTypes.includes('responsive-search')}
 *   onSelect={(id) => toggleAdType(id)}
 * />
 */
export function AdTypeCard({
  adType,
  isSelected,
  onSelect,
  disabled = false,
  showDetailsOnHover = false,
  selectionMode = "multi",
}: AdTypeCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    if (!disabled) {
      onSelect(adType.id);
    }
  }, [disabled, onSelect, adType.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!disabled) {
          onSelect(adType.id);
        }
      }
    },
    [disabled, onSelect, adType.id]
  );

  const role = selectionMode === "single" ? "radio" : "checkbox";
  const categoryClass = `category${formatCategory(adType.category)}` as keyof typeof styles;

  return (
    <button
      type="button"
      role={role}
      aria-checked={isSelected}
      aria-disabled={disabled}
      aria-label={`${adType.name} - ${adType.description}`}
      className={`${styles.card} ${isSelected ? styles.cardSelected : ""} ${disabled ? styles.cardDisabled : ""}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`ad-type-card-${adType.id}`}
    >
      {/* Selection Indicator */}
      <div className={styles.selectionIndicator}>
        {isSelected && (
          <svg
            className={styles.checkIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Card Content */}
      <div className={styles.content}>
        {/* Icon */}
        <div className={styles.icon}>{getIconElement(adType.icon)}</div>

        {/* Info */}
        <div className={styles.info}>
          <div className={styles.header}>
            <h4 className={styles.name}>{adType.name}</h4>
            <span className={`${styles.category} ${styles[categoryClass] || ""}`}>
              {formatCategory(adType.category)}
            </span>
          </div>
          <p className={styles.description}>{adType.description}</p>

          {/* Details on hover */}
          {showDetailsOnHover && isHovered && adType.constraints.platformRules && (
            <div className={styles.details}>
              <ul className={styles.rulesList}>
                {adType.constraints.platformRules.map((rule, index) => (
                  <li key={index} className={styles.rule}>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
