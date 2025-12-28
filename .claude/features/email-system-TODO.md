# Email System - Shared Package Implementation

**Date:** 2025-12-28
**Status:** Planning

---

## Goal

Build a robust, reusable email infrastructure as a shared package (`@repo/email`) that enables magic-link authentication and transactional email capabilities across the dotoro monorepo. This system will serve as the foundation for user authentication flows and future notification features.

### Success Criteria

- [ ] `@repo/email` package is created and consumable by `apps/api` and `apps/web`
- [ ] Magic-link authentication emails send successfully via Resend with < 2s delivery time
- [ ] React Email templates render correctly across major email clients (Gmail, Outlook, Apple Mail)
- [ ] Email sending has proper error handling with retry logic and failure notifications
- [ ] All email templates are type-safe with full TypeScript support

---

## What's Already Done

### Monorepo Infrastructure (Complete)

- [x] Turborepo setup with `pnpm` workspaces configured
- [x] Shared package structure established: `packages/core`, `packages/database`, `packages/ui`, `packages/reddit-ads`
- [x] TypeScript configuration via `@repo/typescript-config`
- [x] ESLint configuration via `@repo/eslint-config`
- [x] Build pipeline with `turbo run build`

### API Application - `apps/api` (Complete)

- [x] Hono server running with OpenAPI/Swagger support
- [x] Environment variable handling via `dotenv`
- [x] Existing OAuth token infrastructure (`services/oauth-tokens.ts`, `repositories/oauth-token-repository.ts`)
- [x] Job queue system with `pg-boss` for background processing
- [x] API middleware patterns established (`middleware/api-key-auth.ts`)

### Database Layer - `packages/database` (Complete)

- [x] Drizzle ORM configured with PostgreSQL
- [x] Schema patterns established for entities (see `src/schema/`)
- [x] Migration workflow: `db:generate`, `db:migrate`, `db:push`
- [x] User OAuth tokens table exists (`user-oauth-tokens.ts`)

### Web Application - `apps/web` (Complete)

- [x] Next.js 16 with App Router
- [x] Tailwind CSS v4 configured
- [x] React 19 integration
- [x] `@repo/ui` shared component library available

---

## What We're Building Now

### Phase 1: Core Email Package Setup

**Priority: HIGH** - Foundation for all email functionality

#### 1.1 Package Scaffolding

- [ ] Create `packages/email/` directory structure
  ```
  packages/email/
  ├── package.json
  ├── tsconfig.json
  ├── src/
  │   ├── index.ts           # Public API exports
  │   ├── client.ts          # Resend client wrapper
  │   ├── types.ts           # TypeScript types
  │   └── templates/
  │       └── index.ts       # Template exports
  └── emails/                 # React Email templates (JSX)
      ├── magic-link.tsx
      └── base-layout.tsx
  ```

- [ ] Configure `package.json` with proper exports
  ```json
  {
    "name": "@repo/email",
    "exports": {
      ".": "./dist/index.js",
      "./templates": "./dist/templates/index.js"
    }
  }
  ```

- [ ] Add dependencies: `resend`, `@react-email/components`, `react`

**Example Use Cases:**
1. API imports `@repo/email` to send magic-link on login request
2. Web app imports `@repo/email/templates` for email preview components
3. Background jobs use the email client for scheduled notifications

#### 1.2 Resend Client Implementation

- [ ] Create `src/client.ts` - Resend client wrapper
  - Singleton pattern for client initialization
  - Environment variable validation (`RESEND_API_KEY`)
  - Type-safe send function with proper error handling

```typescript
// Expected API
import { sendEmail } from '@repo/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Your login link',
  template: 'magic-link',
  props: { url: 'https://app.dotoro.io/auth/verify?token=...' }
});
```

- [ ] Create `src/types.ts` - Shared TypeScript definitions
  - `EmailTemplate` union type for all templates
  - `SendEmailOptions` interface
  - `EmailResult` type for send responses

#### 1.3 Base Template Components

- [ ] Create `emails/base-layout.tsx` - Shared email wrapper
  - Responsive container (600px max-width)
  - Brand header with logo placeholder
  - Footer with unsubscribe/legal links
  - Dark mode support via `@react-email/components`

- [ ] Create preview configuration for local development
  - Add `email:dev` script to run React Email preview server

---

### Phase 2: Magic-Link Authentication Email

**Priority: HIGH** - Required for auth system

