"use client";

import { useState, useCallback, useEffect, ReactNode } from "react";
import Link from "next/link";
import { CharacterCounter } from "../../components/CharacterCounter";
import { ValidationBadge } from "../../components/ValidationBadge";
import styles from "./TemplatePreview.module.css";

type Platform = "reddit" | "google" | "facebook";

/**
 * Highlights substituted values in the generated text by comparing with the template.
 * Returns React nodes with highlighted spans for substituted values.
 */
interface VariableMatch {
  start: number;
  end: number;
  name: string;
  fullMatch: string;
}

function highlightSubstitutions(
  templateText: string,
  generatedText: string,
  sourceRow: Record<string, unknown>,
  stylesRef: typeof styles
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const variablePattern = /\{([^{}|]+)(?:\|[^{}]*)?\}/g;

  // Extract variables and their positions from template
  const variables: VariableMatch[] = [];
  let match;
  while ((match = variablePattern.exec(templateText)) !== null) {
    const varName = match[1];
    if (varName !== undefined) {
      variables.push({
        start: match.index,
        end: match.index + match[0].length,
        name: varName,
        fullMatch: match[0],
      });
    }
  }

  if (variables.length === 0) {
    // No variables, return plain text
    return [generatedText];
  }

  // Build the result by walking through the template and finding corresponding parts
  let templatePos = 0;
  let generatedPos = 0;

  for (let i = 0; i < variables.length; i++) {
    const variable = variables[i];
    if (!variable) continue;

    // Add literal text before this variable
    const literalBefore = templateText.substring(templatePos, variable.start);
    if (literalBefore) {
      nodes.push(
        <span key={`literal-${i}`}>{generatedText.substring(generatedPos, generatedPos + literalBefore.length)}</span>
      );
      generatedPos += literalBefore.length;
    }

    // Get the substituted value from source row
    const substitutedValue = String(sourceRow[variable.name] ?? "");

    // Add highlighted substituted value
    if (substitutedValue) {
      nodes.push(
        <span key={`var-${i}`} className={stylesRef.substitutedValue} title={`Variable: {${variable.name}}`}>
          {substitutedValue}
        </span>
      );
      generatedPos += substitutedValue.length;
    }

    templatePos = variable.end;
  }

  // Add any remaining literal text
  const remainingLiteral = templateText.substring(templatePos);
  if (remainingLiteral) {
    nodes.push(
      <span key="literal-end">{generatedText.substring(generatedPos)}</span>
    );
  }

  return nodes;
}

interface GeneratedAd {
  headline: string | null;
  description: string | null;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
  sourceRow: Record<string, unknown>;
  warnings: string[];
}

interface ValidationError {
  rowIndex: number;
  errors: Array<{ field: string; message: string }>;
}

interface PreviewResponse {
  previewAds: GeneratedAd[];
  validationErrors: ValidationError[];
  warnings: string[];
}

