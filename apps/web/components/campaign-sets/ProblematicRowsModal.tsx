"use client";

import { useEffect, useCallback, useRef, useId } from "react";
import type { InvalidRowDetail } from "./BatchValidationWarning";

interface ProblematicRowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: InvalidRowDetail[];
  limit: number;
  fieldName: string;
}

export function ProblematicRowsModal({
  isOpen,
  onClose,
  rows,
  limit,
  fieldName,
}: ProblematicRowsModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 id={titleId} className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Problematic Rows - {fieldName}
          </h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
          <p>
            The following {rows.length} row{rows.length !== 1 ? "s" : ""} will exceed the {limit} character limit for {fieldName}:
          </p>
        </div>

        <div className="flex-1 overflow-auto px-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th className="py-2 px-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Row</th>
                <th className="py-2 px-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Length</th>
                <th className="py-2 px-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Over</th>
                <th className="py-2 px-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Generated Content</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {rows.map((row) => (
                <tr key={row.rowIndex} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  <td className="py-2 px-3 text-neutral-900 dark:text-neutral-100">{row.rowIndex + 1}</td>
                  <td className="py-2 px-3 text-neutral-900 dark:text-neutral-100">{row.generatedLength}</td>
                  <td className="py-2 px-3 text-red-600 dark:text-red-400">+{row.overflow}</td>
                  <td className="py-2 px-3">
                    <div className="max-w-xs truncate text-neutral-700 dark:text-neutral-300" title={row.generatedValue}>
                      {row.generatedValue}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProblematicRowsModal;
