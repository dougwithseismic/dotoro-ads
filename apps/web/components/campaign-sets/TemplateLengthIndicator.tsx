"use client";

import { useMemo } from "react";
import type { LengthEstimation } from "@/lib/hooks/useTemplateLengthEstimation";

interface TemplateLengthIndicatorProps {
  estimation: LengthEstimation;
  className?: string;
}

function getStatusColor(
  current: number,
  limit: number | undefined
): { bg: string; text: string; bar: string } {
  if (limit === undefined) {
    return {
      bg: "bg-neutral-100 dark:bg-neutral-800",
      text: "text-neutral-600 dark:text-neutral-400",
      bar: "bg-neutral-400",
    };
  }

  const percentage = (current / limit) * 100;

  if (percentage >= 100) {
    return {
      bg: "bg-red-50 dark:bg-red-950",
      text: "text-red-600 dark:text-red-400",
      bar: "bg-red-500",
    };
  }

  if (percentage >= 80) {
    return {
      bg: "bg-amber-50 dark:bg-amber-950",
      text: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
    };
  }

  return {
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-600 dark:text-green-400",
    bar: "bg-green-500",
  };
}

export function TemplateLengthIndicator({
  estimation,
  className = "",
}: TemplateLengthIndicatorProps) {
  const { estimatedMax, platformLimit, isOverLimit, variables, staticLength } = estimation;

  const colors = useMemo(
    () => getStatusColor(estimatedMax, platformLimit),
    [estimatedMax, platformLimit]
  );

  const percentage = useMemo(() => {
    if (!platformLimit) return 0;
    return Math.min((estimatedMax / platformLimit) * 100, 100);
  }, [estimatedMax, platformLimit]);

  const displayText = useMemo(() => {
    if (!platformLimit) {
      return `${staticLength} chars`;
    }
    if (variables.length === 0) {
      return `${staticLength}/${platformLimit}`;
    }
    return `${staticLength}/${platformLimit} (est. max: ${estimatedMax})`;
  }, [staticLength, platformLimit, estimatedMax, variables.length]);

  return (
    <div className={`text-xs ${className}`}>
      <div className={`flex items-center gap-2 px-2 py-1 rounded ${colors.bg}`}>
        <span className={colors.text}>{displayText}</span>
        {isOverLimit && (
          <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      {platformLimit && (
        <div className="mt-1 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-200 ${colors.bar}`} style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

export default TemplateLengthIndicator;
