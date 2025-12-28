/**
 * Auth Types for Dotoro Web App
 */

/**
 * User object returned from the API
 */
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Session response from GET /api/auth/session
 */
export interface SessionResponse {
  user: User | null;
  expiresAt: string | null;
}

/**
 * Magic link request response
 */
export interface MagicLinkRequestResponse {
  success: true;
  message: string;
}

/**
 * Magic link verify response
 */
export interface MagicLinkVerifyResponse {
  user: User;
  expiresAt: string;
}

/**
 * Auth context value
 */
export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
