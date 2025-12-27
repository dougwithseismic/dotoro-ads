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
} from "../types";
import styles from "./CampaignEditor.module.css";

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

const SECTIONS: Section[] = [
  {
    id: "campaign-set-name",
    title: "Campaign Set",
    subtitle: "Name your campaign set",
    icon: "◉",
  },
  {
    id: "data-source",
    title: "Data Source",
    subtitle: "Select your campaign data",
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
    title: "Create",
    subtitle: "Review and create your campaign set",
    icon: "◑",
  },
];

// Default initial campaign config
const DEFAULT_CAMPAIGN_CONFIG: CampaignConfigType = {
  namePattern: "",
};

// Default initial hierarchy config
const DEFAULT_HIERARCHY_CONFIG: HierarchyConfigType = {
  adGroups: [createDefaultAdGroup()],
};

export function CampaignEditor() {
  const {
    state,
    setCampaignSetName,
    setCampaignSetDescription,
    setDataSource,
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
  } = useGenerateWizard();

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

  // Track which sections are expanded (multiple can be open)
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    () => new Set(["campaign-set-name"])
  );

  // Ref for scrolling to preview section
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle generation complete - navigate to campaign set page
  const handleGenerateComplete = useCallback(
    (result: import("../types").GenerateResponse) => {
      setGenerateResult(result);
      // Navigate to the campaign set page if we have an ID
      if (result.campaignSetId) {
        router.push(`/campaign-sets/${result.campaignSetId}`);
      }
    },
    [setGenerateResult, router]
  );

  // Persistence
  useWizardPersistence(state, !state.generateResult);
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

  // Restore dialog state
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

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
    setExpandedSections(new Set(SECTIONS.map((s) => s.id)));
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
          <h1 className={styles.title}>Create Campaign Set</h1>
          <p className={styles.subtitle}>
            Build a campaign set from your data sources
          </p>
        </div>
        <div className={styles.headerRight}>
          {dataSourceId && (
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
            className={`${styles.generateButton} ${!isReadyToGenerate ? styles.generateButtonDisabled : ""}`}
            disabled={!isReadyToGenerate}
            onClick={() => {
              setExpandedSections(new Set(["preview"]));
              setTimeout(() => {
                previewSectionRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
          >
            <span>Generate</span>
            <span className={styles.generateButtonArrow}>→</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.main}>
        {/* Left: Accordion Sections */}
        <div className={styles.accordionPanel}>
          {SECTIONS.map(renderSection)}
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
                {SECTIONS.filter((s) => s.id !== "preview").map((section) => {
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
