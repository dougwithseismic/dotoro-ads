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
        relative flex flex-col h-full bg-zinc-950
        border-r border-zinc-800/50
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-16" : "w-64"}
      `}
      role="complementary"
      aria-label="Sidebar"
      data-testid="sidebar"
      data-collapsed={collapsed ? "true" : undefined}
    >
      {/* Logo/Brand */}
      <div className="flex items-center h-14 px-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center shrink-0">
            <span className="text-black font-bold text-sm">D</span>
          </div>
          {!collapsed && (
            <span className="text-[15px] font-medium text-zinc-100 whitespace-nowrap tracking-tight">
              Dotoro
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Navigation collapsed={collapsed} />
      </div>

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className={`
          absolute -right-3 top-16 z-10
          w-6 h-6 flex items-center justify-center
          bg-zinc-900 border border-zinc-700
          rounded-full
          hover:bg-zinc-800 hover:border-zinc-600
          transition-colors
        `}
        aria-label="Toggle sidebar"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
        )}
      </button>
    </aside>
  );
}
