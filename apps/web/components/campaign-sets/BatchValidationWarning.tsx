"use client";

import { useState } from "react";

export interface InvalidRowDetail {
  rowIndex: number;
  generatedLength: number;
  limit: number;
  overflow: number;
  generatedValue: string;
}

export interface BatchValidationResult {
  success: boolean;
  error?: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  invalidRowDetails: InvalidRowDetail[];
  summary: string;
}

interface BatchValidationWarningProps {
  validation: BatchValidationResult | null;
  onViewDetails?: () => void;
  className?: string;
}

export function BatchValidationWarning({
  validation,
  onViewDetails,
  className = "",
}: BatchValidationWarningProps) {
  if (!validation || validation.invalidRows === 0) {
    return null;
  }

  const percentage = Math.round((validation.invalidRows / validation.totalRows) * 100);

  return (
    <div className={`rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Content Length Warning
          </h4>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {validation.summary}
          </p>
          <div className="mt-2 flex items-center gap-4">
            <div className="text-xs text-amber-600 dark:text-amber-400">
              <span className="font-medium">{validation.invalidRows}</span> of{" "}
              <span className="font-medium">{validation.totalRows}</span> rows ({percentage}%)
            </div>
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 underline"
              >
                View problematic rows
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchValidationWarning;
