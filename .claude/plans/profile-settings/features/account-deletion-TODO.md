# Account Deletion Feature

**Date**: 2025-12-28
**Status**: In Progress (Phase 2 Complete)
**Priority**: 2
**Complexity**: High
**Depends On**: display-name

---

## Overview

This feature enables users to permanently delete their accounts from the platform. Account deletion is a critical user privacy feature that must handle complex team ownership scenarios, properly transfer or delete associated data, and provide clear feedback to users about the consequences of their actions.

### Key Challenges
1. **Team Ownership Transfer**: When a user owns teams with other members, ownership must be transferred before deletion
2. **Solo Team Cleanup**: Teams where the user is the only member must be deleted along with the account
3. **Data Cascade**: Sessions, OAuth accounts, and team memberships must be cleaned up properly
4. **User Confirmation**: Irreversible action requires strong confirmation UX

---

## Goal

Enable users to permanently delete their accounts with proper handling of team ownership, membership cleanup, and associated data deletion while providing clear communication about the consequences.

### Success Criteria

- [x] Users can delete their account via `DELETE /api/users/me` endpoint
- [x] Solo teams (user is only member) are automatically deleted with the account
- [x] Team ownership is transferred to most senior admin/member when user owns shared teams
- [x] All sessions, OAuth accounts, and team memberships are properly cleaned up
- [x] UI clearly communicates which teams will be deleted vs transferred before confirmation
- [x] Account deletion requires email confirmation to prevent accidental deletion
- [x] Comprehensive test coverage for all deletion scenarios

---

## What's Already Done

### Authentication & User Management
- [x] Better Auth configured with magic link, OAuth, and session management (`apps/api/src/lib/auth.ts`)
- [x] User schema with cascade delete for sessions and accounts (`packages/database/src/schema/auth.ts`)
- [x] Session management with impersonation support
- [x] Profile page displaying user info (`apps/web/app/[locale]/[teamSlug]/settings/profile/page.tsx`)

### Team System
- [x] Teams schema with memberships and invitations (`packages/database/src/schema/teams.ts`)
- [x] Team CRUD API routes (`apps/api/src/routes/teams.ts`)
- [x] Team role system: owner, admin, editor, viewer
- [x] Personal team auto-creation on user signup (`apps/api/src/services/personal-team.js`)
- [x] Cascade delete on team memberships when user is deleted

### UI Components
- [x] ProfileHeader component with avatar, name, email
- [x] ProfileDetails component with email verification and dates
- [x] Modal/dialog patterns established in codebase

---

## What We're Building Now

### Phase 1: Backend API Implementation

#### 1.1 Account Deletion Preview Endpoint
**Priority**: HIGH - Required for UI to show deletion consequences

**Route**: `GET /api/users/me/deletion-preview`

**File**: `apps/api/src/routes/users.ts`

- [x] Create `apps/api/src/routes/users.ts` with OpenAPIHono structure
- [x] Implement authentication check using `validateSession`
- [x] Query all teams where user is a member
- [x] Categorize teams into three groups:
  - `teamsToDelete`: Teams where user is the only member
  - `teamsToTransfer`: Teams where user is owner/admin with other members
  - `teamsToLeave`: Teams where user is just a member (not owner)
- [x] For `teamsToTransfer`, identify the new owner:
  - Prefer admin role, then editor, then viewer
  - Within same role, prefer earliest `acceptedAt` date
- [x] Return response with team lists and new owner info

**Request/Response Schema**:
```typescript
// Response: GET /api/users/me/deletion-preview
{
  teamsToDelete: Array<{
    id: string;
    name: string;
    slug: string;
    memberCount: 1; // Always 1 for solo teams
  }>;
  teamsToTransfer: Array<{
    id: string;
    name: string;
    slug: string;
    memberCount: number;
    newOwner: {
      id: string;
      email: string;
      currentRole: "admin" | "editor" | "viewer";
    };
  }>;
  teamsToLeave: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}
```

#### 1.2 Account Deletion Endpoint
**Priority**: HIGH - Core functionality

**Route**: `DELETE /api/users/me`

**File**: `apps/api/src/routes/users.ts`

- [x] Create delete route with OpenAPI spec
- [x] Require request body with email confirmation
- [x] Validate email matches authenticated user's email
- [x] Implement deletion in transaction:
  1. [x] Transfer ownership for shared teams (update role to 'owner')
  2. [x] Delete solo teams (cascade handles memberships)
  3. [x] Remove user from teams they're just a member of
  4. [x] Delete user record (cascade handles sessions, accounts)
- [x] Return 204 No Content on success
- [x] Handle errors gracefully with proper error codes

**Request Schema**:
```typescript
// Request: DELETE /api/users/me
{
  confirmEmail: string; // Must match user's email
}
```

