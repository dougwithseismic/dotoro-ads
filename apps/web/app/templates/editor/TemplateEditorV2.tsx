"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CampaignStructureBuilder,
  type AdConfig,
  type AdGroupConfig,
  type CampaignConfig,
} from "./components/CampaignStructureBuilder";
import {
  VariablePickerPanel,
  type Variable,
} from "./components/VariablePickerPanel";
import { LivePreviewPanel, type AdPreview } from "./components/LivePreviewPanel";
import styles from "./TemplateEditorV2.module.css";

type Platform = "reddit" | "google" | "facebook";

export interface EditorState {
  name: string;
  platform: Platform;
  objective: string;
  budget: string;
  adGroups: AdGroupConfig[];
}

interface TemplateEditorV2Props {
  templateId?: string;
  initialState?: EditorState;
  availableVariables: Variable[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const DEFAULT_STATE: EditorState = {
  name: "",
  platform: "reddit",
  objective: "CONVERSIONS",
  budget: "",
  adGroups: [
    {
      id: "ag-default-1",
      name: "Ad Group 1",
      ads: [
        {
          id: "ad-default-1",
          headline: "",
          description: "",
          displayUrl: "",
          finalUrl: "",
          callToAction: "",
        },
      ],
    },
  ],
};

const PLATFORM_LIMITS: Record<Platform, { headline: number; description: number }> = {
  reddit: { headline: 100, description: 500 },
  google: { headline: 30, description: 90 },
  facebook: { headline: 40, description: 125 },
};

const CTA_OPTIONS: Record<Platform, string[]> = {
  reddit: [
    "Shop Now",
    "Learn More",
    "Sign Up",
    "Download",
    "Install",
    "Get Quote",
    "Contact Us",
    "Book Now",
    "Apply Now",
    "Watch More",
    "Get Started",
    "Subscribe",
    "Order Now",
    "See More",
    "View More",
    "Play Now",
  ],
  google: ["Learn More", "Shop Now", "Sign Up", "Get Quote", "Contact Us"],
  facebook: ["Shop Now", "Learn More", "Sign Up", "Download", "Book Now"],
};

// Default sample data for preview
const DEFAULT_SAMPLE_DATA = [
  {
    product_name: "Premium Widget",
    price: "29.99",
    sale_price: "19.99",
    brand: "Acme",
    category: "Electronics",
    discount_percent: "33",
    sku: "WDG-001",
    color: "Blue",
    size: "Medium",
  },
  {
    product_name: "Deluxe Gadget",
    price: "49.99",
    sale_price: "39.99",
    brand: "TechCo",
    category: "Gadgets",
    discount_percent: "20",
    sku: "GDG-002",
    color: "Red",
    size: "Large",
  },
  {
    product_name: "Basic Tool",
    price: "14.99",
    sale_price: "9.99",
    brand: "ToolMaster",
    category: "Tools",
    discount_percent: "33",
    sku: "TL-003",
    color: "Black",
    size: "Small",
  },
];

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function TemplateEditorV2({
  templateId,
  initialState,
  availableVariables,
}: TemplateEditorV2Props) {
  const router = useRouter();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<EditorState | null>(null);

  // Editor state
  const [editorState, setEditorState] = useState<EditorState>(
    initialState || DEFAULT_STATE
  );

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"saved" | "saving" | "unsaved" | null>(null);
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);
  const focusedInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Panel collapse state
  const [variablePickerCollapsed, setVariablePickerCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  // Track initial state for change detection
  const initialStateRef = useRef(initialState || DEFAULT_STATE);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return !deepEqual(editorState, initialStateRef.current);
  }, [editorState]);

  // Create campaign config from editor state
  const campaignConfig: CampaignConfig = useMemo(
    () => ({
      name: editorState.name,
      objective: editorState.objective,
      budget: editorState.budget,
      platform: editorState.platform,
    }),
    [editorState.name, editorState.objective, editorState.budget, editorState.platform]
  );

  // Get variable names for autocomplete
  const variableNames = useMemo(
    () => availableVariables.map((v) => v.name),
    [availableVariables]
  );

