import { useState, useCallback } from "react";
import { api } from "../api-client";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string | number | boolean | string[] | number[];
}

interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: (Condition | ConditionGroup)[];
}

interface Action {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface Rule {
  id: string;
  userId: string | null;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditionGroup: ConditionGroup;
  actions: Action[];
  createdAt: string;
  updatedAt: string;
}

interface RulesResponse {
  data: Rule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<RulesResponse>("/api/v1/rules");
      setRules(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch rules");
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/v1/rules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
      throw err;
    }
  }, []);

  const toggleRule = useCallback(async (rule: Rule) => {
    try {
      const updated = await api.put<Rule>(`/api/v1/rules/${rule.id}`, {
        enabled: !rule.enabled,
      });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle rule");
      throw err;
    }
  }, []);

  const createRule = useCallback(async (rule: Partial<Rule>) => {
    try {
      const newRule = await api.post<Rule>("/api/v1/rules", rule);
      setRules((prev) => [newRule, ...prev]);
      return newRule;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule");
      throw err;
    }
  }, []);

  const updateRule = useCallback(async (id: string, updates: Partial<Rule>) => {
    try {
      const updated = await api.put<Rule>(`/api/v1/rules/${id}`, updates);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
      throw err;
    }
  }, []);

  return {
    rules,
    loading,
    error,
    fetchRules,
    deleteRule,
    toggleRule,
    createRule,
    updateRule,
    setRules,
  };
}