**Example Use Cases**:
1. **User with only personal team**: Team deleted, user deleted
2. **User owns team with 3 members**: Ownership transferred to senior admin, user removed
3. **User is member of 5 teams, owns 2**: 2 teams transferred/deleted, removed from 5
4. **User owns team but no other admins exist**: Transfer to senior editor/viewer

#### 1.3 Schema Definitions
**Priority**: HIGH

**File**: `apps/api/src/schemas/users.ts`

- [x] Create Zod schemas for deletion preview response
- [x] Create Zod schema for delete request body
- [x] Export types for TypeScript usage

#### 1.4 Register Users Route
**Priority**: HIGH

**File**: `apps/api/src/app.ts`

- [x] Import `usersApp` from routes
- [x] Register route with `app.route("/", usersApp)`
- [x] Update `apps/api/src/routes/index.ts` to export `usersApp`

---

### Phase 2: Frontend UI Components

#### 2.1 Delete Account Section Component
**Priority**: HIGH

**File**: `apps/web/app/[locale]/[teamSlug]/settings/profile/components/DeleteAccountSection.tsx`

- [x] Create danger zone section with red border/background
- [x] Display warning text about permanent deletion
- [x] Add "Delete Account" button styled as destructive
- [x] Implement click handler to open confirmation modal

**UI Specifications**:
- Section at bottom of profile page
- Clear visual separation (danger zone styling)
- Warning icon with "This action cannot be undone" message
- Button: red/destructive variant

#### 2.2 Delete Account Confirmation Modal
**Priority**: HIGH

**File**: `apps/web/app/[locale]/[teamSlug]/settings/profile/components/DeleteAccountModal.tsx`

- [x] Create modal component with proper accessibility
- [x] Fetch deletion preview on modal open (`GET /api/users/me/deletion-preview`)
- [x] Display loading state while fetching preview
- [x] Show lists of teams:
  - Teams that will be DELETED (with member count)
  - Teams where ownership will be TRANSFERRED (with new owner email)
  - Teams user will LEAVE
- [x] Implement email confirmation input field
- [x] Validate email matches before enabling delete button
- [x] Show inline validation error if email doesn't match
- [x] Display final confirmation warning
- [x] Handle delete request and redirect to logout on success

**UI Specifications**:
```
+--------------------------------------------------+
| Delete Your Account                          [X] |
+--------------------------------------------------+
|                                                  |
| [!] This action is permanent and cannot be       |
|     undone. Please review carefully.             |
|                                                  |
| Teams that will be DELETED:                      |
| - My Personal Team (1 member)                    |
| - Side Project (1 member)                        |
|                                                  |
| Teams where ownership will be TRANSFERRED:       |
| - Acme Corp (5 members) -> john@example.com      |
|                                                  |
| Teams you will LEAVE:                            |
| - Client Project (you're an editor)              |
|                                                  |
| To confirm, type your email:                     |
| [user@example.com                           ]    |
|                                                  |
| [Cancel]                [Delete My Account]      |
+--------------------------------------------------+
```

#### 2.3 API Hook for Deletion
**Priority**: HIGH

**File**: `apps/web/lib/hooks/useAccountDeletion.ts`

- [x] Create `useDeletionPreview` hook for fetching preview data
- [x] Create `useDeleteAccount` mutation hook
- [x] Handle loading, error, and success states
- [x] Implement redirect to login page after successful deletion
- [x] Clear any cached auth state

#### 2.4 Integrate Delete Section into Profile Page
**Priority**: MEDIUM

**File**: `apps/web/app/[locale]/[teamSlug]/settings/profile/page.tsx`

- [x] Import DeleteAccountSection component
- [x] Add section below ProfileDetails
- [x] Add horizontal divider for visual separation

---

### Phase 3: Testing

#### 3.1 Backend Unit Tests
**Priority**: HIGH

**File**: `apps/api/src/__tests__/routes/users.test.ts`

- [x] Test deletion preview returns correct team categorization
- [x] Test solo team detection (memberCount === 1)
- [x] Test ownership transfer priority (admin > editor > viewer)
- [x] Test ownership transfer by seniority (acceptedAt date)
- [x] Test email confirmation validation
- [x] Test email mismatch rejection
- [x] Test unauthorized access (no session)
- [x] Test transaction rollback on failure
- [x] Test cascade deletion of sessions and accounts
- [x] Test team membership cleanup

#### 3.2 Frontend Component Tests
**Priority**: HIGH

**File**: `apps/web/app/[locale]/[teamSlug]/settings/profile/components/__tests__/DeleteAccountSection.test.tsx`

- [x] Test section renders with warning message
- [x] Test button opens modal
- [x] Test accessibility attributes

**File**: `apps/web/app/[locale]/[teamSlug]/settings/profile/components/__tests__/DeleteAccountModal.test.tsx`

