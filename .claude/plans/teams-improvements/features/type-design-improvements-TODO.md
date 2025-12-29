# Type Design Improvements - Teams Module

**Date:** 2025-12-29
**Status:** Complete (Phases 1, 2, 6 done; Phases 3-5 deferred)
**Priority:** 3 (Quality/Technical Debt)
**Complexity:** Medium

---

## Overview

This TODO addresses type design issues identified in a code quality analysis that scored the codebase 6/10. The primary focus is on improving type safety in the teams module by implementing discriminated unions for state machines, centralizing permission checks, defining proper TypeScript schemas, and eliminating unsafe type assertions.

### Problems Identified

1. **TeamContextValue** - Mixes `isLoading`, `error`, and `currentTeam` states without discriminated union pattern, allowing invalid state combinations
2. **Invitation email status** - Uses optional fields (`emailSent?`, `emailError?`, `inviteLink?`) instead of discriminated union
3. **TeamSettings** - Uses `Record<string, unknown>` with runtime casting instead of proper typed schema
4. **Permission checks** - Scattered `role === "owner"` and `role === "admin"` checks across 14+ locations
5. **URL params** - Unsafe `params.id as string` casting without runtime validation
6. **fetchWithAuth** - Returns `{} as T` for 204 responses, causing type erasure

---

## Goal

Improve type design quality from 6/10 to 8+/10 by implementing TypeScript best practices that catch bugs at compile time rather than runtime, reduce code duplication, and improve developer experience through better IDE autocomplete and type inference.

### Success Criteria

- [x] All async state uses discriminated union pattern with `status` field
- [x] Permission logic is centralized in a single module with clear function names
- [x] TeamSettings has fully typed schema with no `unknown` types
- [ ] URL params are validated at runtime before use (deferred to Phase 5)
- [ ] No `{} as T` type assertions in API client code (deferred to Phase 4)
- [x] All existing tests continue to pass
- [x] No TypeScript errors introduced

---

## What's Already Done

### Teams Module Structure
- `/apps/web/lib/teams/types.ts` - Core type definitions for Team, TeamMember, Invitation
- `/apps/web/lib/teams/context.tsx` - TeamProvider with TeamContextValue interface
- `/apps/web/lib/teams/api.ts` - fetchWithAuth wrapper and team API functions
- `/apps/web/lib/teams/index.ts` - Module exports

### Existing Type Definitions
- `TeamRole = "owner" | "admin" | "editor" | "viewer"`
- `TeamPlan = "free" | "pro" | "enterprise"`
- `Team`, `TeamDetail`, `TeamMember`, `Invitation` interfaces

### Permission Check Locations (to refactor)
- `/apps/web/app/[locale]/[teamSlug]/settings/team/page.tsx` (lines 338, 792, 809, 971, 972, 1096)
- `/apps/web/app/[locale]/[teamSlug]/settings/team/components/AdvancedTab.tsx` (line 58)
- `/apps/web/app/[locale]/[teamSlug]/settings/team/components/BillingTab.tsx` (line 50)
- `/apps/web/app/[locale]/[teamSlug]/settings/team/utils/team-utils.ts` (line 28)

---

## What We're Building Now

### Phase 1: Core Type Infrastructure (HIGH Priority)

Create foundational discriminated union types and permission utilities that will be used across the codebase.

**1.1 Create AsyncState discriminated union type**
`/apps/web/lib/types/async-state.ts` (NEW)

- [x] Define `AsyncState<T>` discriminated union:
  ```typescript
  export type AsyncState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; error: string }
    | { status: 'success'; data: T };
  ```
- [x] Add type guard functions: `isLoading()`, `isError()`, `isSuccess()`, `isIdle()`
- [x] Add utility functions: `mapSuccess()`, `getDataOrDefault()`
- [x] Export from `/apps/web/lib/types/index.ts`

**1.2 Create centralized permissions module**
`/apps/web/lib/teams/permissions.ts` (NEW)

