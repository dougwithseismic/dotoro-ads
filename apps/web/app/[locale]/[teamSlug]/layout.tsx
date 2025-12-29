import { notFound } from "next/navigation";
import { TeamNavigationProvider } from "@/lib/navigation/TeamNavigationProvider";
import { NON_TEAM_ROUTES } from "@/lib/navigation/team-routes";

/**
 * Team Layout
 *
 * This layout wraps all team-scoped pages under /[locale]/[teamSlug]/.
 * It provides:
 * - Team slug validation (ensures it's not a non-team route)
 * - TeamNavigationProvider for team-aware navigation
 *
 * Note: Full team membership validation happens client-side in TeamProvider
 * since we need the user's session which is stored client-side.
 */
export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; teamSlug: string }>;
}) {
  const { teamSlug } = await params;

  // Check if this is actually a non-team route that shouldn't be here
  // This prevents matching routes like /en/login as team slugs
  const isNonTeamRoute = NON_TEAM_ROUTES.some(
    (route) => teamSlug === route || teamSlug.startsWith(`${route}/`)
  );

  if (isNonTeamRoute) {
    notFound();
  }

  return <TeamNavigationProvider>{children}</TeamNavigationProvider>;
}
