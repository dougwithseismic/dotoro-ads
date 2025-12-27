"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { DataSourceCombobox } from "./DataSourceCombobox";
import { CreateDataSourceDrawer } from "./CreateDataSourceDrawer";
import { CampaignConfig as CampaignConfigComponent } from "./CampaignConfig";
import { HierarchyConfig } from "./HierarchyConfig";
import { InlineRuleBuilder } from "./InlineRuleBuilder";
import { PlatformSelector } from "./PlatformSelector";
import { GenerationPreview } from "./GenerationPreview";
import { ValidationMessage } from "./ValidationMessage";
import { HierarchyPreview } from "./HierarchyPreview";
import { CampaignSetName } from "./CampaignSetName";
import { useGenerateWizard } from "../hooks/useGenerateWizard";
import {
  useWizardPersistence,
  useWizardRestore,
  clearPersistedState,
} from "../hooks/useWizardPersistence";
import { useScrollToError, type FieldError } from "../hooks/useScrollToError";
import { mapConfigToWizardState } from "../utils/config-mapper";
import { api } from "@/lib/api-client";
import {
  validateCampaignConfig,
  validateHierarchyConfig,
  validatePlatformSelection,
  validateCampaignSetName,
  createDefaultAdGroup,
  interpolatePattern,
  type CampaignConfig as CampaignConfigType,
  type HierarchyConfig as HierarchyConfigType,
  type GenerateResponse,
} from "../types";
import type { CampaignSet } from "../../types";
import styles from "./CampaignEditor.module.css";

/**
 * Props for CampaignEditor component
 */
export interface CampaignEditorProps {
  /**
   * Mode of operation - 'create' for new campaign sets, 'edit' for existing ones
   * @default 'create'
   */
  mode?: "create" | "edit";

  /**
   * ID of the campaign set being edited (required in edit mode)
   */
  campaignSetId?: string;

  /**
   * Initial campaign set data to populate the editor (for edit mode)
   */
  initialData?: CampaignSet;

  /**
   * Callback when save/create is complete
   */
  onSaveComplete?: (result: { campaignSetId?: string }) => void;

  /**
   * Callback when user cancels editing
   */
  onCancel?: () => void;
}

// Section definitions for the accordion
type SectionId =
  | "campaign-set-name"
  | "data-source"
  | "rules"
  | "campaign-config"
  | "hierarchy"
  | "platform"
  | "preview";

interface Section {
  id: SectionId;
  title: string;
  subtitle: string;
  icon: string;
  optional?: boolean;
}

/**
 * Get sections with mode-specific titles
 */
function getSections(mode: "create" | "edit"): Section[] {
  return [
    {
      id: "campaign-set-name",
      title: "Campaign Set",
      subtitle: mode === "edit" ? "Edit campaign set details" : "Name your campaign set",
      icon: "◉",
    },
    {
      id: "data-source",
      title: "Data Source",
      subtitle: mode === "edit" ? "View or change data source" : "Select your campaign data",
      icon: "◎",
    },
    {
      id: "rules",
      title: "Data Rules",
      subtitle: "Filter and transform data",
      icon: "◇",
      optional: true,
    },
    {
      id: "campaign-config",
      title: "Campaign",
      subtitle: "Configure campaign settings",
      icon: "◈",
    },
    {
      id: "hierarchy",
      title: "Ad Structure",
      subtitle: "Define ad groups and ads",
      icon: "◆",
    },
    {
      id: "platform",
      title: "Platforms",
      subtitle: "Select target platforms",
      icon: "◐",
    },
    {
      id: "preview",
      title: mode === "edit" ? "Save" : "Create",
      subtitle: mode === "edit"
        ? "Review and save changes"
        : "Review and create your campaign set",
      icon: "◑",
    },
  ];
}

// Default initial campaign config
const DEFAULT_CAMPAIGN_CONFIG: CampaignConfigType = {
  namePattern: "",
};

// Default initial hierarchy config
const DEFAULT_HIERARCHY_CONFIG: HierarchyConfigType = {
  adGroups: [createDefaultAdGroup()],
};

