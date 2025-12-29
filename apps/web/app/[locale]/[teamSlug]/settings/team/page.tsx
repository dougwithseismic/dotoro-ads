"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  getTeam,
  updateTeam,
  getTeamMembers,
  updateMemberRole,
  removeMember,
  getTeamInvitations,
  sendInvitation,
  revokeInvitation,
  resendInvitation,
  leaveTeam,
  useTeam,
  type Team,
  type TeamDetail,
  type TeamMember,
  type Invitation,
  type TeamRole,
  type ResendInvitationResponse,
} from "@/lib/teams";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { Users, Mail, Settings, X, Check, ChevronDown, Plus, Shield, RefreshCw, Copy, AlertCircle, CreditCard, Sliders } from "lucide-react";
import { PermissionsTab } from "./components/PermissionsTab";
import { TeamList } from "./components/TeamList";
import { LeaveTeamDialog } from "./components/LeaveTeamDialog";
import { BillingTab } from "./components/BillingTab";
import { AdvancedTab } from "./components/AdvancedTab";
import { DangerZone } from "./components/DangerZone";
import { TeamAvatarUpload } from "./components/TeamAvatarUpload";
import { TeamSlugDisplay } from "./components/TeamSlugDisplay";
import { deleteTeam } from "@/lib/teams";

// ============================================================================
// Role Badge Component
// ============================================================================

