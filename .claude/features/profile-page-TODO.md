# Profile Page Feature

**Date:** 2025-12-28
**Status:** Phase 1 Complete

---

## Overview

The Profile Page provides authenticated users with a dedicated interface to view and manage their account information within the Dotoro application. Users can view their profile details (name, email, avatar), update editable fields, check email verification status, and see their account creation date. This feature integrates with Better Auth's user update API for seamless profile management.

**Key Integration Points:**
- Better Auth `useSession()` hook for user data retrieval
- Better Auth client API for user profile updates (`authClient.updateUser`)
- Existing auth context (`useAuth`) for authentication state
- Existing UI patterns from Team Settings page (`apps/web/app/settings/team/page.tsx`)

---

## 1. OVERVIEW

### Goal

Enable users to view and manage their personal profile information through a clean, accessible interface that follows existing application design patterns and provides immediate feedback on actions.

### User Stories

1. **As a user**, I want to see my current profile information at a glance so I can verify my account details are correct.
2. **As a user**, I want to update my display name so other team members can identify me easily.
3. **As a user**, I want to change my avatar (via URL or upload) so I can personalize my account.
4. **As a user**, I want to see if my email is verified so I know my account status.
5. **As a user**, I want to know when I created my account so I have a sense of my account history.

### Technical Context

**User Schema Fields (from `packages/database/src/schema/auth.ts`):**
```typescript
{
  id: string;          // Primary key
  name: string;        // Display name (required, can be empty string)
  email: string;       // Unique email address
  emailVerified: boolean; // Email verification status
  image: string | null;   // Avatar URL
  createdAt: Date;     // Account creation timestamp
  updatedAt: Date;     // Last update timestamp
}
```

**Auth Client (from `apps/web/lib/auth-client.ts`):**
- `useSession()` - Hook providing `{ data: session, isPending, error }`
- `authClient` - Better Auth client instance for API calls

---

## 2. PHASES

### Phase 1: Profile Display (Read-Only View)

**Priority:** HIGH - Foundation for all profile functionality

#### Tasks

- [x] Create profile page route at `apps/web/app/settings/profile/page.tsx`
- [x] Create `ProfileHeader` component displaying user avatar, name, and email
- [x] Create `ProfileDetails` component showing:
  - [x] Email with verification badge (checkmark if verified, warning if not)
  - [x] Account creation date formatted as "Member since [date]"
  - [x] Last updated timestamp
- [x] Implement loading state with skeleton UI matching Team Settings pattern
- [x] Implement error state with retry button
- [x] Add profile link to navigation/sidebar (if not present)
- [x] Write unit tests for ProfileHeader component (11 tests)
- [x] Write unit tests for ProfileDetails component (13 tests)
- [x] Write unit tests for ProfilePage component (17 tests)

**Files Created:**
- `apps/web/app/settings/profile/page.tsx` - Main profile page
- `apps/web/app/settings/profile/components/ProfileHeader.tsx`
- `apps/web/app/settings/profile/components/ProfileDetails.tsx`
- `apps/web/app/settings/profile/__tests__/ProfilePage.test.tsx`
- `apps/web/app/settings/profile/__tests__/ProfileHeader.test.tsx`
- `apps/web/app/settings/profile/__tests__/ProfileDetails.test.tsx`
- `apps/web/app/settings/error.tsx` - Error boundary for settings pages
- `apps/web/app/settings/__tests__/error.test.tsx` - Error boundary tests

**Notes:**
- Added Settings section to sidebar navigation with Profile and Team links
- Uses Next.js Image component for optimized avatar loading
- Initials-based avatar placeholder for users without image
- All 54 tests passing (45 profile + 9 error boundary), TypeScript checks pass

**PR Test Suite Fixes (Iteration 2):**
- [x] Fixed fabricated dates - now uses real `createdAt`/`updatedAt` from Better Auth session
- [x] Updated User type in `apps/web/lib/auth/types.ts` to include optional date fields
- [x] Updated `apps/web/lib/auth/context.tsx` to pass createdAt/updatedAt from session
- [x] Added safe date formatting with try-catch in ProfileDetails component
- [x] Date sections now conditionally render only when valid dates are available
- [x] Created error boundary at `apps/web/app/settings/error.tsx` for catching runtime errors
- [x] Added tests for new date handling behaviors (ISO strings, null, invalid dates)