export function CampaignEditor({
  mode = "create",
  campaignSetId,
  initialData,
  onSaveComplete,
  onCancel,
}: CampaignEditorProps = {}) {
  // Get mode-specific sections
  const sections = useMemo(() => getSections(mode), [mode]);

  // Compute initial state from initialData for edit mode
  const wizardInitialState = useMemo(() => {
    if (mode === "edit" && initialData) {
      return mapConfigToWizardState(initialData);
    }
    return undefined;
  }, [mode, initialData]);

  const {
    state,
    setCampaignSetName,
    setCampaignSetDescription,
    setDataSource,
    setAvailableColumns,
    setCampaignConfig,
    setHierarchyConfig,
    toggleRule,
    setRules,
    setInlineRules,
    togglePlatform,
    setPlatforms,
    setPlatformBudget,
    setStep,
    setGenerateResult,
    reset,
  } = useGenerateWizard({ initialState: wizardInitialState });

  const {
    campaignSetName,
    campaignSetDescription,
    dataSourceId,
    campaignConfig,
    hierarchyConfig,
    availableColumns,
  } = state;

  // Router for navigation after generation
  const router = useRouter();

  // In edit mode, start with all sections expanded for easy access
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    () => mode === "edit"
      ? new Set(sections.map(s => s.id))
      : new Set(["campaign-set-name"])
  );

  // Ref for scrolling to preview section
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle generation/save complete
  const handleGenerateComplete = useCallback(
    (result: GenerateResponse) => {
      setGenerateResult(result);

      // Use provided callback or default navigation
      if (onSaveComplete) {
        onSaveComplete({ campaignSetId: result.campaignSetId ?? campaignSetId });
      } else if (result.campaignSetId) {
        // Default: navigate to the campaign set page
        router.push(`/campaign-sets/${result.campaignSetId}`);
      }
    },
    [setGenerateResult, router, onSaveComplete, campaignSetId]
  );

  // Persistence - only enabled in create mode
  const isCreateMode = mode === "create";
  useWizardPersistence(state, isCreateMode && !state.generateResult);
  const restoreState = useMemo(
    () => ({
      setCampaignSetName,
      setCampaignSetDescription,
      setDataSource,
      setCampaignConfig,
      setHierarchyConfig,
      setRules,
      setPlatforms,
      setPlatformBudget,
      setStep,
    }),
    [
      setCampaignSetName,
      setCampaignSetDescription,
      setDataSource,
      setCampaignConfig,
      setHierarchyConfig,
      setRules,
      setPlatforms,
      setPlatformBudget,
      setStep,
    ]
  );
  const { restore, hasSession, clearSession } = useWizardRestore(restoreState);

  // Restore dialog state - only for create mode
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(mode === "edit");

  // Sample data for preview
  const [sampleData, setSampleData] = useState<Record<string, unknown>[]>([]);
  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const [sampleDataError, setSampleDataError] = useState<string | null>(null);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState<string | null>(null);

  // Data source creation drawer
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  // Check for saved session on mount
  useEffect(() => {
    if (!sessionChecked && hasSession) {
      setShowRestoreDialog(true);
    }
    setSessionChecked(true);
  }, [hasSession, sessionChecked]);

  const handleRestoreSession = useCallback(() => {
    restore();
    setShowRestoreDialog(false);
    // Expand all sections that have data
    setExpandedSections(new Set(sections.map((s) => s.id)));
  }, [restore]);

  const handleStartFresh = useCallback(() => {
    clearSession();
    setShowRestoreDialog(false);
  }, [clearSession]);

  const handleStartOver = useCallback(() => {
    clearPersistedState();
    reset();
    setExpandedSections(new Set(["campaign-set-name"]));
  }, [reset]);

  // Fetch sample data when data source changes
  useEffect(() => {
    if (dataSourceId) {
      setSampleDataLoading(true);
      setSampleDataError(null);
      api
        .get<{ data: Record<string, unknown>[]; total: number }>(
          `/api/v1/data-sources/${dataSourceId}/sample?limit=100`
        )
        .then((response) => {
          if (!response.data || !Array.isArray(response.data)) {
            console.warn("[CampaignEditor] Unexpected sample data response:", response);
            setSampleData([]);
            return;
          }
          setSampleData(response.data);
        })
        .catch((err) => {
          console.error("[CampaignEditor] Failed to fetch sample data:", err);
          const errorMessage =
            err instanceof Error ? err.message : "Failed to load sample data";
          setSampleDataError(errorMessage);
          setSampleData([]);
        })
        .finally(() => {
          setSampleDataLoading(false);
        });
    } else {
      setSampleData([]);
      setSampleDataError(null);
    }
  }, [dataSourceId]);

  // Track if we've already fetched columns for edit mode to prevent infinite loops
  const [editModeColumnsFetched, setEditModeColumnsFetched] = useState(false);

  // In edit mode, fetch fresh columns from the data source API
  // The stored config may have incomplete column data (missing sampleValues) or no columns at all
  useEffect(() => {
    if (mode === "edit" && dataSourceId && !editModeColumnsFetched) {
      // Fetch columns if we have none, OR if existing columns are missing sampleValues (stale data)
      const shouldFetchColumns = availableColumns.length === 0 ||
        !availableColumns.some(col => col.sampleValues && col.sampleValues.length > 0);

      if (shouldFetchColumns) {
        setColumnsLoading(true);
        setColumnsError(null);
        setEditModeColumnsFetched(true); // Mark as fetched to prevent infinite loops
        interface ColumnResponse {
          name: string;
          type: "string" | "number" | "boolean" | "date" | "unknown";
          sampleValues?: string[];
        }
        api
          .get<{ data: ColumnResponse[] }>(`/api/v1/data-sources/${dataSourceId}/columns`)
          .then((response) => {
            const columns = response.data || [];
            // Update only the columns, preserving campaignConfig and hierarchyConfig
            setAvailableColumns(columns);
          })
          .catch((err) => {
            console.error("[CampaignEditor] Failed to refresh columns in edit mode:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to load columns";
            setColumnsError(errorMessage);
          })
          .finally(() => {
            setColumnsLoading(false);
          });
      }
    }
  }, [mode, dataSourceId, availableColumns, setAvailableColumns, editModeColumnsFetched]);

  // Handle data source selection
  const handleDataSourceSelect = useCallback(
    async (id: string) => {
      setColumnsLoading(true);
      setColumnsError(null);
      try {
        interface ColumnResponse {
          name: string;
          type: "string" | "number" | "boolean" | "date" | "unknown";
          sampleValues?: string[];
        }
        const response = await api.get<{ data: ColumnResponse[] }>(
          `/api/v1/data-sources/${id}/columns`
        );
        const columns = response.data || [];
        setDataSource(id, columns);
        // Auto-expand next section
        setExpandedSections((prev) => new Set([...prev, "campaign-config"]));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load columns";
        setColumnsError(errorMessage);
      } finally {
        setColumnsLoading(false);
      }
    },
    [setDataSource]
  );

  // Handle data source created from drawer
  const handleDataSourceCreated = useCallback(
    (id: string) => {
      setShowCreateDrawer(false);
      handleDataSourceSelect(id);
    },
    [handleDataSourceSelect]
  );

  // Section handlers
  const handleCampaignConfigChange = useCallback(
    (config: CampaignConfigType) => {
      setCampaignConfig(config);
    },
    [setCampaignConfig]
  );

  const handleHierarchyConfigChange = useCallback(
    (config: HierarchyConfigType) => {
      setHierarchyConfig(config);
    },
    [setHierarchyConfig]
  );

  // Working configs
  const workingCampaignConfig = campaignConfig ?? DEFAULT_CAMPAIGN_CONFIG;
  const workingHierarchyConfig = hierarchyConfig ?? DEFAULT_HIERARCHY_CONFIG;

  // Memoize validation results for use in renderSectionContent
  const campaignConfigValidation = useMemo(
    () => (campaignConfig ? validateCampaignConfig(campaignConfig, availableColumns) : undefined),
    [campaignConfig, availableColumns]
  );

  const hierarchyConfigValidation = useMemo(
    () => (hierarchyConfig ? validateHierarchyConfig(hierarchyConfig, availableColumns) : undefined),
    [hierarchyConfig, availableColumns]
  );

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: SectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Memoize all section statuses at once to avoid repeated validation calls
  const sectionStatuses = useMemo(() => {
    const campaignSetNameValid = validateCampaignSetName(state).valid;
    const campaignConfigValid = campaignConfig
      ? validateCampaignConfig(campaignConfig, availableColumns).valid
      : false;
    const hierarchyConfigValid = hierarchyConfig
      ? validateHierarchyConfig(hierarchyConfig, availableColumns).valid
      : false;
    const platformValid = validatePlatformSelection(state.selectedPlatforms).valid;

    return {
      "campaign-set-name": campaignSetNameValid ? "complete" : "incomplete",
      "data-source": dataSourceId ? "complete" : "incomplete",
      "rules": "complete", // Optional
      "campaign-config": campaignConfig?.namePattern
        ? campaignConfigValid
          ? "complete"
          : "error"
        : "incomplete",
      "hierarchy": !hierarchyConfig
        ? "incomplete"
        : hierarchyConfigValid
          ? "complete"
          : "error",
      "platform": platformValid ? "complete" : "incomplete",
      "preview": "incomplete",
    } as Record<SectionId, "complete" | "incomplete" | "error">;
  }, [
    state,
    dataSourceId,
    campaignConfig,
    hierarchyConfig,
    availableColumns,
  ]);

  // Lookup function for section status (now just a map lookup, not validation)
  const getSectionStatus = useCallback(
    (sectionId: SectionId): "complete" | "incomplete" | "error" => {
      return sectionStatuses[sectionId] ?? "incomplete";
    },
    [sectionStatuses]
  );

  // Check if ready to generate (uses memoized statuses directly)
  const isReadyToGenerate = useMemo(() => {
    return (
      sectionStatuses["campaign-set-name"] === "complete" &&
      sectionStatuses["data-source"] === "complete" &&
      sectionStatuses["campaign-config"] === "complete" &&
      sectionStatuses["hierarchy"] === "complete" &&
      sectionStatuses["platform"] === "complete"
    );
  }, [sectionStatuses]);

  // Build field errors for scroll-to-error functionality
  const validationErrors = useMemo((): FieldError[] => {
    const errors: FieldError[] = [];

    // Campaign set name validation
    const nameValidation = validateCampaignSetName(state);
    if (!nameValidation.valid) {
      errors.push({
        fieldId: "campaign-set-name",
        message: nameValidation.errors[0] ?? "Campaign set name is invalid",
        sectionId: "campaign-set-name",
      });
    }

    // Data source validation
    if (!dataSourceId) {
      errors.push({
        fieldId: "data-source-combobox",
        message: "Please select a data source",
        sectionId: "data-source",
      });
    }

    // Campaign config validation
    if (campaignConfig) {
      const configValidation = validateCampaignConfig(campaignConfig, availableColumns);
      if (!configValidation.valid) {
        errors.push({
          fieldId: "campaign-name-pattern",
          message: configValidation.errors[0] ?? "Campaign name pattern is invalid",
          sectionId: "campaign-config",
        });
      }
    } else {
      errors.push({
        fieldId: "campaign-name-pattern",
        message: "Campaign name pattern is required",
        sectionId: "campaign-config",
      });
    }

    // Hierarchy config validation
    if (hierarchyConfig) {
      const hierarchyValidation = validateHierarchyConfig(hierarchyConfig, availableColumns);
      if (!hierarchyValidation.valid) {
        errors.push({
          fieldId: "hierarchy-config",
          message: hierarchyValidation.errors[0] ?? "Ad structure configuration is invalid",
          sectionId: "hierarchy",
        });
      }
    } else {
      errors.push({
        fieldId: "hierarchy-config",
        message: "Ad structure is required",
        sectionId: "hierarchy",
      });
    }

    // Platform selection validation
    const platformValidation = validatePlatformSelection(state.selectedPlatforms);
    if (!platformValidation.valid) {
      errors.push({
        fieldId: "platform-selector",
        message: platformValidation.errors[0] ?? "At least one platform must be selected",
        sectionId: "platform",
      });
    }

    return errors;
  }, [state, dataSourceId, campaignConfig, hierarchyConfig, availableColumns]);

  // Expand a section by ID
  const expandSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => new Set([...prev, sectionId as SectionId]));
  }, []);

  // Hook up scroll-to-error functionality
  const { scrollToFirstError, hasErrors } = useScrollToError({
    errors: validationErrors,
    expandedSections,
    onExpandSection: expandSection,
    scrollBehavior: "smooth",
    block: "center",
    focusAfterScroll: true,
    onErrorNotFound: (fieldId) => {
      // Log when an error element cannot be found for debugging
      console.warn(`[CampaignEditor] Could not scroll to error field: ${fieldId}`);
      // Fallback: expand all sections so the user can find the error manually
      setExpandedSections(new Set(sections.map((s) => s.id)));
    },
  });

  // Handle Generate/Save button click with validation
  const handleGenerateClick = useCallback(() => {
    if (!isReadyToGenerate) {
      // Scroll to first validation error
      scrollToFirstError();
      return;
    }

    // Ready to generate - expand preview section and scroll to it
    setExpandedSections(new Set(["preview"]));
    setTimeout(() => {
      previewSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [isReadyToGenerate, scrollToFirstError]);

  // Check if a section should be disabled (requires data source first)
  const isSectionDisabled = useCallback(
    (sectionId: SectionId): boolean => {
      // These sections require a data source to be selected
      const requiresDataSource: SectionId[] = [
        "rules",
        "campaign-config",
        "hierarchy",
        "preview",
      ];
      return requiresDataSource.includes(sectionId) && !dataSourceId;
    },
    [dataSourceId]
  );

  // Computed preview data
  const previewData = useMemo(() => {
    if (!sampleData || sampleData.length === 0) return null;
    const firstRow = sampleData[0];
    if (!firstRow) return null;

    // Count unique campaigns
    const uniqueCampaignNames = new Set<string>();
    if (campaignConfig?.namePattern) {
      for (const row of sampleData) {
        const name = interpolatePattern(campaignConfig.namePattern, row);
        if (name) uniqueCampaignNames.add(name);
      }
    }

    // Count ad groups and ads
    const adGroupCount = hierarchyConfig?.adGroups.length ?? 0;
    const adCount =
      hierarchyConfig?.adGroups.reduce((sum, ag) => sum + ag.ads.length, 0) ?? 0;
    const keywordCount =
      hierarchyConfig?.adGroups.reduce(
        (sum, ag) => sum + (ag.keywords?.length ?? 0),
        0
      ) ?? 0;

    return {
      sampleCount: sampleData.length,
      columnCount: availableColumns.length,
      campaignCount: uniqueCampaignNames.size,
      adGroupCount,
      adCount,
      keywordCount,
      platformCount: state.selectedPlatforms.length,
      ruleCount: state.ruleIds.length,
    };
  }, [
    sampleData,
    campaignConfig,
    hierarchyConfig,
    availableColumns,
    state.selectedPlatforms,
    state.ruleIds,
  ]);

  // Render section content
  const renderSectionContent = (sectionId: SectionId): ReactNode => {
    switch (sectionId) {
      case "campaign-set-name":
        return (
          <div className={styles.sectionBody}>
            <CampaignSetName
              name={campaignSetName}
              description={campaignSetDescription}
              onNameChange={setCampaignSetName}
              onDescriptionChange={setCampaignSetDescription}
            />
          </div>
        );

      case "data-source":
        return (
          <div className={styles.sectionBody}>
            {columnsLoading && (
              <div className={styles.loadingIndicator}>Loading columns...</div>
            )}
            {columnsError && (
              <ValidationMessage message={columnsError} type="error" />
            )}
            <DataSourceCombobox
              selectedId={dataSourceId}
              onSelect={handleDataSourceSelect}
              onCreateNew={() => setShowCreateDrawer(true)}
            />
          </div>
        );

      case "rules":
        return (
          <div className={styles.sectionBody}>
            <InlineRuleBuilder
              rules={state.inlineRules}
              onChange={setInlineRules}
              availableColumns={availableColumns}
            />
          </div>
        );

      case "campaign-config":
        return (
          <div className={styles.sectionBody}>
            {columnsLoading && (
              <div className={styles.loadingIndicator}>Loading columns...</div>
            )}
            <CampaignConfigComponent
              config={workingCampaignConfig}
              availableColumns={availableColumns}
              sampleData={sampleData}
              onChange={handleCampaignConfigChange}
              validation={campaignConfigValidation}
            />
          </div>
        );

      case "hierarchy":
        return (
          <div className={styles.sectionBody}>
            {sampleDataLoading && (
              <div className={styles.loadingIndicator}>
                Loading preview data...
              </div>
            )}
            {sampleDataError && (
              <ValidationMessage message={sampleDataError} type="error" />
            )}
            <HierarchyConfig
              config={workingHierarchyConfig}
              campaignConfig={workingCampaignConfig}
              availableColumns={availableColumns}
              sampleData={sampleData}
              onChange={handleHierarchyConfigChange}
              validation={hierarchyConfigValidation}
            />
          </div>
        );

      case "platform":
        return (
          <div className={styles.sectionBody}>
            <PlatformSelector
              selectedPlatforms={state.selectedPlatforms}
              platformBudgets={state.platformBudgets}
              availableColumns={availableColumns}
              onToggle={togglePlatform}
              onBudgetChange={setPlatformBudget}
              showError={false}
            />
          </div>
        );

      case "preview":
        return (
          <div className={styles.sectionBody}>
            {state.campaignConfig &&
            state.hierarchyConfig &&
            state.selectedPlatforms.length > 0 ? (
              <GenerationPreview
                campaignSetName={campaignSetName}
                campaignSetDescription={campaignSetDescription}
                dataSourceId={state.dataSourceId ?? ""}
                ruleIds={state.ruleIds}
                campaignConfig={state.campaignConfig}
                hierarchyConfig={state.hierarchyConfig}
                selectedPlatforms={state.selectedPlatforms}
                platformBudgets={state.platformBudgets}
                sampleData={sampleData}
                onGenerateComplete={handleGenerateComplete}
                mode={mode}
                campaignSetId={campaignSetId}
              />
            ) : (
              <div className={styles.incompleteMessage}>
                Complete all required sections before generating.
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Render accordion section
  const renderSection = (section: Section) => {
    const isExpanded = expandedSections.has(section.id);
    const status = getSectionStatus(section.id);
    const isDisabled = isSectionDisabled(section.id);

    return (
      <div
        key={section.id}
        className={`${styles.section} ${isExpanded ? styles.sectionExpanded : ""} ${isDisabled ? styles.sectionDisabled : ""}`}
        data-status={status}
      >
        <button
          type="button"
          className={styles.sectionHeader}
          onClick={() => !isDisabled && toggleSection(section.id)}
          aria-expanded={isExpanded}
          aria-controls={`section-content-${section.id}`}
          aria-disabled={isDisabled}
        >
          <div className={styles.sectionHeaderLeft}>
            <span className={styles.sectionIcon}>{section.icon}</span>
            <div className={styles.sectionTitleGroup}>
              <span className={styles.sectionTitle}>
                {section.title}
                {section.optional && (
                  <span className={styles.optionalBadge}>Optional</span>
                )}
              </span>
              <span className={styles.sectionSubtitle}>{section.subtitle}</span>
            </div>
          </div>
          <div className={styles.sectionHeaderRight}>
            <span
              className={`${styles.statusIndicator} ${styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}
            >
              {status === "complete" && "✓"}
              {status === "error" && "!"}
            </span>
            <span
              className={`${styles.expandIcon} ${isExpanded ? styles.expandIconRotated : ""}`}
            >
              ▾
            </span>
          </div>
        </button>

        <div
          ref={section.id === "preview" ? previewSectionRef : undefined}
          id={`section-content-${section.id}`}
          className={styles.sectionContent}
          aria-hidden={!isExpanded}
        >
          {isExpanded && renderSectionContent(section.id)}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.editor}>
      {/* Restore Session Dialog */}
      {showRestoreDialog && (
        <div
          className={styles.dialogOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-dialog-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              handleStartFresh();
            }
          }}
          onClick={(e) => {
            // Close on backdrop click
            if (e.target === e.currentTarget) {
              handleStartFresh();
            }
          }}
        >
          <div ref={dialogRef} className={styles.dialog}>
            <h3 id="restore-dialog-title" className={styles.dialogTitle}>
              Resume Previous Session?
            </h3>
            <p className={styles.dialogText}>
              You have an unfinished campaign set. Would you like to continue
              where you left off?
            </p>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.dialogButtonSecondary}
                onClick={handleStartFresh}
              >
                Start Fresh
              </button>
              <button
                type="button"
                className={styles.dialogButtonPrimary}
                onClick={handleRestoreSession}
                autoFocus
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            {mode === "edit" ? "Edit Campaign Set" : "Create Campaign Set"}
          </h1>
          <p className={styles.subtitle}>
            {mode === "edit"
              ? "Modify your campaign set configuration"
              : "Build a campaign set from your data sources"}
          </p>
        </div>
        <div className={styles.headerRight}>
          {/* Cancel button for edit mode */}
          {mode === "edit" && onCancel && (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          {/* Start Over button for create mode */}
          {mode === "create" && dataSourceId && (
            <button
              type="button"
              className={styles.startOverButton}
              onClick={handleStartOver}
            >
              Start Over
            </button>
          )}
          <button
            type="button"
            className={`${styles.generateButton} ${hasErrors ? styles.generateButtonDisabled : ""}`}
            aria-disabled={hasErrors}
            onClick={handleGenerateClick}
          >
            <span>{mode === "edit" ? "Save Changes" : "Generate"}</span>
            <span className={styles.generateButtonArrow}>→</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.main}>
        {/* Left: Accordion Sections */}
        <div className={styles.accordionPanel}>
          {sections.map(renderSection)}
        </div>

        {/* Right: Preview Panel */}
        <aside className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <h2 className={styles.previewTitle}>Live Preview</h2>
            <span className={styles.previewBadge}>
              <span className={styles.previewBadgeDot} />
              Live
            </span>
          </div>

          <div className={styles.previewContent}>
            {/* Data Source Summary */}
            <div className={styles.previewSection}>
              <h4 className={styles.previewSectionTitle}>Data Source</h4>
              {dataSourceId ? (
                <div className={styles.previewStats}>
                  <div className={styles.previewStatRow}>
                    <span className={styles.previewStatLabel}>Columns</span>
                    <span className={styles.previewStatValue}>
                      {previewData?.columnCount ?? 0}
                    </span>
                  </div>
                  <div className={styles.previewStatRow}>
                    <span className={styles.previewStatLabel}>Sample Rows</span>
                    <span className={styles.previewStatValue}>
                      {previewData?.sampleCount ?? 0}
                    </span>
                  </div>
                </div>
              ) : (
                <p className={styles.previewEmpty}>No data source selected</p>
              )}
            </div>

            {/* Hierarchy Preview - Main Preview Section */}
            <div className={`${styles.previewSection} ${styles.previewSectionMain}`}>
              <h4 className={styles.previewSectionTitle}>Campaign Hierarchy</h4>
              {sampleData.length > 0 ? (
                <HierarchyPreview
                  campaignConfig={workingCampaignConfig}
                  hierarchyConfig={workingHierarchyConfig}
                  sampleData={sampleData}
                  selectedPlatforms={state.selectedPlatforms}
                  loading={sampleDataLoading}
                />
              ) : dataSourceId ? (
                <p className={styles.previewEmpty}>
                  Loading sample data...
                </p>
              ) : (
                <p className={styles.previewEmpty}>
                  Select a data source to see hierarchy preview
                </p>
              )}
            </div>

            {/* Platforms */}
            <div className={styles.previewSection}>
              <h4 className={styles.previewSectionTitle}>Platforms</h4>
              {state.selectedPlatforms.length > 0 ? (
                <div className={styles.previewPlatforms}>
                  {state.selectedPlatforms.map((platform) => (
                    <span
                      key={platform}
                      className={`${styles.previewPlatformBadge} ${styles[`platform${platform.charAt(0).toUpperCase() + platform.slice(1)}`]}`}
                    >
                      {platform === "google" && "Google Ads"}
                      {platform === "reddit" && "Reddit"}
                      {platform === "facebook" && "Facebook"}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.previewEmpty}>No platforms selected</p>
              )}
            </div>

            {/* Progress */}
            <div className={styles.previewSection}>
              <h4 className={styles.previewSectionTitle}>Progress</h4>
              <div className={styles.progressList}>
                {sections.filter((s) => s.id !== "preview").map((section) => {
                  const status = getSectionStatus(section.id);
                  return (
                    <div key={section.id} className={styles.progressItem}>
                      <span
                        className={`${styles.progressIndicator} ${styles[`progress${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}
                      >
                        {status === "complete" ? "✓" : status === "error" ? "!" : "○"}
                      </span>
                      <span className={styles.progressLabel}>
                        {section.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Create Data Source Drawer */}
      <CreateDataSourceDrawer
        isOpen={showCreateDrawer}
        onClose={() => setShowCreateDrawer(false)}
        onCreated={handleDataSourceCreated}
      />
    </div>
  );
}