#### 2.1 Magic-Link Template

- [ ] Create `emails/magic-link.tsx`
  - Clear call-to-action button with magic link URL
  - Expiration notice (e.g., "This link expires in 15 minutes")
  - Alternative: plain-text link for email clients that block buttons
  - Security notice: "If you didn't request this, ignore this email"

**Template Props:**
```typescript
interface MagicLinkEmailProps {
  url: string;
  expiresAt: Date;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}
```

**Example Use Cases:**
1. New user signs up - receives welcome + magic link
2. Existing user clicks "Sign in with email" - receives login link
3. User requests password reset - receives magic link to set new password
4. Session expired - user can re-authenticate via email

#### 2.2 Send Function

- [ ] Create `src/send/magic-link.ts`
  - Dedicated function: `sendMagicLinkEmail()`
  - Validates email format before sending
  - Logs send attempts for debugging
  - Returns typed result with messageId or error

```typescript
// API usage in auth route
import { sendMagicLinkEmail } from '@repo/email';

const result = await sendMagicLinkEmail({
  to: email,
  magicLinkUrl: `${baseUrl}/auth/verify?token=${token}`,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
});

if (!result.success) {
  throw new Error(`Failed to send magic link: ${result.error}`);
}
```

---

### Phase 3: API Integration

**Priority: HIGH** - Connect email package to Hono API

#### 3.1 Environment Configuration

- [ ] Add `RESEND_API_KEY` to `apps/api/.env.example`
- [ ] Add `EMAIL_FROM` address configuration (e.g., `noreply@dotoro.io`)
- [ ] Document required Resend domain verification steps

#### 3.2 Email Service Layer

- [ ] Create `apps/api/src/services/email.ts`
  - Thin wrapper that initializes `@repo/email` with API config
  - Provides dependency injection point for testing
  - Handles API-specific logging/monitoring

#### 3.3 Auth Routes Integration

- [ ] Create `apps/api/src/routes/auth.ts`
  - `POST /auth/magic-link` - Request magic link
    - Validates email
    - Generates secure token (store in DB with expiry)
    - Sends magic-link email
    - Returns success (no token leak)

  - `GET /auth/verify` - Verify magic link token
    - Validates token exists and not expired
    - Creates session/JWT
    - Redirects to app or returns token

**Request/Response:**
```typescript
// POST /auth/magic-link
// Request
{ "email": "user@example.com" }

// Response (always 200 to prevent enumeration)
{ "message": "If this email exists, you will receive a login link" }

// GET /auth/verify?token=abc123
// Success: Redirect to /dashboard with session cookie
// Failure: Redirect to /login?error=invalid_token
```

---

### Phase 4: Database Schema for Auth Tokens

**Priority: MEDIUM** - Required for magic-link persistence

#### 4.1 Auth Tokens Table

- [ ] Create `packages/database/src/schema/auth-tokens.ts`
  ```typescript
  export const authTokens = pgTable('auth_tokens', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    type: varchar('type', { length: 50 }).notNull(), // 'magic_link', 'password_reset'
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    metadata: jsonb('metadata'), // IP, user agent, etc.
  });
  ```

- [ ] Add migration for auth_tokens table
- [ ] Export from `packages/database/src/schema/index.ts`

#### 4.2 Token Repository

- [ ] Create `apps/api/src/repositories/auth-token-repository.ts`
  - `createToken(email, type, expiresIn)` - Generate and store token
  - `validateToken(token)` - Check validity, mark as used
  - `cleanupExpired()` - Remove old tokens (for cron job)

---

### Phase 5: Testing & Quality

**Priority: MEDIUM** - Ensure reliability

#### 5.1 Unit Tests

- [ ] Test email client initialization and error handling
- [ ] Test template rendering produces valid HTML
- [ ] Test send function with mocked Resend API

#### 5.2 Integration Tests

- [ ] Test full magic-link flow: request -> send -> verify
- [ ] Test token expiration handling
- [ ] Test rate limiting on magic-link requests

#### 5.3 Email Previews

- [ ] Configure React Email preview server
- [ ] Add `pnpm email:dev` to root package.json
- [ ] Document preview workflow for designers/developers

---

## Not In Scope

### User Management System

- Creating users table and user CRUD operations
- **Why:** Depends on broader auth architecture decisions; email system should be auth-agnostic

### Session/JWT Management