function RoleBadge({ role }: { role: TeamRole }) {
  const roleStyles: Record<TeamRole, string> = {
    owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    editor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    viewer: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  };

  const roleLabels: Record<TeamRole, string> = {
    owner: "Owner",
    admin: "Admin",
    editor: "Editor",
    viewer: "Viewer",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${roleStyles[role]}`}
    >
      {roleLabels[role]}
    </span>
  );
}

// ============================================================================
// Role Selector Dropdown
// ============================================================================

function RoleSelector({
  currentRole,
  onSelect,
  disabled,
}: {
  currentRole: TeamRole;
  onSelect: (role: TeamRole) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const roles: TeamRole[] = ["admin", "editor", "viewer"];

  // Click-outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-1 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Change role"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <RoleBadge role={currentRole} />
        {!disabled && <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-neutral-200 dark:border-zinc-700 py-1 z-10"
        >
          {roles.map((role) => (
            <div
              key={role}
              role="option"
              aria-selected={role === currentRole}
              onClick={() => {
                onSelect(role);
                setIsOpen(false);
              }}
              className="px-3 py-1.5 cursor-pointer hover:bg-neutral-100 dark:hover:bg-zinc-800 flex items-center justify-between"
            >
              <span className="text-sm capitalize">{role}</span>
              {role === currentRole && <Check className="w-3 h-3 text-blue-500" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Confirmation Dialog
// ============================================================================

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// General Tab
// ============================================================================

function GeneralTab({
  team,
  canEdit,
  onSave,
  onAvatarUpload,
  isSaving,
  saveSuccess,
  saveError,
}: {
  team: TeamDetail;
  canEdit: boolean;
  onSave: (name: string, description: string) => void;
  onAvatarUpload: (file: File) => Promise<void>;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
}) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");

  useEffect(() => {
    setName(team.name);
    setDescription(team.description || "");
  }, [team]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name, description);
  };

  return (
    <div className="space-y-8">
      {/* Team Avatar */}
      <div>
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
          Team Avatar
        </h3>
        <TeamAvatarUpload
          teamName={team.name}
          avatarUrl={team.avatarUrl}
          onUpload={onAvatarUpload}
          isOwnerOrAdmin={canEdit}
        />
      </div>

      {/* Team URL */}
      <div>
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
          Team URL
        </h3>
        <TeamSlugDisplay slug={team.slug} />
      </div>

      {/* Team Details Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="team-name"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Team name
          </label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="w-full max-w-md px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label
            htmlFor="team-description"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Description
          </label>
          <textarea
            id="team-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            rows={3}
            className="w-full max-w-md px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
        </div>

        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>

            {saveSuccess && (
              <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Saved
              </span>
            )}

            {saveError && (
              <span className="text-sm text-red-600 dark:text-red-400">
                Failed to save: {saveError}
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

// ============================================================================
// Members Tab
// ============================================================================

function MembersTab({
  teamId,
  members,
  canManage,
  currentUserId,
  onUpdateRole,
  onRemove,
}: {
  teamId: string;
  members: TeamMember[];
  canManage: boolean;
  currentUserId: string;
  onUpdateRole: (userId: string, role: TeamRole) => void;
  onRemove: (userId: string) => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const handleRemove = (userId: string) => {
    onRemove(userId);
    setConfirmRemove(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
        {members.length} member{members.length !== 1 ? "s" : ""}
      </h3>

      <div className="space-y-2">
        {members.map((member) => {
          const isOwner = member.role === "owner";
          const isSelf = member.userId === currentUserId;
          const canEditMember = canManage && !isOwner && !isSelf;

          return (
            <div
              key={member.id}
              data-testid="member-row"
              className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    {member.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {member.email}
                  </div>
                  {isSelf && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      You
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canEditMember ? (
                  <RoleSelector
                    currentRole={member.role}
                    onSelect={(role) => onUpdateRole(member.userId, role)}
                  />
                ) : (
                  <RoleBadge role={member.role} />
                )}

                {canEditMember && (
                  <button
                    onClick={() => setConfirmRemove(member.userId)}
                    className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                    aria-label="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && handleRemove(confirmRemove)}
        title="Remove member"
        message="Are you sure you want to remove this member from the team? They will lose access to all team resources."
      />
    </div>
  );
}

// ============================================================================
// Email Status Feedback Component
// ============================================================================

interface EmailFeedback {
  type: "success" | "error";
  message: string;
  inviteLink?: string;
}

function EmailStatusFeedback({
  feedback,
  onCopy,
  copied,
}: {
  feedback: EmailFeedback;
  onCopy: () => void;
  copied: boolean;
}) {
  if (feedback.type === "success") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <Check className="w-4 h-4" />
        <span>{feedback.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        <AlertCircle className="w-4 h-4" />
        <span>{feedback.message}</span>
      </div>
      {feedback.inviteLink && (
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            aria-label="Copy link"
          >
            <Copy className="w-3 h-3" />
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Invitations Tab
// ============================================================================

function InvitationsTab({
  teamId,
  invitations,
  onSend,
  onRevoke,
  isSending,
  sendFeedback,
  onClearSendFeedback,
}: {
  teamId: string;
  invitations: Invitation[];
  onSend: (email: string, role: "admin" | "editor" | "viewer") => void;
  onRevoke: (invitationId: string) => void;
  isSending: boolean;
  sendFeedback: EmailFeedback | null;
  onClearSendFeedback: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer");
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Resend state per invitation
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendFeedback, setResendFeedback] = useState<Record<string, EmailFeedback>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendCopied, setSendCopied] = useState(false);

  // Click-outside detection for role dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleOpen(false);
      }
    };
    if (isRoleOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isRoleOpen]);

  // Auto-clear success feedback after 3 seconds
  useEffect(() => {
    const successIds = Object.entries(resendFeedback)
      .filter(([, fb]) => fb.type === "success")
      .map(([id]) => id);

    if (successIds.length > 0) {
      const timeout = setTimeout(() => {
        setResendFeedback((prev) => {
          const next = { ...prev };
          successIds.forEach((id) => delete next[id]);
          return next;
        });
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [resendFeedback]);

  // Auto-clear send feedback after 3 seconds for success
  useEffect(() => {
    if (sendFeedback?.type === "success") {
      const timeout = setTimeout(() => {
        onClearSendFeedback();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [sendFeedback, onClearSendFeedback]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onSend(email.trim(), role);
    setEmail("");
  };

  const handleResend = async (invitationId: string) => {
    setResendingId(invitationId);
    // Clear any previous feedback for this invitation
    setResendFeedback((prev) => {
      const next = { ...prev };
      delete next[invitationId];
      return next;
    });

    try {
      const result = await resendInvitation(teamId, invitationId);

      if (result.emailSent) {
        setResendFeedback((prev) => ({
          ...prev,
          [invitationId]: {
            type: "success",
            message: "Email sent",
          },
        }));
      } else {
        setResendFeedback((prev) => ({
          ...prev,
          [invitationId]: {
            type: "error",
            message: "Email failed to send",
            inviteLink: result.inviteLink,
          },
        }));
      }
    } catch (error) {
      setResendFeedback((prev) => ({
        ...prev,
        [invitationId]: {
          type: "error",
          message: "Failed to resend invitation",
        },
      }));
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyLink = async (invitationId: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invitationId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleCopySendLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setSendCopied(true);
      setTimeout(() => setSendCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const roles: Array<"admin" | "editor" | "viewer"> = ["admin", "editor", "viewer"];

  return (
    <div className="space-y-6">
      {/* Send Invitation Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              disabled={isSending}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div className="relative" ref={roleDropdownRef}>
            <label
              htmlFor="invite-role"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Role
            </label>
            <button
              id="invite-role"
              type="button"
              onClick={() => setIsRoleOpen(!isRoleOpen)}
              disabled={isSending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 disabled:opacity-50"
              aria-haspopup="listbox"
              aria-expanded={isRoleOpen}
            >
              <span className="capitalize">{role}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {isRoleOpen && (
              <div
                role="listbox"
                className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-neutral-200 dark:border-zinc-700 py-1 z-10"
              >
                {roles.map((r) => (
                  <div
                    key={r}
                    role="option"
                    aria-selected={r === role}
                    onClick={() => {
                      setRole(r);
                      setIsRoleOpen(false);
                    }}
                    className="px-3 py-1.5 cursor-pointer hover:bg-neutral-100 dark:hover:bg-zinc-800 flex items-center justify-between"
                  >
                    <span className="text-sm capitalize">{r}</span>
                    {r === role && <Check className="w-3 h-3 text-blue-500" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSending || !email.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isSending ? "Sending..." : "Send invite"}
          </button>

          {sendFeedback && (
            <EmailStatusFeedback
              feedback={sendFeedback}
              onCopy={() => sendFeedback.inviteLink && handleCopySendLink(sendFeedback.inviteLink)}
              copied={sendCopied}
            />
          )}
        </div>
      </form>

      {/* Pending Invitations */}
      <div>
        <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">
          Pending invitations ({invitations.length})
        </h3>

        {invitations.length === 0 ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            No pending invitations
          </p>
        ) : (
          <div className="space-y-2">
            {invitations.map((invite) => {
              const isResending = resendingId === invite.id;
              const feedback = resendFeedback[invite.id];
              const isCopied = copiedId === invite.id;

              return (
                <div
                  key={invite.id}
                  className="p-3 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {invite.email}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Invited as {invite.role} by {invite.inviterEmail}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResend(invite.id)}
                        disabled={isResending}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                        aria-label={isResending ? "Resending" : "Resend"}
                      >
                        <RefreshCw className={`w-3 h-3 ${isResending ? "animate-spin" : ""}`} />
                        {isResending ? "Resending..." : "Resend"}
                      </button>

                      <button
                        onClick={() => onRevoke(invite.id)}
                        className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        aria-label="Revoke"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>

                  {feedback && (
                    <div className="mt-2">
                      <EmailStatusFeedback
                        feedback={feedback}
                        onCopy={() => feedback.inviteLink && handleCopyLink(invite.id, feedback.inviteLink)}
                        copied={isCopied}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

type TabId = "general" | "members" | "invitations" | "permissions" | "billing" | "advanced";

export default function TeamSettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = params?.locale as string || "en";

  // Get team context
  const { currentTeam, teams, refetchTeams } = useTeam();

  // Get teamId from URL or use current team from context
  const urlTeamId = searchParams?.get("teamId");
  const teamId = urlTeamId || currentTeam?.id || "team-1";

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<EmailFeedback | null>(null);

  // Leave team dialog state
  const [leaveTeamTarget, setLeaveTeamTarget] = useState<Team | null>(null);

  const canManage = team?.role === "owner" || team?.role === "admin";
  const canEdit = canManage;

  // Load team data
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const teamData = await getTeam(teamId);
        setTeam(teamData);

        const membersData = await getTeamMembers(teamId);
        setMembers(membersData.data);

        if (teamData.role === "owner" || teamData.role === "admin") {
          const invitationsData = await getTeamInvitations(teamId);
          setInvitations(invitationsData.data);
        }
      } catch (err) {
        setError("Failed to load team");
        console.error("Failed to load team:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [teamId, isAuthenticated, authLoading]);

  // Handle save team
  const handleSaveTeam = async (name: string, description: string) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const updated = await updateTeam(teamId, { name, description });
      setTeam(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle update member role
  const handleUpdateMemberRole = async (userId: string, role: TeamRole) => {
    try {
      await updateMemberRole(teamId, userId, role);
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role } : m))
      );
    } catch (err) {
      console.error("Failed to update member role:", err);
    }
  };

  // Handle remove member
  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember(teamId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  // Handle send invitation
  const handleSendInvitation = async (
    email: string,
    role: "admin" | "editor" | "viewer"
  ) => {
    setIsSendingInvite(true);
    setSendFeedback(null);
    try {
      const invite = await sendInvitation(teamId, { email, role });
      setInvitations((prev) => [...prev, invite]);

      // Show email status feedback
      if (invite.emailSent === false) {
        setSendFeedback({
          type: "error",
          message: "Email failed to send",
          inviteLink: invite.inviteLink,
        });
      } else {
        setSendFeedback({
          type: "success",
          message: "Invitation sent successfully",
        });
      }
    } catch (err) {
      console.error("Failed to send invitation:", err);
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Clear send feedback
  const handleClearSendFeedback = () => {
    setSendFeedback(null);
  };

  // Handle revoke invitation
  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await revokeInvitation(teamId, invitationId);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch (err) {
      console.error("Failed to revoke invitation:", err);
    }
  };

  // Handle leave team request (opens dialog)
  const handleLeaveTeamRequest = (teamToLeave: Team) => {
    setLeaveTeamTarget(teamToLeave);
  };

  // Handle confirmed leave team
  const handleLeaveTeamConfirm = async () => {
    if (!leaveTeamTarget) return;

    await leaveTeam(leaveTeamTarget.id);

    // Refetch teams to update the list
    await refetchTeams();

    // Close the dialog
    setLeaveTeamTarget(null);

    // If we left the currently selected team, the context will auto-select another
    // and we should refresh the page data
    if (leaveTeamTarget.id === teamId) {
      router.push(`/${locale}/settings/team`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="team-settings-loading"
        className="flex items-center justify-center h-64"
      >
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => router.refresh()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  // Handle successful team creation
  const handleTeamCreated = (newTeam: TeamDetail) => {
    // Navigate to the new team's settings page
    router.push(`/${locale}/settings/team?teamId=${newTeam.id}`);
    // Refresh the router cache to fetch the new team's data
    router.refresh();
  };

  if (!team) return null;

  const isOwner = team?.role === "owner";
  const isAdminOrOwner = team?.role === "owner" || team?.role === "admin";

  const tabs: { id: TabId; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: "general", label: "General", icon: <Settings className="w-4 h-4" />, show: true },
    { id: "members", label: "Members", icon: <Users className="w-4 h-4" />, show: true },
    { id: "invitations", label: "Invitations", icon: <Mail className="w-4 h-4" />, show: canManage },
    { id: "permissions", label: "Roles & Permissions", icon: <Shield className="w-4 h-4" />, show: true },
    { id: "billing", label: "Billing", icon: <CreditCard className="w-4 h-4" />, show: isOwner },
    { id: "advanced", label: "Advanced", icon: <Sliders className="w-4 h-4" />, show: isAdminOrOwner },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Team Settings
        </h1>
        <button
          onClick={() => setShowCreateTeamDialog(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          data-testid="create-team-button"
        >
          <Plus className="w-4 h-4" />
          Create New Team
        </button>
      </div>

      <CreateTeamDialog
        isOpen={showCreateTeamDialog}
        onClose={() => setShowCreateTeamDialog(false)}
        onSuccess={handleTeamCreated}
      />

      {/* Leave Team Dialog */}
      {leaveTeamTarget && (
        <LeaveTeamDialog
          isOpen={!!leaveTeamTarget}
          team={leaveTeamTarget}
          onClose={() => setLeaveTeamTarget(null)}
          onConfirm={handleLeaveTeamConfirm}
        />
      )}

      {/* Team List Section */}
      <TeamList onLeaveTeam={handleLeaveTeamRequest} />

      {/* Divider */}
      <div className="border-t border-neutral-200 dark:border-zinc-700 my-6" />

      {/* Current Team Settings Header */}
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        {team.name} Settings
      </h2>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-zinc-700 mb-6">
        <nav className="flex gap-4" role="tablist">
          {tabs
            .filter((tab) => tab.show)
            .map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === "general" && (
          <GeneralTab
            team={team}
            canEdit={canEdit}
            onSave={handleSaveTeam}
            onAvatarUpload={async (file: File) => {
              // TODO: Implement actual file upload to storage
              // For now, we'll just log it - in production, upload to S3/R2 and update team
              console.log("Avatar upload:", file.name);
              // const url = await uploadFile(file);
              // await updateTeam(teamId, { avatarUrl: url });
            }}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
            saveError={saveError}
          />
        )}

        {activeTab === "members" && (
          <MembersTab
            teamId={teamId}
            members={members}
            canManage={canManage}
            currentUserId={user?.id || ""}
            onUpdateRole={handleUpdateMemberRole}
            onRemove={handleRemoveMember}
          />
        )}

        {activeTab === "invitations" && canManage && (
          <InvitationsTab
            teamId={teamId}
            invitations={invitations}
            onSend={handleSendInvitation}
            onRevoke={handleRevokeInvitation}
            isSending={isSendingInvite}
            sendFeedback={sendFeedback}
            onClearSendFeedback={handleClearSendFeedback}
          />
        )}

        {activeTab === "permissions" && (
          <PermissionsTab
            currentRole={team.role}
            isOwner={team.role === "owner"}
          />
        )}

        {activeTab === "billing" && isOwner && (
          <BillingTab
            team={team}
            onUpdateBillingEmail={async (email) => {
              const updated = await updateTeam(teamId, { billingEmail: email || null });
              setTeam(updated);
            }}
          />
        )}

        {activeTab === "advanced" && isAdminOrOwner && (
          <AdvancedTab
            team={team}
            onUpdateSettings={async (settings) => {
              const updatedSettings = {
                ...(team.settings as Record<string, unknown> || {}),
                ...settings,
              };
              const updated = await updateTeam(teamId, { settings: updatedSettings });
              setTeam(updated);
            }}
          />
        )}
      </div>

      {/* Danger Zone (General tab, owner only) */}
      {activeTab === "general" && isOwner && (
        <div className="mt-8">
          <DangerZone
            teamId={team.id}
            teamName={team.name}
            isOwner={isOwner}
            onDelete={async (id) => {
              await deleteTeam(id);
            }}
          />
        </div>
      )}
    </div>
  );
}
