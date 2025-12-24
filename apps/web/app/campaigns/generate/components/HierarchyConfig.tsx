"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import type {
  HierarchyConfig as HierarchyConfigType,
  CampaignConfig as CampaignConfigType,
  DataSourceColumn,
  ValidationResult,
  AdGroupDefinition,
  AdDefinition,
} from "../types";
import {
  generateId,
  createDefaultAdGroup,
  createDefaultAd,
  interpolatePattern,
} from "../types";
import { KeywordCombinator } from "./KeywordCombinator";
import styles from "./HierarchyConfig.module.css";

// Find all variables in text with their positions
function findVariables(text: string): { start: number; end: number; content: string }[] {
  const variables: { start: number; end: number; content: string }[] = [];
  const matches = text.matchAll(/\{[^}]+\}/g);
  for (const match of matches) {
    variables.push({
      start: match.index!,
      end: match.index! + match[0].length,
      content: match[0],
    });
  }
  return variables;
}

// Check if cursor position is inside a variable (not at boundaries)
function getVariableAtPosition(text: string, pos: number): { start: number; end: number; content: string } | null {
  const variables = findVariables(text);
  for (const v of variables) {
    // Inside the variable (exclusive of boundaries for typing)
    if (pos > v.start && pos < v.end) {
      return v;
    }
  }
  return null;
}

// Get the variable that the cursor would enter when moving left
function getVariableToLeft(text: string, pos: number): { start: number; end: number; content: string } | null {
  const variables = findVariables(text);
  for (const v of variables) {
    // Cursor is at the end of this variable
    if (pos === v.end) {
      return v;
    }
  }
  return null;
}

// Get the variable that the cursor would enter when moving right
function getVariableToRight(text: string, pos: number): { start: number; end: number; content: string } | null {
  const variables = findVariables(text);
  for (const v of variables) {
    // Cursor is at the start of this variable
    if (pos === v.start) {
      return v;
    }
  }
  return null;
}

// Helper to create a deep copy of ad groups for local state
function cloneAdGroups(adGroups: AdGroupDefinition[]): AdGroupDefinition[] {
  return adGroups.map(ag => ({
    ...ag,
    ads: ag.ads.map(ad => ({ ...ad })),
    keywords: ag.keywords ? [...ag.keywords] : undefined,
  }));
}

interface HierarchyConfigProps {
  config: HierarchyConfigType;
  campaignConfig: CampaignConfigType;
  availableColumns: DataSourceColumn[];
  sampleData?: Record<string, unknown>[];
  onChange: (config: HierarchyConfigType) => void;
  validation?: ValidationResult;
}

type InputField =
  | { type: "adGroupName"; adGroupId: string }
  | { type: "headline"; adGroupId: string; adId: string }
  | { type: "description"; adGroupId: string; adId: string }
  | { type: "displayUrl"; adGroupId: string; adId: string }
  | { type: "finalUrl"; adGroupId: string; adId: string };

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