interface TemplatePreviewProps {
  templateId: string;
  templateName: string;
  platform: Platform;
  template: {
    headline: string;
    description?: string;
    displayUrl?: string;
    finalUrl?: string;
    callToAction?: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const PLATFORM_LIMITS: { [key in Platform]: { headline: number; description: number } } = {
  reddit: { headline: 100, description: 500 },
  google: { headline: 30, description: 90 },
  facebook: { headline: 40, description: 125 },
};

// Default sample data
const DEFAULT_SAMPLE_DATA: Record<string, unknown>[] = [
  {
    product_name: "Premium Widget",
    price: "29.99",
    sale_price: "19.99",
    brand: "Acme",
    category: "Electronics",
    discount_percent: "33",
  },
  {
    product_name: "Deluxe Gadget",
    price: "49.99",
    sale_price: "39.99",
    brand: "TechCo",
    category: "Accessories",
    discount_percent: "20",
  },
  {
    product_name: "Super Tool",
    price: "99.99",
    sale_price: "79.99",
    brand: "ProGear",
    category: "Tools",
    discount_percent: "20",
  },
];

export function TemplatePreview({
  templateId,
  templateName,
  platform,
  template,
}: TemplatePreviewProps) {
  const [sampleData, setSampleData] = useState<string>(
    JSON.stringify(DEFAULT_SAMPLE_DATA, null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewAds, setPreviewAds] = useState<GeneratedAd[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const limits = PLATFORM_LIMITS[platform];

  const generatePreview = useCallback(async () => {
    // Parse sample data
    let dataRows: Record<string, unknown>[];
    try {
      const parsed = JSON.parse(sampleData);
      dataRows = Array.isArray(parsed) ? parsed : [parsed];
      setParseError(null);
    } catch {
      setParseError("Invalid JSON format");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_BASE + "/api/v1/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          platform,
          dataRows,
          limit: 50,
        }),
      });

      if (!response.ok) {
        throw new Error("Preview generation failed");
      }

      const result: PreviewResponse = await response.json();
      setPreviewAds(result.previewAds);
      setValidationErrors(result.validationErrors);
      setWarnings(result.warnings);
      setCurrentIndex(0);
    } catch (err) {
      console.error("Preview error:", err);
      setWarnings([err instanceof Error ? err.message : "Failed to generate preview"]);
    } finally {
      setLoading(false);
    }
  }, [sampleData, template, platform]);

  // Generate preview on mount
  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  const currentAd = previewAds[currentIndex];
  const currentErrors = validationErrors.find((e) => e.rowIndex === currentIndex);

  const getValidationStatus = (): "valid" | "invalid" | "warning" => {
    if (currentErrors && currentErrors.errors.length > 0) {
      return "invalid";
    }
    if (currentAd?.warnings && currentAd.warnings.length > 0) {
      return "warning";
    }
    return "valid";
  };

