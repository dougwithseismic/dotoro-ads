/**
 * TwoFactorVerify Component
 *
 * A verification component displayed during login when a user has
 * two-factor authentication enabled on their account.
 *
 * Features:
 * - 6-digit TOTP code input
 * - Backup code fallback option
 * - Loading and error states
 * - Keyboard navigation (Enter to submit)
 */

"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { twoFactor } from "@/lib/auth-client";
import { Shield, ChevronLeft } from "lucide-react";

/**
 * Props for the TwoFactorVerify component
 */
export interface TwoFactorVerifyProps {
  /** Called when verification succeeds */
  onSuccess: () => void;
  /** Called when user cancels verification */
  onCancel: () => void;
  /** Optional email to display for context */
  email?: string;
}

/**
 * TwoFactorVerify - 2FA code verification during login
 *
 * @example
 * ```tsx
 * <TwoFactorVerify
 *   onSuccess={() => router.push("/dashboard")}
 *   onCancel={() => router.push("/login")}
 *   email="user@example.com"
 * />
 * ```
 */
export function TwoFactorVerify({ onSuccess, onCancel, email }: TwoFactorVerifyProps) {
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  /**
   * Handle code input change
   * For TOTP: Only allow digits, max 6 characters
   * For backup: Allow alphanumeric and hyphens, max 10 characters
   */
  const handleCodeChange = (value: string) => {
    setError(null);

    if (mode === "totp") {
      // Only digits, max 6
      const sanitized = value.replace(/\D/g, "").slice(0, 6);
      setCode(sanitized);
    } else {
      // Alphanumeric and hyphens, max 10 (XXXX-XXXX format)
      const sanitized = value.toUpperCase().slice(0, 10);
      setCode(sanitized);
    }
  };

  /**
   * Validate code format
   */
  const validateCode = (): boolean => {
    if (mode === "totp") {
      if (!/^\d{6}$/.test(code)) {
        setError("Please enter all 6 digits");
        return false;
      }
    } else {
      if (code.length < 8) {
        setError("Please enter a valid backup code");
        return false;
      }
    }
    return true;
  };

  /**
   * Handle verification
   */
  const handleVerify = async () => {
    if (!validateCode()) {
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await twoFactor.verifyTotp({ code });

      if (result.error) {
        setError(result.error.message || "Invalid code");
        setCode("");
        inputRef.current?.focus();
        return;
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setCode("");
      inputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Handle Enter key to submit
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleVerify();
    }
  };

  /**
   * Switch between TOTP and backup code mode
   */
  const toggleMode = () => {
    setMode(mode === "totp" ? "backup" : "totp");
    setCode("");
    setError(null);
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Two-Factor Authentication
        </h1>
        {email && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {email}
          </p>
        )}
      </div>

      {/* Instructions */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center mb-6">
        {mode === "totp" ? (
          "Enter the 6-digit code from your authenticator app."
        ) : (
          "Enter one of your backup codes."
        )}
      </p>

      {/* Code Input */}
      <div className="mb-4">
        <label
          htmlFor="code-input"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          {mode === "totp" ? "Verification Code" : "Backup Code"}
        </label>
        <input
          ref={inputRef}
          id="code-input"
          type="text"
          inputMode={mode === "totp" ? "numeric" : "text"}
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isVerifying}
          placeholder={mode === "totp" ? "000000" : "XXXX-XXXX"}
          maxLength={mode === "totp" ? 6 : 10}
          autoComplete="one-time-code"
          className={`w-full px-4 py-3 text-center text-2xl font-mono tracking-widest rounded-lg border ${
            error
              ? "border-red-300 dark:border-red-600"
              : "border-neutral-300 dark:border-neutral-600"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Verify Button */}
      <button
        type="button"
        onClick={handleVerify}
        disabled={isVerifying}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isVerifying ? (
          <>
            <span
              data-testid="verify-loading"
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
            />
            Verifying...
          </>
        ) : (
          "Verify"
        )}
      </button>

      {/* Mode Toggle */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={toggleMode}
          disabled={isVerifying}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
        >
          {mode === "totp" ? "Use backup code instead" : "Use authenticator app"}
        </button>
      </div>

      {/* Cancel Button */}
      <button
        type="button"
        onClick={onCancel}
        disabled={isVerifying}
        className="mt-4 w-full py-2 px-4 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to login
      </button>
    </div>
  );
}
