"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTeam } from "@/lib/teams/context";
import {
  useDesignTemplates,
  type DesignTemplate,
  type DesignTemplateStatus,
} from "@/lib/hooks/useDesignTemplates";
import styles from "./page.module.css";

/**
 * Design Templates Gallery Page
 *
 * Lists all design templates with:
 * - Grid of template cards with thumbnails
 * - Search and filter by status
 * - Create new template button
 * - Template actions: Edit, Duplicate, Delete
 */
export default function DesignTemplatesPage() {
  const params = useParams();
  const router = useRouter();
  const { currentTeam } = useTeam();
  const teamSlug = params.teamSlug as string;
  const locale = params.locale as string;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DesignTemplateStatus>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    templates,
    loading,
    error,
    total,
    fetchTemplates,
    deleteTemplate,
    duplicateTemplate,
  } = useDesignTemplates(currentTeam?.id);

  // Fetch templates when filters change
  useEffect(() => {
    if (currentTeam?.id) {
      fetchTemplates({
        search: debouncedSearch || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        sortBy: "updatedAt",
        sortOrder: "desc",
      });
    }
  }, [currentTeam?.id, debouncedSearch, statusFilter, fetchTemplates]);

  /**
   * Handle template deletion
   */
  const handleDelete = useCallback(
    async (template: DesignTemplate) => {
      if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) {
        return;
      }

      try {
        await deleteTemplate(template.id);
      } catch (err) {
        console.error("Failed to delete template:", err);
      }
    },
    [deleteTemplate]
  );

  /**
   * Handle template duplication
   */
  const handleDuplicate = useCallback(
    async (template: DesignTemplate) => {
      try {
        const duplicated = await duplicateTemplate(template.id);
        router.push(`/${locale}/${teamSlug}/design-templates/${duplicated.id}/edit`);
      } catch (err) {
        console.error("Failed to duplicate template:", err);
      }
    },
    [duplicateTemplate, router, locale, teamSlug]
  );

  // Loading state
  if (!currentTeam) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading team...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button
            onClick={() => fetchTemplates()}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Design Templates</h1>
            <p className={styles.subtitle}>
              Create and manage visual ad templates with the canvas editor
            </p>
          </div>
          <Link
            href={`/${locale}/${teamSlug}/design-templates/new`}
            className={styles.createButton}
          >
            <PlusIcon />
            Create Template
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <SearchIcon />
          <input
            type="search"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Search templates"
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            const val = e.target.value;
            const isValidStatus = (v: string): v is 'all' | 'draft' | 'active' | 'archived' =>
              ['all', 'draft', 'active', 'archived'].includes(v);
            if (isValidStatus(val)) setStatusFilter(val);
          }}
          className={styles.statusFilter}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Template count */}
      {!loading && (
        <div className={styles.countBar}>
          <span className={styles.count}>
            {total} template{total !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className={styles.loadingGrid}>
          <div className={styles.spinner} />
          <span>Loading templates...</span>
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div className={styles.grid}>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              teamSlug={teamSlug}
              locale={locale}
              onDelete={() => handleDelete(template)}
              onDuplicate={() => handleDuplicate(template)}
            />
          ))}

          {/* Empty state */}
          {templates.length === 0 && (
            <div className={styles.empty}>
              <EmptyIcon />
              <h3>No templates yet</h3>
              <p>Create your first design template to get started</p>
              <Link
                href={`/${locale}/${teamSlug}/design-templates/new`}
                className={styles.emptyCreateButton}
              >
                <PlusIcon />
                Create Template
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TemplateCard Component
// ============================================================================

interface TemplateCardProps {
  template: DesignTemplate;
  teamSlug: string;
  locale: string;
  onDelete: () => void;
  onDuplicate: () => void;
}

function TemplateCard({
  template,
  teamSlug,
  locale,
  onDelete,
  onDuplicate,
}: TemplateCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={styles.card}>
      <Link
        href={`/${locale}/${teamSlug}/design-templates/${template.id}/edit`}
        className={styles.cardLink}
      >
        <div className={styles.thumbnail}>
          {template.thumbnailUrl ? (
            <img
              src={template.thumbnailUrl}
              alt={template.name}
              className={styles.thumbnailImage}
            />
          ) : (
            <div className={styles.placeholderThumb}>
              <span className={styles.ratioLabel}>{template.primaryAspectRatio}</span>
            </div>
          )}
        </div>
      </Link>

      <div className={styles.cardInfo}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{template.name}</h3>
          <div className={styles.menuWrapper}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Template actions"
              aria-expanded={showMenu}
            >
              <MoreIcon />
            </button>
            {showMenu && (
              <>
                <div
                  className={styles.menuBackdrop}
                  onClick={() => setShowMenu(false)}
                />
                <div className={styles.menu}>
                  <Link
                    href={`/${locale}/${teamSlug}/design-templates/${template.id}/edit`}
                    className={styles.menuItem}
                    onClick={() => setShowMenu(false)}
                  >
                    <EditIcon />
                    Edit
                  </Link>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate();
                    }}
                  >
                    <DuplicateIcon />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                  >
                    <DeleteIcon />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.cardMeta}>
          <span className={styles.ratio}>{template.primaryAspectRatio}</span>
          <span
            className={`${styles.status} ${styles[`status${capitalize(template.status)}`]}`}
          >
            {template.status}
          </span>
        </div>

        {template.description && (
          <p className={styles.cardDescription}>{template.description}</p>
        )}

        <span className={styles.cardDate}>
          Updated {formatRelativeDate(template.updatedAt)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

// ============================================================================
// Icon Components
// ============================================================================

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="4" />
      <path d="M10 10l3 3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 2.5l2 2L4.5 11.5H2.5v-2l7-7z" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="8" height="8" rx="1" />
      <path d="M10 2H3a1 1 0 00-1 1v7" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M11 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="6" width="36" height="36" rx="4" />
      <path d="M6 18h36M18 6v36" />
      <circle cx="30" cy="30" r="6" strokeDasharray="3 2" />
    </svg>
  );
}
