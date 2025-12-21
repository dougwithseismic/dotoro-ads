"use client";

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DataPreviewEnhanced } from "../components/DataPreviewEnhanced";
import { ColumnMapperEnhanced } from "../components/ColumnMapperEnhanced";
import { ValidationPanel } from "../components/ValidationPanel";
import type { DataSourceDetail, ColumnMapping, ValidationError } from "../types";
import styles from "./DataSourceDetail.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type TabId = "preview" | "mapping" | "validation";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "preview", label: "Preview" },
  { id: "mapping", label: "Mapping" },
  { id: "validation", label: "Validation" },
];

// Mock data for development
const createMockDataSource = (id: string): DataSourceDetail => ({
  id,
  name: "Product Catalog",
  type: "csv",
  rowCount: 1000,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-20"),
  status: "ready",
  columns: ["product_name", "price", "category", "description"],
  columnMappings: [
    { sourceColumn: "product_name", normalizedName: "name", dataType: "string" },
    { sourceColumn: "price", normalizedName: "price", dataType: "currency" },
    { sourceColumn: "category", normalizedName: "category", dataType: "string" },
    { sourceColumn: "description", normalizedName: "description", dataType: "string" },
  ],
  data: Array.from({ length: 100 }, (_, i) => {
    const categories = ["Electronics", "Clothing", "Home", "Sports"];
    return {
      product_name: `Product ${i + 1}`,
      price: (Math.random() * 100).toFixed(2),
      category: categories[i % 4] as string,
      description: `Description for product ${i + 1}`,
    };
  }),
  validationErrors: [
    { column: "price", row: 5, message: "Invalid currency format", severity: "error" },
    { column: "price", row: 15, message: "Invalid currency format", severity: "error" },
    { column: "category", row: 12, message: "Unknown category", severity: "warning" },
  ],
});

export default function DataSourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dataSource, setDataSource] = useState<DataSourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("preview");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterToRow, setFilterToRow] = useState<number | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());

  const fetchDataSource = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use mock data for development
      if (process.env.NODE_ENV === "development") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setDataSource(createMockDataSource(id));
        return;
      }

      const response = await fetch(`${API_BASE}/api/v1/data-sources/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Data source not found");
        }
        throw new Error("Failed to load data source");
      }

      const data: DataSourceDetail = await response.json();
      setDataSource(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDataSource();
  }, [fetchDataSource]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleMappingChange = (mappings: ColumnMapping[]) => {
    if (!dataSource) return;

    setDataSource({
      ...dataSource,
      columnMappings: mappings,
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!dataSource || !hasChanges) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/v1/data-sources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnMappings: dataSource.columnMappings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      const updated = await response.json();
      setDataSource(updated);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditName = () => {
    if (!dataSource) return;
    setEditedName(dataSource.name);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!dataSource || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    if (editedName === dataSource.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/data-sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editedName }),
      });

      if (!response.ok) {
        throw new Error("Failed to update name");
      }

      setDataSource({ ...dataSource, name: editedName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  };

  const handleDelete = async () => {
    if (!dataSource) return;

    try {
      setDeleting(true);

      const response = await fetch(`${API_BASE}/api/v1/data-sources/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete data source");
      }

      router.push("/data-sources");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    setFilterToRow(null);
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let newIndex = currentIndex;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      newIndex = (currentIndex + 1) % TABS.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      newIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      newIndex = TABS.length - 1;
    } else {
      return;
    }

    const newTab = TABS[newIndex];
    if (newTab) {
      setActiveTab(newTab.id);
      tabRefs.current.get(newTab.id)?.focus();
    }
  };

  const handleValidationErrorClick = (error: ValidationError) => {
    setFilterToRow(error.row);
    setActiveTab("preview");
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <span>Loading data source...</span>
        </div>
      </div>
    );
  }

  if (error && !dataSource) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button onClick={fetchDataSource} className={styles.retryButton}>
              Try Again
            </button>
            <Link href="/data-sources" className={styles.backLink}>
              Back to Data Sources
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!dataSource) {
    return null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link href="/data-sources" className={styles.breadcrumbLink}>
            Data Sources
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>{dataSource.name}</span>
        </div>

        <div className={styles.headerMain}>
          <div className={styles.headerContent}>
            <div className={styles.titleRow}>
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleNameKeyDown}
                  className={styles.titleInput}
                  aria-label="Data source name"
                />
              ) : (
                <h1 className={styles.title}>{dataSource.name}</h1>
              )}
              {!isEditingName && (
                <button
                  onClick={handleStartEditName}
                  className={styles.editNameButton}
                  aria-label="Edit name"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11.5 2.5L13.5 4.5M2 14H4L12.5 5.5C13.0523 4.94772 13.0523 4.05228 12.5 3.5L12.5 3.5C11.9477 2.94772 11.0523 2.94772 10.5 3.5L2 12V14Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className={styles.meta}>
              <span className={`${styles.typeBadge} ${styles[dataSource.type]}`}>
                {dataSource.type.toUpperCase()}
              </span>
              <span className={styles.metaItem}>
                {dataSource.rowCount.toLocaleString()} rows
              </span>
              <span className={styles.metaItem}>
                Updated {formatDate(dataSource.updatedAt)}
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className={styles.deleteButton}
              aria-label="Delete data source"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 4H14M5.333 4V2.667C5.333 2.298 5.632 2 6 2H10C10.368 2 10.667 2.298 10.667 2.667V4M12.667 4V13.333C12.667 13.702 12.368 14 12 14H4C3.632 14 3.333 13.702 3.333 13.333V4H12.667Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Delete
            </button>

            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className={styles.saveButton}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className={styles.inlineError} role="alert">
          {error}
          <button
            onClick={() => setError(null)}
            className={styles.dismissError}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div
        className={styles.tabList}
        role="tablist"
        aria-label="Data source sections"
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ""}`}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, index)}
          >
            {tab.label}
            {tab.id === "validation" && dataSource.validationErrors && dataSource.validationErrors.length > 0 && (
              <span className={styles.tabBadge}>
                {dataSource.validationErrors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className={styles.content}>
        <div
          role="tabpanel"
          id="tabpanel-preview"
          aria-labelledby="tab-preview"
          hidden={activeTab !== "preview"}
          className={styles.tabPanel}
        >
          {activeTab === "preview" && (
            <DataPreviewEnhanced
              columns={dataSource.columns || []}
              data={dataSource.data}
              columnMappings={dataSource.columnMappings}
              highlightRow={filterToRow}
              onClearHighlight={() => setFilterToRow(null)}
            />
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-mapping"
          aria-labelledby="tab-mapping"
          hidden={activeTab !== "mapping"}
          className={styles.tabPanel}
        >
          {activeTab === "mapping" && (
            <ColumnMapperEnhanced
              mappings={dataSource.columnMappings}
              onChange={handleMappingChange}
              disabled={dataSource.status === "processing"}
            />
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-validation"
          aria-labelledby="tab-validation"
          hidden={activeTab !== "validation"}
          className={styles.tabPanel}
        >
          {activeTab === "validation" && (
            <ValidationPanel
              errors={dataSource.validationErrors || []}
              onErrorClick={handleValidationErrorClick}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div
          className={styles.dialogOverlay}
          onClick={() => setShowDeleteDialog(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className={styles.dialog}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-dialog-title" className={styles.dialogTitle}>
              Delete Data Source
            </h2>
            <p className={styles.dialogMessage}>
              Are you sure you want to delete &quot;{dataSource.name}&quot;? This action cannot be undone.
            </p>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className={styles.cancelButton}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className={styles.confirmDeleteButton}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