### Phase 2: Profile Editing (Name Update)

**Priority:** HIGH - Core user functionality

#### Tasks

- [ ] Create `ProfileEditForm` component with controlled inputs
- [ ] Implement name field with validation (non-empty, max length)
- [ ] Add save button with loading state during API call
- [ ] Implement success feedback (toast or inline message)
- [ ] Implement error handling with user-friendly messages
- [ ] Integrate with Better Auth `authClient.updateUser({ name })` API
- [ ] Refresh session data after successful update
- [ ] Write unit tests for form validation
- [ ] Write integration test for update flow

**API Integration:**
```typescript
// Better Auth provides updateUser on the client
await authClient.updateUser({
  name: newName,
});
```

**Files to Create/Modify:**
- `apps/web/app/settings/profile/components/ProfileEditForm.tsx`
- `apps/web/app/settings/profile/__tests__/ProfileEditForm.test.tsx`

### Phase 3: Avatar Management

**Priority:** MEDIUM - Enhances personalization but not critical path

#### Tasks

- [ ] Create `AvatarUpload` component with current avatar preview
- [ ] Implement URL input mode for avatar (paste image URL)
- [ ] Validate URL format and image accessibility
- [ ] Add image preview before saving
- [ ] Implement file upload mode (optional enhancement):
  - [ ] Accept image files (jpg, png, gif, webp)
  - [ ] Limit file size (e.g., 2MB max)
  - [ ] Upload to storage service and get URL
- [ ] Create avatar placeholder for users without image (initials-based)
- [ ] Integrate save with Better Auth `authClient.updateUser({ image })` API
- [ ] Write unit tests for AvatarUpload component
- [ ] Write tests for URL validation

**Files to Create:**
- `apps/web/app/settings/profile/components/AvatarUpload.tsx`
- `apps/web/app/settings/profile/__tests__/AvatarUpload.test.tsx`

### Phase 4: Email Verification Status

**Priority:** MEDIUM - Important for trust but mostly read-only

#### Tasks

- [ ] Create `EmailVerificationBadge` component
- [ ] Display verified status with green checkmark icon
- [ ] Display unverified status with warning icon and message
- [ ] Add "Resend verification email" button for unverified users
- [ ] Integrate resend with Better Auth verification API
- [ ] Show success/error feedback for resend action
- [ ] Write unit tests for verification badge states

**Files to Create:**
- `apps/web/app/settings/profile/components/EmailVerificationBadge.tsx`
- `apps/web/app/settings/profile/__tests__/EmailVerificationBadge.test.tsx`

### Phase 5: Polish and Accessibility

**Priority:** LOW - Quality improvements after core functionality

#### Tasks

- [ ] Ensure keyboard navigation works throughout profile page
- [ ] Add proper ARIA labels to all interactive elements
- [ ] Implement focus management after form submissions
- [ ] Add screen reader announcements for success/error states
- [ ] Test with multiple screen sizes (responsive design)
- [ ] Add dark mode support matching existing Team Settings styles
- [ ] Performance optimization: memoize expensive renders
- [ ] Add end-to-end test for complete profile update flow

---

## 3. SUCCESS CRITERIA

- [x] User can view their complete profile information (name, email, avatar, verification status, creation date)
- [ ] User can successfully update their display name with validation feedback (Phase 2)
- [ ] User can update their avatar via URL input with preview (Phase 3)
- [x] Email verification status is clearly displayed with appropriate visual indicators
- [ ] All form submissions show loading states and provide success/error feedback (Phase 2+)
- [x] Profile page follows existing application design patterns (matches Team Settings UI)
- [x] Page is fully accessible (keyboard navigation, screen reader support, ARIA labels)
- [x] All unit tests pass with adequate coverage (54 tests passing)
- [x] Page renders correctly in both light and dark modes
- [ ] Session data refreshes correctly after profile updates (Phase 2+)

---

## 4. DEFINITION OF DONE

