# Settings Page Feature - Dotoro

**Date:** 2025-12-28
**Status:** In Progress
**Priority:** Medium
**Depends On:** profile-page (user profile data structure)

---

## OVERVIEW

The Settings Page provides users with centralized control over their account, security, sessions, and notification preferences. This feature builds on the existing Better Auth infrastructure and user profile system.

### Current State
- Better Auth with magic link authentication is fully implemented
- Session management exists at the database level (session table with token, ipAddress, userAgent)
- User table includes: id, name, email, emailVerified, image, createdAt, updatedAt
- Teams/workspaces with RBAC implemented (`/settings/team/` route exists)
- Account table exists for future OAuth provider connections
- No user-facing settings page exists yet

### Target State
Users can manage all personal account settings from a single, well-organized settings page with tabbed navigation matching the existing team settings UI pattern.

---

## SUCCESS CRITERIA

- [x] User can navigate to `/settings` from the main navigation
- [ ] User can change their email address with automatic re-verification flow
- [ ] User can view all active sessions with device/location info and revoke any session
- [ ] User can toggle email notification preferences (persisted to database)
- [ ] User can delete their account with proper confirmation and data cleanup
- [ ] All settings forms show proper loading, success, and error states
- [x] Settings page follows existing UI patterns (matches `/settings/team/` design)
- [ ] Mobile-responsive layout works on all screen sizes
- [ ] All API endpoints return proper error messages and status codes
- [ ] Unit tests cover critical user flows with 80%+ coverage

---

## PHASE 1: Page Structure & Navigation (HIGH PRIORITY)

**Why HIGH:** Foundation for all subsequent work; enables development of individual tabs in parallel.

### 1.1 Create Settings Page Route
- [x] Create `apps/web/app/settings/page.tsx` with tab-based layout
- [x] Implement tab navigation: Account | Sessions | Security | Notifications | Danger Zone
- [x] Add route to sidebar navigation in `apps/web/components/layout/Navigation.tsx`
- [x] Add settings link to user dropdown menu in `apps/web/components/layout/TopBar.tsx`

### 1.2 Create Settings Layout Component
- [x] Create `apps/web/app/settings/components/SettingsLayout.tsx`
  - Matches team settings visual design (tabs, spacing, typography)
  - Handles active tab state via URL query params (`?tab=account`)
  - Provides consistent header and container styling
- [x] Create `apps/web/app/settings/components/SettingsSection.tsx`
  - Reusable section wrapper with title and description
  - Consistent padding and borders between sections

### 1.3 Shared Components
- [x] Create `apps/web/app/settings/components/ConfirmDialog.tsx`
  - Reusable confirmation modal (can extract from team settings)
  - Props: isOpen, onClose, onConfirm, title, message, variant (default/danger)
- [x] Create `apps/web/app/settings/components/FormField.tsx`
  - Consistent form field styling with label, input, error message
  - Support for text, email, toggle input types

**Example Use Cases:**
1. User clicks "Settings" in sidebar, lands on Account tab by default
2. User bookmarks `/settings?tab=sessions` to go directly to sessions
3. User navigates between tabs without page reload (client-side navigation)

---

## PHASE 2: Account Settings Tab (HIGH PRIORITY)

**Why HIGH:** Core user functionality for managing identity; email change requires re-verification.

### 2.1 API: Email Change Endpoint
- [ ] Create `apps/api/src/routes/users.ts` with user settings routes
- [ ] Add `PATCH /api/users/me` endpoint for updating user profile
  - Request body: `{ email?: string, name?: string, image?: string }`
  - Response: `{ user: User }`
  - Validation: valid email format, email not already in use
- [ ] Add `POST /api/users/me/change-email` endpoint
  - Request body: `{ newEmail: string }`
  - Response: `{ message: string, verificationSent: boolean }`
  - Flow: Sets emailVerified=false, sends magic link to new email
  - On verification: Updates email field, sets emailVerified=true

### 2.2 API: Schema & Types
- [ ] Create `apps/api/src/schemas/users.ts` with Zod validation schemas
  ```typescript
  export const updateUserSchema = z.object({
    email: z.string().email().optional(),
    name: z.string().min(1).max(100).optional(),
    image: z.string().url().optional(),
  });

  export const changeEmailSchema = z.object({
    newEmail: z.string().email(),
  });
  ```

### 2.3 Frontend: Account Tab Component
- [ ] Create `apps/web/app/settings/components/AccountTab.tsx`
  - Display current email with "verified" badge if emailVerified=true
  - Change email form with new email input
  - Submit triggers verification email to new address
  - Show pending state if email change is in progress
