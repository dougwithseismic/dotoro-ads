/**
 * Better Auth Client Configuration
 *
 * Client-side authentication using Better Auth library.
 * Provides hooks and methods for authentication in React components.
 *
 * @see https://www.better-auth.com/docs/react
 */
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

/**
 * Better Auth client configured for the Dotoro application
 *
 * Features:
 * - Magic link authentication (passwordless login)
 * - Session management with automatic token handling
 * - Cross-tab session synchronization
 *
 * Configuration:
 * - baseURL: Points to the API server which handles auth endpoints
 * - plugins: Magic link plugin for passwordless authentication
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  plugins: [magicLinkClient()],
});

/**
 * Destructured exports for convenient usage
 *
 * @example
 * ```tsx
 * // In a component
 * import { useSession, signOut } from "@/lib/auth-client";
 *
 * function Profile() {
 *   const { data: session, isPending } = useSession();
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (!session) return <div>Not logged in</div>;
 *
 *   return (
 *     <div>
 *       <p>Hello, {session.user.email}</p>
 *       <button onClick={() => signOut()}>Sign out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const { signIn, signOut, useSession, getSession } = authClient;
