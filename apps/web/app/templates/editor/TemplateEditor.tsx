"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { VariableInput } from "../components/VariableInput";
import { ValidationBadge } from "../components/ValidationBadge";
import { CharacterCounter } from "../components/CharacterCounter";
import styles from "./TemplateEditor.module.css";

type Platform = "reddit" | "google" | "facebook";

interface AdTemplateConfig {
  headline: string;
  description?: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
}

interface ValidationWarning {
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  extractedVariables: string[];
}

interface TemplateEditorProps {
  templateId?: string;
  initialData?: {
    name: string;
    platform: Platform;
    template: AdTemplateConfig;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: "reddit", label: "Reddit" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
];

const CTA_OPTIONS: { [key in Platform]: string[] } = {
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

const PLATFORM_LIMITS: { [key in Platform]: { headline: number; description: number } } = {
  reddit: { headline: 100, description: 500 },
  google: { headline: 30, description: 90 },
  facebook: { headline: 40, description: 125 },
};

function getValidationMessage(
  status: string,
  isValidating: boolean,
  validation: ValidationResult | null
): string {
  if (isValidating) return "Validating...";
  switch (status) {
    case "valid":
      return "All fields valid";
    case "invalid":
      return `${validation?.errors?.length ?? 0} error(s)`;
    case "warning":
      return `${validation?.warnings?.length ?? 0} warning(s)`;
    default:
      return "Enter content to validate";
  }
}

// Sample data for preview and variable extraction
const SAMPLE_DATA: Record<string, unknown> = {
  product_name: "Premium Widget",
  price: "29.99",
  sale_price: "19.99",
  brand: "Acme",
  category: "Electronics",
  discount_percent: "33",
  sku: "WDG-001",
  color: "Blue",
  size: "Medium",
};

export function TemplateEditor({ templateId, initialData }: TemplateEditorProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(initialData?.name || "");
  const [platform, setPlatform] = useState<Platform>(initialData?.platform || "reddit");
  const [headline, setHeadline] = useState(initialData?.template?.headline || "");
  const [description, setDescription] = useState(initialData?.template?.description || "");
  const [displayUrl, setDisplayUrl] = useState(initialData?.template?.displayUrl || "");
  const [finalUrl, setFinalUrl] = useState(initialData?.template?.finalUrl || "");
  const [callToAction, setCallToAction] = useState(initialData?.template?.callToAction || "");

  // Validation state
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validationStatus, setValidationStatus] = useState<"pending" | "valid" | "invalid" | "warning">("pending");
  const [isValidating, setIsValidating] = useState(false);

  // Submission state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Preview state
  const [previewText, setPreviewText] = useState<{ headline: string; description: string } | null>(null);

  // Available variables from sample data
  const availableVariables = useMemo(() => Object.keys(SAMPLE_DATA), []);

  // Current platform limits
  const limits = PLATFORM_LIMITS[platform];

  // Validate template
  const validateTemplate = useCallback(async () => {
    if (!headline) {
      setValidation(null);
      setValidationStatus("pending");
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch(API_BASE + "/api/v1/templates/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: {
            headline,
            description: description || undefined,
            displayUrl: displayUrl || undefined,
            finalUrl: finalUrl || undefined,
            callToAction: callToAction || undefined,
          },
          platform,
          sampleData: SAMPLE_DATA,
        }),
      });

      if (!response.ok) {
        throw new Error("Validation failed");
      }

      const result: ValidationResult = await response.json();
      setValidation(result);

