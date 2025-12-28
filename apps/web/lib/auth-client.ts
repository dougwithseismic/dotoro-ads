/**
 * Better Auth Client Configuration
 *
 * Client-side authentication using Better Auth library.
 * Provides hooks and methods for authentication in React components.
 *
 * @see https://www.better-auth.com/docs/react
 */
import { createAuthClient } from "better-auth/react";
import {
  magicLinkClient,
  adminClient,
  twoFactorClient,
} from "better-auth/client/plugins";

/**
 * Better Auth client configured for the Dotoro application
 *
 * Features:
 * - Magic link authentication (passwordless login)
 * - Admin user management (roles, banning, session management)
 * - Two-Factor Authentication (TOTP with backup codes)
 * - Session management with automatic token handling
 * - Cross-tab session synchronization
 *
 * Configuration:
 * - baseURL: Points to the API server which handles auth endpoints
 * - plugins: Magic link, Admin, and Two-Factor plugins
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  plugins: [magicLinkClient(), adminClient(), twoFactorClient()],
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
 *
 * @example
 * ```tsx
 * // Admin usage
 * import { admin } from "@/lib/auth-client";
 *
 * // List all users
 * const { data, error } = await admin.listUsers({ query: { limit: 20 } });
 *
 * // Ban a user
 * await admin.banUser({ userId: "user_id", banReason: "Violation" });
 * ```
 */
export const { signIn, signOut, useSession, getSession, admin } = authClient;

/**
 * Session Management API
 *
 * Better Auth provides built-in session management for users to:
 * - View all their active sessions across devices
 * - Revoke specific sessions remotely
 * - Revoke all other sessions at once
 *
 * @example
 * ```tsx
 * import { listSessions, revokeSession, revokeOtherSessions } from "@/lib/auth-client";
 *
 * // Get all active sessions
 * const { data: sessions } = await listSessions();
 *
 * // Revoke a specific session by its token
 * await revokeSession({ token: session.token });
 *
 * // Revoke all sessions except current one
 * await revokeOtherSessions();
 * ```
 */
export const listSessions = authClient.listSessions;
export const revokeSession = authClient.revokeSession;
export const revokeOtherSessions = authClient.revokeOtherSessions;

/**
 * Account Linking API
 *
 * Better Auth provides built-in account linking for users to:
 * - View all linked authentication accounts (OAuth, magic link)
 * - Link additional OAuth providers to their account
 * - Unlink accounts (with safety check for last auth method)
 *
 * @example
 * ```tsx
 * import { listAccounts, linkSocial, unlinkAccount } from "@/lib/auth-client";
 *
 * // Get all linked accounts for the current user
 * const { data: accounts } = await listAccounts();
 *
 * // Link a new OAuth provider (redirects to OAuth flow)
 * await linkSocial({ provider: "google", callbackURL: "/settings?tab=security" });
 *
 * // Unlink an account (fails if it's the last auth method)
 * await unlinkAccount({ providerId: "google" });
 * ```
 */
export const listAccounts = authClient.listAccounts;
export const linkSocial = authClient.linkSocial;
export const unlinkAccount = authClient.unlinkAccount;

/**
 * Two-Factor Authentication API
 *
 * Better Auth provides built-in 2FA for users to:
 * - Enable TOTP-based 2FA with authenticator apps
 * - Verify 2FA codes during login
 * - Disable 2FA when needed
 * - Generate and use backup codes for account recovery
 *
 * @example
 * ```tsx
 * import { twoFactor } from "@/lib/auth-client";
 *
 * // Enable 2FA - returns TOTP URI for QR code
 * const { data } = await twoFactor.enable({ password: "required-password" });
 * // data.totpURI can be used to generate QR code
 * // data.backupCodes contains the backup codes
 *
 * // Verify TOTP code to complete 2FA setup
 * await twoFactor.verifyTotp({ code: "123456" });
 *
 * // Disable 2FA
 * await twoFactor.disable({ password: "required-password" });
 *
 * // Get 2FA status
 * const { data: status } = await twoFactor.getTotpUri();
 * ```
 */
export const twoFactor = authClient.twoFactor;
