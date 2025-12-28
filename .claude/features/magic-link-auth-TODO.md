# Magic Link Authentication - Dotoro

**Date:** 2025-12-28
**Status:** Planning
**Feature:** Passwordless authentication via magic links

---

## Goal

Enable secure, passwordless authentication for Dotoro users by implementing magic link email authentication. Users will enter their email address, receive a secure one-time link, and clicking it will authenticate them - eliminating password management friction while maintaining enterprise-grade security.

### Success Criteria

- [ ] Users can request a magic link by entering their email on `/login`
- [ ] Magic link emails are sent within 3 seconds of request
- [ ] Clicking a valid magic link authenticates the user and creates a session
- [ ] Expired/used magic links show clear error messages with retry option
- [ ] Authenticated routes are protected and redirect unauthenticated users to `/login`
- [ ] Session persists across browser refreshes with secure HTTP-only cookies
- [ ] Rate limiting prevents abuse (max 5 requests per email per 15 minutes)

---

## What's Already Done

### Database Layer (`packages/database`) - Partial Foundation

- [x] Drizzle ORM configured with PostgreSQL
- [x] Schema patterns established (uuid PKs, timestamps, indexes)
- [x] `user-oauth-tokens.ts` - OAuth token storage with encryption pattern
- [x] `ad-accounts.ts` - User ID field pattern (nullable `userId: uuid("user_id")`)
- [x] Encryption integration pattern documented in schema comments

### API Layer (`apps/api`) - Ready

- [x] Hono server with OpenAPI support (`@hono/zod-openapi`)
- [x] CORS configured for `localhost:3000,3001`
- [x] Rate limiter middleware (`hono-rate-limiter`)
- [x] Global error handler with `ApiException` pattern
- [x] Encryption service (`apps/api/src/lib/encryption.ts`) - AES-256-GCM
- [x] Route mounting pattern in `app.ts`

### Web Layer (`apps/web`) - Ready

- [x] Next.js 16 with App Router
- [x] `ThemeProvider` and `AppLayout` components
- [x] Tailwind CSS 4.x styling
- [x] Component test patterns with Vitest + Testing Library

### Infrastructure - Ready

- [x] Docker Compose for PostgreSQL
- [x] pg-boss for background job processing
- [x] Environment variable patterns (`.env`)

---

## What We're Building Now

### Phase 1: Database Schema & Migrations (Priority: HIGH)

**Why HIGH:** Foundation for all auth features. Cannot proceed without user and token storage.

#### 1.1 Users Table (`packages/database/src/schema/users.ts`)

- [ ] Create `users` table with core fields:
  ```typescript
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ```
- [ ] Add indexes: `users_email_idx` (for login lookups)
- [ ] Export types: `User`, `NewUser`

#### 1.2 Magic Link Tokens Table (`packages/database/src/schema/magic-link-tokens.ts`)

- [ ] Create `magic_link_tokens` table:
  ```typescript
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(), // For pre-registration links
  token: varchar("token", { length: 64 }).notNull().unique(), // SHA-256 hash of the actual token
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  ```
- [ ] Add indexes: `magic_link_tokens_token_idx`, `magic_link_tokens_email_idx`, `magic_link_tokens_expires_idx`
- [ ] Add composite index for cleanup: `magic_link_tokens_used_expires_idx`

#### 1.3 Sessions Table (`packages/database/src/schema/sessions.ts`)

- [ ] Create `sessions` table:
  ```typescript
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(), // Session token hash
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 compatible
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  ```
- [ ] Add indexes: `sessions_token_idx`, `sessions_user_idx`, `sessions_expires_idx`

#### 1.4 Schema Index Updates (`packages/database/src/schema/index.ts`)

- [ ] Export new tables and types
- [ ] Add relations between users, magic_link_tokens, and sessions

#### 1.5 Migration

- [ ] Run `pnpm db:generate` to create migration file
- [ ] Review generated SQL for correctness
- [ ] Run `pnpm db:push` to apply schema changes

**Example Use Cases:**
1. New user signs up: Create user record with `emailVerified: false`, create magic link token
2. Existing user logs in: Look up user by email, create new magic link token
3. Token verification: Find token by hash, check not expired/used, mark as used, create session
4. Session validation: Look up session by token hash, check not expired, update lastActiveAt

---

### Phase 2: Auth API Routes (Priority: HIGH)

**Why HIGH:** Core API endpoints required before frontend can be built.

#### 2.1 Auth Schemas (`apps/api/src/schemas/auth.ts`)

- [ ] Define Zod schemas:
  ```typescript
  // Request magic link
  export const requestMagicLinkSchema = z.object({
    email: z.string().email().max(255),
  });

  // Verify magic link
  export const verifyMagicLinkSchema = z.object({
    token: z.string().length(64),
  });

  // Session response
  export const sessionResponseSchema = z.object({
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      emailVerified: z.boolean(),
    }),
    expiresAt: z.string().datetime(),
  });
  ```

