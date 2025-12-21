"use client";

import { useState } from "react";
import styles from "./RulePreview.module.css";
import type { Rule } from "../types";

interface TestResult {
  row: Record<string, unknown>;
  matched: boolean;
  modifiedData?: Record<string, unknown>;
}

interface RulePreviewProps {
  rule: Rule;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const SAMPLE_DATA = [
  { product_name: "iPhone 15", price: 999, category: "Electronics", stock: 50 },
  { product_name: "Basic T-Shirt", price: 25, category: "Clothing", stock: 200 },
  { product_name: "Laptop Pro", price: 1500, category: "Electronics", stock: 5 },
  { product_name: "Coffee Mug", price: 12, category: "Home", stock: 100 },
];

export default function RulePreview({ rule }: RulePreviewProps) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setError(null);

    try {
      // Test draft rule directly without persisting
      const testResponse = await fetch(`${API_BASE}/api/v1/rules/test-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conditionGroup: rule.conditionGroup,
          actions:
            rule.actions.length > 0
              ? rule.actions
              : [{ id: "a1", type: "skip" }],
          sampleData: SAMPLE_DATA,
        }),
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to test rule");
      }

      const testResult = await testResponse.json();
      setResults(
        testResult.results.map(
          (r: {
            originalData: Record<string, unknown>;
            matched: boolean;
            modifiedData?: Record<string, unknown>;
          }) => ({
            row: r.originalData,
            matched: r.matched,
            modifiedData: r.modifiedData,
          })
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const matchedCount = results?.filter((r) => r.matched).length ?? 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Rule Preview</h3>
        <button
          type="button"
          className={styles.testButton}
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? "Testing..." : "Test Rule"}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <>
          <div className={styles.summary}>
            <span className={styles.summaryLabel}>
              {matchedCount} of {results.length} rows matched
            </span>
            <div className={styles.summaryBar}>
              <div
                className={styles.summaryFill}
                style={{
                  width: `${(matchedCount / results.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className={styles.results}>
            {results.map((result, index) => (
              <div
                key={index}
                className={`${styles.resultItem} ${
                  result.matched ? styles.matched : styles.unmatched
                }`}
              >
                <div className={styles.resultHeader}>
                  <span className={styles.resultIndex}>#{index + 1}</span>
                  <span
                    className={`${styles.resultBadge} ${
                      result.matched ? styles.matchedBadge : styles.unmatchedBadge
                    }`}
                  >
                    {result.matched ? "Matched" : "No match"}
                  </span>
                </div>
                <div className={styles.resultData}>
                  {Object.entries(result.row).map(([key, value]) => (
                    <div key={key} className={styles.dataField}>
                      <span className={styles.dataKey}>{key}:</span>
                      <span className={styles.dataValue}>
                        {JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
                {result.matched && result.modifiedData && (
                  <div className={styles.modifications}>
                    <span className={styles.modLabel}>Changes:</span>
                    {Object.entries(result.modifiedData)
                      .filter(
                        ([key, value]) =>
                          JSON.stringify(value) !==
                          JSON.stringify(result.row[key])
                      )
                      .map(([key, value]) => (
                        <div key={key} className={styles.modField}>
                          <span className={styles.modKey}>{key}</span>
                          <span className={styles.modArrow}>&#8594;</span>
                          <span className={styles.modValue}>
                            {JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!results && !error && (
        <div className={styles.placeholder}>
          <p>
            Click "Test Rule" to see how your rule would apply to sample data.
          </p>
          <div className={styles.sampleInfo}>
            <span className={styles.sampleLabel}>Sample data includes:</span>
            <ul className={styles.sampleList}>
              {SAMPLE_DATA.map((item, i) => (
                <li key={i}>{item.product_name} - ${item.price}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