- [ ] Create `apps/web/lib/settings/api.ts` for settings API calls
  - `updateUserProfile(data)`: PATCH /api/users/me
  - `requestEmailChange(newEmail)`: POST /api/users/me/change-email

### 2.4 Email Change Flow
- [ ] Update magic link email template to support email verification context
- [ ] Handle email verification callback to update user email
- [ ] Show success message after email change verification completes

**Example Use Cases:**
1. User changes email from personal to work email, receives verification link
2. User sees "Verification pending" badge after requesting email change
3. User clicks magic link in new email, gets redirected to settings with success message

**API Endpoint:**
```
PATCH /api/users/me
Request:  { "name": "John Doe", "image": "https://..." }
Response: { "user": { "id": "...", "name": "John Doe", ... } }

POST /api/users/me/change-email
Request:  { "newEmail": "newemail@example.com" }
Response: { "message": "Verification email sent", "verificationSent": true }
```

---

## PHASE 3: Session Management Tab (HIGH PRIORITY)

**Why HIGH:** Security-critical feature; users need visibility into and control over active sessions.

### 3.1 API: Sessions Endpoints
- [ ] Add `GET /api/users/me/sessions` endpoint
  - Response: `{ sessions: SessionInfo[] }`
  - SessionInfo includes: id, createdAt, lastActiveAt, ipAddress, userAgent, isCurrent
  - Parse userAgent for friendly device/browser names
- [ ] Add `DELETE /api/users/me/sessions/:sessionId` endpoint
  - Validates session belongs to current user
  - Cannot revoke current session (use sign-out instead)
  - Response: `{ message: string }`
- [ ] Add `DELETE /api/users/me/sessions` endpoint (revoke all except current)
  - Response: `{ revokedCount: number }`

### 3.2 API: Session Utilities
- [ ] Create `apps/api/src/services/session-parser.ts`
  - `parseUserAgent(ua: string)`: Returns `{ browser, os, device }`
  - Use `ua-parser-js` library for reliable parsing
- [ ] Create session list query in repository
  - Query: `SELECT * FROM session WHERE user_id = ? AND expires_at > NOW()`
  - Order by createdAt descending (most recent first)

### 3.3 Frontend: Sessions Tab Component
- [ ] Create `apps/web/app/settings/components/SessionsTab.tsx`
  - Display list of active sessions with device info
  - Show "Current session" badge for the active session
  - Show last active time in relative format ("2 hours ago")
  - Revoke button for each non-current session
  - "Revoke all other sessions" button
- [ ] Create session card component with device icon based on type (desktop/mobile/tablet)

### 3.4 Session Display Format
- [ ] Format IP address with optional geolocation (city/country) - future enhancement
- [ ] Format user agent as: "Chrome on Windows" or "Safari on iPhone"
- [ ] Show session age: "Active since Dec 28, 2025"

**Example Use Cases:**
1. User sees 3 active sessions: current laptop, old phone, work computer
2. User revokes old phone session (lost/sold device)
3. User notices unfamiliar session, revokes it and changes email as precaution
4. User clicks "Revoke all" before traveling

**API Endpoint:**
```
GET /api/users/me/sessions
Response: {
  "sessions": [
    {
      "id": "sess_123",
      "createdAt": "2025-12-20T10:00:00Z",
      "lastActiveAt": "2025-12-28T15:30:00Z",
      "ipAddress": "192.168.1.1",
      "device": { "browser": "Chrome", "os": "Windows 11", "type": "desktop" },
      "isCurrent": true
    }
  ]
}

DELETE /api/users/me/sessions/sess_456
Response: { "message": "Session revoked successfully" }
```

---

## PHASE 4: Security Tab (MEDIUM PRIORITY)

**Why MEDIUM:** OAuth not yet implemented; tab will show minimal info initially but prepares for future OAuth integration.

### 4.1 Connected Accounts Display
- [ ] Create `apps/web/app/settings/components/SecurityTab.tsx`
  - Query account table for current user's connected providers
  - Display "No connected accounts" placeholder for now
  - Show "Connect with Google" / "Connect with GitHub" buttons (disabled/coming soon)
- [ ] Add `GET /api/users/me/accounts` endpoint
  - Response: `{ accounts: ConnectedAccount[] }`
  - ConnectedAccount: { id, providerId, providerAccountId, connectedAt }

### 4.2 Future OAuth Preparation
- [ ] Design component structure for OAuth provider cards
- [ ] Plan disconnect flow (requires at least one auth method to remain)
- [ ] Add placeholder for password option (if enabled in future)

