"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  getInvitationDetails,
  acceptInvitation,
  declineInvitation,
  type InvitationDetails,
} from "@/lib/teams";
import { Users, UserPlus, X, Check, AlertCircle } from "lucide-react";

type PageState = "loading" | "ready" | "accepting" | "declining" | "accepted" | "declined" | "error";

/**
 * Role Badge Component
 */
function RoleBadge({ role }: { role: string }) {
  const roleStyles: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    editor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    viewer: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-sm font-medium rounded capitalize ${
        roleStyles[role] || roleStyles.viewer
      }`}
    >
      {role}
    </span>
  );
}

/**
 * Accept Invitation Page
 * Public page for accepting/declining team invitations
 */
export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Load invitation details
  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage("Invalid invitation link");
      return;
    }

    const loadInvitation = async () => {
      try {
        const details = await getInvitationDetails(token);
        setInvitation(details);
        setState("ready");
      } catch (err) {
        setState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load invitation"
        );
      }
    };

    loadInvitation();
  }, [token]);

  // Handle accept
  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }

    setState("accepting");
    try {
      const result = await acceptInvitation(token);
      setState("accepted");
      // Redirect after a short delay
      setTimeout(() => {
        router.push(result.teamSlug ? `/` : "/");
      }, 2000);
    } catch (err) {
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
    }
  };

  // Handle decline
  const handleDecline = async () => {
    setState("declining");
    try {
      await declineInvitation(token);
      setState("declined");
    } catch (err) {
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to decline invitation"
      );
    }
  };

  // Loading state
  if (state === "loading") {
    return (
      <div
        data-testid="invite-loading"
        className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-zinc-950"
      >
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">
            Loading invitation...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-zinc-950">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              {errorMessage.toLowerCase().includes("expired")
                ? "Invitation Expired"
                : errorMessage.toLowerCase().includes("not found")
                ? "Invitation Not Found"
                : "Something Went Wrong"}
            </h1>

            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {errorMessage}
            </p>

            <Link
              href="/"
              className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Accepted state
  if (state === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-zinc-950">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Successfully Joined!
            </h1>

            <p className="text-neutral-600 dark:text-neutral-400">
              You have successfully joined{" "}
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {invitation?.teamName}
              </span>
              . Redirecting...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Declined state
  if (state === "declined") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-zinc-950">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
            </div>

            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Invitation Declined
            </h1>

            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              You have declined the invitation to join{" "}
              <span className="font-medium">{invitation?.teamName}</span>.
            </p>

            <Link
              href="/"
              className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Ready state - show invitation
  if (!invitation) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-zinc-950">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>

            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              You're invited to join
            </h1>

            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {invitation.teamName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                {invitation.teamName}
              </span>
            </div>
          </div>

          {/* Invitation Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Invited by
              </span>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {invitation.inviterEmail}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Role
              </span>
              <RoleBadge role={invitation.role} />
            </div>
          </div>

          {/* Actions */}
          {!isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-sm text-center text-neutral-600 dark:text-neutral-400">
                Sign in to accept this invitation
              </p>
              <div className="flex gap-3">
                <Link
                  href={`/login?redirect=${encodeURIComponent(
                    `/invite/${token}`
                  )}`}
                  className="flex-1 px-4 py-2 text-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Sign in
                </Link>
                <button
                  onClick={handleDecline}
                  disabled={state === "declining"}
                  className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {state === "declining" ? "Declining..." : "Decline"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={state === "accepting"}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {state === "accepting" ? "Accepting..." : "Accept"}
              </button>
              <button
                onClick={handleDecline}
                disabled={state === "declining"}
                className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {state === "declining" ? "Declining..." : "Decline"}
              </button>
            </div>
          )}

          {/* Logged in as */}
          {isAuthenticated && user && (
            <p className="text-xs text-center text-neutral-400 dark:text-neutral-500 mt-4">
              Logged in as {user.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