      if (!result.valid) {
        setValidationStatus("invalid");
      } else if (result.warnings.length > 0) {
        setValidationStatus("warning");
      } else {
        setValidationStatus("valid");
      }
    } catch (err) {
      console.error("Validation error:", err);
      setValidationStatus("warning");
      setValidation({
        valid: true,
        errors: [],
        warnings: [{ field: "general", message: "Validation service unavailable - template not fully validated" }],
        extractedVariables: [],
      });
    } finally {
      setIsValidating(false);
    }
  }, [headline, description, displayUrl, finalUrl, callToAction, platform]);

  // Generate preview
  const generatePreview = useCallback(async () => {
    if (!headline) {
      setPreviewText(null);
      return;
    }

    try {
      const response = await fetch(API_BASE + "/api/v1/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: {
            headline,
            description: description || undefined,
            displayUrl: displayUrl || undefined,
            finalUrl: finalUrl || undefined,
            callToAction: callToAction || undefined,
          },
          platform,
          dataRows: [SAMPLE_DATA],
          limit: 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Preview failed");
      }

      const result = await response.json();
      if (result.previewAds && result.previewAds.length > 0) {
        setPreviewText({
          headline: result.previewAds[0].headline || "",
          description: result.previewAds[0].description || "",
        });
      }
    } catch (err) {
      console.error("Preview error:", err);
    }
  }, [headline, description, displayUrl, finalUrl, callToAction, platform]);

  // Debounced validation and preview
  useEffect(() => {
    const timer = setTimeout(() => {
      validateTemplate();
      generatePreview();
    }, 500);

    return () => clearTimeout(timer);
  }, [validateTemplate, generatePreview]);

  // Get field errors
  const getFieldErrors = (field: string): string[] => {
    if (!validation) return [];
    return validation.errors
      .filter((e) => e.field === field)
      .map((e) => e.message);
  };

  // Handle save
  const handleSave = async () => {
    if (!name || !headline) {
      setSaveError("Name and headline are required");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const url = templateId
        ? API_BASE + "/api/v1/templates/" + templateId
        : API_BASE + "/api/v1/templates";

      const response = await fetch(url, {
        method: templateId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          platform,
          structure: {
            objective: "CONVERSIONS",
            adTemplate: {
              headline,
              description: description || undefined,
              displayUrl: displayUrl || undefined,
              finalUrl: finalUrl || undefined,
              callToAction: callToAction || undefined,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save template");
      }

      router.push("/templates");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {templateId ? "Edit Template" : "Create Template"}
          </h1>
          <p className={styles.subtitle}>
            Design your ad template with variable placeholders
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => router.push("/templates")}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name || !headline}
            className={styles.saveButton}
          >
            {isSaving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </header>

      {saveError && (
        <div className={styles.saveError}>
          {saveError}
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Template Details</h2>

          <div className={styles.formGroup}>
            <label htmlFor="template-name" className={styles.label}>
              Template Name <span className={styles.required}>*</span>
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Holiday Sale Campaign"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="platform" className={styles.label}>
              Platform <span className={styles.required}>*</span>
            </label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className={styles.select}
            >
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Ad Content</h2>
            <ValidationBadge
              status={isValidating ? "pending" : validationStatus}
              message={getValidationMessage(validationStatus, isValidating, validation)}
            />
          </div>

          <p className={styles.hint}>
            Type {"{"} to insert a variable. Available: {availableVariables.join(", ")}
          </p>

          <VariableInput
            id="headline"
            label="Headline"
            value={headline}
            onChange={setHeadline}
            placeholder={"e.g., Shop {product_name} - {discount_percent}% Off!"}
            availableVariables={availableVariables}
            maxLength={limits.headline}
            required
            error={getFieldErrors("headline")[0]}
          />

          <VariableInput
            id="description"
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder={"e.g., Get the best {category} at unbeatable prices. {brand} quality guaranteed."}
            availableVariables={availableVariables}
            maxLength={limits.description}
            multiline
            rows={3}
            error={getFieldErrors("description")[0]}
          />

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="display-url" className={styles.label}>
                Display URL
              </label>
              <input
                id="display-url"
                type="text"
                value={displayUrl}
                onChange={(e) => setDisplayUrl(e.target.value)}
                placeholder="example.com/shop"
                className={styles.input}
                maxLength={25}
              />
              <CharacterCounter current={displayUrl.length} max={25} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="final-url" className={styles.label}>
                Final URL
              </label>
              <input
                id="final-url"
                type="url"
                value={finalUrl}
                onChange={(e) => setFinalUrl(e.target.value)}
                placeholder="https://example.com/products"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="cta" className={styles.label}>
              Call to Action
            </label>
            <select
              id="cta"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              className={styles.select}
            >
              <option value="">Select a CTA...</option>
              {CTA_OPTIONS[platform].map((cta) => (
                <option key={cta} value={cta}>
                  {cta}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview Panel */}
        <div className={styles.previewSection}>
          <h2 className={styles.sectionTitle}>Live Preview</h2>
          <p className={styles.hint}>
            Preview with sample data. Variables will be substituted.
          </p>

          <div className={styles.previewCard}>
            <div className={styles.previewPlatform}>{PLATFORM_OPTIONS.find(p => p.value === platform)?.label}</div>
            <div className={styles.previewContent}>
              <h3 className={styles.previewHeadline}>
                {previewText?.headline || headline || "Your headline here..."}
              </h3>
              {(previewText?.description || description) && (
                <p className={styles.previewDescription}>
                  {previewText?.description || description}
                </p>
              )}
              {displayUrl && (
                <span className={styles.previewUrl}>{displayUrl}</span>
              )}
              {callToAction && (
                <span className={styles.previewCta}>{callToAction}</span>
              )}
            </div>
          </div>

          <div className={styles.sampleData}>
            <h4>Sample Data Used:</h4>
            <pre>
              {JSON.stringify(SAMPLE_DATA, null, 2)}
            </pre>
          </div>
        </div>

        {/* Validation Errors/Warnings */}
        {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className={styles.validationSection}>
            {validation.errors.length > 0 && (
              <div className={styles.errorList}>
                <h4>Errors</h4>
                <ul>
                  {validation.errors.map((error, i) => (
                    <li key={i}>
                      <strong>{error.field}:</strong> {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className={styles.warningList}>
                <h4>Warnings</h4>
                <ul>
                  {validation.warnings.map((warning, i) => (
                    <li key={i}>
                      <strong>{warning.field}:</strong> {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
