"use client";

import { useEffect, useState, use } from "react";
import { TemplateEditorV2, type EditorState } from "../../editor/TemplateEditorV2";
import styles from "../../components/LoadingError.module.css";

interface AdTemplateStructure {
  headline?: string;
  description?: string;
  displayUrl?: string;
  finalUrl?: string;
  callToAction?: string;
}

interface AdGroupStructure {
  name?: string;
  ads?: AdTemplateStructure[];
}

interface CampaignTemplate {
  id: string;
  name: string;
  platform: "reddit" | "google" | "facebook";
  structure: {
    objective?: string;
    budget?: string;
    adGroups?: AdGroupStructure[];
    // Legacy single ad template support
    adTemplate?: AdTemplateStructure;
  } | null;
}

interface Variable {
  name: string;
  sampleValue: string;
  description?: string;
  category?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Default variables when no data source is connected
const DEFAULT_VARIABLES: Variable[] = [
  { name: "product_name", sampleValue: "Premium Widget", category: "Product" },
  { name: "price", sampleValue: "29.99", category: "Product" },
  { name: "sale_price", sampleValue: "19.99", category: "Product" },
  { name: "brand", sampleValue: "Acme", category: "Product" },
  { name: "category", sampleValue: "Electronics", category: "Product" },
  { name: "discount_percent", sampleValue: "33", category: "Pricing" },
  { name: "sku", sampleValue: "WDG-001", category: "Product" },
  { name: "color", sampleValue: "Blue", category: "Attributes" },
  { name: "size", sampleValue: "Medium", category: "Attributes" },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

function convertTemplateToEditorState(template: CampaignTemplate): EditorState {
  // Handle new multi-ad-group structure
  if (template.structure?.adGroups && template.structure.adGroups.length > 0) {
    return {
      name: template.name,
      platform: template.platform,
      objective: template.structure.objective || "CONVERSIONS",
      budget: template.structure.budget || "",
      adGroups: template.structure.adGroups.map((ag, agIndex) => ({
        id: `ag-${template.id}-${agIndex}`,
        name: ag.name || `Ad Group ${agIndex + 1}`,
        ads: (ag.ads || []).map((ad, adIndex) => ({
          id: `ad-${template.id}-${agIndex}-${adIndex}`,
          headline: ad.headline || "",
          description: ad.description || "",
          displayUrl: ad.displayUrl || "",
          finalUrl: ad.finalUrl || "",
          callToAction: ad.callToAction || "",
        })),
      })),
    };
  }

  // Handle legacy single adTemplate structure
  const legacyAd = template.structure?.adTemplate;
  return {
    name: template.name,
    platform: template.platform,
    objective: template.structure?.objective || "CONVERSIONS",
    budget: template.structure?.budget || "",
    adGroups: [
      {
        id: `ag-${template.id}-0`,
        name: "Ad Group 1",
        ads: [
          {
            id: `ad-${template.id}-0-0`,
            headline: legacyAd?.headline || "",
            description: legacyAd?.description || "",
            displayUrl: legacyAd?.displayUrl || "",
            finalUrl: legacyAd?.finalUrl || "",
            callToAction: legacyAd?.callToAction || "",
          },
        ],
      },
    ],
  };
}

export default function EditTemplatePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [template, setTemplate] = useState<CampaignTemplate | null>(null);
  const [variables, setVariables] = useState<Variable[]>(DEFAULT_VARIABLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch template
        const templateResponse = await fetch(
          API_BASE + "/api/v1/templates/" + resolvedParams.id
        );
        if (!templateResponse.ok) {
          throw new Error("Template not found");
        }
        const templateData = await templateResponse.json();
        setTemplate(templateData);

        // Try to fetch variables from data source (optional)
        try {
          const varsResponse = await fetch(
            API_BASE + "/api/v1/data-sources/variables"
          );
          if (varsResponse.ok) {
            const varsData = await varsResponse.json();
            if (varsData.variables && varsData.variables.length > 0) {
              setVariables(varsData.variables);
            }
          }
        } catch {
          // Use default variables if fetch fails
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load template");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>Loading template...</div>
    );
  }

  if (error || !template) {
    return (
      <div className={styles.errorContainer}>
        {error || "Template not found"}
      </div>
    );
  }

  const initialState = convertTemplateToEditorState(template);

  return (
    <TemplateEditorV2
      templateId={template.id}
      initialState={initialState}
      availableVariables={variables}
    />
  );
}