  return (
    <div className={styles.preview}>
      <header className={styles.header}>
        <div>
          <Link href="/templates" className={styles.backLink}>
            ← Back to Templates
          </Link>
          <h1 className={styles.title}>Preview: {templateName}</h1>
          <p className={styles.subtitle}>
            Test your template with different data to see generated ads
          </p>
        </div>
        <Link
          href={"/templates/editor/" + templateId}
          className={styles.editButton}
        >
          Edit Template
        </Link>
      </header>

      <div className={styles.content}>
        {/* Sample Data Editor */}
        <div className={styles.dataSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Sample Data (JSON)</h2>
            <button
              onClick={generatePreview}
              disabled={loading}
              className={styles.generateButton}
            >
              {loading ? "Generating..." : "Generate Preview"}
            </button>
          </div>

          <textarea
            value={sampleData}
            onChange={(e) => setSampleData(e.target.value)}
            className={styles.dataInput}
            rows={12}
            placeholder="Enter JSON array of data rows..."
          />

          {parseError && (
            <div className={styles.parseError}>{parseError}</div>
          )}

          <p className={styles.hint}>
            Enter a JSON array of objects. Each object generates one ad preview.
          </p>
        </div>

        {/* Preview Results */}
        <div className={styles.resultsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Generated Ads</h2>
            {previewAds.length > 0 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className={styles.paginationButton}
                >
                  Previous
                </button>
                <span className={styles.paginationInfo}>
                  {currentIndex + 1} of {previewAds.length}
                </span>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(previewAds.length - 1, i + 1))}
                  disabled={currentIndex === previewAds.length - 1}
                  className={styles.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className={styles.loading} role="status" aria-live="polite">
              <div className={styles.spinner} />
              Generating previews...
            </div>
          )}

          {!loading && previewAds.length === 0 && (
            <div className={styles.empty}>
              No preview generated yet. Click &quot;Generate Preview&quot; to see results.
            </div>
          )}

          {!loading && currentAd && (
            <div className={styles.adPreview}>
              <div className={styles.adHeader}>
                <span className={styles.platform}>{platform.toUpperCase()}</span>
                <ValidationBadge status={getValidationStatus()} />
              </div>

              <div className={styles.adContent}>
                <div className={styles.adField}>
                  <div className={styles.fieldHeader}>
                    <span className={styles.fieldLabel}>Headline</span>
                    <CharacterCounter
                      current={(currentAd.headline || "").length}
                      max={limits.headline}
                    />
                  </div>
                  <div className={styles.fieldValue}>
                    {currentAd.headline ? (
                      highlightSubstitutions(
                        template.headline,
                        currentAd.headline,
                        currentAd.sourceRow,
                        styles
                      )
                    ) : (
                      <span className={styles.empty}>No headline</span>
                    )}
                  </div>
                </div>

                {currentAd.description && (
                  <div className={styles.adField}>
                    <div className={styles.fieldHeader}>
                      <span className={styles.fieldLabel}>Description</span>
                      <CharacterCounter
                        current={currentAd.description.length}
                        max={limits.description}
                      />
                    </div>
                    <div className={styles.fieldValue}>
                      {template.description
                        ? highlightSubstitutions(
                            template.description,
                            currentAd.description,
                            currentAd.sourceRow,
                            styles
                          )
                        : currentAd.description}
                    </div>
                  </div>
                )}

                {currentAd.displayUrl && (
                  <div className={styles.adField}>
                    <span className={styles.fieldLabel}>Display URL</span>
                    <div className={styles.urlValue}>{currentAd.displayUrl}</div>
                  </div>
                )}

                {currentAd.finalUrl && (
                  <div className={styles.adField}>
                    <span className={styles.fieldLabel}>Final URL</span>
                    <div className={styles.urlValue}>{currentAd.finalUrl}</div>
                  </div>
                )}

                {currentAd.callToAction && (
                  <div className={styles.adField}>
                    <span className={styles.fieldLabel}>Call to Action</span>
                    <div className={styles.ctaValue}>{currentAd.callToAction}</div>
                  </div>
                )}
              </div>

              {/* Source Data */}
              <div className={styles.sourceData}>
                <h4>Source Data Row</h4>
                <pre>{JSON.stringify(currentAd.sourceRow, null, 2)}</pre>
              </div>

              {/* Warnings */}
              {currentAd.warnings && currentAd.warnings.length > 0 && (
                <div className={styles.warningBox}>
                  <h4>Warnings</h4>
                  <ul>
                    {currentAd.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Errors */}
              {currentErrors && currentErrors.errors.length > 0 && (
                <div className={styles.errorBox}>
                  <h4>Validation Errors</h4>
                  <ul>
                    {currentErrors.errors.map((error, i) => (
                      <li key={i}>
                        <strong>{error.field}:</strong> {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Global Warnings */}
          {warnings.length > 0 && (
            <div className={styles.globalWarnings}>
              <h4>Global Warnings</h4>
              <ul>
                {warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Template Reference */}
        <div className={styles.templateSection}>
          <h2 className={styles.sectionTitle}>Template Reference</h2>
          <div className={styles.templateFields}>
            <div className={styles.templateField}>
              <span className={styles.fieldLabel}>Headline Template</span>
              <code>{template.headline}</code>
            </div>
            {template.description && (
              <div className={styles.templateField}>
                <span className={styles.fieldLabel}>Description Template</span>
                <code>{template.description}</code>
              </div>
            )}
            {template.displayUrl && (
              <div className={styles.templateField}>
                <span className={styles.fieldLabel}>Display URL</span>
                <code>{template.displayUrl}</code>
              </div>
            )}
            {template.finalUrl && (
              <div className={styles.templateField}>
                <span className={styles.fieldLabel}>Final URL</span>
                <code>{template.finalUrl}</code>
              </div>
            )}
            {template.callToAction && (
              <div className={styles.templateField}>
                <span className={styles.fieldLabel}>CTA</span>
                <code>{template.callToAction}</code>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