- Session storage, JWT generation, refresh tokens
- **Why:** Separate concern; this TODO focuses on email delivery infrastructure

### Email Analytics & Tracking

- Open rates, click tracking, delivery analytics
- **Why:** Premature optimization; can be added later via Resend dashboard or webhooks

### Email Queuing with pg-boss

- Background job queue for email sending
- **Why:** Initial implementation uses synchronous sending; can optimize later if needed

### Transactional Email Templates Beyond Magic-Link

- Welcome emails, password changed notifications, etc.
- **Why:** Build incrementally; magic-link proves the pattern, others follow easily

### SMTP Fallback

- Alternative email provider configuration
- **Why:** Resend reliability is sufficient for MVP; add redundancy later

---

## Implementation Plan

### Step 1: Package Setup (2-3 hours)

1. Create `packages/email/` directory
2. Initialize `package.json` with dependencies
3. Configure TypeScript with `@repo/typescript-config`
4. Set up build scripts and exports
5. Add to workspace in root `pnpm-workspace.yaml` if not auto-detected

### Step 2: Resend Client (1-2 hours)

1. Implement client wrapper with environment validation
2. Create type definitions
3. Add error handling and logging
4. Write unit tests with mocked Resend

### Step 3: Base Template (1-2 hours)

1. Create base layout component
2. Add brand styling (fonts, colors, spacing)
3. Test rendering in React Email preview
4. Verify responsive behavior

### Step 4: Magic-Link Template (1-2 hours)

1. Build magic-link email component
2. Add all required props with defaults
3. Test across email clients using Resend preview
4. Add plain-text fallback

### Step 5: Database Schema (1 hour)

1. Create auth_tokens schema file
2. Generate and run migration
3. Update schema exports

### Step 6: API Integration (2-3 hours)

1. Add environment variables
2. Create email service wrapper
3. Implement auth routes
4. Create token repository
5. Wire up full flow

### Step 7: Testing (2-3 hours)

1. Write unit tests for email package
2. Write integration tests for auth flow
3. Test with real Resend API (sandbox mode)
4. Document testing approach

**Total Estimated Time: 10-16 hours**

---

## Definition of Done

- [ ] `@repo/email` package builds successfully with `turbo run build`
- [ ] Magic-link email sends successfully to real email address via Resend
- [ ] Email renders correctly in Gmail, Outlook, and Apple Mail (visual verification)
- [ ] Auth token is created in database with correct expiry
- [ ] Token verification works and invalidates token after use
- [ ] All unit tests pass (`pnpm test` in `packages/email`)
- [ ] Integration tests pass for full auth flow
- [ ] Environment variables documented in `.env.example`
- [ ] React Email preview server runs with `pnpm email:dev`

---

## Notes

### Tech Stack Rationale

| Technology | Why |
|------------|-----|
| **Resend** | Modern email API with excellent developer experience, React Email integration, generous free tier (100 emails/day), simple API |
| **React Email** | Type-safe templates, component reusability, familiar React patterns, excellent preview tooling |
| **TypeScript** | Consistent with monorepo, catches template prop errors at compile time |
| **Shared Package** | Enables email from API (transactional) and potentially web (preview), single source of truth for templates |

### Design Principles

1. **Fail gracefully** - Email failures shouldn't crash auth flow; log and return user-friendly error
2. **Security first** - Never log tokens, use crypto-secure random generation, enforce expiry
3. **Template isolation** - Each email type gets its own template file for maintainability
4. **Type everything** - Template props, send options, and results all fully typed

### Best Practices

- Use `crypto.randomBytes(32).toString('hex')` for token generation (not UUID)
- Set magic-link expiry to 15 minutes (balance security vs. user convenience)
- Always use HTTPS URLs in magic links
- Include request metadata (IP, user agent) in token for security auditing
- Rate limit magic-link requests to prevent abuse (e.g., 3 per email per hour)

---

## Next Steps

### Phase 2: Additional Transactional Emails

After magic-link is working:
- Welcome email for new users
- Password changed confirmation
- Account security alerts

### Phase 3: Email Preferences

- User preference management for email types
- Unsubscribe handling
- Preference center UI

### Phase 4: Email Queuing & Reliability

- Integrate with pg-boss for background sending
- Add retry logic for failed sends
- Implement webhook handling for delivery status

### Phase 5: Templates & Branding

- Design system integration with `@repo/ui`
- A/B testing infrastructure
- Localization support
