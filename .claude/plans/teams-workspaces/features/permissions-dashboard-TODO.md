# Permissions Dashboard & Role Management

**Date:** 2025-12-28
**Status:** Complete
**Feature Area:** Team Settings > Roles & Permissions

---

## Overview

This feature adds a "Roles & Permissions" tab to the existing Team Settings page, providing users with clear visibility into the 4-tier RBAC system (owner, admin, editor, viewer). The dashboard will display a visual permission matrix, explain each role's capabilities, and highlight dangerous permissions. The implementation is designed to be future-proof for custom roles.

**Current State:**
- Backend RBAC exists in `apps/api/src/middleware/team-auth.ts`
- Team settings page exists at `apps/web/app/[locale]/settings/team/page.tsx` with tabs: General, Members, Invitations
- Role hierarchy: owner (level 4), admin (3), editor (2), viewer (1)
- `TeamRole` type defined in `apps/web/lib/teams/types.ts`

**Target State:**
- New "Roles & Permissions" tab in team settings
- Visual permission matrix showing roles vs actions per resource
- Current user's role prominently displayed
- Help tooltips on every permission
- Mobile-responsive design (cards on mobile, table on desktop)

---

## Goal

Build a comprehensive permissions dashboard that gives team members clear visibility into role capabilities, reduces confusion about access levels, and sets the foundation for future custom roles.

### Success Criteria

- [x] Users can view all permissions for all 4 roles in a single matrix view
- [x] Current user's role is displayed prominently with visual emphasis
- [x] Dangerous permissions (delete team, manage billing, remove members) are highlighted with warning indicators
- [x] Every permission cell has a help tooltip explaining the action
- [x] Dashboard is fully responsive (table on desktop, stacked cards on mobile)
- [x] Page loads in under 500ms (no additional API calls needed - uses static permission definitions)
- [x] Owners can see a complete audit of all permission checks available

---

## What's Already Done

### Backend RBAC System (Complete)
- [x] `TeamRole` type: `"owner" | "admin" | "editor" | "viewer"`
- [x] Role hierarchy levels: owner=4, admin=3, editor=2, viewer=1
- [x] `requireTeamAuth()` middleware - validates team membership
- [x] `requireTeamRole(minimumRole)` middleware - enforces minimum role
- [x] `hasTeamRole(c, minimumRole)` helper - boolean check
- [x] `canManageTeam(c)` helper - checks admin+ access
- [x] `isTeamOwner(c)` helper - checks owner access
- [x] File: `apps/api/src/middleware/team-auth.ts`

### Team Settings Page (Complete)
- [x] Page component at `apps/web/app/[locale]/settings/team/page.tsx`
- [x] Tab navigation system with General, Members, Invitations tabs
- [x] `RoleBadge` component for displaying role chips
- [x] `RoleSelector` dropdown for changing roles
- [x] Team context and role available via `team.role`
- [x] Responsive layout with max-width container

### Team Types (Complete)
- [x] `TeamRole` type in `apps/web/lib/teams/types.ts`
- [x] `TeamDetail` interface with role property
- [x] `TeamMember` interface with role property

---

## What We're Building Now

### Phase 1: Permission Data Model & Types (Priority: HIGH)

**Why HIGH:** Foundation required before any UI work can begin.

**Deliverables:**

- [x] Create permission types file at `apps/web/lib/permissions/types.ts`
  - Define `Permission` interface with id, name, description, dangerLevel
  - Define `ResourceType` enum: campaigns, campaign_sets, data_sources, templates, rules, transforms, team, billing
  - Define `ActionType` enum: read, create, edit, delete, manage
  - Define `PermissionMatrix` type mapping roles to resource-action booleans

- [x] Create permission definitions file at `apps/web/lib/permissions/definitions.ts`
  - Define all permissions with descriptions and danger levels
  - Map each role to their allowed permissions
  - Include tooltips text for each permission
  - Export `PERMISSION_MATRIX` constant
  - Export `ROLE_DESCRIPTIONS` with role explanations
  - Export `DANGER_PERMISSIONS` array of high-risk permission IDs

- [x] Create permissions index at `apps/web/lib/permissions/index.ts`
  - Re-export all types and definitions
  - Export helper functions: `canPerform(role, resource, action)`

**Example Permission Structure:**
```typescript
interface Permission {
  id: string;                    // "campaigns:create"
  resource: ResourceType;        // "campaigns"
  action: ActionType;            // "create"
  name: string;                  // "Create Campaigns"
  description: string;           // "Create new advertising campaigns"
  tooltip: string;               // "Allows creating new campaigns..."
  dangerLevel: 'safe' | 'moderate' | 'dangerous';
  minimumRole: TeamRole;         // "editor"
}
```