  // Create preview data from ads
  const previewData = useMemo(() => {
    const ads: AdPreview[] = [];
    for (const adGroup of editorState.adGroups) {
      for (const ad of adGroup.ads) {
        ads.push({
          id: ad.id,
          headline: ad.headline,
          description: ad.description,
          displayUrl: ad.displayUrl,
          finalUrl: ad.finalUrl,
          callToAction: ad.callToAction,
        });
      }
    }
    return {
      platform: editorState.platform,
      ads,
    };
  }, [editorState.adGroups, editorState.platform]);

  // Create sample data for preview from available variables
  const sampleData = useMemo(() => {
    if (availableVariables.length === 0) {
      return DEFAULT_SAMPLE_DATA;
    }

    const sample: Record<string, string> = {};
    for (const variable of availableVariables) {
      sample[variable.name] = variable.sampleValue;
    }
    return [sample, ...DEFAULT_SAMPLE_DATA.slice(1)];
  }, [availableVariables]);

  // Handle campaign config changes
  const handleCampaignChange = useCallback((newCampaign: CampaignConfig) => {
    setEditorState((prev) => ({
      ...prev,
      name: newCampaign.name,
      objective: newCampaign.objective,
      budget: newCampaign.budget,
      platform: newCampaign.platform as Platform,
    }));
    setDraftStatus("unsaved");
  }, []);

  // Handle ad groups changes
  const handleAdGroupsChange = useCallback((newAdGroups: AdGroupConfig[]) => {
    setEditorState((prev) => ({
      ...prev,
      adGroups: newAdGroups,
    }));
    setDraftStatus("unsaved");
  }, []);

