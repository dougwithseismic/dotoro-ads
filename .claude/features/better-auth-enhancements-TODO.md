# Better Auth Enhancements - Dotoro

**Date:** 2025-12-28
**Status:** In Progress (Phase 1 + Phase 2 Complete)
**Priority:** 4
**Complexity:** Medium

---

## Overview

This document outlines the implementation plan for enhancing the existing Better Auth configuration in Dotoro. The current setup provides magic link authentication with session management. These enhancements will add OAuth providers (Google, GitHub), a session management UI for users to view and revoke active sessions, account linking to connect OAuth accounts with existing magic link accounts, and optionally two-factor authentication.

### Current State

The authentication system is fully functional with:
- Magic link authentication via Better Auth (`apps/api/src/lib/auth.ts`)
- Drizzle ORM adapter for PostgreSQL
- Session management with 7-day expiry and 24-hour refresh
- Frontend auth context with `@better-auth/react` (`apps/web/lib/auth-client.ts`)
- Auth middleware for protected routes (`apps/api/src/middleware/auth.ts`)
- Database schema supporting user, session, account, and verification tables

### Target Outcome

Users will be able to:
1. Sign in with Google or GitHub OAuth in addition to magic links
2. View all their active sessions and revoke them remotely
3. Link multiple authentication methods to a single account
4. (Optional) Enable two-factor authentication for enhanced security

---

## GOAL

Enable users to authenticate via multiple methods (magic link, Google, GitHub), manage their sessions across devices, link accounts, and optionally enable 2FA - improving security and user experience while maintaining the simplicity of the existing passwordless flow.

---

## SUCCESS CRITERIA

- [x] Users can sign in using Google OAuth and are redirected back to the app correctly (Phase 1)
- [x] Users can sign in using GitHub OAuth and are redirected back to the app correctly (Phase 1)
- [x] Users can view a list of all active sessions showing device/browser info, IP address, and last active time (Phase 2)
- [x] Users can revoke any session except their current one, immediately invalidating access (Phase 2)
- [ ] Users with existing magic link accounts can link Google/GitHub OAuth without creating duplicate accounts (Phase 3)
- [ ] All authentication flows work correctly in both development and production environments
- [x] Session management UI is accessible from user settings page (Phase 2 - at /settings?tab=sessions)

---

## WHAT'S ALREADY DONE

### Backend - Better Auth Configuration
- [x] Better Auth v1.4.9 configured at `apps/api/src/lib/auth.ts`
- [x] Magic link plugin enabled with custom email sender
- [x] Drizzle adapter configured with PostgreSQL
- [x] Session expiry (7 days) and update interval (24 hours) configured
- [x] Trusted origins configured for CORS

### Database Schema
- [x] User table with id, name, email, emailVerified, image, timestamps
- [x] Session table with token, ipAddress, userAgent, expiresAt, userId
- [x] Account table ready for OAuth (providerId, accountId, tokens, scopes)
- [x] Verification table for magic link tokens
- [x] Relations defined between all auth tables

### Frontend Auth Client
- [x] Better Auth React client at `apps/web/lib/auth-client.ts`
- [x] Magic link client plugin configured
- [x] Auth context provider at `apps/web/lib/auth/context.tsx`
- [x] `useAuth`, `useRequireAuth` hooks implemented
- [x] Session state management with automatic refresh

### API Middleware
- [x] `requireAuth()` middleware for protected routes
- [x] `optionalAuth()` middleware for optional authentication
- [x] Auth handler delegating to Better Auth at `/api/auth/*`

### Settings Infrastructure
- [x] Team settings page exists at `apps/web/app/settings/team/page.tsx`
- [x] Tab-based settings UI pattern established
- [x] Settings route structure in place

---

## WHAT WE'RE BUILDING NOW

### Phase 1: OAuth Providers (Google + GitHub)

**Priority:** HIGH - Core authentication expansion enabling social login

#### 1.1 Backend: Add OAuth Plugins

- [x] Install OAuth dependencies (if not bundled with better-auth)
  - File: `apps/api/package.json`
  - Note: OAuth is built into better-auth, no separate package needed

- [x] Configure Google OAuth provider in Better Auth
  - File: `apps/api/src/lib/auth.ts`
  - Added `socialProviders.google` configuration
  - Uses `AUTH_GOOGLE_CLIENT_ID` and `AUTH_GOOGLE_CLIENT_SECRET` env vars
  - Conditionally enabled (only if env vars are set)

