import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface BaseLayoutProps {
  /** Preview text shown in email clients */
  preview?: string;
  /** Email content */
  children: React.ReactNode;
}

/**
 * Base email layout component
 *
 * Provides a consistent wrapper for all email templates with:
 * - Responsive container (600px max-width)
 * - Brand header with logo placeholder
 * - Footer with unsubscribe/legal links
 * - Dark mode support
 */
export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src="https://via.placeholder.com/150x40?text=Dotoro"
              width="150"
              height="40"
              alt="Dotoro"
              style={logo}
            />
          </Section>

          {/* Main Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by Dotoro. If you have questions, please
              contact our support team.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://dotoro.io/privacy" style={link}>
                Privacy Policy
              </Link>
              {" | "}
              <Link href="https://dotoro.io/terms" style={link}>
                Terms of Service
              </Link>
              {" | "}
              <Link href="https://dotoro.io/unsubscribe" style={link}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={copyright}>
              &copy; {new Date().getFullYear()} Dotoro. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header: React.CSSProperties = {
  padding: "32px 48px",
  borderBottom: "1px solid #e6ebf1",
};

const logo: React.CSSProperties = {
  margin: "0 auto",
  display: "block",
};

const content: React.CSSProperties = {
  padding: "32px 48px",
};

const footer: React.CSSProperties = {
  padding: "32px 48px",
  borderTop: "1px solid #e6ebf1",
  textAlign: "center" as const,
};

const footerText: React.CSSProperties = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  marginBottom: "16px",
};

const footerLinks: React.CSSProperties = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  marginBottom: "8px",
};

const link: React.CSSProperties = {
  color: "#8898aa",
  textDecoration: "underline",
};

const copyright: React.CSSProperties = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "0",
};

export default BaseLayout;