#### 2.2 Auth Service (`apps/api/src/services/auth-service.ts`)

- [ ] `generateMagicLinkToken()`: Create cryptographically secure token (32 bytes -> 64 hex chars)
- [ ] `hashToken(token: string)`: SHA-256 hash for storage
- [ ] `createMagicLink(email: string)`: Create/update user, generate token, return URL
- [ ] `verifyMagicLink(token: string)`: Validate token, create session, return user
- [ ] `createSession(userId: string, metadata: SessionMetadata)`: Generate session token, store in DB
- [ ] `validateSession(token: string)`: Check session validity, refresh lastActiveAt
- [ ] `revokeSession(sessionId: string)`: Mark session as expired
- [ ] `revokeAllUserSessions(userId: string)`: Revoke all sessions for a user

#### 2.3 Auth Routes (`apps/api/src/routes/auth.ts`)

```
POST /api/auth/magic-link/request
  Request: { email: string }
  Response: { success: true, message: "If an account exists, a magic link has been sent" }
  Notes: Always return success to prevent email enumeration

POST /api/auth/magic-link/verify
  Request: { token: string }
  Response: { user: User, expiresAt: string }
  Cookies: Sets `session` HTTP-only cookie
  Errors: 400 (invalid/expired token)

GET /api/auth/session
  Response: { user: User, expiresAt: string } | { user: null }
  Notes: Validates current session from cookie

POST /api/auth/logout
  Response: { success: true }
  Notes: Revokes current session, clears cookie
```

- [ ] Implement request magic link endpoint with rate limiting (5/15min per email)
- [ ] Implement verify magic link endpoint
- [ ] Implement get session endpoint
- [ ] Implement logout endpoint
- [ ] Add OpenAPI documentation for all endpoints

#### 2.4 Auth Middleware (`apps/api/src/middleware/auth.ts`)

- [ ] `requireAuth()`: Middleware that validates session cookie, attaches user to context
- [ ] `optionalAuth()`: Middleware that attaches user if session exists, but doesn't require it
- [ ] Add user type to Hono context: `c.get('user')` or `c.var.user`

#### 2.5 Rate Limiting Enhancement

- [ ] Add email-specific rate limiting: 5 magic link requests per email per 15 minutes
- [ ] Add IP-specific rate limiting: 20 magic link requests per IP per hour
- [ ] Store rate limit state in Redis or pg-boss queue (for distributed rate limiting)

**Example Use Cases:**
1. User requests magic link: POST to `/api/auth/magic-link/request` with email, receive success message
2. User clicks email link: Frontend extracts token, POSTs to `/api/auth/magic-link/verify`, receives session cookie
3. Protected API call: Request includes session cookie, middleware validates and injects user
4. User logs out: POST to `/api/auth/logout`, session revoked, cookie cleared

---

### Phase 3: Email Integration (Priority: HIGH)

**Why HIGH:** Magic links require email delivery. No email = no authentication.

#### 3.1 Email Service Interface (`apps/api/src/services/email/types.ts`)

- [ ] Define email service interface:
  ```typescript
  interface EmailService {
    sendMagicLink(to: string, magicLinkUrl: string): Promise<void>;
    sendWelcome(to: string, name?: string): Promise<void>;
  }
  ```

#### 3.2 Email Provider Implementation

- [ ] Choose email provider (Resend recommended for simplicity)
- [ ] Create `apps/api/src/services/email/resend.ts` implementation
- [ ] Create `apps/api/src/services/email/console.ts` for development (logs to console)
- [ ] Add environment variables: `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM`

#### 3.3 Email Templates

- [ ] Create magic link email template (HTML + plain text):
  - Subject: "Sign in to Dotoro"
  - Body: Brief message, prominent CTA button, expiration notice (15 min), link fallback
  - Footer: Security notice about not sharing the link
- [ ] Create welcome email template for first-time users

#### 3.4 Environment Configuration

- [ ] Add to `.env.example`:
  ```
  EMAIL_PROVIDER=resend  # or 'console' for development
  RESEND_API_KEY=re_xxxxx
  EMAIL_FROM=noreply@dotoro.app
  MAGIC_LINK_BASE_URL=http://localhost:3000
  MAGIC_LINK_EXPIRY_MINUTES=15
  ```

**Example Use Cases:**
1. Development: `EMAIL_PROVIDER=console` logs magic link URL to terminal
2. Production: `EMAIL_PROVIDER=resend` sends actual emails via Resend API
3. User receives email: Clean, mobile-responsive design with clear CTA

---

### Phase 4: Frontend Authentication UI (Priority: HIGH)

