"use client";

import { useState, useCallback } from "react";
import type {
  TargetingConfig as TargetingConfigType,
  LocationTarget,
  DemographicTarget,
  DeviceTarget,
  AudienceTarget,
  PlacementTarget,
} from "@repo/core";
import type { Platform } from "../../types";
import { LocationTargeting } from "./LocationTargeting";
import { DemographicTargeting } from "./DemographicTargeting";
import { DeviceTargeting } from "./DeviceTargeting";
import styles from "./TargetingConfig.module.css";

export interface TargetingConfigProps {
  config: TargetingConfigType | null;
  selectedPlatforms: Platform[];
  onChange: (config: TargetingConfigType | null) => void;
}

type TargetingSection = "location" | "demographic" | "device" | "placement";

export function TargetingConfig({
  config,
  // TODO: Use selectedPlatforms for platform-specific targeting options
  selectedPlatforms,
  onChange,
}: TargetingConfigProps) {
  const [expandedSections, setExpandedSections] = useState<Set<TargetingSection>>(
    new Set(["location"])
  );

  const toggleSection = useCallback((section: TargetingSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleLocationsChange = useCallback(
    (locations: LocationTarget[]) => {
      onChange({
        ...config,
        locations: locations.length > 0 ? locations : undefined,
      });
    },
    [config, onChange]
  );

  const handleDemographicsChange = useCallback(
    (demographics: DemographicTarget | undefined) => {
      onChange({
        ...config,
        demographics,
      });
    },
    [config, onChange]
  );

  const handleDevicesChange = useCallback(
    (devices: DeviceTarget | undefined) => {
      onChange({
        ...config,
        devices,
      });
    },
    [config, onChange]
  );

  // Count active targeting options
  const getActiveCount = (): number => {
    let count = 0;
    if (config?.locations && config.locations.length > 0) count++;
    if (config?.demographics) {
      const d = config.demographics;
      if (d.ageMin !== undefined || d.ageMax !== undefined || d.genders?.length || d.languages?.length) {
        count++;
      }
    }
    if (config?.devices) {
      const dev = config.devices;
      if (dev.types?.length || dev.operatingSystems?.length || dev.browsers?.length) {
        count++;
      }
    }
    if (config?.interests && config.interests.length > 0) count++;
    if (config?.audiences && config.audiences.length > 0) count++;
    if (config?.placements) count++;
    return count;
  };

  const activeCount = getActiveCount();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Targeting Configuration</h3>
        <p className={styles.description}>
          Configure who sees your ads. All targeting is optional - leave blank to target everyone.
        </p>
      </div>

      <div className={styles.summary}>
        {activeCount === 0 ? (
          <p className={styles.summaryNone}>No targeting configured - ads will reach everyone</p>
        ) : (
          <p className={styles.summaryActive}>
            {activeCount} targeting option{activeCount !== 1 ? "s" : ""} configured
          </p>
        )}
      </div>

      <div className={styles.sections}>
        {/* Location Targeting */}
        <div className={styles.section}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection("location")}
            aria-expanded={expandedSections.has("location")}
          >
            <div className={styles.sectionInfo}>
              <span className={styles.sectionIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div className={styles.sectionText}>
                <span className={styles.sectionTitle}>Location</span>
                <span className={styles.sectionSubtitle}>
                  {config?.locations?.length
                    ? `${config.locations.length} location${config.locations.length !== 1 ? "s" : ""}`
                    : "Countries, regions, cities"}
                </span>
              </div>
            </div>
            <svg
              className={`${styles.chevron} ${expandedSections.has("location") ? styles.chevronExpanded : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.has("location") && (
            <div className={styles.sectionContent}>
              <LocationTargeting
                locations={config?.locations || []}
                onChange={handleLocationsChange}
              />
            </div>
          )}
        </div>

        {/* Demographic Targeting */}
        <div className={styles.section}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection("demographic")}
            aria-expanded={expandedSections.has("demographic")}
          >
            <div className={styles.sectionInfo}>
              <span className={styles.sectionIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <div className={styles.sectionText}>
                <span className={styles.sectionTitle}>Demographics</span>
                <span className={styles.sectionSubtitle}>
                  {config?.demographics
                    ? formatDemographicSummary(config.demographics)
                    : "Age, gender, languages"}
                </span>
              </div>
            </div>
            <svg
              className={`${styles.chevron} ${expandedSections.has("demographic") ? styles.chevronExpanded : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.has("demographic") && (
            <div className={styles.sectionContent}>
              <DemographicTargeting
                demographics={config?.demographics}
                onChange={handleDemographicsChange}
              />
            </div>
          )}
        </div>

        {/* Device Targeting */}
        <div className={styles.section}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection("device")}
            aria-expanded={expandedSections.has("device")}
          >
            <div className={styles.sectionInfo}>
              <span className={styles.sectionIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </span>
              <div className={styles.sectionText}>
                <span className={styles.sectionTitle}>Devices</span>
                <span className={styles.sectionSubtitle}>
                  {config?.devices
                    ? formatDeviceSummary(config.devices)
                    : "Desktop, mobile, tablet"}
                </span>
              </div>
            </div>
            <svg
              className={`${styles.chevron} ${expandedSections.has("device") ? styles.chevronExpanded : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expandedSections.has("device") && (
            <div className={styles.sectionContent}>
              <DeviceTargeting
                devices={config?.devices}
                onChange={handleDevicesChange}
              />
            </div>
          )}
        </div>
      </div>

      {config && activeCount > 0 && (
        <div className={styles.clearSection}>
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => onChange(null)}
          >
            Clear all targeting
          </button>
        </div>
      )}
    </div>
  );
}

function formatDemographicSummary(demographics: DemographicTarget): string {
  const parts: string[] = [];

  if (demographics.ageMin !== undefined || demographics.ageMax !== undefined) {
    const min = demographics.ageMin ?? "18";
    const max = demographics.ageMax ?? "65+";
    parts.push(`Age ${min}-${max}`);
  }

  if (demographics.genders?.length) {
    parts.push(demographics.genders.join(", "));
  }

  if (demographics.languages?.length) {
    parts.push(`${demographics.languages.length} language${demographics.languages.length !== 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? parts.join(", ") : "Age, gender, languages";
}

function formatDeviceSummary(devices: DeviceTarget): string {
  const parts: string[] = [];

  if (devices.types?.length) {
    parts.push(devices.types.join(", "));
  }

  if (devices.operatingSystems?.length) {
    parts.push(`${devices.operatingSystems.length} OS`);
  }

  if (devices.browsers?.length) {
    parts.push(`${devices.browsers.length} browser${devices.browsers.length !== 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? parts.join(", ") : "Desktop, mobile, tablet";
}
