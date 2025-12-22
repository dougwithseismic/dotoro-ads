import { useState, useCallback } from "react";
import { api } from "../api-client";
import type { CampaignTemplate } from "@/app/templates/components/TemplateCard";

interface TemplatesResponse {
  data: CampaignTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<TemplatesResponse>("/api/v1/templates");
      setTemplates(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(
    async (template: Partial<CampaignTemplate>) => {
      try {
        const newTemplate = await api.post<CampaignTemplate>(
          "/api/v1/templates",
          template
        );
        setTemplates((prev) => [newTemplate, ...prev]);
        return newTemplate;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create template");
        throw err;
      }
    },
    []
  );

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/v1/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
      throw err;
    }
  }, []);

  const duplicateTemplate = useCallback(
    async (id: string) => {
      const templateToDuplicate = templates.find((t) => t.id === id);
      if (!templateToDuplicate) return;

      try {
        const newTemplate = await api.post<CampaignTemplate>("/api/v1/templates", {
          name: `${templateToDuplicate.name} (Copy)`,
          platform: templateToDuplicate.platform,
          structure: templateToDuplicate.structure,
        });
        setTemplates((prev) => [newTemplate, ...prev]);
        return newTemplate;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to duplicate template");
        throw err;
      }
    },
    [templates]
  );

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    duplicateTemplate,
    setTemplates,
  };
}
