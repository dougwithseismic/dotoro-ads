"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Database,
  Layout,
  Filter,
  Megaphone,
  User,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: Home },
];

const dataNavItems: NavItem[] = [
  { label: "Data Sources", href: "/data-sources", icon: Database },
  { label: "Templates", href: "/templates", icon: Layout },
  { label: "Rules", href: "/rules", icon: Filter },
];

const managementNavItems: NavItem[] = [
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Accounts", href: "/accounts", icon: User },
];

interface NavigationProps {
  collapsed?: boolean;
}

export function Navigation({ collapsed = false }: NavigationProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-md transition-colors
            ${active
              ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
            }
          `}
          aria-current={active ? "page" : undefined}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      </li>
    );
  };

  const renderSection = (items: NavItem[]) => (
    <ul className="space-y-1">
      {items.map(renderNavItem)}
    </ul>
  );

  return (
    <nav className="flex flex-col gap-6" aria-label="Main navigation">
      {renderSection(mainNavItems)}

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {renderSection(dataNavItems)}

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {renderSection(managementNavItems)}
    </nav>
  );
}
