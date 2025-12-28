/**
 * Team Invitation Page
 *
 * Handles team invitation acceptance flow with the following states:
 * - Loading: Shows skeleton while fetching invitation details
 * - Valid invitation (not authenticated): Shows sign-in options
 * - Valid invitation (authenticated): Shows accept/decline buttons
 * - Error states: Invalid token, expired, already accepted
 * - Success state: After accepting, shows welcome message
 * - Declined state: After declining, shows confirmation
 */
import type { Metadata } from "next";
import { InvitationPageClient } from "./InvitationPageClient";

interface PageProps {
  params: Promise<{
    token: string;
    locale: string;
  }>;
}

/**
 * Generate dynamic metadata for the invitation page
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Team Invitation | Dotoro",
    description: "You've been invited to join a team on Dotoro.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

/**
 * Invitation Page - Server Component wrapper
 *
 * Extracts the token from params and renders the client component.
 */
export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params;

  return <InvitationPageClient token={token} />;
}
