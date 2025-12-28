"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut as betterAuthSignOut } from "../auth-client";
import type { User, AuthContextValue } from "./types";

// Create the context
const AuthContext = createContext<AuthContextValue | null>(null);

// Auth routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/verify"];

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state using Better Auth
 *
 * Uses Better Auth's useSession hook which:
 * - Automatically fetches session on mount
 * - Handles session refresh and token rotation
 * - Syncs session across browser tabs
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Transform Better Auth user to our User type
  // Better Auth includes createdAt/updatedAt from the database schema
  const user: User | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerified ?? false,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        createdAt: session.user.createdAt ?? null,
        updatedAt: session.user.updatedAt ?? null,
      }
    : null;

  // Redirect logic
  useEffect(() => {
    if (isPending) return;

    const isPublicRoute = PUBLIC_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (!user && !isPublicRoute) {
      // Not authenticated and trying to access protected route
      const redirectUrl = encodeURIComponent(pathname);
      router.push(`/login?redirect=${redirectUrl}`);
    }
  }, [user, isPending, pathname, router]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await betterAuthSignOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect even if API call fails
      router.push("/login");
    }
  }, [router]);

  // Refresh session wrapper
  const refreshSession = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value: AuthContextValue = {
    user,
    isLoading: isPending,
    isAuthenticated: !!user,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(): AuthContextValue {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      const redirectUrl = encodeURIComponent(pathname);
      router.push(`/login?redirect=${redirectUrl}`);
    }
  }, [auth.isLoading, auth.isAuthenticated, router, pathname]);

  return auth;
}
