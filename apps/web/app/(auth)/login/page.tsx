"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";

type FormState = "idle" | "loading" | "success" | "error";

/**
 * Login Form Component
 * Uses useSearchParams so must be wrapped in Suspense
 */
function LoginForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setFormState("error");
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setFormState("loading");
    setErrorMessage("");

    try {
      // Use Better Auth's signIn.magicLink method
      // callbackURL must be absolute - Better Auth redirects relative to its baseURL (API)
      const baseUrl = window.location.origin;
      const result = await signIn.magicLink({
        email,
        callbackURL: redirectUrl ? `${baseUrl}${redirectUrl}` : baseUrl,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to send magic link");
      }

      setSubmittedEmail(email);
      setFormState("success");
    } catch (error) {
      setFormState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    }
  };

  // Success state - show "check your email" message
  if (formState === "success") {
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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Check your email
        </h2>

        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          We sent a magic link to{" "}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {submittedEmail}
          </span>
        </p>

        <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-6">
          Click the link in the email to sign in. The link expires in 15
          minutes.
        </p>

        <button
          onClick={() => {
            setFormState("idle");
            setEmail(submittedEmail);
          }}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Didn't receive the email? Send again
        </button>
      </div>
    );
  }

  // Email input form
  return (
    <div>
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2 text-center">
        Sign in to Dotoro
      </h2>

      <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-center">
        Enter your email to receive a magic link
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
            disabled={formState === "loading"}
            className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {formState === "error" && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={formState === "loading" || !email}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 disabled:cursor-not-allowed"
        >
          {formState === "loading" ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              Sending magic link...
            </span>
          ) : (
            "Continue with email"
          )}
        </button>
      </form>

      {redirectUrl && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-4 text-center">
          You'll be redirected after signing in
        </p>
      )}
    </div>
  );
}

/**
 * Login Page
 * Wraps LoginForm in Suspense for useSearchParams
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="text-center text-neutral-500">Loading...</div>}
    >
      <LoginForm />
    </Suspense>
  );
}
