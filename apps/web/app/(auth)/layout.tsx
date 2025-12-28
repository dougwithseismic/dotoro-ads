import type { ReactNode } from "react";

/**
 * Auth Layout
 * Centered card layout for login/verify pages
 * No navigation sidebar (public pages)
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Dotoro
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Ad Management Platform
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 border border-neutral-200 dark:border-neutral-700">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
          Secure, passwordless authentication
        </p>
      </div>
    </div>
  );
}
