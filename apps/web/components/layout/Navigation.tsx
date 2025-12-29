"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Home,
  Database,
  Shuffle,
  Layout,
  Filter,
  Megaphone,
  User,
  UserCircle,
  Users,
  Cog,
  ImageIcon,
} from "lucide-react";
import { getTeamPathWithoutSlug } from "@/lib/navigation/team-routes";
import { TEAM_ROUTES } from "@/lib/routes";

interface NavItem {
  label: string;
  /** Path relative to team context (e.g., "/dashboard", "/settings") */
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", path: TEAM_ROUTES.DASHBOARD, icon: Home },
];

const dataNavItems: NavItem[] = [
  { label: "Data Sources", path: TEAM_ROUTES.DATA_SOURCES, icon: Database },
  { label: "Transforms", path: TEAM_ROUTES.TRANSFORMS, icon: Shuffle },
  { label: "Templates", path: TEAM_ROUTES.TEMPLATES, icon: Layout },
  { label: "Rules", path: TEAM_ROUTES.RULES, icon: Filter },
];

const managementNavItems: NavItem[] = [
  { label: "Campaign Sets", path: TEAM_ROUTES.CAMPAIGN_SETS, icon: Megaphone },
  { label: "Accounts", path: TEAM_ROUTES.ACCOUNTS, icon: User },
  { label: "Assets", path: TEAM_ROUTES.ASSETS, icon: ImageIcon },
];

const settingsNavItems: NavItem[] = [
  { label: "Settings", path: TEAM_ROUTES.SETTINGS, icon: Cog },
  { label: "Profile", path: TEAM_ROUTES.SETTINGS_PROFILE, icon: UserCircle },
  { label: "Team", path: TEAM_ROUTES.SETTINGS_TEAM, icon: Users },
];

interface NavigationProps {
  collapsed?: boolean;
}

/**
 * Navigation Component
 *
 * Team-aware sidebar navigation. Automatically includes the current
 * team slug and locale in all navigation links.
 */
export function Navigation({ collapsed = false }: NavigationProps) {
  const pathname = usePathname();
  const params = useParams();

  // Get team slug and locale from URL params
  const teamSlug = params?.teamSlug as string | undefined;
  const locale = params?.locale as string | undefined;

  // Get the path portion without locale and team (for active state matching)
  const currentPath = getTeamPathWithoutSlug(pathname);

  /**
   * Build the full href for a nav item, including locale and team context.
   */
  const buildHref = (path: string): string => {
    if (!teamSlug || !locale) {
      // Fallback to path without team context
      return path;
    }
    return `/${locale}/${teamSlug}${path}`;
  };

  /**
   * Check if a nav item is currently active.
   */
  const isActive = (path: string) => {
    if (path === TEAM_ROUTES.DASHBOARD) {
      return currentPath === "/" || currentPath === TEAM_ROUTES.DASHBOARD;
    }
    // For /settings, only match exact path or with query params
    // to avoid matching /settings/profile or /settings/team
    if (path === TEAM_ROUTES.SETTINGS) {
      return currentPath === TEAM_ROUTES.SETTINGS || currentPath.startsWith(`${TEAM_ROUTES.SETTINGS}?`);
    }
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    const href = buildHref(item.path);

    return (
      <li key={item.path}>
        <Link
          href={href}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
            ${active
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }
          `}
          aria-current={active ? "page" : undefined}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      </li>
    );
  };

  const renderSection = (items: NavItem[], label?: string) => (
    <div className="space-y-1">
      {label && !collapsed && (
        <p className="px-3 py-1 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {label}
        </p>
      )}
      <ul className="space-y-0.5">
        {items.map(renderNavItem)}
      </ul>
    </div>
  );

  return (
    <nav className="flex flex-col gap-6" aria-label="Main navigation">
      {renderSection(mainNavItems)}

      {renderSection(dataNavItems, "Data")}

      {renderSection(managementNavItems, "Management")}

      {renderSection(settingsNavItems, "Settings")}
    </nav>
  );
}
