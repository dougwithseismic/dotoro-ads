# Display Name Feature

**Date:** 2025-12-28
**Status:** Planning
**Priority:** Medium

---

## Overview

Add the ability for users to edit their display name from the profile settings page. This feature enables users to personalize their account identity beyond their email address. The display name is shown in the ProfileHeader component and throughout the application where user identity is displayed.

**Key Integration Points:**
- Backend: New `PATCH /api/users/me` endpoint in Hono API
- Frontend: Editable display name form in ProfileHeader component
- Auth: Uses existing Better Auth session for user identification
- Database: Updates existing `name` field in `user` table

---

## What's Already Done

### Database Schema
- [x] `user` table exists with `name` field (`packages/database/src/schema/auth.ts`)
- [x] `name` field is `text("name").notNull()` (empty string default)
- [x] `updatedAt` field auto-updates on changes via `$onUpdate()`

### Authentication
- [x] Better Auth configured with session management (`apps/api/src/lib/auth.ts`)
- [x] `validateSession` middleware extracts user from session (`apps/api/src/middleware/auth.ts`)
- [x] Auth context provides `user` object with name field (`apps/web/lib/auth/context.tsx`)
- [x] `refreshSession` function available to re-fetch user data after updates

### Profile Page Infrastructure
- [x] Profile page at `apps/web/app/[locale]/[teamSlug]/settings/profile/page.tsx`
- [x] ProfileHeader component displays name/email/avatar (`components/ProfileHeader.tsx`)
- [x] ProfileDetails component shows account metadata (`components/ProfileDetails.tsx`)
- [x] Loading skeleton and error states implemented
- [x] `useAuth` hook provides user data and loading states

### API Patterns
- [x] OpenAPI Hono route pattern established (`apps/api/src/routes/teams.ts`)
- [x] Zod schema validation for requests/responses
- [x] `errorResponseSchema` for consistent error responses
- [x] Test patterns using Vitest and hono/testing (`apps/api/src/__tests__/routes/teams.test.ts`)

---

## What We're Building Now

### Phase 1: API Endpoint

**Feature:** `PATCH /api/users/me` endpoint
**Priority:** HIGH - Backend must be complete before frontend integration

- [ ] Create users route file at `apps/api/src/routes/users.ts`
  - Follow teams.ts pattern for OpenAPI Hono structure
  - Export as `usersApp`

- [ ] Create users schema file at `apps/api/src/schemas/users.ts`
  - Define `updateUserSchema` with Zod
  - Define `userResponseSchema` for response type
  ```typescript
  // apps/api/src/schemas/users.ts
  export const updateUserSchema = z.object({
    name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less").trim(),
  });

  export const userResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });
  ```

- [ ] Implement PATCH /api/users/me route handler
  - Authenticate user via `validateSession`
  - Validate request body with `updateUserSchema`
  - Update user record in database
  - Return updated user with `userResponseSchema`
  ```typescript
  // Example response
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "emailVerified": true,
    "image": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-12-28T12:00:00.000Z"
  }
  ```

- [ ] Register users route in main app
  - Add export in `apps/api/src/routes/index.ts`
  - Mount in `apps/api/src/app.ts`

- [ ] Add error handling for edge cases
  - 401 Unauthorized (no session)
  - 400 Bad Request (validation failure)
  - 500 Internal Server Error (database failure)

**Example Use Cases:**
1. User sets their name for the first time after signup
2. User updates their display name to reflect a name change
3. User corrects a typo in their display name
4. API rejects name that exceeds 50 characters
5. API trims whitespace from name input

### Phase 2: Frontend Hook

**Feature:** `useUpdateProfile` hook for profile mutations
**Priority:** HIGH - Required for form integration

- [ ] Create hook at `apps/web/lib/hooks/useUpdateProfile.ts`
  - Follow `useCreateTeam.ts` pattern for state management
  - Handle loading, error, and success states