**Resources to Define Permissions For:**
- Campaigns: read, create, edit, delete
- Campaign Sets: read, create, edit, delete
- Data Sources: read, create, edit, delete, sync
- Templates: read, create, edit, delete
- Rules: read, create, edit, delete
- Transforms: read, create, edit, delete
- Team Settings: read, edit
- Team Members: read, invite, edit_role, remove
- Team: delete (dangerous)
- Billing: read, manage (dangerous)

---

### Phase 2: Core UI Components (Priority: HIGH)

**Why HIGH:** Reusable components needed for the matrix view.

**Deliverables:**

- [x] Create `PermissionCell` component at `apps/web/components/permissions/PermissionCell.tsx`
  - Display check/X icon based on permission status
  - Green check for allowed, gray X for denied
  - Amber warning icon for dangerous permissions that are allowed
  - Hover tooltip with permission description
  - Props: `{ allowed: boolean; tooltip: string; dangerous?: boolean }`

- [x] Create `PermissionTooltip` component (integrated into PermissionCell)
  - Native CSS tooltip
  - Shows permission description
  - Accessible with proper ARIA labels
  - Max-width 280px, positioned above cell

- [x] Create role column functionality (integrated into PermissionMatrix)
  - Column header with role name and level
  - Highlight current user's role with background and "You" indicator
  - Role hierarchy indicator (level 1-4)

- [x] Create resource row functionality (integrated into PermissionMatrix)
  - Row header with resource name and icon
  - Groups actions under resource category
  - Resource-specific icons for visual clarity

- [x] Create `DangerBadge` component at `apps/web/components/permissions/DangerBadge.tsx`
  - Warning triangle icon with "Critical" or "Caution" label
  - Red/amber styling based on danger level
  - Accessible with proper ARIA labels

- [x] Create `CurrentRoleBanner` component at `apps/web/components/permissions/CurrentRoleBanner.tsx`
  - Prominent banner showing "Your Role: [Role]"
  - Role-specific icon and gradient styling
  - Brief description of role capabilities
  - Props: `{ role: TeamRole }`

- [x] Create component barrel file at `apps/web/components/permissions/index.ts`

**Component Styling:**
- Create `apps/web/components/permissions/PermissionCell.module.css`
- Create `apps/web/components/permissions/PermissionTooltip.module.css`
- Create `apps/web/components/permissions/RoleColumn.module.css`
- Create `apps/web/components/permissions/ResourceRow.module.css`
- Create `apps/web/components/permissions/DangerBadge.module.css`
- Create `apps/web/components/permissions/CurrentRoleBanner.module.css`

---

### Phase 3: Permission Matrix Component (Priority: HIGH)

**Why HIGH:** Core feature - the main visual representation.

**Deliverables:**

- [x] Create `PermissionMatrix` component at `apps/web/components/permissions/PermissionMatrix.tsx`
  - Table layout with roles as columns, resources/actions as rows
  - Sticky header row for role names
  - Grouped rows by resource type
  - Highlights current user's role column
  - Uses all Phase 2 components
  - Props: `{ currentRole: TeamRole; showDangerousOnly?: boolean }`

- [x] Create `PermissionMatrix.module.css`
  - Responsive grid layout
  - Role column highlighting
  - Filter bar for dangerous-only toggle
  - Horizontal scroll on mobile if needed

- [x] Create mobile-responsive `PermissionCards` component at `apps/web/components/permissions/PermissionCards.tsx`
  - Card-based layout for mobile (< 768px)
  - One card per role showing all permissions
  - Expandable sections per resource type
  - Current role card highlighted and shown first

- [x] Create `PermissionCards.module.css`
  - Card stack layout
  - Accordion-style expandable sections
  - Touch-friendly tap targets (min 44px)

- [x] Create responsive wrapper `PermissionsView` at `apps/web/components/permissions/PermissionsView.tsx`
  - Uses useEffect with window resize listener
  - Renders `PermissionMatrix` on desktop (>= 768px)
  - Renders `PermissionCards` on mobile (< 768px)
  - Props: `{ currentRole: TeamRole }`

---

### Phase 4: Roles & Permissions Tab (Priority: HIGH)

**Why HIGH:** Integration into existing team settings page.

**Deliverables:**