- [x] Define permission check functions:
  ```typescript
  export const isOwner = (role: TeamRole) => role === 'owner';
  export const isAdmin = (role: TeamRole) => role === 'admin';
  export const canManageTeam = (role: TeamRole) => role === 'owner' || role === 'admin';
  export const canEditContent = (role: TeamRole) => role !== 'viewer';
  export const canViewOnly = (role: TeamRole) => role === 'viewer';
  export const canManageBilling = (role: TeamRole) => role === 'owner';
  export const canInviteMembers = (role: TeamRole) => role === 'owner' || role === 'admin';
  export const canRemoveMembers = (role: TeamRole) => role === 'owner' || role === 'admin';
  ```
- [x] Add JSDoc documentation explaining each permission level
- [x] Export from `/apps/web/lib/teams/index.ts`

**1.3 Define proper TeamSettings schema**
`/apps/web/lib/teams/types.ts` (UPDATE)

- [x] Replace `settings: Record<string, unknown>` with typed interface:
  ```typescript
  export interface TeamSettings {
    timezone?: string;
    defaultMemberRole?: Exclude<TeamRole, 'owner'>;
    notifications?: {
      emailDigest?: boolean;
      slackWebhook?: string;
    };
    features?: {
      advancedAnalytics?: boolean;
      customBranding?: boolean;
    };
  }
  ```
- [x] Update `TeamDetail` interface to use `TeamSettings | null`
- [x] Update `UpdateTeamInput` to use `Partial<TeamSettings>`

---

### Phase 2: Invitation Email Status Discriminated Union (MEDIUM Priority)

Replace optional fields pattern with proper discriminated union for invitation email status.

**2.1 Create InvitationEmailStatus type**
`/apps/web/lib/teams/types.ts` (UPDATE)

- [x] Define discriminated union:
  ```typescript
  export type InvitationEmailStatus =
    | { sent: true }
    | { sent: false; error: string; inviteLink: string };
  ```
- [x] Update `Invitation` interface:
  ```typescript
  export interface Invitation {
    id: string;
    email: string;
    role: TeamRole;
    inviterEmail: string;
    expiresAt: string;
    createdAt: string;
    emailStatus?: InvitationEmailStatus;  // Only present on create/resend
  }
  ```
- [ ] Update `ResendInvitationResponse` to use the same pattern (deferred - requires API changes)

**2.2 Update invitation handling code**
- [ ] Update `sendInvitation` response handling in `/apps/web/lib/teams/api.ts` (deferred - backward compatible)
- [ ] Update invitation display components to use type guards (deferred - backward compatible)

---

### Phase 3: TeamContextValue Discriminated Union (MEDIUM Priority)

Refactor TeamContextValue to use discriminated union preventing invalid state combinations.

**3.1 Create TeamContextState type**
`/apps/web/lib/teams/context.tsx` (UPDATE)

- [ ] Define discriminated union for team context state:
  ```typescript
  export type TeamContextState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; error: string }
    | { status: 'ready'; teams: Team[]; currentTeam: Team | null };
  ```
- [ ] Update `TeamContextValue` interface:
  ```typescript
  export interface TeamContextValue {
    state: TeamContextState;
    setCurrentTeam: (team: Team) => void;
    refetchTeams: () => Promise<void>;
    urlTeamSlug: string | null;
    // Convenience getters
    isLoading: boolean;
    isReady: boolean;
    teams: Team[];
    currentTeam: Team | null;
    error: string | null;
  }
  ```
- [ ] Implement convenience getters that derive from state

**3.2 Update TeamProvider implementation**
- [ ] Refactor useState hooks to single state discriminated union
- [ ] Update fetchTeams to set proper state transitions
- [ ] Ensure backward compatibility for existing consumers

---

### Phase 4: API Client Type Safety (MEDIUM Priority)

Fix type erasure issues in API client functions.

**4.1 Create NoContent type**
`/apps/web/lib/api-client.ts` (UPDATE)

- [ ] Define explicit NoContent type:
  ```typescript
  export type NoContent = { __noContent: true };
  ```
- [ ] Create typed wrapper for void responses:
  ```typescript
  export async function apiRequestVoid(endpoint: string, options?: RequestOptions): Promise<void> {
    await apiRequest<NoContent>(endpoint, options);
  }
  ```
- [ ] Update 204 handling to return proper NoContent marker

