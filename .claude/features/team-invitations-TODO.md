# Team Invitations Feature

**Project:** Dotoro
**Date:** 2025-12-28
**Status:** Phase 1 & 2 Complete - Core Email Sending Implemented

---

## Overview

The Team Invitations feature enables team owners and admins to invite new members via email, with a complete invitation acceptance workflow. This feature bridges the gap between creating invitations in the database (already implemented) and actually sending email notifications while providing a polished user experience for accepting/declining invitations.

### Current State

The backend API routes and frontend UI are already scaffolded:
- **API Routes:** `apps/api/src/routes/invitations.ts` - Contains endpoints for send, list, revoke, accept, decline
- **Database Schema:** `packages/database/src/schema/teams.ts` - `teamInvitations` table with token, expiry, role fields
- **Frontend Pages:** `apps/web/app/invite/[token]/page.tsx` - Accept/decline UI exists
- **Team Settings:** `apps/web/app/settings/team/page.tsx` - Invitations tab with send form

### What's Missing

The critical gap is the **email sending functionality** - the API currently has a `TODO: Send invitation email` comment but never actually sends emails. Additionally, there are several UX improvements and security hardening tasks needed.

---

## Goal

Enable team owners and administrators to invite users to their teams via email, providing a seamless onboarding experience that works for both existing and new users while maintaining security through time-limited tokens.

### Success Criteria

- [x] Invitation emails are sent via Resend when a team admin creates an invitation
- [x] Email contains clear call-to-action with invitation link `/invite/{token}`
- [x] Existing users can accept invitations while logged in and are auto-added to team
- [x] New users are redirected to sign-up/login, then returned to accept the invitation
- [x] Invitations expire after 7 days and cannot be reused after acceptance
- [x] Invitation emails show team name, inviter name, and assigned role
- [x] Users can decline invitations without logging in
- [x] **API returns email delivery status so frontend can inform admin of failures**
- [x] **When email fails, API returns invite link for manual sharing**

---

## What's Already Done

### Database Schema (Complete)
- `teamInvitations` table with:
  - `id`, `teamId`, `email`, `role`, `token` (unique, 64 chars)
  - `invitedBy` (user reference), `expiresAt`, `acceptedAt`, `createdAt`
  - Indexes on `token`, `team_email`, `expires_at`

### API Routes (Complete - apps/api/src/routes/invitations.ts)
- `POST /api/teams/{id}/invitations` - Create invitation with validation
- `GET /api/teams/{id}/invitations` - List pending invitations (admin only)
- `DELETE /api/teams/{id}/invitations/{invitationId}` - Revoke invitation
- `GET /api/invitations/{token}` - Get public invitation details (no auth)
- `POST /api/invitations/{token}/accept` - Accept (requires auth)
- `POST /api/invitations/{token}/decline` - Decline (no auth required)

### Frontend UI (Complete)
- Team Settings Invitations Tab: `apps/web/app/settings/team/page.tsx`
  - Send invitation form with email + role selector
  - Pending invitations list with revoke buttons
- Invitation Accept Page: `apps/web/app/invite/[token]/page.tsx`
  - Shows team name, inviter, assigned role
  - Accept/Decline buttons with loading states
  - Redirects unauthenticated users to login
  - Success/error/expired states handled

### Email Package (Complete - packages/email/)
- Resend client with dev console fallback
- `sendEmail()` function supporting React Email templates
- `MagicLinkEmail` template as reference implementation
- Type-safe email sending with validation

---

## What We're Building Now

### Phase 1: Email Template & Send Function (HIGH Priority)

**Why HIGH:** Without sending actual emails, invitations are useless - users have no way to receive their invitation links.

#### 1.1 Create Team Invitation Email Template
**File:** `packages/email/src/emails/team-invitation.tsx`

- [x] Create `TeamInvitationEmail` React Email component following `MagicLinkEmail` pattern
- [x] Include team name prominently in header
- [x] Show inviter's email address ("You were invited by...")
- [x] Display assigned role with explanation (admin/editor/viewer)
- [x] Primary CTA button: "Join {Team Name}"
- [x] Include plain-text link fallback
- [x] Add expiration notice ("This invitation expires in X days")
- [x] Add security notice ("If you didn't expect this invitation...")

**Props interface:**
```typescript
interface TeamInvitationEmailProps {
  teamName: string;
  inviterEmail: string;
  inviterName?: string;
  role: 'admin' | 'editor' | 'viewer';
  inviteUrl: string;
  expiresAt: Date;
  recipientEmail: string;
}
```

#### 1.2 Create Send Invitation Email Function
**File:** `packages/email/src/send/team-invitation.ts`

- [x] Create `sendTeamInvitationEmail(options)` function
- [x] Validate email address using existing `isValidEmail()`
- [x] Validate invite URL is HTTPS using `isValidUrl()`
- [x] Validate expiration is in the future
- [x] Compose email using `TeamInvitationEmail` component
- [x] Use subject: "You're invited to join {teamName} on Dotoro"
- [x] Return `EmailResult` with success/error status

