"use client";

import { useEffect, useState } from "react";
import { TemplateEditorV2 } from "./TemplateEditorV2";

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

export default function NewTemplatePage() {
  const [variables, setVariables] = useState<Variable[]>(DEFAULT_VARIABLES);

  useEffect(() => {
    // Try to fetch variables from data source (optional)
    async function fetchVariables() {
      try {
        const response = await fetch(API_BASE + "/api/v1/data-sources/variables");
        if (response.ok) {
          const data = await response.json();
          if (data.variables && data.variables.length > 0) {
            setVariables(data.variables);
          }
        }
      } catch {
        // Use default variables if fetch fails
      }
    }

    fetchVariables();
  }, []);

  return <TemplateEditorV2 availableVariables={variables} />;
}
