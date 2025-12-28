/**
 * Auth Module Exports
 *
 * This module re-exports authentication utilities from:
 * - context.tsx: React context provider and hooks (AuthProvider, useAuth, useRequireAuth)
 * - auth-client.ts: Better Auth client (signIn, signOut, useSession, getSession)
 * - types.ts: TypeScript types (User, Session, AuthContextValue)
 */

// React context and hooks
export { AuthProvider, useAuth, useRequireAuth } from "./context";

// Better Auth client utilities (re-exported for convenience)
export { signIn, signOut, useSession, getSession, authClient } from "../auth-client";

// Types
export type { User, Session, AuthContextValue } from "./types";
