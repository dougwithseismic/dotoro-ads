"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type {
  HierarchyConfig as HierarchyConfigType,
  CampaignConfig as CampaignConfigType,
  DataSourceColumn,
  ValidationResult,
} from "../types";
import styles from "./HierarchyConfig.module.css";

interface HierarchyConfigProps {
  config: HierarchyConfigType;
  campaignConfig: CampaignConfigType;
  availableColumns: DataSourceColumn[];
  sampleData?: Record<string, unknown>[];
  onChange: (config: HierarchyConfigType) => void;
  validation?: ValidationResult;
}

type InputField = "adGroup" | "headline" | "description" | "displayUrl" | "finalUrl";

interface GroupedCampaign {
  name: string;
  adGroups: GroupedAdGroup[];
}

interface GroupedAdGroup {
  name: string;
  ads: GroupedAd[];
}

interface GroupedAd {
  headline: string;
  description: string;
}

// Variable pattern regex: matches {variable_name} or {variable_name|default}
const VARIABLE_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\|([^}]*))?\}/g;

function interpolatePattern(
  pattern: string,
  row: Record<string, unknown>
): string {
  if (!pattern) return "";
  return pattern.replace(VARIABLE_PATTERN, (match, varName, defaultVal) => {
    const value = row[varName];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
    return defaultVal ?? match;
  });
}