export function HierarchyConfig({
  config,
  campaignConfig,
  availableColumns,
  sampleData,
  onChange,
  validation,
}: HierarchyConfigProps) {
  // Initialize local ad groups state from props
  const [localAdGroups, setLocalAdGroups] = useState<AdGroupDefinition[]>(() => {
    if (!config.adGroups || config.adGroups.length === 0) {
      return [createDefaultAdGroup()];
    }
    return cloneAdGroups(config.adGroups);
  });

  // Ref to track if component is mounted (for queueMicrotask safety)
  const isMountedRef = useRef(true);

  // Use ref pattern to avoid onChange in deps
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync local state with props when config changes from parent
  // (e.g., when restoring a session or parent resets the state)
  useEffect(() => {
    const configAdGroupIds = config.adGroups?.map(ag => ag.id).join(',') ?? '';

    // Use functional update to compare with current local state
    setLocalAdGroups(currentLocalAdGroups => {
      const localAdGroupIds = currentLocalAdGroups.map(ag => ag.id).join(',');

      // Only sync if structure changed (different ad groups)
      if (configAdGroupIds !== localAdGroupIds) {
        if (!config.adGroups || config.adGroups.length === 0) {
          return [createDefaultAdGroup()];
        } else {
          return cloneAdGroups(config.adGroups);
        }
      }
      // No change needed, return current state
      return currentLocalAdGroups;
    });
  }, [config]);

  // Use local state for rendering
  const effectiveConfig = useMemo(() => {
    return { adGroups: localAdGroups };
  }, [localAdGroups]);

  // Autocomplete state
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [activeInputField, setActiveInputField] = useState<InputField | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);


  // Expanded state for ad groups
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(() => {
    // Default: expand all ad groups
    return new Set(effectiveConfig.adGroups.map(ag => ag.id));
  });

  // Collapsed state for tree nodes
  const [collapsedCampaigns, setCollapsedCampaigns] = useState<Set<string>>(new Set());
  const [collapsedAdGroups, setCollapsedAdGroups] = useState<Set<string>>(new Set());

  // Refs for inputs
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter columns based on partial variable input (typing after {)
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
        !Array.from(inputRefs.current.values()).some(ref => ref === target)
      ) {
        setShowDropdown(false);
        setDropdownFilter("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get ref key for an input field
  const getRefKey = useCallback((field: InputField): string => {
    switch (field.type) {
      case "adGroupName":
        return `adGroup-${field.adGroupId}-name`;
      case "headline":
        return `ad-${field.adGroupId}-${field.adId}-headline`;
      case "description":
        return `ad-${field.adGroupId}-${field.adId}-description`;
      case "displayUrl":
        return `ad-${field.adGroupId}-${field.adId}-displayUrl`;
      case "finalUrl":
        return `ad-${field.adGroupId}-${field.adId}-finalUrl`;
    }
  }, []);

  // Update dropdown position when shown, based on active input
  useEffect(() => {
    if (showDropdown && activeInputField) {
      const refKey = getRefKey(activeInputField);
      const inputEl = inputRefs.current.get(refKey);
      if (inputEl) {
        const rect = inputEl.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  }, [showDropdown, activeInputField, getRefKey]);

  // Get current value for active input
  const getCurrentValue = useCallback((field: InputField | null): string => {
    if (!field) return "";

    switch (field.type) {
      case "adGroupName": {
        const adGroup = effectiveConfig.adGroups.find(ag => ag.id === field.adGroupId);
        return adGroup?.namePattern ?? "";
      }
      case "headline": {
        const adGroup = effectiveConfig.adGroups.find(ag => ag.id === field.adGroupId);
        const ad = adGroup?.ads.find(a => a.id === field.adId);
        return ad?.headline ?? "";
      }
      case "description": {
        const adGroup = effectiveConfig.adGroups.find(ag => ag.id === field.adGroupId);
        const ad = adGroup?.ads.find(a => a.id === field.adId);
        return ad?.description ?? "";
      }
      case "displayUrl": {
        const adGroup = effectiveConfig.adGroups.find(ag => ag.id === field.adGroupId);
        const ad = adGroup?.ads.find(a => a.id === field.adId);
        return ad?.displayUrl ?? "";
      }
      case "finalUrl": {
        const adGroup = effectiveConfig.adGroups.find(ag => ag.id === field.adGroupId);
        const ad = adGroup?.ads.find(a => a.id === field.adId);
        return ad?.finalUrl ?? "";
      }
    }
  }, [effectiveConfig.adGroups]);

  // Update ad group - updates local state and notifies parent immediately
  const updateAdGroup = useCallback((adGroupId: string, updates: Partial<AdGroupDefinition>) => {
    setLocalAdGroups(prevAdGroups => {
      const newAdGroups = prevAdGroups.map(ag =>
        ag.id === adGroupId ? { ...ag, ...updates } : ag
      );
      // Notify parent immediately for real-time preview updates
      // Using queueMicrotask to batch with React's state update cycle
      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current({ adGroups: newAdGroups });
        }
      });
      return newAdGroups;
    });
  }, []);

  // Update ad within an ad group - updates local state and notifies parent immediately
  const updateAd = useCallback((adGroupId: string, adId: string, updates: Partial<AdDefinition>) => {
    setLocalAdGroups(prevAdGroups => {
      const newAdGroups = prevAdGroups.map(ag => {
        if (ag.id !== adGroupId) return ag;
        const newAds = ag.ads.map(ad =>
          ad.id === adId ? { ...ad, ...updates } : ad
        );
        return { ...ag, ads: newAds };
      });
      // Notify parent immediately for real-time preview updates
      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current({ adGroups: newAdGroups });
        }
      });
      return newAdGroups;
    });
  }, []);

  // Add new ad group - updates local state and notifies parent immediately
  const addAdGroup = useCallback(() => {
    const newAdGroup = createDefaultAdGroup();
    setLocalAdGroups(prevAdGroups => {
      const newAdGroups = [...prevAdGroups, newAdGroup];
      // Notify parent immediately
      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current({ adGroups: newAdGroups });
        }
      });
      return newAdGroups;
    });
    setExpandedAdGroups(prev => new Set([...prev, newAdGroup.id]));
  }, []);

  // Remove ad group - updates local state and notifies parent immediately
  const removeAdGroup = useCallback((adGroupId: string) => {
    setLocalAdGroups(prevAdGroups => {
      if (prevAdGroups.length <= 1) return prevAdGroups; // Keep at least one
      const newAdGroups = prevAdGroups.filter(ag => ag.id !== adGroupId);
      // Notify parent immediately
      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current({ adGroups: newAdGroups });
        }
      });
      return newAdGroups;
    });
    setExpandedAdGroups(prev => {
      const next = new Set(prev);
      next.delete(adGroupId);
      return next;
    });
  }, []);

  // Add new ad to an ad group - updates local state and notifies parent immediately
  const addAd = useCallback((adGroupId: string) => {
    const newAd = createDefaultAd();
    setLocalAdGroups(prevAdGroups => {
      const newAdGroups = prevAdGroups.map(ag => {
        if (ag.id !== adGroupId) return ag;
        return { ...ag, ads: [...ag.ads, newAd] };
      });
      // Notify parent immediately
      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current({ adGroups: newAdGroups });
        }
      });
      return newAdGroups;
    });
  }, []);

  // Remove ad from an ad group - updates local state and notifies parent immediately
  const removeAd = useCallback((adGroupId: string, adId: string) => {
    setLocalAdGroups(prevAdGroups => {
      const newAdGroups = prevAdGroups.map(ag => {
        if (ag.id !== adGroupId) return ag;
        if (ag.ads.length <= 1) return ag; // Keep at least one
        return { ...ag, ads: ag.ads.filter(ad => ad.id !== adId) };
      });
      // Notify parent immediately
      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current({ adGroups: newAdGroups });
        }
      });
      return newAdGroups;
    });
  }, []);

  // Toggle ad group expansion
  const toggleAdGroupExpansion = useCallback((adGroupId: string) => {
    setExpandedAdGroups(prev => {
      const next = new Set(prev);
      if (next.has(adGroupId)) {
        next.delete(adGroupId);
      } else {
        next.add(adGroupId);
      }
      return next;
    });
  }, []);

  // Handle variable autocomplete trigger
  const handleInputChange = useCallback((value: string, field: InputField, inputRef: HTMLInputElement | null) => {
    // Update the value
    switch (field.type) {
      case "adGroupName":
        updateAdGroup(field.adGroupId, { namePattern: value });
        break;
      case "headline":
        updateAd(field.adGroupId, field.adId, { headline: value });
        break;
      case "description":
        updateAd(field.adGroupId, field.adId, { description: value });
        break;
      case "displayUrl":
        updateAd(field.adGroupId, field.adId, { displayUrl: value || undefined });
        break;
      case "finalUrl":
        updateAd(field.adGroupId, field.adId, { finalUrl: value || undefined });
        break;
    }

    // Find if we're typing a variable
    const cursorPosition = inputRef?.selectionStart ?? value.length;
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
  }, [updateAdGroup, updateAd]);

  // Handle selecting a variable from dropdown
  const selectVariable = useCallback((columnName: string) => {
    if (!activeInputField) return;

    const refKey = getRefKey(activeInputField);
    const inputRef = inputRefs.current.get(refKey);
    const currentValue = getCurrentValue(activeInputField);
    const cursorPosition = inputRef?.selectionStart ?? currentValue.length;
    const textBeforeCursor = currentValue.slice(0, cursorPosition);
    const textAfterCursor = currentValue.slice(cursorPosition);

    const openBraceIndex = textBeforeCursor.lastIndexOf("{");
    const beforeBrace = textBeforeCursor.slice(0, openBraceIndex);
    const newValue = `${beforeBrace}{${columnName}}${textAfterCursor}`;

    // Update the value
    switch (activeInputField.type) {
      case "adGroupName":
        updateAdGroup(activeInputField.adGroupId, { namePattern: newValue });
        break;
      case "headline":
        updateAd(activeInputField.adGroupId, activeInputField.adId, { headline: newValue });
        break;
      case "description":
        updateAd(activeInputField.adGroupId, activeInputField.adId, { description: newValue });
        break;
      case "displayUrl":
        updateAd(activeInputField.adGroupId, activeInputField.adId, { displayUrl: newValue || undefined });
        break;
      case "finalUrl":
        updateAd(activeInputField.adGroupId, activeInputField.adId, { finalUrl: newValue || undefined });
        break;
    }

    setShowDropdown(false);
    setDropdownFilter("");
    setHighlightedIndex(-1);

    // Restore focus and set cursor position
    setTimeout(() => {
      inputRef?.focus();
      const newCursorPos = beforeBrace.length + columnName.length + 2;
      inputRef?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [activeInputField, getRefKey, getCurrentValue, updateAdGroup, updateAd]);

  // Handle keyboard navigation - both dropdown and atomic variable behavior
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const value = input.value;
    const pos = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? pos;
    const hasSelection = pos !== selEnd;

    // Handle dropdown navigation when open
    if (showDropdown) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            Math.min(prev + 1, filteredColumns.length - 1)
          );
          return;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          return;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredColumns[highlightedIndex]) {
            selectVariable(filteredColumns[highlightedIndex].name);
          }
          return;
        case "Escape":
          e.preventDefault();
          setShowDropdown(false);
          setDropdownFilter("");
          setHighlightedIndex(-1);
          return;
      }
    }

    // Atomic variable handling - make variables behave as single units
    switch (e.key) {
      case "ArrowLeft": {
        if (hasSelection) return; // Let default handle selection collapse
        // Check if we're about to enter a variable from the right
        const varToLeft = getVariableToLeft(value, pos);
        if (varToLeft) {
          e.preventDefault();
          input.setSelectionRange(varToLeft.start, varToLeft.start);
        }
        // Check if we're inside a variable (shouldn't happen but safety check)
        const varInside = getVariableAtPosition(value, pos);
        if (varInside) {
          e.preventDefault();
          input.setSelectionRange(varInside.start, varInside.start);
        }
        break;
      }
      case "ArrowRight": {
        if (hasSelection) return; // Let default handle selection collapse
        // Check if we're about to enter a variable from the left
        const varToRight = getVariableToRight(value, pos);
        if (varToRight) {
          e.preventDefault();
          input.setSelectionRange(varToRight.end, varToRight.end);
        }
        // Check if we're inside a variable
        const varInside = getVariableAtPosition(value, pos);
        if (varInside) {
          e.preventDefault();
          input.setSelectionRange(varInside.end, varInside.end);
        }
        break;
      }
      case "Backspace": {
        if (hasSelection) return; // Let default handle selection delete
        // Check if backspace would delete part of a variable
        const varToLeft = getVariableToLeft(value, pos);
        if (varToLeft) {
          e.preventDefault();
          // Delete the entire variable
          const newValue = value.slice(0, varToLeft.start) + value.slice(varToLeft.end);
          input.value = newValue;
          input.setSelectionRange(varToLeft.start, varToLeft.start);
          // Trigger onChange
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
        }
        // Check if we're inside a variable
        const varInside = getVariableAtPosition(value, pos);
        if (varInside) {
          e.preventDefault();
          const newValue = value.slice(0, varInside.start) + value.slice(varInside.end);
          input.value = newValue;
          input.setSelectionRange(varInside.start, varInside.start);
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
        }
        break;
      }
      case "Delete": {
        if (hasSelection) return; // Let default handle selection delete
        // Check if delete would delete part of a variable
        const varToRight = getVariableToRight(value, pos);
        if (varToRight) {
          e.preventDefault();
          // Delete the entire variable
          const newValue = value.slice(0, varToRight.start) + value.slice(varToRight.end);
          input.value = newValue;
          input.setSelectionRange(varToRight.start, varToRight.start);
          // Trigger onChange
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
        }
        // Check if we're inside a variable
        const varInside = getVariableAtPosition(value, pos);
        if (varInside) {
          e.preventDefault();
          const newValue = value.slice(0, varInside.start) + value.slice(varInside.end);
          input.value = newValue;
          input.setSelectionRange(varInside.start, varInside.start);
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
        }
        break;
      }
    }
  }, [showDropdown, filteredColumns, highlightedIndex, selectVariable]);

  // Compute hierarchy preview from sample data
  const hierarchyPreview = useMemo((): {
    campaigns: GroupedCampaign[];
    stats: { campaignCount: number; adGroupCount: number; adCount: number };
  } => {
    if (!sampleData || sampleData.length === 0 || effectiveConfig.adGroups.length === 0) {
      return { campaigns: [], stats: { campaignCount: 0, adGroupCount: 0, adCount: 0 } };
    }

    const campaignMap = new Map<string, Map<string, GroupedAd[]>>();

    for (const row of sampleData) {
      const campaignName = interpolatePattern(campaignConfig.namePattern, row);

      // For each ad group definition, create ad group instances
      for (const adGroupDef of effectiveConfig.adGroups) {
        const adGroupName = interpolatePattern(adGroupDef.namePattern, row);

        if (!campaignMap.has(campaignName)) {
          campaignMap.set(campaignName, new Map());
        }
        const adGroupMap = campaignMap.get(campaignName)!;

        // Create or get ads for this ad group
        if (!adGroupMap.has(adGroupName)) {
          adGroupMap.set(adGroupName, []);
        }
        const ads = adGroupMap.get(adGroupName)!;

        // Add all ads from this definition
        for (const adDef of adGroupDef.ads) {
          const headline = interpolatePattern(adDef.headline, row);
          const description = interpolatePattern(adDef.description, row);
          ads.push({ headline, description });
        }
      }
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
  }, [sampleData, campaignConfig.namePattern, effectiveConfig.adGroups]);

  // Toggle campaign collapse in preview
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

  // Toggle ad group collapse in preview
  const toggleAdGroupPreview = useCallback((key: string) => {
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

  // Check for validation errors
  const hasErrors = validation && validation.errors.length > 0;
  const hasWarnings = validation && validation.warnings.length > 0;

  // Helper to check if a specific ad field has an error
  // Checks that BOTH the ad identifier AND field name appear in the SAME error message
  const hasAdFieldError = useCallback((adGroupIndex: number, adIndex: number, fieldName: string) => {
    if (!validation) return false;
    const adGroupPrefix = `ad group ${adGroupIndex + 1}`;
    const adPrefix = `ad ${adIndex + 1}`;
    const fieldLower = fieldName.toLowerCase();

    return validation.errors.some(e => {
      const errorLower = e.toLowerCase();
      // Check that this error is specifically about this ad group, ad, and field
      return errorLower.includes(adGroupPrefix) &&
             errorLower.includes(adPrefix) &&
             errorLower.includes(fieldLower);
    });
  }, [validation]);

  // Legacy helper for ad group level errors (name pattern)
  const hasAdGroupFieldError = useCallback((adGroupIndex: number, fieldName: string) => {
    if (!validation) return false;
    const adGroupPrefix = `ad group ${adGroupIndex + 1}`;
    const fieldLower = fieldName.toLowerCase();

    return validation.errors.some(e => {
      const errorLower = e.toLowerCase();
      return errorLower.includes(adGroupPrefix) && errorLower.includes(fieldLower);
    });
  }, [validation]);

  // Render variable dropdown
  const renderDropdown = (field: InputField) => {
    if (!showDropdown || !activeInputField || !dropdownPosition) return null;
    if (typeof document === 'undefined') return null;

    // Check if this is the active field
    const activeKey = getRefKey(activeInputField);
    const fieldKey = getRefKey(field);
    if (activeKey !== fieldKey) return null;

    // Render in portal to avoid overflow:hidden clipping
    return createPortal(
      <div
        ref={dropdownRef}
        className={styles.dropdownPortal}
        style={{
          position: 'fixed',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
        data-testid="variable-dropdown"
        role="listbox"
        aria-label="Available variables"
      >
        <div className={styles.dropdownOptions}>
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
      </div>,
      document.body
    );
  };

  // Handle click on input to prevent cursor landing inside variables
  const handleInputClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    // Use setTimeout to let the browser set cursor position first
    setTimeout(() => {
      const pos = input.selectionStart ?? 0;
      const selEnd = input.selectionEnd ?? pos;

      // If there's a selection, don't interfere
      if (pos !== selEnd) return;

      const value = input.value;
      const varInside = getVariableAtPosition(value, pos);

      if (varInside) {
        // Snap cursor to the end of the variable
        input.setSelectionRange(varInside.end, varInside.end);
      }
    }, 0);
  }, []);

  // Render a single ad form
  const renderAdForm = (adGroup: AdGroupDefinition, ad: AdDefinition, adGroupIndex: number, adIndex: number) => {
    const headlineField: InputField = { type: "headline", adGroupId: adGroup.id, adId: ad.id };
    const descriptionField: InputField = { type: "description", adGroupId: adGroup.id, adId: ad.id };
    const displayUrlField: InputField = { type: "displayUrl", adGroupId: adGroup.id, adId: ad.id };
    const finalUrlField: InputField = { type: "finalUrl", adGroupId: adGroup.id, adId: ad.id };

    const canRemoveAd = adGroup.ads.length > 1;

    return (
      <div key={ad.id} className={styles.adCard} data-testid={`ad-card-${ad.id}`}>
        <div className={styles.adCardHeader}>
          <span className={styles.adCardTitle}>Ad {adIndex + 1}</span>
          {canRemoveAd && (
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => removeAd(adGroup.id, ad.id)}
              aria-label={`Remove Ad ${adIndex + 1}`}
              data-testid={`remove-ad-${ad.id}`}
            >
              Remove
            </button>
          )}
        </div>

        <div className={styles.adMappingGrid}>
          {/* Headline */}
          <div className={styles.fieldGroup}>
            <label htmlFor={`ad-headline-${ad.id}`} className={styles.fieldLabel}>
              Headline<span className={styles.requiredMark}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                ref={(el) => { if (el) inputRefs.current.set(getRefKey(headlineField), el); }}
                id={`ad-headline-${ad.id}`}
                type="text"
                className={`${styles.input} ${hasAdFieldError(adGroupIndex, adIndex, "headline") ? styles.inputInvalid : ""}`}
                value={ad.headline}
                onChange={(e) => handleInputChange(e.target.value, headlineField, e.target)}
                onKeyDown={handleKeyDown}
                onClick={handleInputClick}
                placeholder="{headline}"
                aria-label="Headline"
              />
              {renderDropdown(headlineField)}
            </div>
          </div>

          {/* Description */}
          <div className={styles.fieldGroup}>
            <label htmlFor={`ad-description-${ad.id}`} className={styles.fieldLabel}>
              Description<span className={styles.requiredMark}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                ref={(el) => { if (el) inputRefs.current.set(getRefKey(descriptionField), el); }}
                id={`ad-description-${ad.id}`}
                type="text"
                className={`${styles.input} ${hasAdFieldError(adGroupIndex, adIndex, "description") ? styles.inputInvalid : ""}`}
                value={ad.description}
                onChange={(e) => handleInputChange(e.target.value, descriptionField, e.target)}
                onKeyDown={handleKeyDown}
                onClick={handleInputClick}
                placeholder="{description}"
                aria-label="Description"
              />
              {renderDropdown(descriptionField)}
            </div>
          </div>

          {/* Display URL */}
          <div className={styles.fieldGroup}>
            <label htmlFor={`ad-display-url-${ad.id}`} className={styles.fieldLabel}>
              Display URL<span className={styles.optionalMark}>(optional)</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                ref={(el) => { if (el) inputRefs.current.set(getRefKey(displayUrlField), el); }}
                id={`ad-display-url-${ad.id}`}
                type="text"
                className={styles.input}
                value={ad.displayUrl ?? ""}
                onChange={(e) => handleInputChange(e.target.value, displayUrlField, e.target)}
                onKeyDown={handleKeyDown}
                onClick={handleInputClick}
                placeholder="{display_url}"
                aria-label="Display URL"
              />
              {renderDropdown(displayUrlField)}
            </div>
          </div>

          {/* Final URL */}
          <div className={styles.fieldGroup}>
            <label htmlFor={`ad-final-url-${ad.id}`} className={styles.fieldLabel}>
              Final URL<span className={styles.optionalMark}>(optional)</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                ref={(el) => { if (el) inputRefs.current.set(getRefKey(finalUrlField), el); }}
                id={`ad-final-url-${ad.id}`}
                type="text"
                className={styles.input}
                value={ad.finalUrl ?? ""}
                onChange={(e) => handleInputChange(e.target.value, finalUrlField, e.target)}
                onKeyDown={handleKeyDown}
                onClick={handleInputClick}
                placeholder="{final_url}"
                aria-label="Final URL"
              />
              {renderDropdown(finalUrlField)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render a single ad group
  const renderAdGroup = (adGroup: AdGroupDefinition, adGroupIndex: number) => {
    const nameField: InputField = { type: "adGroupName", adGroupId: adGroup.id };
    const isExpanded = expandedAdGroups.has(adGroup.id);
    const canRemoveAdGroup = effectiveConfig.adGroups.length > 1;

    return (
      <div key={adGroup.id} className={styles.adGroupCard} data-testid={`ad-group-${adGroup.id}`}>
        <div className={styles.adGroupHeader}>
          <button
            type="button"
            className={`${styles.adGroupToggle} ${isExpanded ? styles.adGroupToggleExpanded : ""}`}
            onClick={() => toggleAdGroupExpansion(adGroup.id)}
            aria-expanded={isExpanded}
            aria-label={`Toggle Ad Group ${adGroupIndex + 1}`}
            data-testid={`toggle-ad-group-${adGroup.id}`}
          >
            &#x25B6;
          </button>
          <span className={styles.adGroupTitle}>Ad Group {adGroupIndex + 1}</span>
          <span className={styles.adGroupInfo}>{adGroup.ads.length} ad{adGroup.ads.length !== 1 ? "s" : ""}</span>
          {canRemoveAdGroup && (
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => removeAdGroup(adGroup.id)}
              aria-label={`Remove Ad Group ${adGroupIndex + 1}`}
              data-testid={`remove-ad-group-${adGroup.id}`}
            >
              Remove
            </button>
          )}
        </div>

        {isExpanded && (
          <div className={styles.adGroupBody}>
            {/* Ad Group Name Pattern */}
            <div className={styles.fieldGroup}>
              <label htmlFor={`ad-group-name-${adGroup.id}`} className={styles.fieldLabel}>
                Name Pattern<span className={styles.requiredMark}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  ref={(el) => { if (el) inputRefs.current.set(getRefKey(nameField), el); }}
                  id={`ad-group-name-${adGroup.id}`}
                  type="text"
                  className={`${styles.input} ${hasAdGroupFieldError(adGroupIndex, "name pattern") ? styles.inputInvalid : ""}`}
                  value={adGroup.namePattern}
                  onChange={(e) => handleInputChange(e.target.value, nameField, e.target)}
                  onKeyDown={handleKeyDown}
                  onClick={handleInputClick}
                  placeholder="{product_name}"
                  aria-label="Ad group name pattern"
                  aria-describedby={`ad-group-pattern-hint-${adGroup.id}`}
                />
                {renderDropdown(nameField)}
              </div>
              <p id={`ad-group-pattern-hint-${adGroup.id}`} className={styles.inputHint}>
                Use {"{variable}"} syntax to create dynamic names based on your data.
              </p>
            </div>

            {/* Ads Section */}
            <div className={styles.adsSection}>
              <h4 className={styles.adsSectionTitle}>Ads</h4>
              {adGroup.ads.map((ad, adIndex) => renderAdForm(adGroup, ad, adGroupIndex, adIndex))}
              <button
                type="button"
                className={styles.addButton}
                onClick={() => addAd(adGroup.id)}
                data-testid={`add-ad-${adGroup.id}`}
              >
                + Add Ad
              </button>
            </div>

            {/* Keywords Section */}
            <div className={styles.keywordsSection} data-testid={`keywords-section-${adGroup.id}`}>
              <h4 className={styles.adsSectionTitle}>Keywords (optional)</h4>
              <p className={styles.keywordsSectionHint}>
                Build keywords by combining prefixes, core terms, and suffixes. Use {"{variable}"} syntax for dynamic values.
              </p>
              <KeywordCombinator
                keywords={adGroup.keywords}
                sampleRow={sampleData?.[0]}
                onChange={(keywords) => {
                  updateAdGroup(adGroup.id, { keywords: keywords.length > 0 ? keywords : undefined });
                }}
                showPreview={true}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Ad Groups Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Ad Groups</h3>
        <p className={styles.sectionDescription}>
          Define your ad groups and the ads within each group. Use {"{variable}"} syntax to create dynamic content from your data.
        </p>

        {availableColumns.length === 0 && (
          <p className={styles.noVariablesHint}>
            No variables available. Select a data source first.
          </p>
        )}

        <div className={styles.adGroupsContainer}>
          {effectiveConfig.adGroups.map((adGroup, index) => renderAdGroup(adGroup, index))}
        </div>

        <button
          type="button"
          className={styles.addAdGroupButton}
          onClick={addAdGroup}
          data-testid="add-ad-group"
        >
          + Add Ad Group
        </button>
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
                                onClick={() => toggleAdGroupPreview(agKey)}
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