**Function signature:**
```typescript
interface SendTeamInvitationOptions {
  to: string;
  teamName: string;
  inviterEmail: string;
  role: 'admin' | 'editor' | 'viewer';
  inviteToken: string;
  expiresAt: Date;
}

async function sendTeamInvitationEmail(
  options: SendTeamInvitationOptions
): Promise<EmailResult>
```

#### 1.3 Export from Email Package
**File:** `packages/email/src/index.ts`

- [x] Export `sendTeamInvitationEmail` function
- [x] Export `TeamInvitationEmailProps` type
- [x] Export `SendTeamInvitationOptions` type

#### 1.4 Write Tests for Email Template
**File:** `packages/email/src/__tests__/team-invitation.test.ts`

- [x] Test email renders with all required props
- [x] Test expiration formatting (minutes, hours, days)
- [x] Test role descriptions render correctly
- [x] Test validation rejects invalid emails
- [x] Test validation rejects non-HTTPS URLs
- [x] Test validation rejects expired invitations

---

### Phase 2: API Integration (HIGH Priority)

**Why HIGH:** Connect the email sending to the existing API route that creates invitations.

#### 2.1 Integrate Email Sending in Create Invitation Route
**File:** `apps/api/src/routes/invitations.ts`

- [x] Import `sendTeamInvitationEmail` from `@repo/email`
- [x] Construct invitation URL: `{APP_URL}/invite/{token}`
- [x] Call `sendTeamInvitationEmail()` after creating invitation record
- [x] Log email send result for debugging
- [x] Handle email send failure gracefully (don't fail the whole request)
- [x] **CRITICAL FIX:** Return email delivery status in API response (emailSent, emailError, inviteLink)
- [x] Include invite link in response when email fails so admin can share manually
- [x] Add structured error logging with full context when email fails
- [ ] Consider: Store email send status on invitation record?

**Integration point (line ~412 in invitations.ts):**
```typescript
// Response now includes email status so frontend can inform admin
return c.json(
  {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    inviterEmail: auth.user.email,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    emailSent: emailResult.success,
    emailError: emailResult.success ? undefined : emailResult.error,
    // Provide invite link when email fails so admin can share manually
    inviteLink: emailResult.success ? undefined : `${appUrl}/invite/${token}`,
  },
  201
);
```

#### 2.2 Add APP_URL Environment Variable
**File:** `apps/api/.env.example`

- [x] Add `APP_URL=http://localhost:3000` to env example
- [x] Document that this is used for invitation links

#### 2.3 Handle Resend Invitation (Email Re-send)
**File:** `apps/api/src/routes/invitations.ts`

- [ ] Add `POST /api/teams/{id}/invitations/{invitationId}/resend` endpoint
- [ ] Validate invitation exists and hasn't been accepted
- [ ] Validate invitation hasn't expired (or extend expiry?)
- [ ] Re-send email with existing token
- [ ] Return success response

---

### Phase 3: Frontend Enhancements (MEDIUM Priority)

**Why MEDIUM:** Core functionality works, but UX improvements increase adoption.

#### 3.1 Add Resend Button to Pending Invitations
**File:** `apps/web/app/settings/team/page.tsx`

- [ ] Add "Resend" button next to each pending invitation
- [ ] Show loading state during resend
- [ ] Show success toast on resend
- [ ] Show last sent timestamp if available

#### 3.2 Improve Invitation Accept Page Error States
**File:** `apps/web/app/invite/[token]/page.tsx`

- [ ] Add specific handling for "already a member" error
- [ ] Add specific handling for "email mismatch" (logged in as different email)
- [ ] Show option to sign in with different account
- [ ] Improve loading state with skeleton UI

#### 3.3 Add Invitation Success Notification
**File:** `apps/web/app/settings/team/page.tsx`

- [ ] Show toast notification when invitation sent successfully
- [ ] Include "Copy invite link" button as fallback
- [ ] Show email preview/confirmation before sending

#### 3.4 Add Frontend API Function for Resend
**File:** `apps/web/lib/teams/api.ts`

- [ ] Add `resendInvitation(teamId, invitationId)` function
- [ ] Export from `apps/web/lib/teams/index.ts`

---

### Phase 4: Security & Edge Cases (MEDIUM Priority)

**Why MEDIUM:** Protects against abuse but not blocking launch.

#### 4.1 Rate Limiting for Invitations
**File:** `apps/api/src/routes/invitations.ts`

- [ ] Limit invitations per team per hour (e.g., 20/hour)
- [ ] Limit invitations per inviter per hour (e.g., 10/hour)
- [ ] Return 429 Too Many Requests with retry-after header
- [ ] Consider using existing rate limiting middleware if available

#### 4.2 Email Mismatch Handling
**File:** `apps/api/src/routes/invitations.ts` (acceptInvitationRoute handler)

- [ ] When accepting, optionally verify logged-in email matches invitation email
- [ ] If mismatch: allow with warning, or require match? (product decision)
- [ ] Log acceptance with email mismatch for audit

#### 4.3 Invitation Audit Logging
**File:** `apps/api/src/routes/invitations.ts`

- [ ] Log invitation created (inviter, invitee email, team, role)
- [ ] Log invitation accepted (who accepted, when)
- [ ] Log invitation declined
- [ ] Log invitation revoked (who revoked)
- [ ] Consider structured logging format for analytics

#### 4.4 Token Security Review

- [ ] Verify token generation uses crypto-secure random (already uses `crypto.randomBytes`)
- [ ] Confirm token length is sufficient (64 chars hex = 256 bits)
- [ ] Ensure tokens are single-use (acceptedAt prevents reuse)
- [ ] Add index hint for token lookups if not indexed

---

## Not In Scope

### Bulk Invitations
- **What:** Invite multiple users at once via CSV or multi-email input
- **Why:** MVP focuses on individual invitations; bulk can be v2 feature

### Invitation Link Sharing (Copy Link)
- **What:** Allow admins to copy invitation link without sending email
- **Why:** Deprioritized to avoid potential security issues with shared links; email ensures intended recipient

### Notification of Acceptance to Inviter
- **What:** Email the inviter when their invitation is accepted
- **Why:** Nice-to-have but not critical for MVP; can add in later iteration

### Invitation Reminders
- **What:** Automatically resend invitation after X days if not accepted
- **Why:** Requires scheduled job infrastructure; manual resend suffices for MVP

### Custom Invitation Messages
- **What:** Allow inviter to add personalized message to invitation email
- **Why:** Schema supports `message` field but keeping email template simple for MVP

### Team Plan Limits on Invitations
- **What:** Limit number of team members based on billing plan
- **Why:** Billing/plan features are future scope; all plans allow unlimited for now

---

## Implementation Plan

### Step 1: Email Template (2-3 hours)
1. Create `team-invitation.tsx` email template component
2. Create `send/team-invitation.ts` send function
3. Export from package index
4. Write unit tests for template and validation

### Step 2: API Integration (1-2 hours)
1. Add `@repo/email` as dependency to API if not present
2. Import and call `sendTeamInvitationEmail` in create route
3. Add `APP_URL` environment variable
4. Test end-to-end with Resend

### Step 3: Resend Endpoint (1 hour)
1. Create resend invitation route
2. Add frontend API function
3. Add resend button to UI

### Step 4: Testing & Polish (1-2 hours)
1. Write integration tests for invitation flow
2. Test with real Resend API
3. Test all error states in UI
4. Manual QA of full flow

---

## Definition of Done

- [x] Invitation emails are sent successfully via Resend when admin invites a user
- [x] Email contains correct team name, inviter info, role, and clickable link
- [x] Clicking email link navigates to `/invite/{token}` page
- [x] Authenticated users can accept and are added to team immediately
- [x] Unauthenticated users are redirected to login, then back to accept page
- [x] Declining an invitation removes it from pending list
- [x] Expired invitations show appropriate error message
- [x] All email template tests pass
- [x] API integration tests cover send, accept, decline flows
- [x] **API returns emailSent, emailError, inviteLink in response for email failure visibility**
- [x] **Tests verify email status fields in API response**
- [ ] No console errors or warnings in production build

---

## Notes

### Tech Stack Decisions

| Technology | Choice | Why |
|------------|--------|-----|
| Email Provider | Resend | Already integrated in `@repo/email` package |
| Email Templates | React Email | Type-safe, component-based, matches existing `MagicLinkEmail` |
| Token Generation | `crypto.randomBytes` | Already implemented, crypto-secure |
| Token Length | 64 chars (256 bits) | Sufficient entropy, URL-safe |
| Expiration | 7 days | Balance between convenience and security |

### Design Principles

1. **Graceful Degradation:** If email sending fails, invitation is still created - admin can copy link manually
2. **Security First:** Tokens are crypto-random, time-limited, single-use
3. **UX Clarity:** Clear states for loading, success, error, expired
4. **Accessibility:** All UI elements have proper ARIA labels and keyboard navigation

### Best Practices

- **Logging:** Log all invitation lifecycle events for debugging and audit
- **Validation:** Validate email format client-side and server-side
- **Error Messages:** User-friendly error messages, technical details in logs
- **Testing:** Unit tests for email template, integration tests for API flow

### Example Use Cases

1. **Inviting a colleague:** Team owner enters colleague's email, selects "editor" role, colleague receives email and joins
2. **New hire onboarding:** HR sends invitation before employee starts, they sign up and join team on first day
3. **Contractor access:** Admin invites contractor as "viewer", contractor accepts with existing account
4. **Declined invitation:** Recipient doesn't recognize team, declines, invitation is removed
5. **Expired invitation:** User clicks link after 7 days, sees "invitation expired" message, needs new invitation

---

## Next Steps

### v2 Features (After MVP)
1. Bulk invitations via CSV upload
2. Invitation analytics (sent, opened, accepted rates)
3. Auto-reminder emails for pending invitations
4. Custom invitation messages from inviter

### v3 Features (Future)
1. Team plan limits on member count
2. Invitation approval workflow for sensitive teams
3. SSO/SAML integration for enterprise invitations
4. Invitation via slack/teams integration