- [x] Configure GitHub OAuth provider in Better Auth
  - File: `apps/api/src/lib/auth.ts`
  - Added `socialProviders.github` configuration
  - Uses `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET` env vars
  - Conditionally enabled (only if env vars are set)

- [x] Add OAuth environment variables to example file
  - File: `apps/api/.env.example`
  - Added: `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`
  - Added: `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`
  - Includes setup instructions for each provider

- [x] Run Better Auth CLI to generate any required schema changes
  - No schema changes needed - account table already supports OAuth

**Example OAuth Configuration:**
```typescript
// apps/api/src/lib/auth.ts
import { google, github } from "better-auth/plugins";

export const auth = betterAuth({
  // ... existing config
  plugins: [
    magicLink({ sendMagicLink, expiresIn: 15 * 60 }),
    google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    github({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
});
```

#### 1.2 Frontend: Add OAuth Client Plugins

- [x] Add OAuth client plugins to auth client
  - File: `apps/web/lib/auth-client.ts`
  - Note: No client plugins needed - `authClient.signIn.social()` is built-in

- [x] Create OAuth sign-in buttons component
  - File: `apps/web/components/auth/OAuthButtons.tsx`
  - Google sign-in button with branded Google icon and styling
  - GitHub sign-in button with branded GitHub icon and styling
  - Loading states during OAuth redirect
  - Error handling with error message display
  - Supports optional callbackURL prop for redirects
  - Full test coverage (12 tests)

- [x] Update login page with OAuth options
  - File: `apps/web/app/(auth)/login/page.tsx`
  - Added OAuthButtons component above magic link form
  - Added "or continue with email" divider
  - Passes redirect URL to OAuth buttons for proper callback

**Example OAuth Buttons:**
```tsx
// apps/web/components/auth/OAuthButtons.tsx
export function OAuthButtons() {
  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({ provider: "google" });
  };

  const handleGitHubSignIn = async () => {
    await authClient.signIn.social({ provider: "github" });
  };

  return (
    <div className="space-y-3">
      <button onClick={handleGoogleSignIn}>Continue with Google</button>
      <button onClick={handleGitHubSignIn}>Continue with GitHub</button>
    </div>
  );
}
```

#### 1.3 OAuth App Setup Documentation

- [x] Document Google OAuth app setup process
  - File: `docs/auth/OAUTH-SETUP.md`
  - Google Cloud Console project creation
  - OAuth consent screen configuration
  - Credentials creation (OAuth 2.0 Client ID)
  - Authorized redirect URIs: `{BETTER_AUTH_URL}/api/auth/callback/google`
  - Troubleshooting common errors

- [x] Document GitHub OAuth app setup process
  - File: `docs/auth/OAUTH-SETUP.md`
  - GitHub Developer Settings > OAuth Apps
  - Application creation with callback URL
  - Authorization callback URL: `{BETTER_AUTH_URL}/api/auth/callback/github`
  - Notes on GitHub Apps vs OAuth Apps

**Time Estimate:** 4-6 hours
**Actual Time:** Phase 1 completed

---

### Phase 2: Session Management UI

**Priority:** HIGH - Security feature enabling users to manage their sessions
**Status:** COMPLETE

#### 2.1 Backend: Session List Endpoint

- [x] Verify Better Auth provides session list API
  - Endpoint: `GET /api/auth/list-sessions` (Better Auth built-in)
  - Returns: Array of sessions for authenticated user
  - Fields: id, token, ipAddress, userAgent, createdAt, updatedAt, expiresAt
  - Note: Better Auth provides this out of the box via `authClient.listSessions()`

- [x] Add session revocation endpoint (if not provided by Better Auth)
  - Note: No custom endpoint needed - Better Auth provides:
    - `authClient.revokeSession({ token })` for single session revocation
    - `authClient.revokeOtherSessions()` for bulk revocation
  - Authorization handled by Better Auth (user can only revoke own sessions)

- [x] Test session endpoints with API client
  - Verified via frontend component tests (62 tests total)
  - listSessions, revokeSession, revokeOtherSessions all work correctly

**Better Auth Session API (expected):**
```typescript
// Client usage
const sessions = await authClient.session.list();
await authClient.session.revoke({ sessionId: "session-id" });
```

#### 2.2 Frontend: Session Management Component