### 4.3 Security Overview Section
- [ ] Display authentication method: "Magic Link (Email)"
- [ ] Show email verification status
- [ ] Link to sessions tab for "review active sessions"

**Example Use Cases:**
1. User sees "Magic Link Authentication" as current method
2. User sees empty connected accounts list with "Coming Soon" for OAuth options
3. Future: User connects Google account as backup auth method

---

## PHASE 5: Notification Preferences Tab (MEDIUM PRIORITY)

**Why MEDIUM:** Enhances user experience; requires user preferences storage.

### 5.1 Database: User Preferences
- [ ] Add `user_preferences` table to schema
  ```sql
  CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES user(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    email_digest_frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'never'
    marketing_emails BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Create migration file in `packages/database/drizzle/`
- [ ] Add Drizzle schema in `packages/database/src/schema/user-preferences.ts`

### 5.2 API: Preferences Endpoints
- [ ] Add `GET /api/users/me/preferences` endpoint
  - Returns current preferences or defaults if none exist
- [ ] Add `PATCH /api/users/me/preferences` endpoint
  - Request body: `{ emailNotifications?: boolean, digestFrequency?: string }`
  - Upserts preferences record

### 5.3 Frontend: Notifications Tab Component
- [ ] Create `apps/web/app/settings/components/NotificationsTab.tsx`
  - Toggle: "Email notifications for important updates"
  - Radio/Select: "Email digest frequency" (Daily/Weekly/Never)
  - Toggle: "Marketing and product updates"
- [ ] Add optimistic updates for toggle switches
- [ ] Show save confirmation toast on success

**Example Use Cases:**
1. User disables all email notifications (traveling, busy period)
2. User switches digest from daily to weekly to reduce inbox clutter
3. User opts out of marketing emails but keeps transactional ones

**API Endpoint:**
```
GET /api/users/me/preferences
Response: {
  "emailNotifications": true,
  "digestFrequency": "daily",
  "marketingEmails": false
}

PATCH /api/users/me/preferences
Request: { "emailNotifications": false }
Response: { "emailNotifications": false, ... }
```

---

## PHASE 6: Danger Zone Tab (HIGH PRIORITY)

**Why HIGH:** Critical security feature; account deletion must be handled carefully with proper safeguards.

### 6.1 API: Account Deletion Endpoint
- [ ] Add `DELETE /api/users/me` endpoint
  - Requires confirmation: `{ confirmEmail: string }` must match current email
  - Soft delete option: Mark user as deleted, anonymize data, schedule hard delete
  - Hard delete: Cascade delete all user data (sessions, preferences, team memberships)
  - Response: `{ message: string }`
- [ ] Add pre-deletion validation
  - Check if user is sole owner of any teams (must transfer ownership first)
  - Return error with list of teams that need ownership transfer

### 6.2 Data Cleanup Service
- [ ] Create `apps/api/src/services/account-deletion.ts`
  - `validateDeletion(userId)`: Check prerequisites
  - `deleteAccount(userId)`: Execute deletion with proper ordering
  - Log deletion for audit trail (anonymized)
- [ ] Handle team ownership transfer requirement
  - If sole owner: Block deletion, prompt to transfer or delete teams

### 6.3 Frontend: Danger Zone Tab Component
- [ ] Create `apps/web/app/settings/components/DangerZoneTab.tsx`
  - Red-themed section matching danger styling conventions
  - "Delete Account" button with warning text
  - Multi-step confirmation dialog:
    1. Warning about data loss
    2. Type email to confirm
    3. Final "Delete my account" button
- [ ] Handle team ownership blocking scenario
  - Show error: "You must transfer ownership of these teams first: [list]"
  - Link to team settings for each blocking team

### 6.4 Post-Deletion Flow
- [ ] Clear all client-side session data after deletion
- [ ] Redirect to homepage with "Account deleted" message
- [ ] Send confirmation email to deleted address (optional)

**Example Use Cases:**
1. User decides to delete account, confirms by typing email
2. User is blocked because they own "Marketing Team" - must transfer first
3. User confirms deletion, sees success message, redirected to home

**API Endpoint:**
```
DELETE /api/users/me
Request: { "confirmEmail": "user@example.com" }
Response: { "message": "Account successfully deleted" }