- [x] Create `PermissionsTab` component at `apps/web/app/[locale]/settings/team/components/PermissionsTab.tsx`
  - Renders `CurrentRoleBanner` at top
  - Renders `PermissionsView` below
  - Filter built into PermissionsView components
  - Section explaining role hierarchy with descriptions

- [x] Create `PermissionsTab.module.css`
  - Layout spacing and sections
  - Role hierarchy card grid

- [x] Update `apps/web/app/[locale]/settings/team/page.tsx`
  - Add "Roles & Permissions" tab to tabs array with Shield icon
  - Import and render `PermissionsTab` when active
  - Tab visible to all roles (read-only view)

- [x] Create role descriptions section at top of tab
  - Four cards/sections explaining each role with icons
  - Visual hierarchy indicator (level 1-4)
  - "You" marker on current role card

---

### Phase 5: Owner-Only Features (Priority: MEDIUM)

**Why MEDIUM:** Enhanced features for team owners, not blocking core functionality.

**Deliverables:**

- [x] Create owner-only audit section (simplified version integrated into PermissionsTab)
  - Only visible to owners
  - Shows statistics: total permissions, dangerous permissions, role levels
  - Styled with purple dashed border to indicate owner-only content
  - Explanation of what this section shows

- [ ] Create `PermissionAuditPanel` component with full features (deferred to future iteration)
  - Searchable/filterable list of permissions
  - Export to CSV option for documentation

---

### Phase 6: Testing (Priority: HIGH)

**Why HIGH:** Quality assurance before release.

**Deliverables:**

- [x] Unit tests for permission definitions at `apps/web/lib/permissions/__tests__/definitions.test.ts`
  - Verify all roles have expected permissions (39 tests)
  - Verify dangerous permissions are marked correctly
  - Verify `canPerform` helper works correctly
  - Verify `getPermission` and `getRoleLevel` helpers

- [x] Unit tests for `PermissionCell` at `apps/web/components/permissions/__tests__/PermissionCell.test.tsx`
  - Renders check icon when allowed (11 tests)
  - Renders X icon when denied
  - Shows warning for dangerous + allowed
  - Tooltip appears on hover
  - Accessibility labels

- [x] Unit tests for `PermissionMatrix` at `apps/web/components/permissions/__tests__/PermissionMatrix.test.tsx`
  - Renders all roles as columns (13 tests)
  - Renders all resources as rows
  - Highlights current user's role
  - Shows correct permission states
  - Filter toggle works

- [x] Unit tests for `PermissionsTab` at `apps/web/app/[locale]/settings/team/components/__tests__/PermissionsTab.test.tsx`
  - Renders role banner with correct role (8 tests)
  - Shows matrix/cards view
  - Owner-only panel visible for owners
  - Role hierarchy section

- [x] Integration test for Team Settings page with new tab at `apps/web/app/[locale]/settings/team/__tests__/PermissionsIntegration.test.tsx`
  - Tab navigation works (12 tests)
  - Permission matrix loads correctly
  - Owner-only audit section visibility
  - Role hierarchy display

---

## Not In Scope

### Custom Roles System
- [ ] ~~User-defined roles with custom permissions~~
- [ ] ~~Permission inheritance configuration~~
- [ ] ~~Role creation/editing UI~~

**Why:** Custom roles are a Phase 2 feature. The current structure supports future custom roles by using a data-driven permission matrix, but building the full CRUD UI would add 2-3 weeks and delay the core visibility feature.

### Permission Change Logging
- [ ] ~~Audit log of permission changes~~
- [ ] ~~Historical permission snapshots~~

**Why:** Requires backend audit infrastructure not yet built. Will be part of enterprise compliance features.

### Real-time Permission Checks
- [ ] ~~API endpoint to validate specific permission~~
- [ ] ~~Dynamic permission checking in UI components~~

**Why:** Static permission display is sufficient for visibility. Real-time checks would require API changes and are better suited for the custom roles phase.

### Granular Resource Permissions
- [ ] ~~Per-campaign or per-data-source permissions~~
- [ ] ~~Permission inheritance from folders/groups~~

**Why:** Current system is role-based at team level. Resource-level permissions would require significant backend changes and database schema updates.

### Billing Integration
- [ ] ~~Actual billing management UI~~
- [ ] ~~Payment method management~~

**Why:** This feature focuses on displaying who CAN manage billing, not implementing billing management itself.

---

## Implementation Plan

### Step 1: Permission Data Layer (2-3 hours)
1. Create `apps/web/lib/permissions/` directory
2. Define all TypeScript types and interfaces
3. Build comprehensive permission definitions covering all resources
4. Create helper function for permission lookups
5. Add unit tests for definitions

