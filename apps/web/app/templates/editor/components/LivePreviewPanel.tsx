"use client";

import { useState, useMemo, useCallback } from "react";
import styles from "./LivePreviewPanel.module.css";

export interface AdPreview {
  id: string;
  headline: string;
  description: string;
  displayUrl: string;
  finalUrl: string;
  callToAction: string;
}

export interface PreviewData {
  platform: "reddit" | "google" | "facebook";
  ads: AdPreview[];
}

interface SampleDataRow {
  [key: string]: string | number | boolean;
}

interface LivePreviewPanelProps {
  previewData: PreviewData;
  sampleData: SampleDataRow[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type PreviewMode = "single" | "grid";

const PLATFORM_LABELS: Record<string, string> = {
  reddit: "Reddit",
  google: "Google",
  facebook: "Facebook",
};

const PLATFORM_COLORS: Record<string, string> = {
  reddit: "#FF4500",
  google: "#4285F4",
  facebook: "#1877F2",
};

function renderTemplate(template: string, data: SampleDataRow): string {
  if (!template) return "";

  return template.replace(/\{([^}|]+)(?:\|([^}]+))?\}/g, (match, varName, filter) => {
    const value = data[varName.trim()];
    if (value === undefined) return match;

    let result = String(value);

    if (filter) {
      const filters = filter.split("|").map((f: string) => f.trim());
      for (const f of filters) {
        result = applyFilter(result, f);
      }
    }

    return result;
  });
}

function applyFilter(value: string, filter: string): string {
  const [filterName, ...args] = filter.split(":");
  if (!filterName) return value;

  switch (filterName.toLowerCase()) {
    case "uppercase":
      return value.toUpperCase();
    case "lowercase":
      return value.toLowerCase();
    case "capitalize":
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    case "titlecase":
      return value.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
      );
    case "trim":
      return value.trim();
    case "truncate":
      const maxLen = parseInt(args[0] || "50", 10);
      return value.length > maxLen ? value.substring(0, maxLen) + "..." : value;
    case "currency":
      return "$" + parseFloat(value).toFixed(2);
    case "number":
      return parseFloat(value).toLocaleString();
    case "percent":
      return value + "%";
    default:
      return value;
  }
}

function PreviewCard({
  ad,
  platform,
  sampleData,
  index,
}: {
  ad: AdPreview;
  platform: string;
  sampleData: SampleDataRow;
  index: number;
}) {
  const renderedHeadline = useMemo(
    () => renderTemplate(ad.headline, sampleData),
    [ad.headline, sampleData]
  );

  const renderedDescription = useMemo(
    () => renderTemplate(ad.description, sampleData),
    [ad.description, sampleData]
  );

  const platformColor = PLATFORM_COLORS[platform] || "#666";

  return (
    <article className={styles.previewCard}>
      <div className={styles.cardHeader}>
        <span
          className={styles.platformBadge}
          style={{ backgroundColor: platformColor }}
        >
          {PLATFORM_LABELS[platform] || platform}
        </span>
        <span className={styles.adNumber}>Ad {index + 1}</span>
      </div>

      <div className={styles.cardContent}>
        <h4 className={styles.previewHeadline} data-testid="preview-headline">
          {renderedHeadline || "Your headline here..."}
        </h4>

        {renderedDescription && (
          <p className={styles.previewDescription}>{renderedDescription}</p>
        )}

        {ad.displayUrl && (
          <span className={styles.previewUrl}>{ad.displayUrl}</span>
        )}

        {ad.callToAction && (
          <span
            className={styles.previewCta}
            style={{ backgroundColor: platformColor }}
          >
            {ad.callToAction}
          </span>
        )}
      </div>
    </article>
  );
}

export function LivePreviewPanel({
  previewData,
  sampleData,
  isCollapsed = false,
  onToggleCollapse,
}: LivePreviewPanelProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("single");
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);

  const currentSample = sampleData[selectedSampleIndex] || sampleData[0] || {};

  const handleModeChange = useCallback((mode: PreviewMode) => {
    setPreviewMode(mode);
  }, []);

  const handleSampleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedSampleIndex(parseInt(e.target.value, 10));
    },
    []
  );

  if (isCollapsed) {
    return (
      <div className={styles.collapsedPanel}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={styles.expandButton}
          aria-label="Expand preview panel"
          aria-expanded="false"
        >
          <span className={styles.expandIcon}>&#x276E;</span>
          <span className={styles.expandText}>Preview</span>
        </button>
      </div>
    );
  }

  return (
    <aside className={styles.panel} aria-label="Live preview">
      <div className={styles.header}>
        <h3 className={styles.title}>Live Preview</h3>
        <div className={styles.headerActions}>
          <div className={styles.modeToggle} role="group" aria-label="Preview mode">
            <button
              type="button"
              className={`${styles.modeButton} ${
                previewMode === "single" ? styles.modeButtonActive : ""
              }`}
              onClick={() => handleModeChange("single")}
              aria-pressed={previewMode === "single"}
              aria-label="Single preview"
            >
              Single
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${
                previewMode === "grid" ? styles.modeButtonActive : ""
              }`}
              onClick={() => handleModeChange("grid")}
              aria-pressed={previewMode === "grid"}
              aria-label="Grid preview"
            >
              Grid
            </button>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={styles.collapseButton}
              aria-label="Collapse preview panel"
              aria-expanded="true"
            >
              <span className={styles.collapseIcon}>&#x276F;</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.platformIndicator} data-testid="preview-platform">
        {PLATFORM_LABELS[previewData.platform] || previewData.platform}
      </div>

      {sampleData.length > 1 && previewMode === "single" && (
        <div className={styles.sampleSelector}>
          <label htmlFor="sample-select" className={styles.sampleLabel}>
            Sample data:
          </label>
          <select
            id="sample-select"
            value={selectedSampleIndex}
            onChange={handleSampleChange}
            className={styles.sampleSelect}
          >
            {sampleData.map((_, index) => (
              <option key={index} value={index}>
                Row {index + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className={`${styles.previewContent} ${
          previewMode === "grid" ? styles.previewGrid : ""
        }`}
        data-testid={previewMode === "grid" ? "preview-grid" : "preview-single"}
      >
        {previewMode === "single" ? (
          previewData.ads.map((ad, index) => (
            <PreviewCard
              key={ad.id}
              ad={ad}
              platform={previewData.platform}
              sampleData={currentSample}
              index={index}
            />
          ))
        ) : (
          sampleData.slice(0, 6).map((sample, sampleIndex) =>
            previewData.ads.slice(0, 1).map((ad) => (
              <PreviewCard
                key={`${ad.id}-${sampleIndex}`}
                ad={ad}
                platform={previewData.platform}
                sampleData={sample}
                index={sampleIndex}
              />
            ))
          )
        )}
      </div>

      <div className={styles.sampleDataSection}>
        <details className={styles.sampleDetails}>
          <summary className={styles.sampleSummary}>
            Sample Data Used
          </summary>
          <pre className={styles.sampleDataCode}>
            {JSON.stringify(currentSample, null, 2)}
          </pre>
        </details>
      </div>
    </aside>
  );
}