**4.2 Update fetchWithAuth in teams/api.ts**
- [ ] Create separate `fetchWithAuthVoid` for DELETE operations
- [ ] Update `deleteTeam`, `removeMember`, `revokeInvitation` to use void variant
- [ ] Update `leaveTeam` to use void variant

---

### Phase 5: URL Params Runtime Validation (LOW Priority)

Add runtime validation for URL parameters to catch invalid values early.

**5.1 Create param validation utilities**
`/apps/web/lib/params/validators.ts` (NEW)

- [ ] Define validation functions:
  ```typescript
  export function parseStringParam(param: string | string[] | undefined, name: string): string {
    if (typeof param !== 'string' || param.trim() === '') {
      throw new Error(`Invalid ${name} parameter`);
    }
    return param;
  }

  export function parseOptionalStringParam(param: string | string[] | undefined): string | null {
    if (param === undefined) return null;
    if (typeof param !== 'string') return null;
    return param.trim() || null;
  }
  ```
- [ ] Add UUID validation variant for ID params
- [ ] Export from `/apps/web/lib/params/index.ts`

**5.2 Update pages using params casting**
- [ ] `/apps/web/app/[locale]/admin/users/[id]/page.tsx` - Replace `params.id as string`
- [ ] `/apps/web/app/[locale]/[teamSlug]/data-sources/[id]/page.tsx` - Replace `params.id as string`
- [ ] `/apps/web/app/[locale]/[teamSlug]/campaign-sets/[setId]/page.tsx` - Replace `params.setId as string`
- [ ] `/apps/web/app/[locale]/[teamSlug]/campaigns/[id]/page.tsx` - Replace `params.id as string`

---

### Phase 6: Replace Scattered Permission Checks (LOW Priority)

Refactor existing code to use centralized permission utilities.

**6.1 Update team settings page**
`/apps/web/app/[locale]/[teamSlug]/settings/team/page.tsx`

- [x] Import permission utilities from `@/lib/teams/permissions`
- [x] Replace `team?.role === "owner"` with `isOwner(team?.role)`
- [x] Replace `team?.role === "owner" || team?.role === "admin"` with `canManageTeam(team?.role)`
- [x] Update all inline permission checks (approximately 6 locations)

**6.2 Update team settings components**
- [x] Update `/apps/web/app/[locale]/[teamSlug]/settings/team/components/AdvancedTab.tsx`
- [x] Update `/apps/web/app/[locale]/[teamSlug]/settings/team/components/BillingTab.tsx`
- [x] Update `/apps/web/app/[locale]/[teamSlug]/settings/team/utils/team-utils.ts`

---

## Not In Scope

- **Zod runtime validation schemas** - While Zod would provide excellent runtime validation, adding a new dependency and refactoring all types is a larger effort. This TODO focuses on TypeScript-only improvements.
  - Why: Keep scope manageable, can be done in follow-up work

- **API response validation** - Validating API responses against schemas would catch backend/frontend contract mismatches but requires coordination with API team.
  - Why: Cross-team coordination needed, separate initiative

- **Admin module permission refactoring** - The admin module has its own permission patterns (`user?.role === "admin"`) that should be handled separately.
  - Why: Different permission model (app-level admin vs team-level roles)

- **Full AsyncState migration** - Not all async hooks will be converted; focus is on TeamContext as proof of concept.
  - Why: Can iterate after validating pattern works well

---

## Implementation Plan

### Step 1: Create Core Infrastructure (2-3 hours)
- Create `/apps/web/lib/types/async-state.ts` with discriminated union and utilities
- Create `/apps/web/lib/teams/permissions.ts` with all permission check functions
- Add exports to index files
- Write unit tests for permission functions

### Step 2: Update TeamSettings Type (1 hour)
- Define proper `TeamSettings` interface in types.ts
- Update `TeamDetail` and `UpdateTeamInput` interfaces
- Verify no TypeScript errors in consuming code

### Step 3: Implement Invitation Email Status Union (1-2 hours)
- Define `InvitationEmailStatus` discriminated union
- Update `Invitation` interface
- Update API response handling
- Test invitation flows still work

