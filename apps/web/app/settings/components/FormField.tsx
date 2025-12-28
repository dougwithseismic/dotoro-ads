/**
 * FormField Component
 *
 * A reusable form field component with consistent styling,
 * error handling, and accessibility features.
 */

"use client";

import { useId, ChangeEvent } from "react";

interface BaseFormFieldProps {
  id: string;
  label: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

interface TextInputProps extends BaseFormFieldProps {
  type: "text" | "email";
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  maxLength?: number;
}

interface ToggleInputProps extends BaseFormFieldProps {
  type: "toggle";
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

type FormFieldProps = TextInputProps | ToggleInputProps;

/**
 * FormField - Consistent form field with label, input, and error handling
 *
 * Features:
 * - Text and email input types
 * - Toggle switch type
 * - Error state with visual feedback
 * - Helper text support
 * - Disabled and required states
 * - Full accessibility (ARIA attributes)
 *
 * @example
 * ```tsx
 * // Text input
 * <FormField
 *   id="email"
 *   label="Email"
 *   type="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   error={errors.email}
 *   required
 * />
 *
 * // Toggle input
 * <FormField
 *   id="notifications"
 *   label="Enable notifications"
 *   type="toggle"
 *   checked={notifications}
 *   onCheckedChange={setNotifications}
 * />
 * ```
 */
export function FormField(props: FormFieldProps) {
  const generatedId = useId();
  const errorId = `${props.id || generatedId}-error`;
  const helperId = `${props.id || generatedId}-helper`;

  const hasError = !!props.error;
  const showHelperText = props.helperText && !hasError;

  const describedBy = hasError
    ? errorId
    : showHelperText
      ? helperId
      : undefined;

  if (props.type === "toggle") {
    return (
      <div className={`flex items-center justify-between ${props.className || ""}`}>
        <div className="flex flex-col">
          <label
            htmlFor={props.id}
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {props.label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {showHelperText && (
            <p
              id={helperId}
              className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5"
            >
              {props.helperText}
            </p>
          )}
        </div>
        <button
          type="button"
          id={props.id}
          role="switch"
          aria-checked={props.checked}
          aria-describedby={describedBy}
          disabled={props.disabled}
          onClick={() => props.onCheckedChange(!props.checked)}
          className={`
            relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
            border-2 border-transparent transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              props.checked
                ? "bg-blue-600"
                : "bg-neutral-200 dark:bg-neutral-700"
            }
          `}
        >
          <span
            aria-hidden="true"
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full
              bg-white shadow ring-0 transition duration-200 ease-in-out
              ${props.checked ? "translate-x-5" : "translate-x-0"}
            `}
          />
        </button>
      </div>
    );
  }

  // Text/Email input
  return (
    <div className={props.className || ""}>
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
      >
        {props.label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={props.id}
        type={props.type}
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled}
        required={props.required}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        aria-invalid={hasError ? "true" : undefined}
        aria-describedby={describedBy}
        className={`
          w-full max-w-md px-3 py-2 rounded-lg
          border bg-white dark:bg-neutral-800
          text-neutral-900 dark:text-neutral-100
          placeholder-neutral-400 dark:placeholder-neutral-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${
            hasError
              ? "border-red-500 focus:ring-red-500"
              : "border-neutral-300 dark:border-neutral-600"
          }
        `}
      />

      {/* Error Message */}
      {hasError && (
        <p
          id={errorId}
          className="mt-1 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {props.error}
        </p>
      )}

      {/* Helper Text */}
      {showHelperText && (
        <p
          id={helperId}
          className="mt-1 text-sm text-neutral-500 dark:text-neutral-400"
        >
          {props.helperText}
        </p>
      )}
    </div>
  );
}
