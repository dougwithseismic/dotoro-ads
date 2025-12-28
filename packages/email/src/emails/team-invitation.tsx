import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout.js";

/**
 * Props for the Team Invitation Email component
 */
export interface TeamInvitationEmailProps {
  /** Name of the team the user is being invited to */
  teamName: string;
  /** Email address of the person sending the invitation */
  inviterEmail: string;
  /** Optional name of the inviter for a more personal touch */
  inviterName?: string;
  /** Role assigned to the invitee */
  role: "admin" | "editor" | "viewer";
  /** Full URL for accepting the invitation */
  inviteUrl: string;
  /** When the invitation expires */
  expiresAt: Date;
  /** Email address of the recipient */
  recipientEmail: string;
}

/**
 * Human-readable descriptions for each role
 */
const roleDescriptions: Record<TeamInvitationEmailProps["role"], string> = {
  admin: "As an Admin, you'll have full access to manage team settings, members, and all resources.",
  editor: "As an Editor, you'll be able to create, edit, and manage content and resources.",
  viewer: "As a Viewer, you'll have read-only access to view team resources and data.",
};

/**
 * Formats the expiration time as a human-readable string
 */
function formatExpiration(expiresAt: Date): string {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes <= 0) {
    return "has expired";
  }

  if (diffMinutes === 1) {
    return "1 minute";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours === 1) {
    return "1 hour";
  }

  if (diffHours < 24) {
    return `${diffHours} hours`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) {
    return "1 day";
  }

  return `${diffDays} days`;
}

/**
 * Capitalizes the first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Team Invitation Email Template
 *
 * Used to invite users to join a team. Includes:
 * - Team name prominently displayed
 * - Inviter information (email and optional name)
 * - Role description with explanation
 * - Clear call-to-action button
 * - Plain-text link fallback
 * - Expiration notice
 * - Security notice for unexpected invitations
 */
export function TeamInvitationEmail({
  teamName,
  inviterEmail,
  inviterName,
  role,
  inviteUrl,
  expiresAt,
  recipientEmail,
}: TeamInvitationEmailProps) {
  const expirationText = formatExpiration(expiresAt);
  const inviterDisplay = inviterName ? `${inviterName} (${inviterEmail})` : inviterEmail;
  const roleDescription = roleDescriptions[role];

  return (
    <BaseLayout preview={`You've been invited to join ${teamName} on Dotoro`}>
      <Heading style={heading}>
        You're invited to join {teamName}
      </Heading>

      <Text style={paragraph}>
        <strong>{inviterDisplay}</strong> has invited you to join{" "}
        <strong>{teamName}</strong> on Dotoro.
      </Text>

      <Section style={roleSection}>
        <Text style={roleLabel}>Your Role: <strong>{capitalize(role)}</strong></Text>
        <Text style={roleDescriptionText}>{roleDescription}</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={inviteUrl}>
          Join {teamName}
        </Button>
      </Section>

      <Text style={expirationNote}>
        This invitation expires in <strong>{expirationText}</strong>.
      </Text>

      <Hr style={hr} />

      <Text style={paragraph}>
        If the button above doesn't work, copy and paste this URL into your
        browser:
      </Text>

      <Text style={codeBlock}>
        <Link href={inviteUrl} style={codeLink}>
          {inviteUrl}
        </Link>
      </Text>

      <Hr style={hr} />

      <Text style={securityNote}>
        If you didn't expect this invitation, you can safely ignore this email.
        Your email address ({recipientEmail}) may have been entered by mistake.
      </Text>

      <Section style={helpSection}>
        <Text style={helpText}>
          Need help? Contact our support team or visit our help center.
        </Text>
      </Section>
    </BaseLayout>
  );
}

// ============================================================================
// Styles
// ============================================================================

const heading: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "32px",
  margin: "0 0 24px",
};

const paragraph: React.CSSProperties = {
  color: "#3c4149",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const roleSection: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "24px 0",
  borderLeft: "4px solid #5469d4",
};

const roleLabel: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0 0 8px",
};

const roleDescriptionText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#5469d4",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 28px",
};

const expirationNote: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const hr: React.CSSProperties = {
  borderColor: "#e6ebf1",
  margin: "24px 0",
};

const codeBlock: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "4px",
  padding: "12px 16px",
  fontSize: "14px",
  lineHeight: "20px",
  wordBreak: "break-all" as const,
  margin: "0 0 16px",
};

const codeLink: React.CSSProperties = {
  color: "#5469d4",
  textDecoration: "none",
};

const securityNote: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 16px",
};

const helpSection: React.CSSProperties = {
  marginTop: "24px",
};

const helpText: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "0",
};

export default TeamInvitationEmail;