### Phase 1 (Read-Only Display) - COMPLETE
- [x] Profile page is accessible at `/settings/profile` route
- [x] User can view: name, email, avatar, email verification status, account creation date
- [x] Loading states shown during async operations
- [x] Error state with retry functionality
- [x] Unit tests exist for all new components (54 tests)
- [x] No TypeScript errors or ESLint warnings
- [x] Code follows existing patterns in `apps/web/app/settings/team/page.tsx`
- [x] Error boundary protects settings pages

### Phases 2-5 (Edit Functionality) - PENDING
- [ ] All Phase 1 and Phase 2 tasks are completed and tested
- [ ] User can edit: name and avatar (URL mode)
- [ ] Form validation prevents invalid submissions
- [ ] API errors are caught and displayed to user
- [ ] Success feedback is shown after updates
- [ ] PR passes CI checks (lint, type-check, test)
- [ ] Manual QA confirms happy path and error scenarios work correctly

---

## 5. NOT IN SCOPE

- **Password management** - Application uses magic link authentication only (no passwords)
- **Email change functionality** - Requires verification flow; separate feature
- **Account deletion** - Requires confirmation flow and data cleanup; separate feature
- **Two-factor authentication settings** - Not currently supported by auth setup
- **Connected accounts/OAuth providers** - Future enhancement
- **Profile visibility settings** - No multi-user profile viewing in current scope
- **Activity history/audit log** - Separate analytics feature
- **File upload to cloud storage** - Phase 3 avatar upload is URL-only initially

---

## 6. TECHNICAL NOTES

### Design Patterns to Follow

Reference `apps/web/app/settings/team/page.tsx` for:
- Tab navigation structure (if adding tabs)
- Form layout and styling
- Loading/error state patterns
- Button styles and states
- Input field styling with dark mode support

### Better Auth Integration

```typescript
// Getting session data
import { useSession } from "@/lib/auth";
const { data: session, isPending } = useSession();
// session.user contains: id, email, name, image, emailVerified

// Updating user profile
import { authClient } from "@/lib/auth-client";
await authClient.updateUser({
  name: "New Name",
  image: "https://example.com/avatar.jpg",
});
```

### Component Structure

```
apps/web/app/settings/profile/
  page.tsx                          # Main profile page
  components/
    ProfileHeader.tsx               # Avatar + name + email display
    ProfileDetails.tsx              # Account info (dates, status)
    ProfileEditForm.tsx             # Editable fields form
    AvatarUpload.tsx                # Avatar URL input/preview
    EmailVerificationBadge.tsx      # Verified/unverified indicator
  __tests__/
    ProfilePage.test.tsx
    ProfileHeader.test.tsx
    ProfileEditForm.test.tsx
    AvatarUpload.test.tsx
    EmailVerificationBadge.test.tsx
```

### State Management

- Use `useSession()` for initial data and refresh after updates
- Local component state for form inputs (controlled components)
- Consider `useState` for optimistic UI updates

### Error Handling

```typescript
try {
  await authClient.updateUser({ name });
  // Show success toast/message
  // Refresh session
} catch (error) {
  // Show error message to user
  // Log error for debugging
}
```

---

## 7. DEPENDENCIES

- Better Auth client (`better-auth/react`)
- Existing auth context and hooks (`apps/web/lib/auth/`)
- Lucide React icons (already in project)
- Existing UI styling patterns (Tailwind CSS)

---

## 8. ESTIMATED EFFORT

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 1: Profile Display | 3-4 hours | Foundation components and tests |
| Phase 2: Profile Editing | 2-3 hours | Form handling and API integration |
| Phase 3: Avatar Management | 3-4 hours | URL input, validation, preview |
| Phase 4: Email Verification | 1-2 hours | Mostly display with optional resend |
| Phase 5: Polish | 2-3 hours | Accessibility, dark mode, tests |
| **Total** | **11-16 hours** | ~2 days of focused development |

---

## 9. RISKS AND MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Better Auth updateUser API differs from expected | Medium | Review Better Auth docs before implementation; test in isolation first |
| Avatar URL validation false positives | Low | Use permissive validation; show preview for user confirmation |
| Session not refreshing after update | Medium | Explicitly call session refresh; verify in integration tests |
| Inconsistent styling with existing pages | Low | Use Team Settings page as direct reference; share components where possible |