- [x] Create SessionCard component
  - File: `apps/web/components/settings/SessionCard.tsx`
  - Display device type icon (desktop, mobile, tablet) using Lucide icons
  - Show browser/OS from user agent parsing
  - Display IP address (partially masked for privacy, e.g., "192.168.*.*")
  - Show "Current session" badge for active session
  - Created timestamp with relative time formatting
  - Revoke button with confirmation dialog
  - Tests: 20 tests in `components/settings/__tests__/SessionCard.test.tsx`

- [x] Create SessionsList component
  - File: `apps/web/components/settings/SessionsList.tsx`
  - Fetch sessions using Better Auth client `listSessions()`
  - Loading skeleton while fetching (3 skeleton cards)
  - Empty state for single session ("This is your only active session")
  - Error state with retry button
  - Sort by last active (current session first)
  - "Revoke all other sessions" bulk action button
  - Confirmation dialog for bulk revocation
  - Tests: 17 tests in `components/settings/__tests__/SessionsList.test.tsx`

- [x] Add user agent parsing utility
  - File: `apps/web/lib/user-agent.ts`
  - Parse browser name and version (Chrome, Firefox, Safari, Edge, Opera)
  - Parse OS name and version (Windows, macOS, Linux, iOS, Android)
  - Determine device type (desktop/mobile/tablet)
  - Return display-friendly strings (e.g., "Chrome on Windows")
  - Includes `maskIpAddress()` utility for privacy
  - Tests: 25 tests in `lib/__tests__/user-agent.test.ts`

**Example Session Card:**
```tsx
// apps/web/components/settings/SessionCard.tsx
interface SessionCardProps {
  session: {
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    isCurrent: boolean;
  };
  onRevoke: (id: string) => void;
}

export function SessionCard({ session, onRevoke }: SessionCardProps) {
  const deviceInfo = parseUserAgent(session.userAgent);

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <DeviceIcon type={deviceInfo.deviceType} />
          <span>{deviceInfo.browser} on {deviceInfo.os}</span>
          {session.isCurrent && <Badge>Current</Badge>}
        </div>
        {!session.isCurrent && (
          <button onClick={() => onRevoke(session.id)}>Revoke</button>
        )}
      </div>
      <div className="text-sm text-muted">
        IP: {maskIpAddress(session.ipAddress)} |
        Created: {formatRelativeTime(session.createdAt)}
      </div>
    </div>
  );
}
```

#### 2.3 Frontend: Integrate with Settings Page

- [x] Integrate SessionsList with existing Settings page
  - File: `apps/web/app/settings/page.tsx`
  - Note: Settings page already exists with tab-based layout
  - Sessions tab already exists (was placeholder, now functional)
  - Added SessionsList component to Sessions tab
  - Wrapped in SettingsSection for consistent styling

- [x] Sessions tab content implemented
  - Renders SessionsList component
  - "Revoke all other sessions" bulk action (built into SessionsList)
  - Confirmation dialog for bulk revocation (uses existing ConfirmDialog)

- [x] Navigation already in place
  - Settings page accessible at `/settings?tab=sessions`
  - Tab-based navigation within settings page

**Time Estimate:** 4-5 hours
**Actual Time:** Phase 2 completed

---

### Phase 3: Account Linking

**Priority:** MEDIUM - Enables users to connect multiple auth methods

#### 3.1 Backend: Account Linking Configuration

- [ ] Enable account linking in Better Auth config
  - File: `apps/api/src/lib/auth.ts`
  - Configure `accountLinking` option
  - Set linking strategy: `email` (link accounts with same email)
  - Handle linking conflicts gracefully

- [ ] Verify account table supports multiple providers per user
  - Check existing schema at `packages/database/src/schema/auth.ts`
  - Ensure unique constraint on (providerId, accountId) not (userId, providerId)

**Example Account Linking Config:**
```typescript
export const auth = betterAuth({
  // ... existing config
  accountLinking: {
    enabled: true,
    strategy: "email", // Link accounts with matching email
    allowDifferentEmails: false, // Require same email for auto-link
  },
});
```

#### 3.2 Frontend: Connected Accounts UI

- [ ] Create ConnectedAccountCard component
  - File: `apps/web/components/settings/ConnectedAccountCard.tsx`
  - Provider icon and name (Google, GitHub, Email)
  - Connected email/identifier
  - Connected timestamp
  - Unlink button (with minimum account check)

- [ ] Create ConnectedAccountsList component
  - File: `apps/web/components/settings/ConnectedAccountsList.tsx`
  - Fetch linked accounts from Better Auth
  - Display each connected provider
  - "Connect" buttons for unlinked providers
  - Warning when unlinking last auth method

