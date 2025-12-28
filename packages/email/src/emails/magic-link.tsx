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
import type { MagicLinkEmailProps } from "../types.js";

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

  return `${diffHours} hours`;
}

/**
 * Magic Link Email Template
 *
 * Used for passwordless authentication. Includes:
 * - Clear call-to-action button with magic link URL
 * - Expiration notice
 * - Plain-text link fallback
 * - Security notice
 */
export function MagicLinkEmail({
  url,
  expiresAt,
  userEmail,
  ipAddress,
  userAgent,
}: MagicLinkEmailProps) {
  const expirationText = formatExpiration(expiresAt);

  return (
    <BaseLayout preview={`Sign in to Dotoro - Link expires in ${expirationText}`}>
      <Heading style={heading}>Sign in to Dotoro</Heading>

      <Text style={paragraph}>
        Hi there! Click the button below to sign in to your Dotoro account for{" "}
        <strong>{userEmail}</strong>.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={url}>
          Sign in to Dotoro
        </Button>
      </Section>

      <Text style={expirationNote}>
        This link expires in <strong>{expirationText}</strong>.
      </Text>

      <Hr style={hr} />

      <Text style={paragraph}>
        If the button above doesn't work, copy and paste this URL into your
        browser:
      </Text>

      <Text style={codeBlock}>
        <Link href={url} style={codeLink}>
          {url}
        </Link>
      </Text>

      <Hr style={hr} />

      <Text style={securityNote}>
        If you didn't request this email, you can safely ignore it. Someone may
        have typed your email address by mistake.
      </Text>

      {(ipAddress || userAgent) && (
        <Section style={securityInfo}>
          <Text style={securityInfoTitle}>Request Details:</Text>
          {ipAddress && (
            <Text style={securityInfoItem}>IP Address: {ipAddress}</Text>
          )}
          {userAgent && (
            <Text style={securityInfoItem}>Device: {userAgent}</Text>
          )}
        </Section>
      )}
    </BaseLayout>
  );
}

// Styles
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
  padding: "12px 24px",
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

const securityInfo: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  padding: "16px",
  marginTop: "16px",
};

const securityInfoTitle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  lineHeight: "16px",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
};

const securityInfoItem: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "0 0 4px",
};

export default MagicLinkEmail;
