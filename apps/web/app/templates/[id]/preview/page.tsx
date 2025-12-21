"use client";

import { useEffect, useState, use } from "react";
import { TemplatePreview } from "./TemplatePreview";
import styles from "../../components/LoadingError.module.css";

interface CampaignTemplate {
  id: string;
  name: string;
  platform: "reddit" | "google" | "facebook";
  structure: {
    adTemplate?: {
      headline?: string;
      description?: string;
      displayUrl?: string;
      finalUrl?: string;
      callToAction?: string;
    };
  } | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PreviewPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [template, setTemplate] = useState<CampaignTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const response = await fetch(API_BASE + "/api/v1/templates/" + resolvedParams.id);
        if (!response.ok) {
          throw new Error("Template not found");
        }
        const data = await response.json();
        setTemplate(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load template");
      } finally {
        setLoading(false);
      }
    }

    fetchTemplate();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        Loading template...
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className={styles.errorContainer}>
        {error || "Template not found"}
      </div>
    );
  }

  // Create a sample template if none exists
  const adTemplate = template.structure?.adTemplate || {
    headline: "Sample Headline - {product_name}",
    description: "Check out our {category} products from {brand}",
  };

  return (
    <TemplatePreview
      templateId={template.id}
      templateName={template.name}
      platform={template.platform}
      template={{
        headline: adTemplate.headline || "",
        description: adTemplate.description,
        displayUrl: adTemplate.displayUrl,
        finalUrl: adTemplate.finalUrl,
        callToAction: adTemplate.callToAction,
      }}
    />
  );
}