- [x] Test modal renders team lists correctly
- [x] Test email input validation
- [x] Test delete button disabled until email matches
- [x] Test loading state during API calls
- [x] Test error state handling
- [x] Test successful deletion redirects

#### 3.3 Integration Tests
**Priority**: MEDIUM

**File**: `apps/api/src/__tests__/routes/users-integration.test.ts`

- [ ] Test full deletion flow with database verification
- [ ] Verify teams are deleted/transferred correctly
- [ ] Verify user record is removed
- [ ] Verify sessions are invalidated

---

## Not In Scope

### Data Export Before Deletion
- **Why**: Separate feature that adds complexity; can be added later as enhancement
- **Future**: Consider "Download my data" feature before deletion flow

### Soft Delete / Grace Period
- **Why**: MVP focuses on immediate deletion; grace period requires scheduled jobs
- **Future**: Could add 30-day grace period with email to recover account

### Email Notification to Team Members
- **Why**: Requires email template system; ownership transfer is instant
- **Future**: Notify new owners when they receive ownership transfer

### Admin Force-Delete User
- **Why**: Separate admin feature; this is user-initiated deletion only
- **Future**: Add to admin panel with audit logging

### Deleting External OAuth Data
- **Why**: We only delete our records; user must revoke access at provider
- **Future**: Add link to OAuth provider settings in deletion flow

---

## Implementation Plan

### Step 1: Create Users Route File (2-3 hours)
- Set up OpenAPIHono app structure
- Create route definitions with proper types
- Export from routes index

### Step 2: Implement Deletion Preview (2-3 hours)
- Write team categorization logic
- Implement new owner selection algorithm
- Add comprehensive inline documentation

### Step 3: Implement Delete Endpoint (3-4 hours)
- Write transactional deletion logic
- Handle edge cases (all scenarios)
- Add proper error handling

### Step 4: Create Schema Definitions (1 hour)
- Define Zod schemas
- Export TypeScript types

### Step 5: Build Delete Section Component (1-2 hours)
- Create danger zone UI
- Style with appropriate warning colors
- Add button with loading states

### Step 6: Build Confirmation Modal (3-4 hours)
- Create accessible modal
- Implement preview fetching
- Build team list displays
- Add email confirmation input
- Handle deletion flow

### Step 7: Create API Hooks (1-2 hours)
- Build useDeletionPreview hook
- Build useDeleteAccount mutation
- Handle auth state cleanup

### Step 8: Integrate into Profile Page (30 min)
- Import and position component
- Test integration

### Step 9: Write Backend Tests (3-4 hours)
- Cover all deletion scenarios
- Test edge cases
- Verify data cleanup

### Step 10: Write Frontend Tests (2-3 hours)
- Test component behavior
- Test validation logic
- Test API integration

**Total Estimated Time**: 20-27 hours

---

## Definition of Done

- [x] `DELETE /api/users/me` endpoint is implemented and documented in OpenAPI
- [x] `GET /api/users/me/deletion-preview` endpoint returns accurate team categorization
- [x] Solo teams are deleted when their only member deletes their account
- [x] Team ownership is transferred correctly following the priority rules (admin > editor > viewer, then by seniority)
- [x] User's sessions, OAuth accounts, and team memberships are cleaned up
- [x] Profile page includes a "Delete Account" section with proper danger zone styling
- [x] Confirmation modal shows clear breakdown of what will happen to each team
- [x] Email confirmation is required and validated before deletion proceeds
- [x] User is redirected to login page after successful deletion
- [x] All backend scenarios have unit test coverage (>90%)
- [x] All frontend components have test coverage
- [x] Error states are handled gracefully with user-friendly messages
- [x] Feature works correctly in both light and dark modes

---

## Notes

### Tech Stack
- **Backend**: Hono with OpenAPIHono for type-safe routes
- **Database**: Drizzle ORM with PostgreSQL
- **Auth**: Better Auth with magic link and OAuth
- **Frontend**: Next.js 15 with App Router
- **Testing**: Vitest for unit tests

### Design Principles
1. **Fail-safe**: Transaction ensures all-or-nothing deletion
2. **User-first**: Clear communication about consequences before action
3. **Accessibility**: Modal follows ARIA patterns, keyboard navigable
4. **Defensive**: Email confirmation prevents accidental deletion

### Best Practices
- Use transactions for multi-table operations
- Log deletion events for audit purposes (userId, timestamp, teams affected)
- Never expose internal IDs in error messages
- Rate limit the delete endpoint to prevent abuse
- Ensure deletion preview and actual deletion use same logic

---

## Next Steps

### Phase 2: Profile Enhancements
- Display name editing
- Avatar upload
- Email change flow

### Phase 3: Security Settings
- Password change (if email/password auth added)
- Two-factor authentication management
- Connected OAuth accounts management
- Active sessions management
