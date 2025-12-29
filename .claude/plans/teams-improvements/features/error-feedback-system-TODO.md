# Error Feedback System - Teams Feature

**Date:** 2025-12-29
**Status:** Complete
**Priority:** HIGH - Critical UX improvement

---

## Overview

The PR test suite identified **13 silent failures** in the teams feature where mutations (API calls) catch errors but only log to console without providing user feedback. This creates a poor user experience where operations appear to succeed when they actually fail.

**Problem Statement:**
Users performing team management operations (creating teams, updating roles, sending invitations, etc.) receive no visual feedback when these operations fail. Errors are silently caught and logged to console, leaving users confused about the state of their actions.

**Solution:**
Implement a toast notification system using `sonner` (lightweight, accessible, React 19 compatible) to display error messages for all mutation operations. Add proper try-catch blocks where missing, and ensure optimistic updates are rolled back on failure.

---

## Goal

Enable users to receive immediate, clear feedback when team management operations fail, improving UX and reducing confusion about operation status.

### Success Criteria

- [x] All 13 identified silent failures display user-facing error notifications
- [x] Error messages are clear, actionable, and non-technical
- [x] Toast notifications are accessible (ARIA announcements, keyboard dismissible)
- [x] Optimistic updates roll back correctly on API failure
- [x] Success notifications shown for critical operations (team creation, invitation sent)
- [x] No console-only error logging remains for user-facing mutations

---

## What's Already Done

### Infrastructure
- Next.js 15 + React 19 app structure
- Team management API client in `@/lib/teams`
- Team settings page with tabbed interface (General, Members, Invitations, Permissions, Billing, Advanced)
- TeamSwitcher component for team selection

### Error Handling Patterns (Partial)
- `TimezoneSelector.tsx` has proper error state display (line 109, 169-170, 293-297)
- `GeneralTab` shows saveError state (line 201, 292-295)
- Email feedback component for invitation status (`EmailStatusFeedback`)

### Missing
- No global toast/notification library installed
- No toast provider in app layout
- Inconsistent error handling across components

---

## What We're Building Now

### Phase 1: Toast Infrastructure Setup
**Priority: HIGH** - Foundation for all error feedback

- [x] Install `sonner` toast library (`pnpm add sonner@latest`)
- [x] Create toast provider wrapper component at `apps/web/components/providers/ToastProvider.tsx`
- [x] Add Toaster to root layout at `apps/web/app/[locale]/layout.tsx`
- [x] Configure toast defaults (position: bottom-right, duration: 5000ms for errors)
- [x] Add dark mode support for toast styling
- [x] Create reusable toast utility at `apps/web/lib/toast.ts` with typed error/success functions

**Deliverables:**
```typescript
// apps/web/lib/toast.ts
export const showError = (message: string, description?: string) => {...}
export const showSuccess = (message: string, description?: string) => {...}
export const showLoading = (message: string) => {...}
```

### Phase 2: TeamSwitcher Error Handling
**Priority: HIGH** - Core navigation component

**File:** `apps/web/components/layout/TeamSwitcher.tsx`

**Silent Failure #1** (lines 168-174): Empty catch swallowing useTeam errors
- [x] Remove empty catch block around `useTeam()` hook call
- [x] Add proper error boundary or error state handling
- [x] Display inline error message when team context fails to load

**Silent Failure #2** (lines 176-178): Silent fallback to empty values
- [x] Add console warning for debugging but also show UI indicator
- [x] Show "Unable to load teams" message instead of silent empty array

**Silent Failure #3** (lines 295-313): Create team error re-thrown to nowhere
- [x] Wrap `handleCreateTeam` in try-catch with toast notification
- [x] Show error: "Failed to create team. Please try again."
- [x] Keep dialog open on error so user can retry
- [x] Add success toast: "Team created successfully"

