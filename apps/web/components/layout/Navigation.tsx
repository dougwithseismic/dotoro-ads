"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Database,
  Shuffle,
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
  { label: "Transforms", href: "/transforms", icon: Shuffle },
  { label: "Templates", href: "/templates", icon: Layout },
  { label: "Rules", href: "/rules", icon: Filter },
];

const managementNavItems: NavItem[] = [
  { label: "Campaign Sets", href: "/campaign-sets", icon: Megaphone },
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
    </nav>
  );
}
