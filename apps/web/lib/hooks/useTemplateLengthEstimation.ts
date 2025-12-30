'use client';

import { useMemo } from 'react';

export const PLATFORM_LIMITS = {
  google: { headline: 30, description: 90, displayUrl: 30 },
  facebook: { headline: 40, primaryText: 125, description: 30 },
  reddit: { title: 300, text: 500 },
} as const;

export type Platform = keyof typeof PLATFORM_LIMITS;

export interface ColumnLengthStat {
  minLength: number;
  maxLength: number;
  avgLength: number;
  sampleShortest: string;
  sampleLongest: string;
  computedAt: string;
}

export interface ColumnLengthStats {
  [columnName: string]: ColumnLengthStat;
}

export interface VariableLengthContribution {
  name: string;
  minLength: number;
  maxLength: number;
  contribution: number;
}

export interface LengthEstimation {
  staticLength: number;
  estimatedMin: number;
  estimatedMax: number;
  maxWithBuffer: number;
  isOverLimit: boolean;
  platformLimit: number | undefined;
  variables: VariableLengthContribution[];
  missingVariables: string[];
}

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}|\{([^}]+)\}/g;

export function extractVariables(template: string): string[] {
  const variables: Set<string> = new Set();
  let match;
  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    const varName = (match[1] || match[2]).trim();
    const [baseName] = varName.split('|');
    variables.add(baseName.trim());
  }
  VARIABLE_PATTERN.lastIndex = 0;
  return Array.from(variables);
}

export function getFieldLimit(platform: Platform, field: string): number | undefined {
  const platformLimits = PLATFORM_LIMITS[platform];
  if (!platformLimits) return undefined;
  const fieldMapping: Record<string, Record<string, string>> = {
    google: { headline: 'headline', description: 'description', displayUrl: 'displayUrl' },
    facebook: { headline: 'headline', description: 'description', primaryText: 'primaryText' },
    reddit: { headline: 'title', title: 'title', description: 'text', text: 'text' },
  };
  const mappedField = fieldMapping[platform]?.[field] ?? field;
  return platformLimits[mappedField as keyof typeof platformLimits] as number | undefined;
}

function calculateStaticLength(template: string): number {
  const staticText = template.replace(VARIABLE_PATTERN, '');
  VARIABLE_PATTERN.lastIndex = 0;
  return staticText.length;
}

export function useTemplateLengthEstimation(
  template: string,
  columnStats: ColumnLengthStats | undefined,
  platform: Platform,
  field: string
): LengthEstimation {
  return useMemo(() => {
    const staticLength = calculateStaticLength(template);
    const variableNames = extractVariables(template);
    const platformLimit = getFieldLimit(platform, field);

    if (variableNames.length === 0 || !columnStats) {
      const isOverLimit = platformLimit !== undefined && staticLength > platformLimit;
      return { staticLength, estimatedMin: staticLength, estimatedMax: staticLength, maxWithBuffer: Math.ceil(staticLength * 1.1), isOverLimit, platformLimit, variables: [], missingVariables: [] };
    }

    const variables: VariableLengthContribution[] = [];
    const missingVariables: string[] = [];
    let totalMinFromVars = 0;
    let totalMaxFromVars = 0;

    for (const varName of variableNames) {
      const stats = columnStats[varName];
      if (!stats) {
        missingVariables.push(varName);
        const defaultLength = 10;
        totalMinFromVars += defaultLength;
        totalMaxFromVars += defaultLength;
        variables.push({ name: varName, minLength: defaultLength, maxLength: defaultLength, contribution: 0 });
      } else {
        totalMinFromVars += stats.minLength;
        totalMaxFromVars += stats.maxLength;
        variables.push({ name: varName, minLength: stats.minLength, maxLength: stats.maxLength, contribution: 0 });
      }
    }

    const estimatedMin = staticLength + totalMinFromVars;
    const estimatedMax = staticLength + totalMaxFromVars;
    const maxWithBuffer = Math.ceil(estimatedMax * 1.1);

    if (estimatedMax > 0) {
      for (const variable of variables) {
        variable.contribution = Math.round((variable.maxLength / estimatedMax) * 100);
      }
    }

    const isOverLimit = platformLimit !== undefined && estimatedMax > platformLimit;

    return { staticLength, estimatedMin, estimatedMax, maxWithBuffer, isOverLimit, platformLimit, variables, missingVariables };
  }, [template, columnStats, platform, field]);
}

export default useTemplateLengthEstimation;
