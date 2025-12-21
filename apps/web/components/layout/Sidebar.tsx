"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Navigation } from "./Navigation";

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed: controlledCollapsed, onCollapsedChange }: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    const newValue = !collapsed;
    if (isControlled && onCollapsedChange) {
      onCollapsedChange(newValue);
    } else {
      setInternalCollapsed(newValue);
    }
  };

  return (
    <aside
      className={`
        relative flex flex-col h-full bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-16" : "w-64"}
      `}
      role="complementary"
      aria-label="Sidebar"
      data-testid="sidebar"
      data-collapsed={collapsed ? "true" : undefined}
    >
      {/* Logo/Brand */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shrink-0" />
          {!collapsed && (
            <span className="text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              Dotoro
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <Navigation collapsed={collapsed} />
      </div>

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className={`
          absolute -right-3 top-20 z-10
          w-6 h-6 flex items-center justify-center
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-600
          rounded-full shadow-sm
          hover:bg-gray-50 dark:hover:bg-gray-700
          transition-colors
        `}
        aria-label="Toggle sidebar"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        )}
      </button>
    </aside>
  );
}