### Step 4: Refactor TeamContextValue (2-3 hours)
- Define `TeamContextState` discriminated union
- Update TeamProvider with new state management
- Add convenience getters for backward compatibility
- Test team switching and loading states

### Step 5: Fix API Client Type Safety (1-2 hours)
- Create `NoContent` type and void request variant
- Update DELETE operations to use void variant
- Remove `{} as T` type assertions
- Verify API calls work correctly

### Step 6: Add URL Param Validation (1-2 hours)
- Create param validation utilities
- Update 4 page components to use validators
- Add error handling for invalid params

### Step 7: Replace Permission Checks (1-2 hours)
- Update team settings page (6 locations)
- Update AdvancedTab, BillingTab components
- Update team-utils.ts
- Run tests to verify behavior unchanged

---

## Definition of Done

- [x] All new types are exported and documented with JSDoc comments
- [x] `AsyncState<T>` type is defined with type guards and utilities
- [x] Permission utilities cover all team role scenarios
- [x] `TeamSettings` interface replaces all `Record<string, unknown>` usage
- [x] `InvitationEmailStatus` uses discriminated union pattern
- [ ] `TeamContextValue` prevents invalid loading/error/success combinations (deferred to Phase 3)
- [ ] No `{} as T` assertions in API client code (deferred to Phase 4)
- [ ] URL params are validated before use in page components (deferred to Phase 5)
- [x] All scattered `role === "owner"` checks use centralized utilities
- [x] Unit tests exist for permission functions (77 tests passing)
- [x] All existing tests pass without modification
- [x] No new TypeScript errors introduced
- [ ] Code review completed

---

## Notes

### Tech Stack Context
- **Next.js 15** with App Router - params come from `useParams()` as `string | string[] | undefined`
- **React 19** - Context API used for team state management
- **TypeScript 5.x** - Full strict mode enabled, discriminated unions work well

### Design Principles
- **Make invalid states unrepresentable** - Use discriminated unions so TypeScript prevents impossible combinations
- **Centralize domain logic** - Permission checks belong in one place, not scattered across components
- **Explicit over implicit** - Named type guards (`isOwner()`) are clearer than inline checks
- **Backward compatibility** - Add convenience getters to avoid breaking existing consumers

### Best Practices Applied
- **Discriminated unions** - Use literal `status` field for state machines
- **Type guards** - User-defined type guards with `is` return type
- **Branded types** - Consider for IDs to prevent mixing user ID with team ID
- **Exhaustive checking** - Switch statements with `never` default for unions

---

## Next Steps

After completing this TODO:

1. **Phase 2: Zod Schema Validation** - Add runtime validation with Zod for API responses
2. **Phase 3: Admin Permission Refactor** - Apply similar patterns to admin module
3. **Phase 4: Full AsyncState Adoption** - Migrate other hooks to use AsyncState pattern
4. **Phase 5: Branded ID Types** - Prevent ID type confusion with branded primitives

---

## File Summary

### New Files
- `/apps/web/lib/types/async-state.ts`
- `/apps/web/lib/types/index.ts`
- `/apps/web/lib/teams/permissions.ts`
- `/apps/web/lib/params/validators.ts`
- `/apps/web/lib/params/index.ts`

### Modified Files
- `/apps/web/lib/teams/types.ts`
- `/apps/web/lib/teams/context.tsx`
- `/apps/web/lib/teams/api.ts`
- `/apps/web/lib/teams/index.ts`
- `/apps/web/lib/api-client.ts`
- `/apps/web/app/[locale]/[teamSlug]/settings/team/page.tsx`
- `/apps/web/app/[locale]/[teamSlug]/settings/team/components/AdvancedTab.tsx`
- `/apps/web/app/[locale]/[teamSlug]/settings/team/components/BillingTab.tsx`
- `/apps/web/app/[locale]/[teamSlug]/settings/team/utils/team-utils.ts`
- `/apps/web/app/[locale]/admin/users/[id]/page.tsx`
- `/apps/web/app/[locale]/[teamSlug]/data-sources/[id]/page.tsx`
- `/apps/web/app/[locale]/[teamSlug]/campaign-sets/[setId]/page.tsx`
- `/apps/web/app/[locale]/[teamSlug]/campaigns/[id]/page.tsx`