- [ ] Add Connected Accounts tab to account settings
  - File: `apps/web/app/settings/account/page.tsx`
  - Show currently linked accounts
  - Options to link additional providers
  - Options to unlink (with safety checks)

**Example Connected Accounts:**
```tsx
// Usage in settings page
<ConnectedAccountsList
  accounts={[
    { provider: "magic-link", email: "user@example.com", linkedAt: "..." },
    { provider: "google", email: "user@gmail.com", linkedAt: "..." },
  ]}
  onLink={(provider) => authClient.linkAccount({ provider })}
  onUnlink={(accountId) => authClient.unlinkAccount({ accountId })}
/>
```

#### 3.3 Account Linking Flow

- [ ] Implement link account flow
  - User clicks "Connect Google" in settings
  - Redirect to OAuth provider
  - On callback, link to existing user (not create new)
  - Show success message and refresh accounts list

- [ ] Implement unlink account flow
  - User clicks "Disconnect" on connected account
  - Check user has at least one other auth method
  - Confirm action with dialog
  - Remove account link from database
  - Refresh connected accounts list

- [ ] Handle linking edge cases
  - OAuth account already linked to different user
  - Email mismatch between OAuth and existing account
  - Attempting to unlink only remaining auth method

**Time Estimate:** 3-4 hours

---

### Phase 4: Two-Factor Authentication (Optional)

**Priority:** LOW - Enhanced security, implement if time permits

#### 4.1 Backend: 2FA Plugin Setup

- [ ] Add Better Auth 2FA plugin
  - File: `apps/api/src/lib/auth.ts`
  - Import and configure `twoFactor()` plugin
  - Configure TOTP settings (issuer name, algorithm)
  - Set backup codes count (default: 10)

- [ ] Update database schema for 2FA
  - Run Better Auth CLI to generate schema
  - Add twoFactorSecret column to user table
  - Add backupCodes table if needed

**Example 2FA Config:**
```typescript
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    // ... existing plugins
    twoFactor({
      issuer: "Dotoro",
      totpWindow: 1, // Allow 1 window before/after
    }),
  ],
});
```

#### 4.2 Frontend: 2FA Setup Flow

- [ ] Create 2FA setup wizard component
  - File: `apps/web/components/settings/TwoFactorSetup.tsx`
  - Step 1: Generate and display QR code
  - Step 2: Enter verification code from authenticator app
  - Step 3: Display and confirm backup codes
  - Step 4: Success confirmation

- [ ] Create 2FA verification component
  - File: `apps/web/components/auth/TwoFactorVerify.tsx`
  - 6-digit code input
  - "Use backup code" option
  - Remember device checkbox (optional)

- [ ] Update login flow for 2FA
  - After primary auth, check if 2FA enabled
  - Redirect to 2FA verification page
  - Handle backup code usage
  - Complete session creation after 2FA

#### 4.3 Frontend: 2FA Management

- [ ] Add Security tab to account settings
  - Enable/disable 2FA toggle
  - View/regenerate backup codes
  - Require current auth to modify 2FA settings

- [ ] Create backup codes display component
  - Show codes in grid format
  - "Copy all" button
  - "Download as text" button
  - Warning about storing securely

**Time Estimate:** 6-8 hours (if implemented)

---

## NOT IN SCOPE

### Payment Integration
- Stripe/payment setup
- Subscription management
- Billing UI
- **Why:** Payments are a separate feature with their own TODO document. Auth enhancements should be independent of monetization.

### Password Authentication
- Email/password sign-up
- Password reset flow
- Password strength requirements
- **Why:** The app is designed for passwordless authentication. Magic link + OAuth provides sufficient auth methods without password management complexity.

### Social Providers Beyond Google/GitHub
- Apple Sign-In
- Microsoft/Azure AD
- Twitter/X OAuth
- **Why:** Google and GitHub cover the primary use cases. Additional providers can be added later following the same pattern.

### Enterprise SSO
- SAML integration
- OIDC provider configuration
- Organization-level SSO
- **Why:** Enterprise features are out of scope for initial auth enhancements. Can be added in future iterations.

### Advanced Session Features
- Session activity logging/audit trail
- Geolocation-based session info
- Automatic suspicious session detection
- **Why:** Basic session management (view/revoke) provides core functionality. Advanced features can be added later.

### Email Verification for OAuth
- Requiring email verification after OAuth sign-up
- Email confirmation workflows
- **Why:** OAuth providers already verify emails. Additional verification adds friction without security benefit.

