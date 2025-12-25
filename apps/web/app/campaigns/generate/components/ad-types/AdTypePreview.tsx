"use client";

import type { AdTypeDefinition, AdFieldDefinition, CreativeRequirement } from "@repo/core/ad-types";
import styles from "./AdTypePreview.module.css";

export interface AdTypePreviewProps {
  /** The ad type to preview */
  adType: AdTypeDefinition | null | undefined;
}

/**
 * Formats the category name for display
 */
function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Formats a field's constraints for display
 */
function formatFieldConstraints(field: AdFieldDefinition): string {
  const parts: string[] = [];

  if (field.maxLength) {
    parts.push(`${field.maxLength} chars`);
  }

  if (field.minCount !== undefined || field.maxCount !== undefined) {
    const min = field.minCount ?? 0;
    const max = field.maxCount ?? "unlimited";
    parts.push(`${min}-${max}`);
  }

  return parts.join(", ");
}

/**
 * Formats creative specs for display
 */
function formatCreativeSpecs(creative: CreativeRequirement): string[] {
  const specs: string[] = [];

  if (creative.specs?.aspectRatios?.length) {
    specs.push(creative.specs.aspectRatios.join(", "));
  }

  if (creative.specs?.recommendedWidth && creative.specs?.recommendedHeight) {
    specs.push(`${creative.specs.recommendedWidth}x${creative.specs.recommendedHeight}`);
  }

  if (creative.specs?.maxFileSize) {
    const mb = creative.specs.maxFileSize / 1_000_000;
    specs.push(`Max ${mb}MB`);
  }

  return specs;
}

/**
 * AdTypePreview displays detailed information about a selected ad type.
 * Shows required fields, creative requirements, character limits, and features.
 *
 * @example
 * <AdTypePreview adType={selectedAdType} />
 */
export function AdTypePreview({ adType }: AdTypePreviewProps) {
  if (!adType) {
    return null;
  }

  const requiredFields = adType.fields.filter((f) => f.required);
  const optionalFields = adType.fields.filter((f) => !f.required);
  const characterLimits = Object.entries(adType.constraints.characterLimits || {});
  const hasCreatives = adType.creatives.length > 0;

  const categoryClass = `category${formatCategory(adType.category)}` as keyof typeof styles;

  return (
    <div className={styles.container} data-testid="ad-type-preview">
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.name}>{adType.name}</h3>
        <span className={`${styles.category} ${styles[categoryClass] || ""}`}>
          {formatCategory(adType.category)}
        </span>
      </div>

      <p className={styles.description}>{adType.description}</p>

      {/* Required Fields */}
      {requiredFields.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Required Fields</h4>
          <ul className={styles.fieldList}>
            {requiredFields.map((field) => {
              const constraints = formatFieldConstraints(field);
              return (
                <li key={field.id} className={styles.fieldItem}>
                  <span className={styles.fieldName}>{field.name}</span>
                  {constraints && (
                    <span className={styles.fieldConstraints}>{constraints}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Creative Requirements */}
      {hasCreatives && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Creative Requirements</h4>
          <ul className={styles.creativeList}>
            {adType.creatives.map((creative) => {
              const specs = formatCreativeSpecs(creative);
              return (
                <li key={creative.id} className={styles.creativeItem}>
                  <div className={styles.creativeName}>
                    {creative.name}
                    <span className={styles.creativeRequirement}>
                      {creative.required ? "(required)" : "(optional)"}
                    </span>
                  </div>
                  {specs.length > 0 && (
                    <div className={styles.creativeSpecs}>
                      {specs.map((spec) => (
                        <span key={spec} className={styles.specBadge}>
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Character Limits */}
      {characterLimits.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Character Limits</h4>
          <div className={styles.limitGrid}>
            {characterLimits.map(([key, limit]) => (
              <div key={key} className={styles.limitItem}>
                <span className={styles.limitName}>{key}</span>
                <span className={styles.limitValue}>{limit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Features</h4>
        <div className={styles.featureList}>
          {adType.features.supportsVariables && (
            <span className={styles.featureBadge}>Variables</span>
          )}
          {adType.features.supportsKeywords && (
            <span className={styles.featureBadge}>Keywords</span>
          )}
          {adType.features.supportsMultipleAds && (
            <span className={styles.featureBadge}>Multiple Ads</span>
          )}
          {adType.features.supportsScheduling && (
            <span className={styles.featureBadge}>Scheduling</span>
          )}
        </div>
      </div>
    </div>
  );
}
