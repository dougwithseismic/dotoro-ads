"use client";

import { useCallback } from "react";
import { AggregationRow } from "./AggregationRow";
import styles from "./AggregationList.module.css";
import type { AggregationConfig } from "../../types";

interface AggregationListProps {
  aggregations: AggregationConfig[];
  columns: string[];
  onChange: (aggregations: AggregationConfig[]) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function AggregationList({
  aggregations,
  columns,
  onChange,
}: AggregationListProps) {
  const handleAdd = useCallback(() => {
    const newAggregation: AggregationConfig = {
      id: generateId(),
      function: "COUNT",
      outputField: "",
    };
    onChange([...aggregations, newAggregation]);
  }, [aggregations, onChange]);

  const handleChange = useCallback(
    (index: number, aggregation: AggregationConfig) => {
      const updated = [...aggregations];
      updated[index] = aggregation;
      onChange(updated);
    },
    [aggregations, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const updated = aggregations.filter((_, i) => i !== index);
      onChange(updated);
    },
    [aggregations, onChange]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Aggregations *</h3>
          <p className={styles.description}>
            Define how to aggregate values for each group
          </p>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAdd}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Add Aggregation
        </button>
      </div>

      {aggregations.length === 0 ? (
        <div className={styles.empty}>
          <p>No aggregations defined yet.</p>
          <button
            type="button"
            className={styles.addEmptyButton}
            onClick={handleAdd}
          >
            Add Your First Aggregation
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {aggregations.map((agg, index) => (
            <AggregationRow
              key={agg.id || index}
              aggregation={agg}
              columns={columns}
              index={index}
              onChange={(updated) => handleChange(index, updated)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