**Why HIGH:** Users need visual interface to authenticate.

#### 4.1 Auth Pages (`apps/web/app/(auth)/`)

**Login Page (`apps/web/app/(auth)/login/page.tsx`)**
- [ ] Email input form with validation
- [ ] Submit button with loading state
- [ ] Success state: "Check your email" message with email displayed
- [ ] Error handling: rate limit, invalid email, server errors
- [ ] Link to resend magic link (with cooldown timer)

**Verify Page (`apps/web/app/(auth)/verify/page.tsx`)**
- [ ] Extract token from URL: `/verify?token=xxx`
- [ ] Auto-submit token to API on mount
- [ ] Loading state while verifying
- [ ] Success: redirect to dashboard
- [ ] Error states: expired, already used, invalid

**Layout (`apps/web/app/(auth)/layout.tsx`)**
- [ ] Centered card layout
- [ ] Dotoro branding
- [ ] No navigation sidebar (public pages)

#### 4.2 Auth Context & Hook (`apps/web/lib/auth/`)

- [ ] Create `AuthContext` with user state
- [ ] Create `useAuth()` hook:
  ```typescript
  interface UseAuth {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
  }
  ```
- [ ] Fetch session on app mount via `GET /api/auth/session`
- [ ] Handle session expiry gracefully (redirect to login)

#### 4.3 Auth Provider Integration

- [ ] Wrap app in `AuthProvider` in root layout
- [ ] Conditionally render `AppLayout` sidebar for authenticated users only

#### 4.4 Route Protection

- [ ] Create `withAuth` HOC or middleware for protected pages
- [ ] Redirect to `/login` if not authenticated
- [ ] Preserve intended destination: `/login?redirect=/campaigns`
- [ ] After login, redirect to original destination

#### 4.5 Auth Components

**LoginForm Component**
- [ ] Controlled email input
- [ ] Form validation (email format)
- [ ] Submit handler with loading state
- [ ] Success/error message display

**AuthGuard Component**
- [ ] Wrap protected routes
- [ ] Show loading spinner during session check
- [ ] Redirect if not authenticated

**UserMenu Component (Header)**
- [ ] Display user email
- [ ] Logout button
- [ ] (Future: settings link)

**Example Use Cases:**
1. Unauthenticated user visits `/campaigns`: Redirected to `/login?redirect=/campaigns`
2. User submits email: Form shows loading, then success message
3. User clicks magic link: Verify page shows loading, then redirects to `/campaigns`
4. User clicks logout: Session cleared, redirected to `/login`

---

### Phase 5: Session Management & Security (Priority: MEDIUM)

**Why MEDIUM:** Core auth works without these, but needed for production security.

#### 5.1 Session Refresh

- [ ] Implement sliding session expiry (refresh on activity)
- [ ] Add session refresh endpoint: `POST /api/auth/session/refresh`
- [ ] Frontend: periodically refresh session (every 5 minutes if active)

#### 5.2 Session Cleanup Job

- [ ] Create pg-boss job to clean expired sessions
- [ ] Run every hour: `DELETE FROM sessions WHERE expires_at < NOW()`
- [ ] Clean expired magic link tokens: `DELETE FROM magic_link_tokens WHERE expires_at < NOW()`

#### 5.3 Security Headers

- [ ] Ensure secure cookie attributes:
  ```typescript
  {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }
  ```
- [ ] Add CSRF protection for state-changing requests (or rely on SameSite=Lax)

#### 5.4 Logging & Monitoring

- [ ] Log auth events: login_requested, login_success, login_failed, logout
- [ ] Include metadata: email (hashed for logs), IP, user agent
- [ ] Alert on suspicious patterns: many failed attempts, unusual locations

---

## Not In Scope

### User Management

- [ ] Password-based authentication
  **Why:** Magic links are our chosen auth method. Passwords add complexity and security burden.

- [ ] User profile editing (name, avatar, preferences)
  **Why:** Focus on core auth first. Profile features can be added later.

- [ ] Account deletion
  **Why:** Regulatory requirement but not MVP. Implement before public launch.

### Advanced Security

- [ ] Two-factor authentication (2FA)
  **Why:** Magic links already provide one-time codes. Consider for high-security use cases later.

- [ ] OAuth social login (Google, GitHub)
  **Why:** Adds complexity. Magic links work for all users regardless of social accounts.

- [ ] Device trust / remember this device
  **Why:** Nice-to-have UX improvement, not required for MVP.

### Multi-tenancy

- [ ] Organization/team accounts
  **Why:** Single-user accounts first. Team features require significant additional schema.

- [ ] Role-based access control (RBAC)
  **Why:** No multi-user scenarios in MVP. Add when team features are implemented.

### API Authentication

- [ ] API key authentication for programmatic access
  **Why:** Already have `api-key-auth.ts` middleware for data source APIs. User auth is separate concern.

