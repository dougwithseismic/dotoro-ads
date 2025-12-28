# Better Auth Migration TODO

**Project:** Dotoro
**Feature:** Replace Custom Auth with Better Auth
**Date:** 2025-12-28
**Status:** In Progress - Phase 3 Complete

---

## Overview

This migration replaces the existing custom authentication implementation with [Better Auth](https://www.better-auth.com/), a framework-agnostic authentication library. The current implementation suffers from session persistence issues and requires manual maintenance of security-sensitive code. Better Auth provides battle-tested session management, built-in security best practices, and a magic link plugin that matches our existing passwordless authentication flow.

### Why Better Auth?

1. **Session Management**: Built-in session handling with automatic token rotation and sliding expiry resolves the current session persistence bug
2. **Security**: Maintained library with security updates, CSRF protection, and secure cookie handling out of the box
3. **Drizzle Integration**: First-class Drizzle ORM adapter means seamless database integration
4. **Magic Link Support**: Official plugin for magic link authentication matches existing UX
5. **Hono Adapter**: Direct integration with our API framework
6. **React Client**: Type-safe React hooks for the frontend

### Files to Replace/Migrate

| Current File | Action | Better Auth Equivalent |
|-------------|--------|----------------------|
| `apps/api/src/routes/auth.ts` | Replace | Better Auth handler via Hono adapter |
| `apps/api/src/services/auth-service.ts` | Delete | Built into Better Auth core |
| `apps/api/src/middleware/auth.ts` | Replace | `auth.api.getSession()` middleware |
| `packages/database/src/schema/users.ts` | Modify | Add Better Auth required columns |
| `packages/database/src/schema/sessions.ts` | Replace | Better Auth sessions table |
| `packages/database/src/schema/magic-link-tokens.ts` | Replace | Better Auth verification table |
| `apps/web/lib/auth/context.tsx` | Replace | Better Auth React provider |
| `apps/web/lib/auth/api.ts` | Delete | Built into `@better-auth/react` |
| `apps/web/app/(auth)/login/page.tsx` | Modify | Use Better Auth `signIn.magicLink()` |
| `apps/web/app/(auth)/verify/page.tsx` | Modify | Better Auth handles verification |

---

## 1. Goal

Migrate from custom authentication implementation to Better Auth library, fixing the session persistence issue and establishing a maintainable, secure authentication system with magic link support.

### Success Criteria

- [ ] Sessions persist correctly across browser refreshes and API requests
- [ ] Magic link flow works end-to-end: request -> email -> verify -> authenticated session
- [ ] Existing users retain access (email-based identity preserved)
- [ ] Protected routes correctly enforce authentication via Better Auth middleware
- [ ] Frontend auth state syncs properly with server sessions
- [ ] Session cookies set with correct security attributes (httpOnly, secure, sameSite)
- [ ] Logout properly clears session from both server and client

---

## 2. What's Already Done

### Infrastructure (Complete)

- [x] Monorepo structure with `apps/api` (Hono) and `apps/web` (Next.js)
- [x] PostgreSQL database with Drizzle ORM (`packages/database`)
- [x] Email delivery via Resend (`@repo/email` package)
- [x] Environment configuration with `.env` files
- [x] Team workspaces with RBAC (`packages/database/src/schema/teams.ts`)

### Current Auth Implementation (To Be Replaced)

- [x] Custom magic link token generation and verification
- [x] SHA-256 token hashing for database storage
- [x] Session creation with 7-day expiry
- [x] HTTP-only session cookies
- [x] `requireAuth()` and `optionalAuth()` middleware
- [x] React Context-based auth provider
- [x] Login and verify pages with proper UX

### Database Schema (Greenfield - Fresh Start)

- [x] Old auth tables (`users`, `sessions`, `magic_link_tokens`) deleted
- [x] Better Auth schema generated via CLI at `packages/database/src/schema/auth.ts`
- [x] New tables: `user`, `session`, `account`, `verification`

---

## 3. What We're Building Now

### Phase 1: Install Dependencies and Configure Better Auth Server

**Priority:** HIGH - Foundation for all subsequent work
**Estimated Time:** 1-2 hours

#### 1.1 Install Better Auth Packages (API)

- [x] Add `better-auth` package to `apps/api`
  ```bash
  cd apps/api && pnpm add better-auth@latest
  ```
  **Note:** Installed better-auth@1.4.9. There are peer dependency warnings for drizzle-orm (wants >=0.41.0, have 0.38.4) and drizzle-kit (wants >=0.31.4, have 0.30.6). These don't block basic configuration but may need upgrading for full compatibility.

- [x] Add `@better-auth/cli` as dev dependency for migrations
  ```bash
  cd apps/api && pnpm add -D @better-auth/cli@latest
  ```

#### 1.2 Create Better Auth Configuration

- [x] Create `apps/api/src/lib/auth.ts` with Better Auth instance
  **Note:** Implementation includes a custom `sendMagicLink` function that wraps `sendMagicLinkEmail` from `@repo/email` with a development fallback. The email package validates for HTTPS URLs, which would fail in development with http://localhost URLs. The fallback logs the magic link to console in development mode, allowing authentication testing without modifying the email package.

  Type exports were adjusted to use `AuthSession["session"]` and `AuthSession["user"]` since Better Auth's `$Infer` only exposes `Session` (which contains both session and user).

  See: `apps/api/src/lib/auth.ts`

- [x] Configure environment variables in `apps/api/.env.example`
  ```
  BETTER_AUTH_SECRET=your-32-byte-secret-here-change-in-production
  BETTER_AUTH_URL=http://localhost:3001
  WEB_URL=http://localhost:3000
  ```

#### 1.3 Generate Auth Secret

- [x] Generate secure secret for production
  ```bash
  openssl rand -base64 32
  ```
  **Generated:** `sK6+91BmHDM2w4xH3Pp7XFi0qlU6GUUCsA2owKZAZmI=` (example - generate new for production)

- [x] Add secret to `.env.example` as documentation

---

### Phase 2: Database Schema Migration (GREENFIELD APPROACH)

**Priority:** HIGH - Required before Better Auth can function
**Estimated Time:** 2-3 hours
**Status:** COMPLETE

> **APPROACH CHANGE:** This phase was completed using a GREENFIELD approach instead of the originally planned data migration. The old auth tables (`users.ts`, `sessions.ts`, `magic-link-tokens.ts`) were deleted, and Better Auth CLI was used to generate a fresh schema. No user migration was needed as this is a fresh start.

#### 2.1 Delete Old Auth Schema Files

- [x] Delete `packages/database/src/schema/users.ts`
- [x] Delete `packages/database/src/schema/sessions.ts`
- [x] Delete `packages/database/src/schema/magic-link-tokens.ts`
  **Note:** All old auth tables have been removed. Greenfield approach means no legacy data to migrate.

#### 2.2 Create Better Auth Schema File (via CLI)

- [x] Generate Better Auth schema using `@better-auth/cli`
  **Implemented:** Schema file created at `packages/database/src/schema/auth.ts` containing:
  - `user` - Core user identity with `id (text)`, `name`, `email`, `emailVerified`, `image`, timestamps
  - `session` - Active sessions with token-based auth and expiry
  - `account` - OAuth provider connections (for future OAuth support)
  - `verification` - Magic link and email verification tokens
  - All required indexes and relations
  - Type exports for all tables

  See: `packages/database/src/schema/auth.ts`

#### 2.3 Update Schema Exports

- [x] Update `packages/database/src/schema/index.ts` to export Better Auth tables
  **Implemented:** Exports `user`, `session`, `account`, `verification` tables and their relations/types from `./auth.js`

#### 2.4 Update Foreign Key References

- [x] Update `teams.ts` foreign keys to reference new `user` table
  **Implemented:** Updated `packages/database/src/schema/teams.ts`:
  - `teamMemberships.userId` now uses `text` type to match Better Auth's `user.id`
  - `teamMemberships.invitedBy` references `user.id`
  - `teamInvitations.invitedBy` references `user.id`
  - Updated all Drizzle relations to use the new `user` table
  - Import updated to use `user` from `./auth.js`

#### 2.5 Generate Initial Migration

- [x] Generate Drizzle migration file
  **Implemented:** Generated `packages/database/drizzle/0000_initial.sql` containing:
  - All Better Auth tables (`user`, `session`, `account`, `verification`)
  - Proper foreign key constraints from teams to user table
  - All required indexes
  - Full schema for the entire application (clean start)

---

### Phase 3: Replace API Routes with Better Auth Handler

**Priority:** HIGH - Core authentication functionality
**Estimated Time:** 2-3 hours

#### 3.1 Create Hono Auth Handler

- [x] Create `apps/api/src/routes/auth-handler.ts`
  ```typescript
  // apps/api/src/routes/auth-handler.ts
  import { Hono } from "hono";
  import { auth } from "../lib/auth.js";

  export const authHandler = new Hono();

  // Better Auth handles all /api/auth/* routes
  authHandler.on(["GET", "POST"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  export default authHandler;
  ```

#### 3.2 Update Main App Router

- [x] Modify `apps/api/src/app.ts` to mount Better Auth handler
  ```typescript
  import { authHandler } from "./routes/auth-handler.js";

  // Remove old authApp import
  // app.route("/", authApp);  // DELETE THIS

  // Add Better Auth handler
  app.route("/", authHandler);
  ```

#### 3.3 Remove Legacy Auth Routes

- [x] Delete `apps/api/src/routes/auth.ts`
- [x] Delete `apps/api/src/services/auth-service.ts`
- [x] Delete `apps/api/src/__tests__/routes/auth.test.ts`
- [x] Delete `apps/api/src/__tests__/services/auth-service.test.ts`
- [x] Update `apps/api/src/middleware/auth.ts` to use Better Auth
- [x] Update `apps/api/src/middleware/team-auth.ts` to use new auth middleware
- [x] Update `apps/api/src/routes/teams.ts` to use new auth middleware
- [x] Update `apps/api/src/routes/invitations.ts` to use new auth middleware
- [x] Update test files to mock new auth middleware

#### 3.4 Update OpenAPI Documentation

- [x] Old auth routes automatically removed (file deleted)
- [x] Better Auth handles its own endpoints internally (no OpenAPI spec needed)

---

### Phase 4: Update Auth Middleware

**Priority:** HIGH - Required for protected routes
**Estimated Time:** 1-2 hours

#### 4.1 Create New Auth Middleware

- [x] Replace `apps/api/src/middleware/auth.ts` with Better Auth version
  **Note:** Completed as part of Phase 3 to maintain a working build
  ```typescript
  // apps/api/src/middleware/auth.ts
  import type { Context, Next, MiddlewareHandler } from "hono";
  import { auth, type Session, type User } from "../lib/auth.js";

  export interface AuthVariables {
    user: User;
    session: Session;
  }

  export interface OptionalAuthVariables {
    user: User | null;
    session: Session | null;
  }

  /**
   * Middleware that requires authentication
   */
  export function requireAuth(): MiddlewareHandler<{ Variables: AuthVariables }> {
    return async (c: Context, next: Next) => {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session) {
        return c.json(
          { error: "Authentication required", code: "UNAUTHORIZED" },
          401
        );
      }

      c.set("user", session.user);
      c.set("session", session.session);

      await next();
    };
  }

  /**
   * Middleware that optionally attaches user if authenticated
   */
  export function optionalAuth(): MiddlewareHandler<{ Variables: OptionalAuthVariables }> {
    return async (c: Context, next: Next) => {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      c.set("user", session?.user ?? null);
      c.set("session", session?.session ?? null);

      await next();
    };
  }

  export function getAuthUser(c: Context): User {
    const user = c.get("user");
    if (!user) {
      throw new Error("User not found in context");
    }
    return user;
  }

  export function getAuthSession(c: Context): Session {
    const session = c.get("session");
    if (!session) {
      throw new Error("Session not found in context");
    }
    return session;
  }
  ```

#### 4.2 Update Protected Route Handlers

- [x] Verify all routes using `requireAuth()` still work
  **Note:** Completed as part of Phase 3 - teams.ts and invitations.ts updated
- [x] Test `c.get("user")` returns correct user object shape
  **Note:** Auth middleware tests pass (7/7 tests)
- [x] Update any code depending on old `User` type from custom auth
  **Note:** All route handlers updated to use new middleware validateSession signature

---

### Phase 5: Migrate Frontend to Better Auth Client

**Priority:** HIGH - User-facing authentication
**Estimated Time:** 3-4 hours

#### 5.1 Install Better Auth React Package

- [ ] Add `@better-auth/react` to `apps/web`
  ```bash
  cd apps/web && pnpm add @better-auth/react@latest
  ```

#### 5.2 Create Better Auth Client

- [ ] Create `apps/web/lib/auth-client.ts`
  ```typescript
  // apps/web/lib/auth-client.ts
  import { createAuthClient } from "better-auth/react";
  import { magicLinkClient } from "better-auth/client/plugins";

  export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    plugins: [magicLinkClient()],
  });

  export const {
    signIn,
    signOut,
    useSession,
    getSession,
  } = authClient;
  ```

#### 5.3 Replace Auth Context Provider

- [ ] Replace `apps/web/lib/auth/context.tsx` with Better Auth provider
  ```typescript
  // apps/web/lib/auth/context.tsx
  "use client";

  import { createContext, useContext, type ReactNode } from "react";
  import { useRouter, usePathname } from "next/navigation";
  import { useSession, signOut } from "./auth-client";

  const PUBLIC_ROUTES = ["/login", "/verify"];

  interface AuthContextValue {
    user: { id: string; email: string; emailVerified: boolean } | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
  }

  const AuthContext = createContext<AuthContextValue | null>(null);

  export function AuthProvider({ children }: { children: ReactNode }) {
    const { data: session, isPending, refetch } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const logout = async () => {
      await signOut();
      router.push("/login");
    };

    const value: AuthContextValue = {
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
      } : null,
      isLoading: isPending,
      isAuthenticated: !!session?.user,
      logout,
      refreshSession: refetch,
    };

    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  }

  export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
  }
  ```

#### 5.4 Update Login Page

- [ ] Modify `apps/web/app/(auth)/login/page.tsx` to use Better Auth
  ```typescript
  // Key changes:
  import { signIn } from "@/lib/auth-client";

  // Replace requestMagicLink with:
  await signIn.magicLink({ email });
  ```

#### 5.5 Update Verify Page

- [ ] Modify `apps/web/app/(auth)/verify/page.tsx`
  - Better Auth handles token verification automatically via `/api/auth/magic-link/verify`
  - Update to use Better Auth's verification flow

  ```typescript
  // The verify page may need to call:
  import { signIn } from "@/lib/auth-client";

  // Better Auth magic link verification:
  await signIn.magicLink({ token });
  ```

#### 5.6 Delete Legacy Auth Files

- [ ] Delete `apps/web/lib/auth/api.ts`
- [ ] Update `apps/web/lib/auth/index.ts` exports
- [ ] Remove unused type definitions from `apps/web/lib/auth/types.ts`

#### 5.7 Update Auth Types

- [ ] Update `apps/web/lib/auth/types.ts` to match Better Auth types
  ```typescript
  // Ensure types align with Better Auth user/session shapes
  export interface User {
    id: string;
    email: string;
    emailVerified: boolean;
    name?: string | null;
    image?: string | null;
  }

  export interface Session {
    id: string;
    userId: string;
    expiresAt: string;
  }
  ```

---

### Phase 6: Testing and Cleanup

**Priority:** HIGH - Ensure migration success
**Estimated Time:** 2-3 hours

#### 6.1 Manual Testing Checklist

- [ ] Test magic link request flow
  - Submit email on login page
  - Verify email is sent (check Resend dashboard or logs)
  - Click magic link in email

- [ ] Test session persistence
  - After login, refresh the page - should stay logged in
  - Open new tab - should be logged in
  - Close and reopen browser - should be logged in (within session expiry)

- [ ] Test protected routes
  - Access `/dashboard` without auth - should redirect to login
  - Access `/dashboard` with auth - should render page
  - Verify `c.get("user")` returns correct user in API routes

- [ ] Test logout flow
  - Click logout - should clear session
  - Refresh page - should redirect to login
  - Session cookie should be removed

- [ ] Test session expiry
  - Verify sessions expire after 7 days (or test with shorter expiry)

#### 6.2 Update Unit Tests

- [ ] Update/create auth middleware tests
  ```typescript
  // apps/api/src/middleware/__tests__/auth.test.ts
  describe("requireAuth middleware", () => {
    it("returns 401 when no session", async () => {});
    it("sets user on context when valid session", async () => {});
  });
  ```

- [ ] Update login page tests if they exist
- [ ] Add integration test for full magic link flow

#### 6.3 Cleanup Old Code

- [ ] Remove `apps/api/src/services/auth-service.ts`
- [ ] Remove or archive `apps/api/src/routes/auth.ts`
- [ ] Remove legacy schema exports from `packages/database/src/schema/index.ts`
- [ ] Clean up unused imports throughout codebase

#### 6.4 Update Documentation

- [ ] Update API `.env.example` with Better Auth variables
- [ ] Document new auth flow in codebase README (if exists)
- [ ] Update any existing auth documentation

#### 6.5 Database Cleanup (After Verification)

- [ ] Create cleanup migration to drop old tables
  ```sql
  -- Only run after full verification
  DROP TABLE IF EXISTS magic_link_tokens;
  DROP TABLE IF EXISTS sessions; -- old sessions table
  -- Rename users table if needed or update foreign keys
  ```

---

## 4. Not In Scope

### Authentication Methods

- Password/email authentication - **Why:** Project uses magic link only for simplicity and security
- OAuth providers (Google, GitHub) - **Why:** Can be added later as Better Auth plugin; not required for MVP
- Two-factor authentication - **Why:** Magic link provides similar security; defer to future iteration

### Session Features

- Multi-device session management UI - **Why:** Core functionality works; UI enhancement for later
- Session revocation UI - **Why:** Logout works; advanced session management is a future feature
- Remember me functionality - **Why:** 7-day sessions provide adequate persistence

### User Profile

- Profile editing (name, avatar) - **Why:** Better Auth supports it but not in current UX scope
- Account deletion - **Why:** Requires careful implementation; defer to dedicated feature

### Advanced Security

- Rate limiting on auth endpoints - **Why:** Existing rate limiter in place; Better Auth has built-in protection
- IP-based session validation - **Why:** Can cause issues with mobile/VPN users
- Audit logging - **Why:** Enhancement for future compliance requirements

---

## 5. Implementation Plan

### Step 1: Backend Foundation (2-3 hours)

1. Install Better Auth packages in `apps/api`
2. Create Better Auth configuration file
3. Generate and set `BETTER_AUTH_SECRET`
4. Verify configuration loads without errors

### Step 2: Database Migration (2-3 hours)

1. Create Better Auth schema file
2. Generate Drizzle migration
3. Run migration on development database
4. Create and run user data migration script
5. Verify existing users preserved with correct IDs

### Step 3: API Routes (1-2 hours)

1. Create Hono auth handler with Better Auth
2. Mount handler in main app
3. Remove old auth routes
4. Test endpoints with curl/Postman

### Step 4: Middleware Update (1 hour)

1. Replace auth middleware implementation
2. Test protected routes return 401 without auth
3. Test protected routes work with valid session

### Step 5: Frontend Migration (3-4 hours)

1. Install Better Auth React client
2. Create auth client configuration
3. Replace AuthContext implementation
4. Update login page to use `signIn.magicLink()`
5. Update verify page for Better Auth flow
6. Delete legacy API fetch functions

### Step 6: Testing and Validation (2-3 hours)

1. Run through manual testing checklist
2. Fix any discovered issues
3. Update or add unit tests
4. Clean up legacy code
5. Final database cleanup migration

**Total Estimated Time:** 11-18 hours

---

## 6. Success Criteria

- [ ] Magic link emails are sent successfully via Resend
- [ ] Clicking magic link creates authenticated session
- [ ] Sessions persist across page refreshes (primary bug fix)
- [ ] Sessions persist across browser tabs
- [ ] Protected API routes return 401 when unauthenticated
- [ ] Protected API routes return user data when authenticated
- [ ] Frontend auth state reflects server session accurately
- [ ] Logout clears session from server and client
- [ ] Existing users can log in with same email
- [ ] No regressions in team workspace functionality

---

## 7. Definition of Done

- [ ] All Phase 1-6 tasks completed and checked off
- [ ] Session persistence issue verified fixed via manual testing
- [ ] Magic link flow works end-to-end in development environment
- [ ] All existing protected routes continue to function
- [ ] Frontend login/logout UX unchanged (same pages, same flow)
- [ ] No TypeScript errors in `apps/api` or `apps/web`
- [ ] Application builds successfully (`pnpm build` passes)
- [ ] Unit tests pass (if applicable)
- [ ] Legacy auth code removed or archived
- [ ] Environment variables documented in `.env.example`
- [ ] Database migration applied and verified

---

## 8. Notes

### Tech Stack Decisions

| Choice | Rationale |
|--------|-----------|
| Better Auth | Framework-agnostic, Drizzle-native, active maintenance, magic link plugin |
| Drizzle Adapter | Direct integration with existing ORM, no additional dependencies |
| Magic Link Plugin | Matches existing UX, secure passwordless authentication |
| React Client | Type-safe hooks, automatic session management, SSR support |

### Design Principles

1. **Minimal UX Change**: Users should experience the same login flow - enter email, click link, authenticated
2. **Data Preservation**: Existing users must be able to log in; IDs must be preserved for foreign key integrity
3. **Security First**: Use Better Auth defaults which are secure by design
4. **Incremental Migration**: Each phase can be tested independently before proceeding

### Key Files Reference

```
apps/api/
  src/
    lib/
      auth.ts              # DONE: Better Auth configuration
    routes/
      auth-handler.ts      # NEW: Hono handler for Better Auth (Phase 3)
      auth.ts              # DELETE: Old custom routes (Phase 3)
    services/
      auth-service.ts      # DELETE: Old custom service (Phase 3)
    middleware/
      auth.ts              # REPLACE: Better Auth middleware (Phase 4)

apps/web/
  lib/
    auth/
      auth-client.ts       # NEW: Better Auth React client (Phase 5)
      context.tsx          # REPLACE: Better Auth provider (Phase 5)
      api.ts               # DELETE: Old fetch functions (Phase 5)
    app/
      (auth)/
        login/page.tsx     # MODIFY: Use signIn.magicLink() (Phase 5)
        verify/page.tsx    # MODIFY: Better Auth verification (Phase 5)

packages/database/
  src/
    schema/
      auth.ts              # DONE: Better Auth schema (user, session, account, verification)
      users.ts             # DELETED: Replaced by auth.ts (Greenfield)
      sessions.ts          # DELETED: Replaced by auth.ts (Greenfield)
      magic-link-tokens.ts # DELETED: Replaced by auth.ts (Greenfield)
  drizzle/
    0000_initial.sql       # DONE: Initial migration with all tables
```

---

## 9. Next Steps

### Phase 2: Enhanced Session Management

- Add session listing UI for users
- Implement "sign out other devices" functionality
- Add session activity tracking

### Phase 3: OAuth Providers

- Add Google OAuth via Better Auth plugin
- Add GitHub OAuth for developer users
- Implement account linking for existing users

### Phase 4: Security Hardening

- Implement rate limiting specific to auth endpoints
- Add suspicious login detection
- Implement audit logging for auth events

### Phase 5: User Profile

- Add profile editing capabilities
- Implement avatar upload
- Add account settings page