**Example Implementation:**
```typescript
const handleCreateTeam = async (name: string) => {
  try {
    const newTeam = await createTeam({ name });
    toast.success("Team created successfully");
    // ... rest of success handling
  } catch (err) {
    toast.error("Failed to create team", {
      description: err instanceof Error ? err.message : "Please try again"
    });
    throw err; // Re-throw to keep dialog open
  }
};
```

### Phase 3: Team Settings Page Error Handling
**Priority: HIGH** - Most critical user operations

**File:** `apps/web/app/[locale]/[teamSlug]/settings/team/page.tsx`

**Silent Failure #4** (lines 843-851): Member role update failure
- [x] Add toast.error for `handleUpdateMemberRole` catch block
- [x] Rollback optimistic UI update on failure
- [x] Message: "Failed to update member role"

**Silent Failure #5** (lines 854-861): Member removal failure
- [x] Add toast.error for `handleRemoveMember` catch block
- [x] Keep member in list if removal fails
- [x] Message: "Failed to remove member"

**Silent Failure #6** (lines 865-893): Invitation send failure
- [x] Add toast.error for `handleSendInvitation` catch block
- [x] Clear form but show error notification
- [x] Message: "Failed to send invitation"
- [x] Add success toast when invitation sends successfully

**Silent Failure #7** (lines 901-908): Invitation revoke failure
- [x] Add toast.error for `handleRevokeInvitation` catch block
- [x] Keep invitation in list on failure
- [x] Message: "Failed to revoke invitation"

**Silent Failure #8** (lines 916-932): leaveTeam call has no try-catch
- [x] Wrap `handleLeaveTeamConfirm` in try-catch
- [x] Add toast.error on failure: "Failed to leave team"
- [x] Prevent navigation on failure

**Silent Failure #9** (lines 1057-1063): Avatar upload is fake TODO
- [x] Either implement real upload with error handling, OR
- [x] Show toast.info: "Avatar upload coming soon" as temporary solution
- [x] Remove console.log placeholder

**Silent Failure #10** (lines 1103-1106): Billing email update no error handling
- [x] Wrap onUpdateBillingEmail callback in try-catch
- [x] Add toast.error: "Failed to update billing email"
- [x] Add toast.success on successful update

**Silent Failure #11** (lines 1113-1120): Advanced settings update no error handling
- [x] Wrap onUpdateSettings callback in try-catch
- [x] Add toast.error: "Failed to save settings"
- [x] Add toast.success: "Settings saved"

### Phase 4: AdvancedTab Error Handling
**Priority: MEDIUM** - Settings mutations

**File:** `apps/web/app/[locale]/[teamSlug]/settings/team/components/AdvancedTab.tsx`

**Silent Failure #12** (lines 69-93): All setting handlers lack try-catch
- [x] Add try-catch to `handleRoleChange` with toast.error
- [x] Add try-catch to `handleTimezoneChange` with toast.error
- [x] Add try-catch to `handleEmailDigestChange` with toast.error
- [x] Add try-catch to `handleSlackWebhookChange` with toast.error
- [x] Show success toast for each successful save
- [x] Add loading state during save operations

**Example:**
```typescript
const handleRoleChange = async (role: "viewer" | "editor" | "admin") => {
  try {
    await onUpdateSettings({ defaultMemberRole: role });
    toast.success("Default role updated");
  } catch (err) {
    toast.error("Failed to update default role");
  }
};
```

### Phase 5: TimezoneSelector Enhancement
**Priority: LOW** - Already has partial error handling

**File:** `apps/web/app/[locale]/[teamSlug]/settings/team/components/TimezoneSelector.tsx`

**Silent Failure #13** (lines 14-35): Silent fallback for timezone list
- [x] Add toast.warning when browser doesn't support Intl.supportedValuesOf
- [x] Log warning for debugging but inform user of limited timezone options
- [x] Message: "Limited timezone options available in your browser"

**Additional Improvements:**
- [x] Replace inline error display (line 293-297) with toast for consistency
- [x] Add success toast when timezone saves successfully

---

## Not In Scope