### Step 2: Core UI Components (3-4 hours)
1. Create `apps/web/components/permissions/` directory
2. Build `PermissionCell` with tooltip integration
3. Build `RoleColumn` with current-user highlighting
4. Build `ResourceRow` with action grouping
5. Build `DangerBadge` and `CurrentRoleBanner`
6. Create CSS modules for each component
7. Add unit tests for cell and tooltip components

### Step 3: Permission Matrix (2-3 hours)
1. Build `PermissionMatrix` table component
2. Implement sticky headers and row grouping
3. Build `PermissionCards` for mobile
4. Create `PermissionsView` responsive wrapper
5. Add unit tests for matrix component

### Step 4: Tab Integration (1-2 hours)
1. Create `PermissionsTab` component with all sections
2. Add tab to team settings page navigation
3. Add role descriptions section
4. Test tab switching and content loading

### Step 5: Owner Features (1-2 hours)
1. Build `PermissionAuditPanel` component
2. Integrate into `PermissionsTab` with owner check
3. Add search/filter functionality
4. Add CSV export option

### Step 6: Final Testing & Polish (2-3 hours)
1. Run all unit tests
2. Run integration tests
3. Test on mobile devices/viewports
4. Test with screen reader
5. Review danger permission highlighting
6. Performance check (< 500ms load)

**Total Estimated Time:** 12-17 hours

---

## Definition of Done

- [x] "Roles & Permissions" tab appears in team settings for all team members
- [x] Permission matrix displays all 4 roles with correct permission mappings
- [x] Current user's role is visually highlighted in the matrix and shown in banner
- [x] All dangerous permissions (delete team, manage billing, remove members) show warning indicators
- [x] Every permission cell shows a descriptive tooltip on hover
- [x] Matrix view renders on desktop (>= 768px viewport)
- [x] Card view renders on mobile (< 768px viewport)
- [x] Owner-only audit panel is visible only to team owners
- [x] All unit tests pass (83 tests total: 39 definitions + 11 PermissionCell + 13 PermissionMatrix + 8 PermissionsTab + 12 integration)
- [x] Integration tests pass for tab navigation and content display (12 tests)
- [x] Page loads in under 500ms (static permission definitions, no API calls)
- [x] Accessibility: all interactive elements are keyboard navigable
- [x] Accessibility: tooltips are screen-reader accessible
- [x] No TypeScript errors in new files
- [x] No ESLint warnings in new files (verified)

---

## Notes

### Tech Stack Choices

**Why static permission definitions instead of API-fetched:**
The permission structure is defined by the application code, not user configuration. Fetching from an API would add latency and complexity without benefit. Static definitions allow instant rendering and work offline.

**Why CSS Modules instead of Tailwind for new components:**
The existing codebase uses CSS Modules extensively (see `*.module.css` files throughout). Maintaining consistency with the existing pattern reduces cognitive load and keeps styling co-located with components.

**Why separate mobile component instead of responsive table:**
Tables with many columns become unusable on mobile even with horizontal scroll. A card-based view provides better UX for touch devices and avoids the awkward horizontal scroll pattern.

### Design Principles

1. **Clarity over brevity:** Use full descriptions in tooltips even if they're long. Users need to understand exactly what each permission allows.

2. **Progressive disclosure:** Show the overview matrix first, with details available on hover/tap. Owners get additional audit capabilities.

3. **Danger awareness:** Make dangerous permissions impossible to miss with color, icons, and explicit warnings.

4. **Future-proof structure:** The permission matrix data structure can easily accommodate custom roles by adding new columns to the matrix.

### Best Practices

- **Tooltip content:** Include "Why this matters" context, not just what the permission does
- **Color choices:** Use semantic colors (green=allowed, gray=denied, amber/red=danger) consistently
- **Touch targets:** All interactive elements minimum 44x44px for mobile accessibility
- **Loading states:** Since data is static, no loading state needed - but skeleton screens are ready for future API-based custom roles
- **Error handling:** Since no API calls, no error states needed for Phase 1

---

## Next Steps

### Phase 2: Custom Roles Foundation (Future)
- Backend API for custom role definitions
- Role template system (clone from existing role)
- Permission override UI for custom roles
- Migration path from fixed roles to custom roles

### Phase 3: Permission Analytics (Future)
- Track which permissions are most used
- Identify over-permissioned roles
- Suggest role optimizations

### Phase 4: Resource-Level Permissions (Future)
- Folder/workspace permissions
- Per-campaign access controls
- Permission inheritance rules