- [ ] Create API utility at `apps/web/lib/api/users.ts`
  ```typescript
  export interface UpdateProfileInput {
    name: string;
  }

  export interface UserProfile {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
  }

  export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    const response = await fetch(`${API_URL}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }

    return response.json();
  }
  ```

- [ ] Implement hook with optimistic update support
  ```typescript
  interface UseUpdateProfileReturn {
    updateProfile: (input: UpdateProfileInput) => Promise<UserProfile>;
    isLoading: boolean;
    error: string | null;
    reset: () => void;
  }
  ```

- [ ] Export hook from `apps/web/lib/hooks/index.ts`

### Phase 3: UI Components

**Feature:** Editable display name in ProfileHeader
**Priority:** MEDIUM - User-facing feature

- [ ] Create `DisplayNameEditor` component
  - File: `apps/web/app/[locale]/[teamSlug]/settings/profile/components/DisplayNameEditor.tsx`
  - Inline editing with edit button (pencil icon)
  - Input field appears on edit click
  - Save/Cancel buttons for confirming changes
  - Loading spinner during save
  - Error message display on failure

- [ ] Implement form validation
  - Required: name cannot be empty
  - Max length: 50 characters
  - Client-side validation before API call
  - Character counter showing remaining characters

- [ ] Update ProfileHeader to support editing
  - Add `onNameUpdate` callback prop
  - Conditionally render DisplayNameEditor
  - Show success feedback after update

- [ ] Update ProfilePage to integrate editor
  - Pass `onNameUpdate` handler to ProfileHeader
  - Call `refreshSession` after successful update
  - Handle optimistic UI updates

- [ ] Add keyboard accessibility
  - Enter to save, Escape to cancel
  - Focus management on edit/save/cancel

**Example User Flows:**
1. User clicks edit button -> input appears with current name -> types new name -> clicks save -> sees updated name
2. User clicks edit button -> types invalid name (empty) -> sees validation error -> cannot save
3. User clicks edit button -> types new name -> clicks cancel -> original name restored
4. User clicks edit button -> types new name -> presses Enter -> name saved
5. User clicks edit button -> presses Escape -> edit mode cancelled

### Phase 4: Testing

**Feature:** Comprehensive test coverage
**Priority:** HIGH - Quality gate before merge

#### API Tests
- [ ] Create `apps/api/src/__tests__/routes/users.test.ts`
  - Test 401 when not authenticated
  - Test 400 for empty name
  - Test 400 for name exceeding 50 characters
  - Test 400 for whitespace-only name
  - Test 200 successful update returns updated user
  - Test name is trimmed before saving
  - Test updatedAt is updated after save

#### Component Tests
- [ ] Create `apps/web/app/[locale]/[teamSlug]/settings/profile/components/__tests__/DisplayNameEditor.test.tsx`
  - Test renders current name
  - Test entering edit mode on button click
  - Test input displays and focuses correctly
  - Test save button triggers update
  - Test cancel button exits edit mode
  - Test validation error for empty name
  - Test validation error for too long name
  - Test character counter updates
  - Test keyboard shortcuts (Enter/Escape)
  - Test loading state during save
  - Test error message display

#### Hook Tests
- [ ] Create `apps/web/lib/hooks/__tests__/useUpdateProfile.test.ts`
  - Test initial state (not loading, no error)
  - Test loading state during update
  - Test successful update returns user
  - Test error state on failure
  - Test reset clears error state

---

## Not In Scope

### Avatar Upload
- Avatar editing/upload functionality
- **Why:** Separate feature with different complexity (file upload, image processing, storage). Will be its own feature iteration.

### Email Change
- Ability to change email address
- **Why:** Requires re-verification flow, has security implications. Higher complexity feature for future phase.

### Profile Visibility Settings
- Control who can see profile information
- **Why:** Not part of current requirements. Would require privacy controls across the application.

### Username/Handle
- Separate username field distinct from display name
- **Why:** Current architecture uses display name for identity. Username would require uniqueness constraints and different UX patterns.

### Multiple Name Fields
- First name / Last name separation
- **Why:** Display name as single field is simpler and more flexible for international names.

### Name History
- Tracking previous names
- **Why:** Not required for MVP. Could be added later for audit purposes.

---

## Implementation Plan

### Step 1: API Schema and Route (2-3 hours)
1. Create `apps/api/src/schemas/users.ts` with validation schemas
2. Create `apps/api/src/routes/users.ts` with PATCH handler
3. Register route in `apps/api/src/routes/index.ts`
4. Mount route in `apps/api/src/app.ts`
5. Test endpoint manually with curl/Postman

### Step 2: API Tests (1-2 hours)
1. Create test file following teams.test.ts pattern
2. Mock database and auth middleware
3. Write tests for all error cases
4. Write tests for success case
5. Run tests and verify coverage

### Step 3: Frontend API Utility (1 hour)
1. Create `apps/web/lib/api/users.ts`
2. Implement `updateProfile` function
3. Export types for input/output

### Step 4: Frontend Hook (1 hour)
1. Create `apps/web/lib/hooks/useUpdateProfile.ts`
2. Follow useCreateTeam pattern
3. Export from hooks index
4. Write hook tests

### Step 5: UI Components (2-3 hours)
1. Create DisplayNameEditor component
2. Add inline edit UI with form validation
3. Integrate with ProfileHeader
4. Update ProfilePage to handle updates
5. Add keyboard accessibility

### Step 6: Component Tests (1-2 hours)
1. Create DisplayNameEditor test file
2. Test all user interactions
3. Test validation states
4. Test loading and error states

### Step 7: Integration Testing (1 hour)
1. Manual end-to-end testing
2. Verify session refresh after update
3. Test across browsers
4. Test responsive behavior

**Total Estimated Time:** 9-14 hours

---

## Success Criteria

- [ ] User can click an edit button next to their display name
- [ ] User sees an input field with their current name when editing
- [ ] User can type a new name (1-50 characters) and save it
- [ ] User sees validation errors for invalid input (empty, too long)
- [ ] User can cancel editing without saving changes
- [ ] Name updates persist and display correctly after page refresh
- [ ] Session is refreshed after update so name shows across the app
- [ ] Keyboard shortcuts work (Enter to save, Escape to cancel)
- [ ] Loading state is shown during save operation
- [ ] Error messages are displayed if save fails
- [ ] All API tests pass
- [ ] All component tests pass

---

## Definition of Done

- [ ] `PATCH /api/users/me` endpoint implemented and documented in OpenAPI
- [ ] API returns proper error responses (401, 400, 500)
- [ ] Name validation enforced (1-50 chars, trimmed)
- [ ] DisplayNameEditor component renders inline edit UI
- [ ] Form validation prevents invalid submissions
- [ ] Loading spinner shown during API calls
- [ ] Error messages displayed for failures
- [ ] Keyboard accessible (Enter/Escape shortcuts)
- [ ] Unit tests for API endpoint (>80% coverage)
- [ ] Unit tests for DisplayNameEditor component
- [ ] Unit tests for useUpdateProfile hook
- [ ] Manual testing completed on Chrome, Firefox, Safari
- [ ] No console errors or warnings
- [ ] Code reviewed and approved

---

## Technical Notes

### Tech Stack
- **Backend:** Hono with OpenAPI, Zod validation, Drizzle ORM
- **Frontend:** Next.js 15, React 19, TypeScript
- **Auth:** Better Auth with session-based authentication
- **Styling:** Tailwind CSS with CSS Modules
- **Testing:** Vitest for unit tests

### Design Principles
- **Inline Editing:** Use inline edit pattern (click to edit) rather than modal for quick edits
- **Optimistic Updates:** Consider showing updated name immediately while API call is in flight
- **Progressive Enhancement:** Form should work without JavaScript (basic submit)
- **Accessibility:** Proper focus management, ARIA labels, keyboard navigation

### Key File Paths
```
apps/api/
  src/routes/users.ts           # New route file
  src/schemas/users.ts          # New schema file
  src/__tests__/routes/users.test.ts  # New test file

apps/web/
  lib/api/users.ts              # New API utility
  lib/hooks/useUpdateProfile.ts # New hook
  lib/hooks/__tests__/useUpdateProfile.test.ts
  app/[locale]/[teamSlug]/settings/profile/
    components/DisplayNameEditor.tsx  # New component
    components/__tests__/DisplayNameEditor.test.tsx
```

### API Contract
```
PATCH /api/users/me
Content-Type: application/json
Cookie: session=...

Request:
{
  "name": "John Doe"  // 1-50 chars, trimmed
}

Response 200:
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "emailVerified": true,
  "image": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-12-28T12:00:00.000Z"
}

Response 400:
{
  "error": "Name must be 50 characters or less",
  "code": "VALIDATION_ERROR"
}

Response 401:
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

---

## Next Steps

### Phase 2: Avatar Upload
- Add ability to upload/change profile avatar
- Image cropping and resizing
- Storage integration (S3/Cloudflare R2)

### Phase 3: Email Change
- Allow users to change email address
- Email verification flow for new address
- Security notifications for email changes

### Phase 4: Account Deletion
- Self-service account deletion
- Data export before deletion
- Confirmation flow with cooldown period
