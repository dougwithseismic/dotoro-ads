"use client";

import type { CampaignFilters as CampaignFiltersType, CampaignSyncStatus } from "../types";
import styles from "./CampaignFilters.module.css";

interface TemplateOption {
  id: string;
  name: string;
}

interface CampaignFiltersProps {
  filters: CampaignFiltersType;
  templates: TemplateOption[];
  onChange: (filters: CampaignFiltersType) => void;
}

const STATUS_OPTIONS: { value: CampaignSyncStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "pending_sync", label: "Pending Sync" },
  { value: "synced", label: "Synced" },
  { value: "sync_error", label: "Sync Error" },
];

export function CampaignFilters({
  filters,
  templates,
  onChange,
}: CampaignFiltersProps) {
  const hasActiveFilters =
    (filters.status && filters.status.length > 0) ||
    filters.templateId ||
    filters.dateRange;

  const handleStatusChange = (value: string) => {
    if (value === "") {
      const { status: _, ...rest } = filters;
      onChange(rest);
    } else {
      onChange({ ...filters, status: [value as CampaignSyncStatus] });
    }
  };

  const handleTemplateChange = (value: string) => {
    if (value === "") {
      const { templateId: _, ...rest } = filters;
      onChange(rest);
    } else {
      onChange({ ...filters, templateId: value });
    }
  };

  const handleDateChange = (field: "start" | "end", value: string) => {
    if (!value) {
      if (filters.dateRange) {
        const otherField = field === "start" ? "end" : "start";
        const otherValue = filters.dateRange[otherField];
        if (!otherValue) {
          const { dateRange: _, ...rest } = filters;
          onChange(rest);
        } else {
          onChange({ ...filters, dateRange: { [otherField]: otherValue } as { start?: Date; end?: Date } });
        }
      }
      return;
    }

    const date = new Date(value);
    onChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: date,
      },
    });
  };

  const handleClear = () => {
    onChange({});
  };

  const formatDateForInput = (date?: Date) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label htmlFor="status-filter" className={styles.label}>
          Status
        </label>
        <select
          id="status-filter"
          className={styles.select}
          value={filters.status?.[0] || ""}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="template-filter" className={styles.label}>
          Template
        </label>
        <select
          id="template-filter"
          className={styles.select}
          value={filters.templateId || ""}
          onChange={(e) => handleTemplateChange(e.target.value)}
        >
          <option value="">All Templates</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="start-date-filter" className={styles.label}>
          Start Date
        </label>
        <input
          id="start-date-filter"
          type="date"
          className={styles.input}
          value={formatDateForInput(filters.dateRange?.start)}
          onChange={(e) => handleDateChange("start", e.target.value)}
        />
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="end-date-filter" className={styles.label}>
          End Date
        </label>
        <input
          id="end-date-filter"
          type="date"
          className={styles.input}
          value={formatDateForInput(filters.dateRange?.end)}
          onChange={(e) => handleDateChange("end", e.target.value)}
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={handleClear}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
