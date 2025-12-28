"use client";

import { useState, useEffect } from "react";
import { PermissionMatrix } from "./PermissionMatrix";
import { PermissionCards } from "./PermissionCards";
import type { TeamRole } from "@/lib/permissions";

export interface PermissionsViewProps {
  /** The current user's role */
  currentRole: TeamRole;
  /** Whether to show only dangerous permissions initially */
  showDangerousOnly?: boolean;
}

const MOBILE_BREAKPOINT = 768;

/**
 * PermissionsView Component
 *
 * Responsive wrapper that renders:
 * - PermissionMatrix on desktop (>= 768px)
 * - PermissionCards on mobile (< 768px)
 */
export function PermissionsView({
  currentRole,
  showDangerousOnly = false,
}: PermissionsViewProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  if (isMobile) {
    return (
      <PermissionCards
        currentRole={currentRole}
        showDangerousOnly={showDangerousOnly}
      />
    );
  }

  return (
    <PermissionMatrix
      currentRole={currentRole}
      showDangerousOnly={showDangerousOnly}
    />
  );
}
