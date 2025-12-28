"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyMagicLink } from "@/lib/auth";
import Link from "next/link";

type VerifyState = "loading" | "success" | "error";

/**
 * Verify Page
 * Handles magic link verification
 * Auto-submits token on mount, redirects on success
 */
export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const redirectUrl = searchParams.get("redirect") || "/";

  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage("Invalid verification link. Please request a new magic link.");
      return;
    }

    const verify = async () => {
      try {
        await verifyMagicLink(token);
        setState("success");

        // Redirect after a brief delay so user sees success
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1500);
      } catch (error) {
        setState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Verification failed. The link may have expired."
        );
      }
    };

    verify();
  }, [token, redirectUrl, router]);

  // Loading state
  if (state === "loading") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <svg
            className="animate-spin w-16 h-16 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Verifying your magic link...
        </h2>

        <p className="text-neutral-600 dark:text-neutral-400">
          Please wait while we sign you in
        </p>
      </div>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          You're signed in!
        </h2>

        <p className="text-neutral-600 dark:text-neutral-400">
          Redirecting you now...
        </p>
      </div>
    );
  }

  // Error state
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        Verification failed
      </h2>

      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        {errorMessage}
      </p>

      <Link
        href="/login"
        className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800"
      >
        Request a new magic link
      </Link>
    </div>
  );
}
