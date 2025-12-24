"use client";

import { useState, useCallback, useId, useMemo } from "react";
import type { ScheduleConfig } from "../../types";
import styles from "./DateRangePicker.module.css";

/** Common timezone options */
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (AZ)" },
  { value: "America/Anchorage", label: "Alaska (AK)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HI)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "UTC", label: "UTC" },
];

export interface DateRangePickerProps {
  /** Current schedule configuration */
  value: Partial<ScheduleConfig>;
  /** Callback when schedule changes */
  onChange: (schedule: Partial<ScheduleConfig>) => void;
  /** Whether inputs are disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * DateRangePicker - Date range and timezone selector for campaign scheduling
 *
 * Allows setting start date, end date (optional for continuous campaigns),
 * and timezone for the campaign schedule.
 */
export function DateRangePicker({
  value,
  onChange,
  disabled = false,
  className,
}: DateRangePickerProps) {
  const generatedId = useId();
  const [runContinuously, setRunContinuously] = useState(value.endDate === undefined);

  // Validate dates
  const dateError = useMemo(() => {
    if (!value.startDate || !value.endDate) return null;
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);
    if (end < start) {
      return "End date must be after start date";
    }
    return null;
  }, [value.startDate, value.endDate]);

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...value,
        startDate: e.target.value || undefined,
      });
    },
    [value, onChange]
  );

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...value,
        endDate: e.target.value || undefined,
      });
    },
    [value, onChange]
  );

  const handleTimezoneChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({
        ...value,
        timezone: e.target.value || undefined,
      });
    },
    [value, onChange]
  );

  const handleContinuousToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const continuous = e.target.checked;
      setRunContinuously(continuous);

      if (continuous) {
        // Clear end date when switching to continuous
        onChange({
          ...value,
          endDate: undefined,
        });
      }
    },
    [value, onChange]
  );

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.dateFields}>
        {/* Start Date */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`start-date${generatedId}`} className={styles.label}>
            Start Date
          </label>
          <input
            id={`start-date${generatedId}`}
            type="date"
            className={styles.dateInput}
            value={value.startDate || ""}
            onChange={handleStartDateChange}
            disabled={disabled}
          />
          <p className={styles.hint}>Leave empty to start immediately</p>
        </div>

        {/* End Date (when not continuous) */}
        {!runContinuously && (
          <div className={styles.fieldGroup}>
            <label htmlFor={`end-date${generatedId}`} className={styles.label}>
              End Date
            </label>
            <input
              id={`end-date${generatedId}`}
              type="date"
              className={`${styles.dateInput} ${dateError ? styles.dateInputError : ""}`}
              value={value.endDate || ""}
              onChange={handleEndDateChange}
              disabled={disabled}
              min={value.startDate}
            />
            {dateError && <p className={styles.errorMessage}>{dateError}</p>}
          </div>
        )}
      </div>

      {/* Run Continuously Toggle */}
      <div className={styles.continuousToggle}>
        <input
          id={`continuous${generatedId}`}
          type="checkbox"
          className={styles.checkbox}
          checked={runContinuously}
          onChange={handleContinuousToggle}
          disabled={disabled}
          aria-label="Run continuously"
        />
        <label htmlFor={`continuous${generatedId}`} className={styles.checkboxLabel}>
          Run continuously
          <span className={styles.checkboxHint}>Campaign will run indefinitely until paused</span>
        </label>
      </div>

      {/* Timezone Selector */}
      <div className={styles.fieldGroup}>
        <label htmlFor={`timezone${generatedId}`} className={styles.label}>
          Timezone
        </label>
        <select
          id={`timezone${generatedId}`}
          className={styles.select}
          value={value.timezone || ""}
          onChange={handleTimezoneChange}
          disabled={disabled}
        >
          <option value="">Select timezone...</option>
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <p className={styles.hint}>All scheduling will use this timezone</p>
      </div>
    </div>
  );
}
