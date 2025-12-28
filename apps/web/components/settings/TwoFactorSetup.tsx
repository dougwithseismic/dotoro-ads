/**
 * TwoFactorSetup Component
 *
 * A wizard-style component that guides users through the process of
 * enabling two-factor authentication on their account.
 *
 * Steps:
 * 1. Generate and display QR code for authenticator app
 * 2. Enter verification code from authenticator
 * 3. Display and save backup codes
 * 4. Confirm completion
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { twoFactor } from "@/lib/auth-client";
import { Copy, Download, Shield, ChevronLeft, Check, AlertTriangle } from "lucide-react";
import QRCodeLib from "qrcode";

/**
 * Props for the TwoFactorSetup component
 */
export interface TwoFactorSetupProps {
  /** Called when 2FA setup is successfully completed */
  onComplete: () => void;
  /** Called when user cancels the setup */
  onCancel: () => void;
}

/**
 * Wizard step type
 */
type SetupStep = "qr" | "verify" | "backup";

/**
 * Parse secret from TOTP URI
 */
function parseSecretFromUri(uri: string): string {
  try {
    const url = new URL(uri);
    return url.searchParams.get("secret") || "";
  } catch (err) {
    console.error("Failed to parse TOTP URI:", err);
    return "";
  }
}

/**
 * Secure QR Code component using local generation
 * Generates QR codes client-side to prevent exposing TOTP secrets to external services
 */
function QRCode({ value }: { value: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function generateQR() {
      try {
        // Generate QR code as data URL locally - never sends secret to external service
        const dataUrl = await QRCodeLib.toDataURL(value, {
          width: 200,
          margin: 2,
          errorCorrectionLevel: "M",
        });
        if (mounted) {
          setQrDataUrl(dataUrl);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to generate QR code");
          console.error("QR code generation error:", err);
        }
      }
    }

    generateQR();

    return () => {
      mounted = false;
    };
  }, [value]);

  if (error) {
    return (
      <div
        data-testid="qr-code"
        className="w-48 h-48 bg-white p-2 rounded-lg mx-auto flex items-center justify-center"
      >
        <p className="text-sm text-red-600 text-center">{error}</p>
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div
        data-testid="qr-code"
        className="w-48 h-48 bg-white p-2 rounded-lg mx-auto flex items-center justify-center"
      >
        <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      data-testid="qr-code"
      className="w-48 h-48 bg-white p-2 rounded-lg mx-auto"
    >
      <img
        src={qrDataUrl}
        alt="QR Code for authenticator app"
        className="w-full h-full"
      />
    </div>
  );
}

/**
 * Loading spinner component
 */
function LoadingSpinner({ testId }: { testId?: string }) {
  return (
    <div
      data-testid={testId}
      className="flex items-center justify-center gap-2"
    >
      <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      <span className="text-neutral-600 dark:text-neutral-400">Loading...</span>
    </div>
  );
}