Error Response (team ownership):
{
  "error": "Cannot delete account",
  "reason": "sole_owner_of_teams",
  "teams": [{ "id": "...", "name": "Marketing Team" }]
}
```

---

## NOT IN SCOPE

### Authentication Methods
- Password authentication - **Why:** Current architecture uses magic link only; adding passwords requires significant auth flow changes
- OAuth provider connections - **Why:** Planned for future phase; account table structure is ready but OAuth handlers not implemented
- Two-factor authentication (2FA) - **Why:** Requires additional infrastructure (TOTP, backup codes); not prioritized for initial release

### Profile Features
- Profile photo upload - **Why:** Requires file storage infrastructure (S3/Cloudinary); currently accepts URL only
- Username/handle system - **Why:** Not part of current user identity model; would require schema changes
- Public profile pages - **Why:** Not a current product requirement

### Team Features
- Team deletion from user settings - **Why:** Already exists in `/settings/team/` route
- Billing settings - **Why:** Monetization not yet implemented
- Team-level notification preferences - **Why:** Scope limited to user-level settings

### Advanced Features
- Activity log/audit trail - **Why:** Would require significant logging infrastructure
- Export personal data (GDPR) - **Why:** Scheduled for compliance phase
- API key management - **Why:** Developer features planned for separate section

---

## IMPLEMENTATION PLAN

### Step 1: Project Setup (1-2 hours)
- Create directory structure under `apps/web/app/settings/`
- Set up base layout and navigation components
- Add settings route to sidebar

### Step 2: Shared Components (2-3 hours)
- Build SettingsLayout, SettingsSection, ConfirmDialog, FormField components
- Write unit tests for shared components

### Step 3: Account Tab + API (4-6 hours)
- Create user settings API routes
- Implement email change flow with verification
- Build AccountTab component with form handling
- Write integration tests for email change flow

### Step 4: Sessions Tab + API (4-6 hours)
- Create sessions API endpoints
- Implement user-agent parsing service
- Build SessionsTab component with revoke functionality
- Write unit tests for session management

### Step 5: Security Tab (2-3 hours)
- Build SecurityTab placeholder component
- Implement accounts listing API
- Design future OAuth connection UI (disabled state)

### Step 6: Notifications Tab + DB (3-4 hours)
- Create user_preferences table migration
- Implement preferences API endpoints
- Build NotificationsTab with toggle controls
- Write tests for preference persistence

### Step 7: Danger Zone Tab (4-6 hours)
- Implement account deletion API with validations
- Build multi-step deletion confirmation flow
- Handle team ownership edge cases
- Write comprehensive tests for deletion flow

### Step 8: Polish & QA (2-3 hours)
- Add loading states and error handling throughout
- Ensure mobile responsiveness
- Manual QA across all tabs
- Fix edge cases and improve UX

**Total Estimated Time:** 22-33 hours

---

## DEFINITION OF DONE

- [ ] All 6 tabs are implemented and functional
- [ ] All API endpoints have Zod validation schemas
- [ ] All API endpoints return consistent error format
- [ ] Unit test coverage is at least 80% for new components
- [ ] Integration tests cover email change and account deletion flows
- [ ] No TypeScript errors (`pnpm typecheck` passes)
- [ ] No ESLint errors (`pnpm lint` passes)
- [ ] All tests pass (`pnpm test` passes)
- [ ] Page is fully responsive (mobile/tablet/desktop)
- [ ] Keyboard navigation works for all interactive elements
- [ ] Loading states shown during API calls
- [ ] Error states shown with actionable messages
- [ ] Success toasts/messages confirm user actions

---

## NOTES

### Tech Stack
- **Frontend:** Next.js 14 App Router, React 18, TypeScript
- **Styling:** Tailwind CSS (matching existing component patterns)
- **API:** Hono.js on the backend
- **Auth:** Better Auth with magic link plugin
- **Database:** PostgreSQL with Drizzle ORM
- **Email:** @repo/email package with React Email templates

### Design Principles
- **Consistency:** Match existing team settings UI patterns exactly
- **Progressive Disclosure:** Show simple options first, advanced in subsections
- **Confirmation for Destructive Actions:** Multi-step confirmation for delete/revoke
- **Immediate Feedback:** Loading spinners, success toasts, error messages

### Best Practices
- Use `credentials: "include"` for all authenticated API calls
- Parse user agent on server side (not client) for consistency
- Email changes require re-verification for security
- Account deletion should be reversible for 30 days (soft delete)
- Log security-sensitive actions (email change, session revoke, delete)

---

## NEXT STEPS

### Phase 2 (Future)
- OAuth provider connections (Google, GitHub)
- Two-factor authentication (TOTP)
- Security keys (WebAuthn/Passkeys)

### Phase 3 (Future)
- Export personal data (GDPR compliance)
- Activity log / audit trail
- Advanced notification preferences (per-feature)

### Phase 4 (Future)
- API key management
- Developer settings
- Webhook configuration