- [ ] JWT tokens for stateless auth
  **Why:** Session-based auth is simpler and more secure for web apps. JWT adds complexity.

---

## Implementation Plan

### Step 1: Database Schema (2-3 hours)
1. Create `users.ts`, `magic-link-tokens.ts`, `sessions.ts` schemas
2. Update `schema/index.ts` with exports
3. Generate and apply migration
4. Write schema tests

### Step 2: Auth Service Core (3-4 hours)
1. Implement token generation and hashing utilities
2. Implement `auth-service.ts` with all core methods
3. Write comprehensive unit tests
4. Test with direct database calls

### Step 3: Auth API Routes (2-3 hours)
1. Create `schemas/auth.ts` with Zod schemas
2. Implement `routes/auth.ts` with all endpoints
3. Add OpenAPI documentation
4. Mount in `app.ts`
5. Write route integration tests

### Step 4: Email Integration (2-3 hours)
1. Set up Resend account and API key
2. Implement email service interface and Resend provider
3. Create email templates
4. Test email delivery in development

### Step 5: Auth Middleware (1-2 hours)
1. Implement `requireAuth` and `optionalAuth` middleware
2. Add to existing protected routes
3. Test middleware with valid/invalid sessions

### Step 6: Frontend Auth Pages (3-4 hours)
1. Create `(auth)` route group with layout
2. Implement login page with form
3. Implement verify page with auto-submit
4. Style with Tailwind

### Step 7: Auth Context & Provider (2-3 hours)
1. Create `AuthContext` and `useAuth` hook
2. Implement session fetching on mount
3. Add `AuthProvider` to root layout
4. Handle logout flow

### Step 8: Route Protection (2-3 hours)
1. Create `AuthGuard` component
2. Wrap protected routes
3. Implement redirect logic
4. Add UserMenu to header

### Step 9: Security Hardening (2-3 hours)
1. Verify cookie security settings
2. Add rate limiting tests
3. Implement session cleanup job
4. Add auth event logging

### Step 10: Integration Testing (2-3 hours)
1. End-to-end auth flow tests
2. Edge case testing (expired tokens, race conditions)
3. Security testing (enumeration, brute force)

**Total Estimated Time: 22-31 hours**

---

## Definition of Done

- [ ] User can request magic link and receive email within 3 seconds
- [ ] Magic link verification creates session and sets HTTP-only cookie
- [ ] Session persists across page refreshes
- [ ] Expired/used tokens show clear error with retry option
- [ ] Protected routes redirect unauthenticated users to `/login`
- [ ] Rate limiting prevents more than 5 requests per email per 15 minutes
- [ ] All auth endpoints have OpenAPI documentation
- [ ] Unit tests cover auth service (>90% coverage)
- [ ] Integration tests cover full auth flow
- [ ] Security review completed (no token leakage, proper hashing)
- [ ] Email templates are mobile-responsive
- [ ] Loading states and error messages are user-friendly

---

## Notes

### Tech Stack Decisions

| Component | Choice | Why |
|-----------|--------|-----|
| Email Provider | Resend | Simple API, good deliverability, generous free tier |
| Token Storage | Database (not Redis) | Simplicity, already have PostgreSQL, tokens are short-lived |
| Session Storage | HTTP-only Cookie | Most secure for web apps, prevents XSS token theft |
| Token Hashing | SHA-256 | Industry standard for token storage, irreversible |
| Session Duration | 7 days sliding | Balance between security and UX |
| Magic Link Expiry | 15 minutes | Short enough for security, long enough for email delays |

### Design Principles

1. **Security First**: Never store plaintext tokens. Hash before storage, compare hashes.
2. **Prevent Enumeration**: Always return same response whether email exists or not.
3. **Clear Error States**: Users should never be confused about what went wrong.
4. **Graceful Degradation**: If email fails, log the magic link in development.
5. **Mobile-First Emails**: Magic link emails must work on mobile email clients.

### Best Practices

- **Token Generation**: Use `crypto.randomBytes(32)` for 256-bit tokens
- **Hash Storage**: Store `SHA-256(token)` in database, never the raw token
- **Cookie Security**: `httpOnly`, `secure` (prod), `sameSite: lax`
- **Rate Limiting**: Per-email AND per-IP to prevent abuse
- **Logging**: Log auth events but never log raw tokens or full emails

---

## Next Steps

### Phase 2: User Profile & Settings
- Add user profile fields (name, avatar)
- Settings page for preferences
- Account deletion flow

### Phase 3: Team & Organization Support
- Organizations table and membership
- Invite flow with magic links
- Role-based permissions

### Phase 4: Enhanced Security
- Security log / activity history
- Session management UI (view/revoke sessions)
- Optional 2FA for high-security accounts
