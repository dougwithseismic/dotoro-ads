"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User, AuthContextValue } from "./types";
import { getSession, logout as logoutApi } from "./api";

// Create the context
const AuthContext = createContext<AuthContextValue | null>(null);

// Auth routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/verify"];

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Refresh session from API
  const refreshSession = useCallback(async () => {
    try {
      const session = await getSession();
      setUser(session.user);
    } catch (error) {
      console.error("Failed to refresh session:", error);
      setUser(null);
    }
  }, []);

  // Initial session check
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const session = await getSession();
        setUser(session.user);
      } catch (error) {
        console.error("Failed to check session:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

    if (!user && !isPublicRoute) {
      // Not authenticated and trying to access protected route
      const redirectUrl = encodeURIComponent(pathname);
      router.push(`/login?redirect=${redirectUrl}`);
    }
  }, [user, isLoading, pathname, router]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await logoutApi();
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear local state even if API call fails
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
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
