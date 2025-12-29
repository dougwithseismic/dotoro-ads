/**
 * ToastProvider Component
 *
 * Provides toast notification functionality using sonner.
 * Configured with app-wide defaults for accessibility and theming.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <ToastProvider>
 *   {children}
 * </ToastProvider>
 * ```
 */

"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * ToastProvider - Wraps the app with toast notification capability
 *
 * Features:
 * - Respects system/user theme preference (light/dark)
 * - Positioned in bottom-right for non-intrusive notifications
 * - Rich colors for better visual feedback
 * - Accessible with ARIA announcements
 * - Keyboard dismissible (Escape key)
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const { theme } = useTheme();

  return (
    <>
      {children}
      <Toaster
        theme={theme as "light" | "dark" | "system"}
        position="bottom-right"
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          // Ensure toasts are accessible
          className: "sonner-toast",
          descriptionClassName: "sonner-toast-description",
        }}
      />
    </>
  );
}