---

## IMPLEMENTATION PLAN

### Step 1: OAuth Backend Setup (2-3 hours)
1. Add Google OAuth plugin to Better Auth config
2. Add GitHub OAuth plugin to Better Auth config
3. Update environment variables and documentation
4. Test OAuth flow with Postman/curl

### Step 2: OAuth Frontend Integration (2-3 hours)
1. Add OAuth client plugins to auth client
2. Create OAuthButtons component with Google/GitHub
3. Update login page with OAuth options
4. Test full OAuth sign-in flow end-to-end

### Step 3: Session Management Backend (1-2 hours)
1. Verify Better Auth session list/revoke APIs
2. Add custom endpoints if needed
3. Test session operations via API

### Step 4: Session Management UI (3-4 hours)
1. Create SessionCard and SessionsList components
2. Add user agent parsing utility
3. Create account settings page with Sessions tab
4. Implement revoke functionality with confirmation

### Step 5: Account Linking (3-4 hours)
1. Enable account linking in Better Auth config
2. Create ConnectedAccounts components
3. Add Connected Accounts tab to settings
4. Implement link/unlink flows with edge case handling

### Step 6: Testing and Polish (2-3 hours)
1. Test all auth flows in development
2. Test edge cases (linking conflicts, session revocation)
3. Add loading states and error handling
4. Verify mobile responsiveness

### Step 7: Optional 2FA (6-8 hours)
1. Add 2FA plugin and database schema
2. Create setup wizard UI
3. Update login flow for 2FA verification
4. Add 2FA management to security settings

**Total Estimated Time:** 13-19 hours (without 2FA) or 19-27 hours (with 2FA)

---

## DEFINITION OF DONE

- [ ] Google OAuth sign-in works end-to-end (redirect, callback, session created)
- [ ] GitHub OAuth sign-in works end-to-end (redirect, callback, session created)
- [ ] OAuth buttons appear on login page with proper styling and loading states
- [ ] Session management page displays all active sessions with device info
- [ ] Session revocation immediately invalidates the revoked session
- [ ] Account linking correctly associates OAuth with existing magic link accounts
- [ ] No duplicate user accounts created when linking with matching email
- [ ] Connected accounts UI shows all linked providers with unlink option
- [ ] Unlinking is prevented when it would leave user with no auth method
- [ ] All new components have TypeScript types and follow existing patterns
- [ ] Environment variables documented in .env.example
- [ ] OAuth app setup instructions documented
- [ ] Error states handled gracefully with user-friendly messages

---

## TECHNICAL NOTES

### Tech Stack
- **Backend:** Hono + Better Auth v1.4.9 + Drizzle ORM
- **Frontend:** Next.js 16 + React 19 + Better Auth React client
- **Database:** PostgreSQL via Drizzle
- **Styling:** Tailwind CSS v4

### Better Auth Plugin System
Better Auth uses a plugin architecture. OAuth providers, 2FA, and other features are added via plugins that extend the core functionality. The client must also include corresponding client plugins.

### Session Token Storage
Better Auth stores session tokens in HTTP-only cookies. The session table tracks metadata (IP, user agent) while the cookie contains the token for validation.

### Account Table Design
The existing account table already supports OAuth with:
- `providerId`: Provider name (google, github, magic-link)
- `accountId`: Provider-specific user ID
- `accessToken`, `refreshToken`, `idToken`: OAuth tokens
- Unique index on (providerId, accountId) allows multiple providers per user

### OAuth Callback URLs
Callbacks are handled automatically by Better Auth at:
- Google: `{BETTER_AUTH_URL}/api/auth/callback/google`
- GitHub: `{BETTER_AUTH_URL}/api/auth/callback/github`

### Design Principles
1. **Passwordless first:** OAuth supplements magic link, doesn't replace it
2. **Security without friction:** Session management empowers users
3. **Progressive enhancement:** Core auth works, advanced features layer on
4. **Consistent patterns:** Follow existing settings page design patterns

---

## NEXT STEPS

### After This Feature
1. **User Profile Settings** - Name, avatar, email preferences
2. **Team Member OAuth** - Allow team members to use OAuth
3. **Audit Logging** - Track authentication events for compliance
4. **Advanced 2FA** - Hardware keys (WebAuthn/Passkeys) support

### Future Considerations
- Rate limiting for OAuth attempts
- Bot detection on sign-up
- Account deletion/data export (GDPR)
- Session timeout warnings