  // Handle platform change
  const handlePlatformChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const platform = e.target.value as Platform;
    setEditorState((prev) => ({
      ...prev,
      platform,
    }));
    setDraftStatus("unsaved");
  }, []);

  // Handle variable insertion
  const handleInsertVariable = useCallback((variableName: string) => {
    if (!focusedFieldId || !focusedInputRef.current) return;

    const input = focusedInputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const value = input.value;

    const newValue = value.slice(0, start) + `{${variableName}}` + value.slice(end);

    // Trigger a change event
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )?.set;

    if (input.tagName === "TEXTAREA" && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(input, newValue);
    } else if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, newValue);
    }

    const event = new Event("input", { bubbles: true });
    input.dispatchEvent(event);

    // Set cursor position after variable
    const newPosition = start + variableName.length + 2;
    requestAnimationFrame(() => {
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
    });
  }, [focusedFieldId]);

  // Track focused field
  const handleFieldFocus = useCallback((fieldId: string) => {
    setFocusedFieldId(fieldId);
    const element = document.getElementById(fieldId);
    if (element && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      focusedInputRef.current = element;
    }
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!editorState.name.trim()) {
      newErrors.name = "Campaign name is required";
    }

    // Check at least one ad has a headline
    let hasHeadline = false;
    for (const adGroup of editorState.adGroups) {
      for (const ad of adGroup.ads) {
        if (ad.headline.trim()) {
          hasHeadline = true;
          break;
        }
      }
      if (hasHeadline) break;
    }

    if (!hasHeadline) {
      newErrors[`headline-${editorState.adGroups[0]?.ads[0]?.id}`] =
        "At least one headline is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [editorState]);

  // Save template
  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const url = templateId
        ? `${API_BASE}/api/v1/templates/${templateId}`
        : `${API_BASE}/api/v1/templates`;

      const response = await fetch(url, {
        method: templateId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editorState.name,
          platform: editorState.platform,
          structure: {
            objective: editorState.objective,
            budget: editorState.budget,
            adGroups: editorState.adGroups.map((ag) => ({
              name: ag.name,
              ads: ag.ads.map((ad) => ({
                headline: ad.headline,
                description: ad.description || undefined,
                displayUrl: ad.displayUrl || undefined,
                finalUrl: ad.finalUrl || undefined,
                callToAction: ad.callToAction || undefined,
              })),
            })),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save template");
      }

      lastSavedStateRef.current = editorState;
      initialStateRef.current = editorState;
      router.push("/templates");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  }, [editorState, templateId, router, validate]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      router.push("/templates");
    }
  }, [hasUnsavedChanges, router]);

  // Discard changes
  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    router.push("/templates");
  }, [router]);

  // Keep editing (close dialog)
  const handleKeepEditing = useCallback(() => {
    setShowDiscardDialog(false);
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setDraftStatus(null);
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      setDraftStatus("saving");
      // Simulate draft save (in real app, save to localStorage or backend)
      try {
        localStorage.setItem(
          `template-draft-${templateId || "new"}`,
          JSON.stringify(editorState)
        );
        setDraftStatus("saved");
      } catch {
        // Ignore localStorage errors
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editorState, hasUnsavedChanges, templateId]);

  // Capture focused input globally for variable insertion
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        if (target.id) {
          setFocusedFieldId(target.id);
          focusedInputRef.current = target;
        }
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, []);

  return (
    <div className={styles.editor}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            {templateId ? "Edit Template" : "Create Template"}
          </h1>
          <p className={styles.subtitle}>
            Build your campaign structure with variable placeholders
          </p>
        </div>

        <div className={styles.headerCenter}>
          {draftStatus && (
            <span className={styles.draftStatus} aria-live="polite">
              {draftStatus === "saving" && "Saving draft..."}
              {draftStatus === "saved" && "Draft saved"}
              {draftStatus === "unsaved" && "Unsaved changes"}
            </span>
          )}
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={handleCancel}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={styles.saveButton}
          >
            {isSaving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </header>

      {/* Error banner */}
      {saveError && (
        <div className={styles.errorBanner} role="alert">
          {saveError}
        </div>
      )}

      {/* Main content area */}
      <div className={styles.content}>
        {/* Main panel - Campaign Structure Builder */}
        <main className={styles.mainPanel}>
          <div className={styles.platformSelector}>
            <label htmlFor="platform-select" className={styles.platformLabel}>
              Platform <span className={styles.required}>*</span>
            </label>
            <select
              id="platform-select"
              value={editorState.platform}
              onChange={handlePlatformChange}
              className={styles.platformSelect}
              aria-label="Platform"
            >
              <option value="reddit">Reddit</option>
              <option value="google">Google</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>

          <CampaignStructureBuilder
            campaign={campaignConfig}
            adGroups={editorState.adGroups}
            onCampaignChange={handleCampaignChange}
            onAdGroupsChange={handleAdGroupsChange}
            availableVariables={variableNames}
            platformLimits={PLATFORM_LIMITS[editorState.platform]}
            ctaOptions={CTA_OPTIONS[editorState.platform]}
            errors={errors}
            onFieldFocus={handleFieldFocus}
          />
        </main>

        {/* Variable Picker Panel */}
        <VariablePickerPanel
          variables={availableVariables}
          onInsertVariable={handleInsertVariable}
          isCollapsed={variablePickerCollapsed}
          onToggleCollapse={() => setVariablePickerCollapsed((prev) => !prev)}
          focusedFieldId={focusedFieldId}
        />

        {/* Live Preview Panel */}
        <LivePreviewPanel
          previewData={previewData}
          sampleData={sampleData}
          isCollapsed={previewCollapsed}
          onToggleCollapse={() => setPreviewCollapsed((prev) => !prev)}
        />
      </div>

      {/* Discard Dialog */}
      {showDiscardDialog && (
        <div className={styles.dialogOverlay} role="dialog" aria-modal="true">
          <div className={styles.dialog}>
            <h2 className={styles.dialogTitle}>Unsaved Changes</h2>
            <p className={styles.dialogMessage}>
              You have unsaved changes. Are you sure you want to leave?
            </p>
            <div className={styles.dialogActions}>
              <button
                type="button"
                onClick={handleKeepEditing}
                className={styles.keepEditingButton}
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className={styles.discardButton}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { AdConfig, AdGroupConfig };