/**
 * Step indicator component
 */
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index < currentStep
                ? "bg-green-500 text-white"
                : index === currentStep
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
            }`}
          >
            {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 ${
                index < currentStep
                  ? "bg-green-500"
                  : "bg-neutral-200 dark:bg-neutral-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * TwoFactorSetup - Multi-step wizard for enabling 2FA
 *
 * @example
 * ```tsx
 * <TwoFactorSetup
 *   onComplete={() => console.log("2FA enabled!")}
 *   onCancel={() => setShowWizard(false)}
 * />
 * ```
 */
export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>("qr");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // TOTP data
  const [totpUri, setTotpUri] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [secret, setSecret] = useState<string>("");

  // Verification
  const [code, setCode] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [savedCodesConfirmed, setSavedCodesConfirmed] = useState(false);

  // Copy feedback state
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  // Step index for indicator
  const stepIndex = step === "qr" ? 0 : step === "verify" ? 1 : 2;
  const stepLabels = ["Scan QR", "Verify", "Backup Codes"];

  /**
   * Generate TOTP on mount
   */
  const generateTotp = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // For passwordless systems, we pass an empty password
      // Better Auth's 2FA plugin will handle this appropriately
      // In a passwordless setup, the user is already authenticated via magic link
      const result = await twoFactor.enable({ password: "" });

      if (result.error) {
        setError(result.error.message || "Failed to enable 2FA");
        return;
      }

      if (result.data) {
        setTotpUri(result.data.totpURI);
        setSecret(parseSecretFromUri(result.data.totpURI));

        // Validate backup codes are present and non-empty
        const codes = result.data.backupCodes;
        if (!codes || codes.length === 0) {
          setError("Server did not return backup codes. Please try again or contact support.");
          return;
        }
        setBackupCodes(codes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable 2FA");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    generateTotp();
  }, [generateTotp]);

  /**
   * Handle code verification
   */
  const handleVerify = async () => {
    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      setVerificationError("Code must be 6 digits");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const result = await twoFactor.verifyTotp({ code });

      if (result.error) {
        setVerificationError(result.error.message || "Invalid code");
        return;
      }

      // Move to backup codes step
      setStep("backup");
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Copy backup codes to clipboard
   */
  const handleCopyBackupCodes = async () => {
    try {
      const codesText = backupCodes.join("\n");
      await navigator.clipboard.writeText(codesText);
      setCopyStatus("success");
      // Reset status after 2 seconds
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy backup codes to clipboard:", err);
      setCopyStatus("error");
      // Reset status after 3 seconds
      setTimeout(() => setCopyStatus("idle"), 3000);
    }
  };

  /**
   * Download backup codes as text file
   */
  const handleDownloadBackupCodes = () => {
    const codesText = `Dotoro Backup Codes\n==================\n\n${backupCodes.join("\n")}\n\nKeep these codes in a safe place. Each code can only be used once.`;
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dotoro-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Complete the setup
   */
  const handleComplete = () => {
    onComplete();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <LoadingSpinner testId="setup-loading" />
        <p className="mt-4 text-sm text-neutral-500">
          Generating your authenticator setup...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Setup Failed
        </h2>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={generateTotp}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Set Up Two-Factor Authentication
        </h2>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={stepIndex} steps={stepLabels} />

      {/* Step 1: QR Code */}
      {step === "qr" && (
        <div className="space-y-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>

          <QRCode value={totpUri} />

          {/* Manual Entry Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Can't scan the code? Enter manually
            </button>
          </div>

          {/* Manual Entry */}
          {showManualEntry && (
            <div className="p-4 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                Enter this secret key in your authenticator app:
              </p>
              <code className="block p-2 bg-neutral-200 dark:bg-neutral-700 rounded text-center font-mono text-sm break-all">
                {secret}
              </code>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setStep("verify")}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Verification */}
      {step === "verify" && (
        <div className="space-y-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
            Enter the 6-digit code from your authenticator app to verify setup.
          </p>

          <div className="max-w-xs mx-auto">
            <label
              htmlFor="verification-code"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
            >
              Verification Code
            </label>
            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setCode(value);
                setVerificationError(null);
              }}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {verificationError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {verificationError}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("qr")}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg flex items-center gap-2"
            >
              {isVerifying ? (
                <>
                  <span
                    data-testid="verify-loading"
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Backup Codes */}
      {step === "backup" && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Save these backup codes
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  If you lose access to your authenticator app, you can use these codes to sign in.
                  Each code can only be used once.
                </p>
              </div>
            </div>
          </div>

          {/* Backup Codes Grid */}
          <div className="grid grid-cols-2 gap-2 p-4 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg font-mono text-sm">
            {backupCodes.map((backupCode, index) => (
              <div
                key={index}
                className="p-2 bg-white dark:bg-neutral-800 rounded text-center"
              >
                {backupCode}
              </div>
            ))}
          </div>

          {/* Copy and Download Buttons */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleCopyBackupCodes}
                data-testid="copy-backup-codes"
                className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
                  copyStatus === "success"
                    ? "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20"
                    : copyStatus === "error"
                      ? "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20"
                      : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                {copyStatus === "success" ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : copyStatus === "error" ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Copy failed
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy All
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadBackupCodes}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
            {copyStatus === "error" && (
              <p className="text-sm text-red-600 dark:text-red-400" data-testid="copy-error-message">
                Could not copy to clipboard. Please copy manually or use the download option.
              </p>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={savedCodesConfirmed}
              onChange={(e) => setSavedCodesConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
              aria-label="I have saved my backup codes"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              I have saved my backup codes in a secure location
            </span>
          </label>

          {/* Complete Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleComplete}
              disabled={!savedCodesConfirmed}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed rounded-lg flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Complete Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
