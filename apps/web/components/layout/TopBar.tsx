"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, ChevronDown, User, Settings, LogOut, LogIn } from "lucide-react";
import { ThemeToggle } from "./ThemeProvider";
import { TeamSwitcher } from "./TeamSwitcher";
import { useAuth } from "@/lib/auth";
import { TeamLink } from "@/components/ui/TeamLink";
import { AUTH_ROUTES, TEAM_ROUTES, useLocaleRoute } from "@/lib/routes";

interface Breadcrumb {
  label: string;
  href: string;
}

interface TopBarProps {
  breadcrumbs?: Breadcrumb[];
  onMobileMenuToggle?: () => void;
}

export function TopBar({ breadcrumbs = [], onMobileMenuToggle }: TopBarProps) {
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const { buildLocalePath } = useLocaleRoute();

  const handleSignOut = async () => {
    setAccountDropdownOpen(false);
    await logout();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <header
      className="flex items-center justify-between h-14 px-4 bg-zinc-950 border-b border-zinc-800/50"
      role="banner"
    >
      {/* Left side: Mobile menu + Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-md hover:bg-zinc-800 lg:hidden transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5 text-zinc-400" />
        </button>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="hidden sm:block">
            <ol className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={crumb.href} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="text-zinc-600">/</span>
                  )}
                  <Link
                    href={crumb.href}
                    className={`
                      ${index === breadcrumbs.length - 1
                        ? "text-zinc-100 font-medium"
                        : "text-zinc-500 hover:text-zinc-300 transition-colors"
                      }
                    `}
                    aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
                  >
                    {crumb.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>

      {/* Right side: Theme toggle + Team Switcher + Account switcher */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Team Switcher - only shown when authenticated */}
        {isAuthenticated && <TeamSwitcher />}

        {/* Vertical divider between TeamSwitcher and Account */}
        {isAuthenticated && (
          <div
            data-testid="team-account-divider"
            className="h-6 w-px bg-zinc-700"
            aria-hidden="true"
          />
        )}

        {/* Account Switcher / Sign In */}
        {isLoading ? (
          <div className="w-7 h-7 bg-zinc-800 rounded-full animate-pulse" />
        ) : isAuthenticated ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
              aria-label="Account"
              aria-expanded={accountDropdownOpen}
              aria-haspopup="true"
            >
              <div className="w-7 h-7 bg-zinc-800 rounded-full flex items-center justify-center ring-1 ring-zinc-700">
                <User className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${accountDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {accountDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-50"
                role="menu"
                aria-orientation="vertical"
              >
                <div className="px-4 py-3 border-b border-zinc-800">
                  <p className="text-sm font-medium text-zinc-100">
                    {user?.name || "Account"}
                  </p>
                  <p className="text-sm text-zinc-500 truncate">
                    {user?.email}
                  </p>
                </div>

                <div className="py-1">
                  <TeamLink
                    href={TEAM_ROUTES.SETTINGS}
                    onClick={() => setAccountDropdownOpen(false)}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </TeamLink>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href={buildLocalePath(AUTH_ROUTES.LOGIN)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
