"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  SourceSelector,
  GroupByPicker,
  AggregationList,
  TransformPreview,
} from "./components";
import styles from "./TransformBuilder.module.css";
import { useDataSources } from "../hooks/useDataSources";
import { useCreateTransform } from "../hooks/useCreateTransform";
import { useUpdateTransform } from "../hooks/useUpdateTransform";
import { usePreviewTransform } from "../hooks/usePreviewTransform";
import type {
  Transform,
  TransformConfig,
  AggregationConfig,
  DataSource,
} from "../types";

interface TransformBuilderProps {
  initialTransform?: Transform;
  transformId?: string;
}

// UI state config allows empty array for groupBy during building
interface TransformConfigState {
  groupBy: string | string[];
  aggregations: AggregationConfig[];
  includeGroupKey: boolean;
  outputFieldPrefix?: string;
}

interface TransformState {
  name: string;
  description: string;
  sourceDataSourceId: string;
  enabled: boolean;
  config: TransformConfigState;
}

export default function TransformBuilder({
  initialTransform,
  transformId,
}: TransformBuilderProps) {
  const router = useRouter();
  const isEditing = !!transformId;

  const { dataSources, loading: loadingDataSources, error: dataSourcesError } =
    useDataSources();
  const { createTransform, loading: creating } = useCreateTransform();
  const { updateTransform, loading: updating } = useUpdateTransform();
  const { preview, loading: loadingPreview, error: previewError, fetchPreview } =
    usePreviewTransform(500);

  const [transform, setTransform] = useState<TransformState>(() => {
    if (initialTransform) {
      return {
        name: initialTransform.name,
        description: initialTransform.description || "",
        sourceDataSourceId: initialTransform.sourceDataSourceId,
        enabled: initialTransform.enabled,
        config: initialTransform.config,
      };
    }
    return {
      name: "",
      description: "",
      sourceDataSourceId: "",
      enabled: true,
      config: {
        groupBy: [],
        aggregations: [],
        includeGroupKey: true,
      },
    };
  });

  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Get selected data source with columns
  const selectedDataSource = useMemo<DataSource | undefined>(() => {
    return dataSources.find((ds) => ds.id === transform.sourceDataSourceId);
  }, [dataSources, transform.sourceDataSourceId]);

  const columns = useMemo<string[]>(() => {
    return selectedDataSource?.columns || [];
  }, [selectedDataSource]);

  // Fetch preview when config changes
  useEffect(() => {
    if (
      showPreview &&
      transform.sourceDataSourceId &&
      transform.config.groupBy.length > 0 &&
      transform.config.aggregations.length > 0
    ) {
      // Validate aggregations have outputField
      const validAggregations = transform.config.aggregations.every(
        (agg) => agg.outputField
      );
      if (validAggregations) {
        fetchPreview(transform.sourceDataSourceId, transform.config);
      }
    }
  }, [
    showPreview,
    transform.sourceDataSourceId,
    transform.config,
    fetchPreview,
  ]);

  const handleSourceChange = useCallback((sourceId: string) => {
    setTransform((prev) => ({
      ...prev,
      sourceDataSourceId: sourceId,
      config: {
        ...prev.config,
        groupBy: [], // Reset group by when source changes
      },
    }));
  }, []);

  const handleGroupByChange = useCallback((fields: string[]) => {
    setTransform((prev) => {
      const groupBy: string | string[] =
        fields.length === 0
          ? []
          : fields.length === 1 && fields[0]
            ? fields[0]
            : fields;
      return {
        ...prev,
        config: {
          ...prev.config,
          groupBy,
        },
      };
    });
  }, []);

  const handleAggregationsChange = useCallback(
    (aggregations: AggregationConfig[]) => {
      setTransform((prev) => ({
        ...prev,
        config: {
          ...prev.config,
          aggregations,
        },
      }));
    },
    []
  );

  const validate = useCallback((): boolean => {
    if (!transform.name.trim()) {
      setError("Transform name is required");
      return false;
    }

    if (!transform.sourceDataSourceId) {
      setError("Please select a source data source");
      return false;
    }

    const groupByArray = Array.isArray(transform.config.groupBy)
      ? transform.config.groupBy
      : [transform.config.groupBy];

    if (groupByArray.length === 0 || groupByArray.every((f) => !f)) {
      setError("Please select at least one field to group by");
      return false;
    }

    if (transform.config.aggregations.length === 0) {
      setError("Please add at least one aggregation");
      return false;
    }

    for (const agg of transform.config.aggregations) {
      if (!agg.outputField) {
        setError("All aggregations must have an output field name");
        return false;
      }
      if (!agg.outputField.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        setError(
          `Invalid output field name: ${agg.outputField}. Must start with letter or underscore and contain only alphanumeric characters and underscores.`
        );
        return false;
      }
    }

    return true;
  }, [transform]);

  const handleSave = useCallback(async () => {
    if (!validate()) {
      return;
    }

    setError(null);

    try {
      // Clean up aggregations for API - remove local id field
      const cleanAggregations = transform.config.aggregations.map(
        ({ id, ...rest }) => rest
      );

      const payload = {
        name: transform.name.trim(),
        description: transform.description.trim() || undefined,
        sourceDataSourceId: transform.sourceDataSourceId,
        config: {
          ...transform.config,
          aggregations: cleanAggregations,
        },
        enabled: transform.enabled,
      };

      if (isEditing && transformId) {
        await updateTransform(transformId, payload);
      } else {
        await createTransform(payload);
      }

      router.push("/transforms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save transform");
    }
  }, [transform, isEditing, transformId, createTransform, updateTransform, router, validate]);

  const groupByArray = useMemo(() => {
    if (Array.isArray(transform.config.groupBy)) {
      return transform.config.groupBy;
    }
    return transform.config.groupBy ? [transform.config.groupBy] : [];
  }, [transform.config.groupBy]);

  const saving = creating || updating;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            {isEditing ? "Edit Transform" : "Create Transform"}
          </h1>
          <p className={styles.subtitle}>
            Define how to group and aggregate your data source
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.previewButton}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push("/transforms")}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : isEditing
                ? "Update Transform"
                : "Create Transform"}
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.mainPanel}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Transform Details</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="transform-name" className={styles.label}>
                  Name *
                </label>
                <input
                  id="transform-name"
                  type="text"
                  className={styles.input}
                  value={transform.name}
                  onChange={(e) =>
                    setTransform({ ...transform, name: e.target.value })
                  }
                  placeholder="Enter transform name"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={transform.enabled}
                    onChange={(e) =>
                      setTransform({ ...transform, enabled: e.target.checked })
                    }
                  />
                  <span>Transform enabled</span>
                </label>
              </div>
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="transform-description" className={styles.label}>
                  Description
                </label>
                <textarea
                  id="transform-description"
                  className={styles.textarea}
                  value={transform.description}
                  onChange={(e) =>
                    setTransform({ ...transform, description: e.target.value })
                  }
                  placeholder="Describe what this transform does"
                  rows={2}
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Source Data Source</h2>
            <SourceSelector
              dataSources={dataSources}
              selectedId={transform.sourceDataSourceId || null}
              onChange={handleSourceChange}
              loading={loadingDataSources}
              error={dataSourcesError}
            />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Group By</h2>
            <GroupByPicker
              columns={columns}
              selectedFields={groupByArray}
              onChange={handleGroupByChange}
            />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Aggregations</h2>
            <AggregationList
              aggregations={transform.config.aggregations}
              columns={columns}
              onChange={handleAggregationsChange}
            />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Options</h2>
            <div className={styles.optionsGrid}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={transform.config.includeGroupKey}
                  onChange={(e) =>
                    setTransform({
                      ...transform,
                      config: {
                        ...transform.config,
                        includeGroupKey: e.target.checked,
                      },
                    })
                  }
                />
                <span>Include group key fields in output</span>
              </label>
              <div className={styles.formGroup}>
                <label className={styles.label}>Output Field Prefix</label>
                <input
                  type="text"
                  className={styles.inputSmall}
                  value={transform.config.outputFieldPrefix || ""}
                  onChange={(e) =>
                    setTransform({
                      ...transform,
                      config: {
                        ...transform.config,
                        outputFieldPrefix: e.target.value || undefined,
                      },
                    })
                  }
                  placeholder="e.g., agg_"
                />
              </div>
            </div>
          </section>
        </div>

        {showPreview && (
          <div className={styles.previewPanel}>
            <TransformPreview
              preview={preview}
              loading={loadingPreview}
              error={previewError}
            />
          </div>
        )}
      </div>
    </div>
  );
}