export function HierarchyConfig({
  config,
  campaignConfig,
  availableColumns,
  sampleData,
  onChange,
  validation,
}: HierarchyConfigProps) {
  // Local state for input values
  const [localAdGroupPattern, setLocalAdGroupPattern] = useState(config.adGroupNamePattern);
  const [localHeadline, setLocalHeadline] = useState(config.adMapping.headline);
  const [localDescription, setLocalDescription] = useState(config.adMapping.description);
  const [localDisplayUrl, setLocalDisplayUrl] = useState(config.adMapping.displayUrl ?? "");
  const [localFinalUrl, setLocalFinalUrl] = useState(config.adMapping.finalUrl ?? "");

  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [activeInputField, setActiveInputField] = useState<InputField | null>(null);

  // Collapsed state for tree nodes
  const [collapsedCampaigns, setCollapsedCampaigns] = useState<Set<string>>(new Set());
  const [collapsedAdGroups, setCollapsedAdGroups] = useState<Set<string>>(new Set());

  const adGroupInputRef = useRef<HTMLInputElement>(null);
  const headlineInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const displayUrlInputRef = useRef<HTMLInputElement>(null);
  const finalUrlInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync local state with props
  useEffect(() => {
    setLocalAdGroupPattern(config.adGroupNamePattern);
  }, [config.adGroupNamePattern]);

  useEffect(() => {
    setLocalHeadline(config.adMapping.headline);
  }, [config.adMapping.headline]);

  useEffect(() => {
    setLocalDescription(config.adMapping.description);
  }, [config.adMapping.description]);

  useEffect(() => {
    setLocalDisplayUrl(config.adMapping.displayUrl ?? "");
  }, [config.adMapping.displayUrl]);

  useEffect(() => {
    setLocalFinalUrl(config.adMapping.finalUrl ?? "");
  }, [config.adMapping.finalUrl]);

  // Filter columns based on partial variable input
  const filteredColumns = useMemo(() => {
    if (!dropdownFilter) return availableColumns;
    const lowerFilter = dropdownFilter.toLowerCase();
    return availableColumns.filter((col) =>
      col.name.toLowerCase().includes(lowerFilter)
    );
  }, [availableColumns, dropdownFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        target !== adGroupInputRef.current &&
        target !== headlineInputRef.current &&
        target !== descriptionInputRef.current &&
        target !== displayUrlInputRef.current &&
        target !== finalUrlInputRef.current
      ) {
        setShowDropdown(false);
        setDropdownFilter("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get ref for active input
  const getActiveRef = useCallback(
    (
      field: InputField | null
    ): React.RefObject<HTMLInputElement | null> | null => {
      switch (field) {
        case "adGroup":
          return adGroupInputRef;
        case "headline":
          return headlineInputRef;
        case "description":
          return descriptionInputRef;
        case "displayUrl":
          return displayUrlInputRef;
        case "finalUrl":
          return finalUrlInputRef;
        default:
          return null;
      }
    },
    []
  );

  // Get current value for active input
  const getCurrentValue = useCallback(
    (field: InputField | null): string => {
      switch (field) {
        case "adGroup":
          return localAdGroupPattern;
        case "headline":
          return localHeadline;
        case "description":
          return localDescription;
        case "displayUrl":
          return localDisplayUrl;
        case "finalUrl":
          return localFinalUrl;
        default:
          return "";
      }
    },
    [localAdGroupPattern, localHeadline, localDescription, localDisplayUrl, localFinalUrl]
  );

  // Update config helper - must be defined before handleInputChange
  const updateConfig = useCallback(
    (field: InputField, value: string) => {
      if (field === "adGroup") {
        onChange({ ...config, adGroupNamePattern: value });
      } else {
        const mapping = { ...config.adMapping };
        switch (field) {
          case "headline":
            mapping.headline = value;
            break;
          case "description":
            mapping.description = value;
            break;
          case "displayUrl":
            mapping.displayUrl = value || undefined;
            break;
          case "finalUrl":
            mapping.finalUrl = value || undefined;
            break;
        }
        onChange({ ...config, adMapping: mapping });
      }
    },
    [config, onChange]
  );

  // Handle variable autocomplete trigger
  const handleInputChange = useCallback(
    (value: string, field: InputField) => {
      // Update local state immediately
      switch (field) {
        case "adGroup":
          setLocalAdGroupPattern(value);
          break;
        case "headline":
          setLocalHeadline(value);
          break;
        case "description":
          setLocalDescription(value);
          break;
        case "displayUrl":
          setLocalDisplayUrl(value);
          break;
        case "finalUrl":
          setLocalFinalUrl(value);
          break;
      }

      // Find if we're typing a variable
      const ref = getActiveRef(field);
      const cursorPosition = ref?.current?.selectionStart ?? value.length;
      const textBeforeCursor = value.slice(0, cursorPosition);
      const openBraceIndex = textBeforeCursor.lastIndexOf("{");
      const closeBraceIndex = textBeforeCursor.lastIndexOf("}");

      if (openBraceIndex > closeBraceIndex) {
        const partialVar = textBeforeCursor.slice(openBraceIndex + 1);
        setDropdownFilter(partialVar);
        setShowDropdown(true);
        setActiveInputField(field);
        setHighlightedIndex(-1);
      } else if (value.endsWith("{")) {
        setDropdownFilter("");
        setShowDropdown(true);
        setActiveInputField(field);
        setHighlightedIndex(-1);
      } else {
        setShowDropdown(false);
        setDropdownFilter("");
      }

      // Update config (notify parent)
      updateConfig(field, value);
    },
    [getActiveRef, updateConfig]
  );

  // Handle selecting a variable from dropdown
  const selectVariable = useCallback(
    (columnName: string) => {
      const ref = getActiveRef(activeInputField);
      const currentValue = getCurrentValue(activeInputField);
      const cursorPosition = ref?.current?.selectionStart ?? currentValue.length;
      const textBeforeCursor = currentValue.slice(0, cursorPosition);
      const textAfterCursor = currentValue.slice(cursorPosition);

      const openBraceIndex = textBeforeCursor.lastIndexOf("{");
      const beforeBrace = textBeforeCursor.slice(0, openBraceIndex);
      const newValue = `${beforeBrace}{${columnName}}${textAfterCursor}`;

      // Update local state
      if (activeInputField) {
        switch (activeInputField) {
          case "adGroup":
            setLocalAdGroupPattern(newValue);
            break;
          case "headline":
            setLocalHeadline(newValue);
            break;
          case "description":
            setLocalDescription(newValue);
            break;
          case "displayUrl":
            setLocalDisplayUrl(newValue);
            break;
          case "finalUrl":
            setLocalFinalUrl(newValue);
            break;
        }
        updateConfig(activeInputField, newValue);
      }

      setShowDropdown(false);
      setDropdownFilter("");
      setHighlightedIndex(-1);

      // Restore focus and set cursor position
      setTimeout(() => {
        ref?.current?.focus();
        const newCursorPos = beforeBrace.length + columnName.length + 2;
        ref?.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [activeInputField, getActiveRef, getCurrentValue, updateConfig]
  );

  // Handle keyboard navigation in dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            Math.min(prev + 1, filteredColumns.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredColumns[highlightedIndex]) {
            selectVariable(filteredColumns[highlightedIndex].name);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowDropdown(false);
          setDropdownFilter("");
          setHighlightedIndex(-1);
          break;
      }
    },
    [showDropdown, filteredColumns, highlightedIndex, selectVariable]
  );

  // Compute hierarchy preview from sample data
  const hierarchyPreview = useMemo((): {
    campaigns: GroupedCampaign[];
    stats: { campaignCount: number; adGroupCount: number; adCount: number };
  } => {
    if (!sampleData || sampleData.length === 0) {
      return { campaigns: [], stats: { campaignCount: 0, adGroupCount: 0, adCount: 0 } };
    }

    const campaignMap = new Map<string, Map<string, GroupedAd[]>>();

    for (const row of sampleData) {
      const campaignName = interpolatePattern(campaignConfig.namePattern, row);
      const adGroupName = interpolatePattern(config.adGroupNamePattern, row);
      const headline = interpolatePattern(config.adMapping.headline, row);
      const description = interpolatePattern(config.adMapping.description, row);

      if (!campaignMap.has(campaignName)) {
        campaignMap.set(campaignName, new Map());
      }
      const adGroupMap = campaignMap.get(campaignName)!;

      if (!adGroupMap.has(adGroupName)) {
        adGroupMap.set(adGroupName, []);
      }
      adGroupMap.get(adGroupName)!.push({ headline, description });
    }

    const campaigns: GroupedCampaign[] = [];
    let adGroupCount = 0;
    let adCount = 0;

    for (const [campaignName, adGroupMap] of campaignMap) {
      const adGroups: GroupedAdGroup[] = [];
      for (const [adGroupName, ads] of adGroupMap) {
        adGroups.push({ name: adGroupName, ads });
        adGroupCount++;
        adCount += ads.length;
      }
      campaigns.push({ name: campaignName, adGroups });
    }

    return {
      campaigns,
      stats: {
        campaignCount: campaigns.length,
        adGroupCount,
        adCount,
      },
    };
  }, [sampleData, campaignConfig.namePattern, config.adGroupNamePattern, config.adMapping]);

  // Toggle campaign collapse
  const toggleCampaign = useCallback((name: string) => {
    setCollapsedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  // Toggle ad group collapse
  const toggleAdGroup = useCallback((key: string) => {
    setCollapsedAdGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Check if fields have validation errors
  const hasAdGroupPatternError =
    validation?.errors.some((e) => e.toLowerCase().includes("ad group pattern")) ?? false;
  const hasHeadlineError =
    validation?.errors.some((e) => e.toLowerCase().includes("headline")) ?? false;
  const hasDescriptionError =
    validation?.errors.some((e) => e.toLowerCase().includes("description")) ?? false;

  const hasErrors = validation && validation.errors.length > 0;
  const hasWarnings = validation && validation.warnings.length > 0;

  // Render variable dropdown
  const renderDropdown = (field: InputField) => {
    if (!showDropdown || activeInputField !== field) return null;

    return (
      <div
        ref={dropdownRef}
        className={styles.dropdown}
        data-testid="variable-dropdown"
        role="listbox"
        aria-label="Available variables"
      >
        {filteredColumns.length > 0 ? (
          filteredColumns.map((col, index) => (
            <button
              key={col.name}
              type="button"
              className={`${styles.dropdownOption} ${
                index === highlightedIndex ? styles.dropdownOptionHighlighted : ""
              }`}
              onClick={() => selectVariable(col.name)}
              data-testid={`variable-option-${col.name}`}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <span className={styles.dropdownOptionName}>{col.name}</span>
              <span className={styles.dropdownOptionType}>{col.type}</span>
              {col.sampleValues && col.sampleValues.length > 0 && (
                <span className={styles.dropdownOptionSamples}>
                  {col.sampleValues.slice(0, 3).join(", ")}
                </span>
              )}
            </button>
          ))
        ) : (
          <div className={styles.dropdownEmpty}>No matching variables</div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Ad Group Name Pattern Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Ad Group Name Pattern</h3>
        <p className={styles.sectionDescription}>
          Define how rows are grouped into ad groups. Use {"{variable}"} syntax to group rows with the same value.
        </p>

        <div className={styles.inputWrapper}>
          <input
            ref={adGroupInputRef}
            id="ad-group-name-pattern"
            type="text"
            className={`${styles.input} ${hasAdGroupPatternError ? styles.inputInvalid : ""}`}
            value={localAdGroupPattern}
            onChange={(e) => handleInputChange(e.target.value, "adGroup")}
            onKeyDown={handleKeyDown}
            placeholder="{product_name}"
            aria-label="Ad group name pattern"
            aria-describedby="ad-group-pattern-hint"
            aria-invalid={hasAdGroupPatternError}
          />
          {renderDropdown("adGroup")}
        </div>

        <p id="ad-group-pattern-hint" className={styles.inputHint}>
          Example: {"{product}"} groups all rows with the same product into one ad group.
        </p>

        {availableColumns.length === 0 && (
          <p className={styles.noVariablesHint}>
            No variables available. Select a data source first.
          </p>
        )}
      </div>

      {/* Ad Field Mapping Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Ad Field Mapping</h3>
        <p className={styles.sectionDescription}>
          Map data columns to ad fields. Use {"{variable}"} syntax to pull values from your data.
        </p>

        <div className={styles.adMappingGrid}>
          {/* Headline */}
          <div className={styles.fieldGroup}>
            <label htmlFor="ad-headline" className={styles.fieldLabel}>
              Headline<span className={styles.requiredMark}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                ref={headlineInputRef}
                id="ad-headline"
                type="text"
                className={`${styles.input} ${hasHeadlineError ? styles.inputInvalid : ""}`}
                value={localHeadline}
                onChange={(e) => handleInputChange(e.target.value, "headline")}
                onKeyDown={handleKeyDown}
                placeholder="{headline}"
                aria-label="Headline"
                aria-invalid={hasHeadlineError}
              />
              {renderDropdown("headline")}
            </div>
          </div>

          {/* Description */}
          <div className={styles.fieldGroup}>
            <label htmlFor="ad-description" className={styles.fieldLabel}>
              Description<span className={styles.requiredMark}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                ref={descriptionInputRef}
                id="ad-description"
                type="text"
                className={`${styles.input} ${hasDescriptionError ? styles.inputInvalid : ""}`}
                value={localDescription}
                onChange={(e) => handleInputChange(e.target.value, "description")}
                onKeyDown={handleKeyDown}
                placeholder="{description}"
                aria-label="Description"
                aria-invalid={hasDescriptionError}
              />
              {renderDropdown("description")}
            </div>
          </div>

          {/* Display URL */}
          <div className={styles.fieldGroup}>
            <label htmlFor="ad-display-url" className={styles.fieldLabel}>
              Display URL<span className={styles.optionalMark}>(optional)</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                ref={displayUrlInputRef}
                id="ad-display-url"
                type="text"
                className={styles.input}
                value={localDisplayUrl}
                onChange={(e) => handleInputChange(e.target.value, "displayUrl")}
                onKeyDown={handleKeyDown}
                placeholder="{display_url}"
                aria-label="Display URL"
              />
              {renderDropdown("displayUrl")}
            </div>
          </div>

          {/* Final URL */}
          <div className={styles.fieldGroup}>
            <label htmlFor="ad-final-url" className={styles.fieldLabel}>
              Final URL<span className={styles.optionalMark}>(optional)</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                ref={finalUrlInputRef}
                id="ad-final-url"
                type="text"
                className={styles.input}
                value={localFinalUrl}
                onChange={(e) => handleInputChange(e.target.value, "finalUrl")}
                onKeyDown={handleKeyDown}
                placeholder="{final_url}"
                aria-label="Final URL"
              />
              {renderDropdown("finalUrl")}
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchy Preview Section */}
      <div className={`${styles.section} ${styles.previewSection}`}>
        <h3 className={styles.sectionTitle}>Hierarchy Preview</h3>
        <p className={styles.sectionDescription}>
          Real-time preview of how your data will be grouped into campaigns, ad groups, and ads.
        </p>

        <div className={styles.previewContainer} data-testid="hierarchy-preview">
          {/* Tree View */}
          <div className={styles.treeView}>
            {!sampleData || sampleData.length === 0 ? (
              <div className={styles.treeEmpty}>
                No sample data available. Select a data source to see the preview.
              </div>
            ) : hierarchyPreview.campaigns.length === 0 ? (
              <div className={styles.treeEmpty}>
                No campaigns generated. Configure the patterns above.
              </div>
            ) : (
              hierarchyPreview.campaigns.map((campaign) => (
                <div
                  key={campaign.name}
                  className={styles.treeNode}
                  data-testid={`tree-node-campaign-${campaign.name}`}
                >
                  <div className={styles.treeNodeHeader}>
                    <button
                      type="button"
                      className={`${styles.treeNodeToggle} ${
                        !collapsedCampaigns.has(campaign.name)
                          ? styles.treeNodeToggleExpanded
                          : ""
                      }`}
                      onClick={() => toggleCampaign(campaign.name)}
                      aria-expanded={!collapsedCampaigns.has(campaign.name)}
                      aria-label={`Toggle ${campaign.name}`}
                    >
                      &#x25B6;
                    </button>
                    <span
                      className={`${styles.treeNodeIcon} ${styles.treeNodeIconCampaign}`}
                    >
                      C
                    </span>
                    <span className={styles.treeNodeLabel}>{campaign.name}</span>
                    <span className={styles.treeNodeCount}>
                      {campaign.adGroups.length} ad groups
                    </span>
                  </div>

                  {!collapsedCampaigns.has(campaign.name) && (
                    <div className={styles.treeNodeChildren}>
                      {campaign.adGroups.map((adGroup, agIdx) => {
                        const agKey = `${campaign.name}-${adGroup.name}-${agIdx}`;
                        return (
                          <div key={agKey} className={styles.treeNode}>
                            <div className={styles.treeNodeHeader}>
                              <button
                                type="button"
                                className={`${styles.treeNodeToggle} ${
                                  !collapsedAdGroups.has(agKey)
                                    ? styles.treeNodeToggleExpanded
                                    : ""
                                }`}
                                onClick={() => toggleAdGroup(agKey)}
                                aria-expanded={!collapsedAdGroups.has(agKey)}
                                aria-label={`Toggle ${adGroup.name}`}
                              >
                                &#x25B6;
                              </button>
                              <span
                                className={`${styles.treeNodeIcon} ${styles.treeNodeIconAdGroup}`}
                              >
                                AG
                              </span>
                              <span className={styles.treeNodeLabel}>
                                {adGroup.name}
                              </span>
                              <span className={styles.treeNodeCount}>
                                {adGroup.ads.length} ads
                              </span>
                            </div>

                            {!collapsedAdGroups.has(agKey) && (
                              <div className={styles.treeNodeChildren}>
                                {adGroup.ads.slice(0, 5).map((ad, adIdx) => (
                                  <div key={adIdx} className={styles.treeNode}>
                                    <div className={styles.treeNodeHeader}>
                                      <span
                                        className={`${styles.treeNodeIcon} ${styles.treeNodeIconAd}`}
                                        style={{ marginLeft: "24px" }}
                                      >
                                        Ad
                                      </span>
                                      <span className={styles.treeNodeLabel}>
                                        {ad.headline || "(no headline)"}
                                      </span>
                                    </div>
                                    <div className={styles.treeNodeAdContent}>
                                      <div className={styles.treeNodeAdDescription}>
                                        {ad.description || "(no description)"}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {adGroup.ads.length > 5 && (
                                  <div className={styles.treeNodeAdContent}>
                                    ...and {adGroup.ads.length - 5} more ads
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Stats Panel */}
          <div className={styles.statsPanel}>
            <h4 className={styles.statsPanelTitle}>Estimated Counts</h4>
            <div className={styles.statsGrid}>
              <div className={styles.statItem} data-testid="stats-campaigns">
                <span className={styles.statLabel}>Campaigns</span>
                <span className={`${styles.statValue} ${styles.statValueCampaigns}`}>
                  {hierarchyPreview.stats.campaignCount}
                </span>
              </div>
              <div className={styles.statItem} data-testid="stats-ad-groups">
                <span className={styles.statLabel}>Ad Groups</span>
                <span className={`${styles.statValue} ${styles.statValueAdGroups}`}>
                  {hierarchyPreview.stats.adGroupCount}
                </span>
              </div>
              <div className={styles.statItem} data-testid="stats-ads">
                <span className={styles.statLabel}>Ads</span>
                <span className={`${styles.statValue} ${styles.statValueAds}`}>
                  {hierarchyPreview.stats.adCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {(hasErrors || hasWarnings) && (
        <div className={styles.validationSection}>
          {hasErrors && (
            <div className={styles.validationErrors} data-testid="validation-errors">
              <h4 className={styles.validationTitle}>Errors</h4>
              <ul className={styles.validationList}>
                {validation!.errors.map((error, index) => (
                  <li key={index} className={styles.validationItem}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasWarnings && (
            <div className={styles.validationWarnings} data-testid="validation-warnings">
              <h4 className={styles.validationTitle}>Warnings</h4>
              <ul className={styles.validationList}>
                {validation!.warnings.map((warning, index) => (
                  <li key={index} className={styles.validationItem}>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
