/// <reference types="vitest/globals" />
import "@testing-library/jest-dom";

declare global {
  namespace Vi {
    interface Assertion<T = unknown> {
      toBeInTheDocument(): T;
      toHaveAttribute(attr: string, value?: string): T;
      toHaveClass(className: string): T;
      toHaveTextContent(text: string | RegExp): T;
      toBeVisible(): T;
      toBeDisabled(): T;
      toBeEnabled(): T;
      toHaveValue(value: string | string[] | number): T;
      toHaveFocus(): T;
      toBeChecked(): T;
      toBeEmpty(): T;
      toContainElement(element: HTMLElement | null): T;
      toContainHTML(html: string): T;
      toHaveAccessibleDescription(description?: string | RegExp): T;
      toHaveAccessibleName(name?: string | RegExp): T;
      toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): T;
      toHaveFormValues(values: Record<string, unknown>): T;
      toHaveStyle(css: string | Record<string, unknown>): T;
      toBeInvalid(): T;
      toBeRequired(): T;
      toBeValid(): T;
      toHaveErrorMessage(message?: string | RegExp): T;
    }
  }
}

export {};