### Full Error Boundary Implementation
- **Why:** Toast notifications cover mutation errors; error boundaries are a larger architectural change for render errors

### Retry Logic / Automatic Retry
- **Why:** Keep initial implementation simple; can add retry buttons to toasts in future iteration

### Error Logging Service Integration (Sentry, etc.)
- **Why:** Separate concern; this feature focuses on user-facing feedback only

### Offline Detection / Network Error Handling
- **Why:** Requires service worker setup; out of scope for this feature

### Internationalization of Error Messages
- **Why:** Project uses next-intl but error messages can be added to translation files in a follow-up PR

---

## Implementation Plan

### Step 1: Install and Configure Toast Library (30 min)
1. Install sonner: `pnpm add sonner@latest`
2. Create ToastProvider component
3. Add Toaster to root layout
4. Test basic toast rendering

### Step 2: Create Toast Utilities (30 min)
1. Create `apps/web/lib/toast.ts` with helper functions
2. Define standard error message patterns
3. Configure default durations and styles

### Step 3: Fix TeamSwitcher Errors (1 hour)
1. Address silent failures #1-3
2. Add proper error states
3. Test team creation flow end-to-end

### Step 4: Fix Team Settings Page Errors (2 hours)
1. Address silent failures #4-11
2. Add rollback logic for optimistic updates
3. Test each operation (role update, member removal, invitations, leave team)

### Step 5: Fix AdvancedTab Errors (45 min)
1. Address silent failure #12
2. Add try-catch to all handlers
3. Test each setting toggle

### Step 6: Fix TimezoneSelector Enhancement (30 min)
1. Address silent failure #13
2. Add success feedback
3. Test timezone selection

### Step 7: Testing and QA (1 hour)
1. Test all error scenarios manually
2. Verify accessibility (keyboard, screen reader)
3. Test dark mode styling
4. Verify no console-only errors remain

**Total Estimated Time:** 6-7 hours

---

## Success Criteria

- [x] Toast notifications appear for all 13 identified silent failures
- [x] Error messages use consistent, user-friendly language
- [x] Success notifications shown for team creation and invitation sending
- [x] Toasts are dismissible via click or keyboard (Escape)
- [x] Dark mode styling matches app theme
- [x] No regressions in existing functionality
- [x] Console.error calls retained for debugging alongside user toasts

---

## Definition of Done

- [x] `sonner` package installed and configured in root layout
- [x] All 13 silent failures converted to user-facing toast notifications
- [x] Toast utility functions created with TypeScript types
- [x] Error messages are clear and non-technical
- [x] Success toasts added for create team and send invitation
- [x] Optimistic updates roll back on API failure for member operations
- [x] Manual testing completed for all team settings operations
- [x] No TypeScript errors introduced
- [x] All existing tests pass
- [x] Code reviewed and follows project conventions

---

## Notes

### Tech Stack Decisions
- **sonner over react-hot-toast:** Smaller bundle, better React 19 support, built-in accessibility
- **Toast over inline errors:** Consistent UX pattern, non-blocking feedback, works across all mutations

### Design Principles
- **Fail gracefully:** Never leave user wondering if operation succeeded
- **Be specific:** Error messages should hint at what went wrong
- **Don't overwhelm:** Success toasts only for significant operations
- **Stay accessible:** All toasts announced to screen readers

### Implementation Notes
- Import toast functions from `@/lib/toast` for consistency
- Keep error messages under 60 characters when possible
- Use `toast.promise()` for operations with loading states
- Always include catch block even when re-throwing

---

## Next Steps

### Phase 2: Enhanced Error Handling
- Add retry buttons to error toasts
- Implement optimistic update patterns across all mutations
- Add offline detection with queue for failed operations

### Phase 3: Error Logging
- Integrate with error monitoring service
- Add correlation IDs for debugging
- Create error dashboard for common failures

### Phase 4: User Feedback
- Add feedback collection on errors
- Track error frequency metrics
- A/B test error message clarity
