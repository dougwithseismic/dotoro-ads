/**
 * Auth Types for Dotoro Web App
 *
 * These types align with Better Auth's user and session structures
 * while providing a consistent interface for the application.
 */

/**
 * User object from Better Auth
 */
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
  image?: string | null;
}

/**
 * Session object from Better Auth
 */
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

/**
 * Auth context value provided by AuthProvider
 */
export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
