import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Heading, Hr, Link, Section, Text, } from "@react-email/components";
import { BaseLayout } from "./base-layout.js";
/**
 * Formats the expiration time as a human-readable string
 */
function formatExpiration(expiresAt) {
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
export function MagicLinkEmail({ url, expiresAt, userEmail, ipAddress, userAgent, }) {
    const expirationText = formatExpiration(expiresAt);
    return (_jsxs(BaseLayout, { preview: `Sign in to Dotoro - Link expires in ${expirationText}`, children: [_jsx(Heading, { style: heading, children: "Sign in to Dotoro" }), _jsxs(Text, { style: paragraph, children: ["Hi there! Click the button below to sign in to your Dotoro account for", " ", _jsx("strong", { children: userEmail }), "."] }), _jsx(Section, { style: buttonContainer, children: _jsx(Button, { style: button, href: url, children: "Sign in to Dotoro" }) }), _jsxs(Text, { style: expirationNote, children: ["This link expires in ", _jsx("strong", { children: expirationText }), "."] }), _jsx(Hr, { style: hr }), _jsx(Text, { style: paragraph, children: "If the button above doesn't work, copy and paste this URL into your browser:" }), _jsx(Text, { style: codeBlock, children: _jsx(Link, { href: url, style: codeLink, children: url }) }), _jsx(Hr, { style: hr }), _jsx(Text, { style: securityNote, children: "If you didn't request this email, you can safely ignore it. Someone may have typed your email address by mistake." }), (ipAddress || userAgent) && (_jsxs(Section, { style: securityInfo, children: [_jsx(Text, { style: securityInfoTitle, children: "Request Details:" }), ipAddress && (_jsxs(Text, { style: securityInfoItem, children: ["IP Address: ", ipAddress] })), userAgent && (_jsxs(Text, { style: securityInfoItem, children: ["Device: ", userAgent] }))] }))] }));
}
// Styles
const heading = {
    color: "#1a1a1a",
    fontSize: "24px",
    fontWeight: "600",
    lineHeight: "32px",
    margin: "0 0 24px",
};
const paragraph = {
    color: "#3c4149",
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 16px",
};
const buttonContainer = {
    textAlign: "center",
    margin: "32px 0",
};
const button = {
    backgroundColor: "#5469d4",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center",
    display: "inline-block",
    padding: "12px 24px",
};
const expirationNote = {
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "20px",
    textAlign: "center",
    margin: "0 0 24px",
};
const hr = {
    borderColor: "#e6ebf1",
    margin: "24px 0",
};
const codeBlock = {
    backgroundColor: "#f4f4f5",
    borderRadius: "4px",
    padding: "12px 16px",
    fontSize: "14px",
    lineHeight: "20px",
    wordBreak: "break-all",
    margin: "0 0 16px",
};
const codeLink = {
    color: "#5469d4",
    textDecoration: "none",
};
const securityNote = {
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "20px",
    margin: "0 0 16px",
};
const securityInfo = {
    backgroundColor: "#f9fafb",
    borderRadius: "6px",
    padding: "16px",
    marginTop: "16px",
};
const securityInfoTitle = {
    color: "#6b7280",
    fontSize: "12px",
    fontWeight: "600",
    lineHeight: "16px",
    margin: "0 0 8px",
    textTransform: "uppercase",
};
const securityInfoItem = {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "18px",
    margin: "0 0 4px",
};
export default MagicLinkEmail;
