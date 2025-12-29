# Team Settings Enhancement

**Date:** 2025-12-28
**Status:** Complete
**Priority:** 4
**Complexity:** Medium
**Depends On:** team-creation-flow

---

## Overview

Enhance the existing Team Settings page with three major feature additions:
1. **Billing & Plan Tab** - Display current plan, feature comparison, upgrade CTA, and billing email management (owner-only)
2. **Enhanced General Tab** - Add team avatar upload, danger zone with delete functionality, and team slug display
3. **Advanced Settings Section** - Default member role, timezone selector, and notification preferences

The existing infrastructure includes a working team settings page with General/Members/Invitations tabs, a complete teams API supporting PATCH operations, and established UI component patterns (SettingsSection, ConfirmDialog, FormField).

---

## Goal

Enable team owners and admins to fully manage their team's configuration, billing information, and advanced preferences through a polished, intuitive settings interface that follows established design patterns and prepares the foundation for future payment integration.

### Success Criteria

- [x] Team owners can view current plan with clear visual differentiation between free/pro/enterprise
- [x] Plan comparison table accurately displays feature limits and benefits for each tier
- [x] Upgrade CTA is prominently displayed with placeholder action for future Stripe integration
- [x] Billing email can be updated by team owners only with proper validation
- [x] Team avatar can be uploaded and displayed using existing asset upload patterns
- [x] Team deletion works with proper confirmation flow and cascading cleanup
- [x] Team slug is displayed as read-only information after team creation
- [x] Default member role for new invites can be configured by admins/owners
- [x] Team timezone can be set and persists to the settings JSONB column
- [x] Notification preferences can be toggled and saved

---

## What's Already Done

### Database Schema (Complete)
- Teams table with all necessary fields:
  - `plan` field with enum: `free`, `pro`, `enterprise`
  - `billingEmail` varchar field
  - `settings` JSONB column for flexible settings storage
  - `avatarUrl` text field
  - `slug` unique varchar field
- `TeamSettings` TypeScript interface defined with:
  - `timezone?: string`
  - `defaultCurrency?: string`
  - `notifications?: { emailDigest?: boolean; slackWebhook?: string }`
- Path: `packages/database/src/schema/teams.ts`

### API Routes (Complete)
- `GET /api/teams/{id}` - Returns team details including plan, settings, billingEmail
- `PATCH /api/teams/{id}` - Updates team with proper role authorization
- `DELETE /api/teams/{id}` - Deletes team (owner only)
- Role-based authorization implemented: owner vs admin permissions
- Path: `apps/api/src/routes/teams.ts`

### Frontend Team Settings Page (Partial)
- Basic page structure with tab navigation (General, Members, Invitations)
- GeneralTab with name/description editing
- MembersTab with role management
- InvitationsTab with send/revoke functionality
- ConfirmDialog component for confirmations
- Path: `apps/web/app/[locale]/settings/team/page.tsx`

### Shared Components (Complete)
- `SettingsSection` - Wrapper with default/danger variants
- `ConfirmDialog` - Modal with loading state, danger variant
- `FormField` - Labeled input wrapper
- RoleBadge and RoleSelector inline components
- Path: `apps/web/app/[locale]/settings/components/`

### Teams Client Library (Complete)
- `updateTeam(teamId, input)` - Supports name, description, avatarUrl, settings, billingEmail
- `deleteTeam(teamId)` - Team deletion
- TypeScript types for all operations
- Path: `apps/web/lib/teams/`

---

## What We're Building Now

### Phase 1: Billing & Plan Tab (Owner Only)

**Priority:** HIGH - Core feature for monetization foundation

#### 1.1 PlanBadge Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/PlanBadge.tsx`

- [x] Create visual badge component for plan display
- [x] Implement distinct styling for each plan tier:
  - Free: neutral/gray background
  - Pro: blue/primary background
  - Enterprise: purple/premium background
- [x] Add plan icon (optional sparkle for pro, crown for enterprise)
- [x] Export from components index

#### 1.2 PlanComparisonTable Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/PlanComparisonTable.tsx`

- [x] Create responsive table comparing all three plans
- [x] Feature rows to include:
  - Team members limit (Free: 3, Pro: 25, Enterprise: Unlimited)
  - Campaign sets limit (Free: 5, Pro: 50, Enterprise: Unlimited)
  - Data sources (Free: 2, Pro: 10, Enterprise: Unlimited)
  - API access (Free: No, Pro: Yes, Enterprise: Yes + Priority)
  - Support level (Free: Community, Pro: Email, Enterprise: Dedicated)
- [x] Highlight current plan column
- [x] Add check/cross icons for boolean features
- [x] Make table horizontally scrollable on mobile

#### 1.3 UsageStats Component (Placeholder)
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/UsageStats.tsx`

- [x] Create placeholder component for future usage metrics
- [x] Display static structure with:
  - Current members / limit
  - Campaign sets used / limit
  - Data sources / limit
- [x] Add "Coming soon" badge or disabled state
- [x] Design for future API integration

#### 1.4 BillingEmailForm Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/BillingEmailForm.tsx`

- [x] Create form for billing email management
- [x] Input field with email validation
- [x] Save button with loading state
- [x] Success/error feedback display
- [x] Only editable when user is owner

#### 1.5 BillingTab Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/BillingTab.tsx`

- [x] Compose all billing sub-components
- [x] Current plan display with PlanBadge
- [x] Upgrade CTA button (placeholder onClick)
- [x] Plan comparison section
- [x] Billing email section
- [x] Usage stats placeholder section
- [x] Owner-only access check with fallback message

#### 1.6 Integration into Main Page
File: `apps/web/app/[locale]/[teamSlug]/settings/team/page.tsx`

- [x] Add "Billing & Plan" tab to tab navigation
- [x] Add CreditCard icon from lucide-react
- [x] Conditionally show tab only for owners
- [x] Render BillingTab when active

**Example Use Cases:**
1. Owner views team on free plan, sees upgrade options with feature comparison
2. Owner on pro plan sees their current features highlighted, enterprise upgrade option
3. Owner updates billing email before upgrading to paid plan
4. Non-owner attempts to access billing tab, sees appropriate message or tab hidden

---

### Phase 2: Enhanced General Tab

**Priority:** HIGH - Critical for team identity and management

#### 2.1 TeamAvatarUpload Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/TeamAvatarUpload.tsx`

- [x] Create avatar display with upload overlay
- [x] Circular avatar preview (64x64 or 80x80)
- [x] Fallback to initials when no avatar
- [x] Click/drag to upload interaction
- [x] Accept image types: jpg, png, webp, gif
- [x] Max file size: 2MB with validation
- [x] Show upload progress indicator
- [x] Integrate with existing asset upload pattern
- [x] Call updateTeam with new avatarUrl on success

#### 2.2 TeamSlugDisplay Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/TeamSlugDisplay.tsx`

- [x] Create read-only display for team slug
- [x] Show full URL format: `app.dotoro.com/{slug}`
- [x] Copy to clipboard button with feedback
- [x] Info tooltip explaining slug is set at creation
- [x] Disabled input styling to indicate read-only

#### 2.3 DangerZone Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/DangerZone.tsx`

- [x] Create danger zone section using SettingsSection variant="danger"
- [x] Delete team button with red styling
- [x] Owner-only visibility check
- [x] Trigger ConfirmDialog on click
- [x] Confirmation requires typing team name
- [x] Loading state during deletion
- [x] Redirect to teams list after successful deletion
- [x] Clear error messaging if deletion fails

#### 2.4 Update GeneralTab
File: `apps/web/app/[locale]/[teamSlug]/settings/team/page.tsx`

- [x] Add TeamAvatarUpload above name field
- [x] Add TeamSlugDisplay below name/description
- [x] Add DangerZone at bottom of tab (owner only)
- [x] Maintain existing save functionality for name/description

**Example Use Cases:**
1. Admin uploads new team avatar, sees preview before save
2. User copies team URL slug to share with colleagues
3. Owner decides to delete abandoned team, must type name to confirm
4. Viewer sees slug but not delete option (appropriate restrictions)

---

### Phase 3: Advanced Settings Section

**Priority:** MEDIUM - Enhances team configuration flexibility

#### 3.1 DefaultRoleSelector Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/DefaultRoleSelector.tsx`

- [x] Create dropdown for default invitation role
- [x] Options: viewer, editor, admin (not owner)
- [x] Pull current value from team.settings.defaultMemberRole
- [x] Save to settings JSONB on change
- [x] Admin/owner only editability

#### 3.2 TimezoneSelector Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/TimezoneSelector.tsx`

- [x] Create searchable timezone dropdown
- [x] Use Intl.supportedValuesOf('timeZone') for options
- [x] Group by region (America, Europe, Asia, etc.)
- [x] Show current time in selected timezone
- [x] Save to team.settings.timezone
- [x] Default to browser timezone if not set

#### 3.3 NotificationPreferences Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/NotificationPreferences.tsx`

- [x] Create toggle switches for notification settings
- [x] Email digest toggle (team.settings.notifications.emailDigest)
- [x] Slack webhook URL input (optional, team.settings.notifications.slackWebhook)
- [x] Validate Slack webhook URL format
- [x] Save all preferences on change
- [x] Admin/owner only editability

#### 3.4 AdvancedTab Component
File: `apps/web/app/[locale]/[teamSlug]/settings/team/components/AdvancedTab.tsx`

- [x] Compose all advanced settings components
- [x] Section: "Invitation Defaults" with DefaultRoleSelector
- [x] Section: "Time & Locale" with TimezoneSelector
- [x] Section: "Notifications" with NotificationPreferences
- [x] Use SettingsSection for grouping
- [x] Show appropriate edit permissions

#### 3.5 Integration into Main Page
File: `apps/web/app/[locale]/[teamSlug]/settings/team/page.tsx`

- [x] Add "Advanced" tab to tab navigation
- [x] Add Sliders icon from lucide-react
- [x] Show tab for admin/owner only
- [x] Render AdvancedTab when active

**Example Use Cases:**
1. Admin sets default role to "editor" so all new invites start with edit access
2. Team owner sets timezone to "America/Los_Angeles" for consistent scheduling
3. Admin enables email digest for weekly team activity summaries
4. Owner configures Slack webhook for real-time notifications

---

## Not In Scope

### Payment Processing
- Actual Stripe/payment integration
- Subscription management flows
- Invoice generation/download
- Payment method management

**Why:** Requires separate billing infrastructure sprint. Current scope establishes UI foundation.

### Usage Metering
- Real-time usage tracking API
- Historical usage graphs
- Overage alerts
- Usage-based billing triggers

**Why:** Depends on analytics infrastructure not yet built. Placeholder UI is sufficient for now.

### Team Transfer
- Transfer ownership to another user
- Bulk member migration
- Team merging functionality

**Why:** Edge case scenarios that add complexity. Can be added post-launch based on user demand.

### Audit Logging
- Settings change history
- Who changed what and when
- Rollback capabilities

**Why:** Separate observability feature. Current focus is on core settings functionality.

### White-labeling
- Custom domains per team
- Team branding options
- Custom email templates

**Why:** Enterprise-tier feature requiring significant infrastructure. Not MVP scope.

---

## Implementation Plan

### Step 1: Create Component Directory Structure (15 minutes)
- [x] Create `apps/web/app/[locale]/[teamSlug]/settings/team/components/` directory
- [x] Create `apps/web/app/[locale]/[teamSlug]/settings/team/components/index.ts` barrel export
- [x] Set up component file stubs

### Step 2: Build Billing Tab Components (3-4 hours)
- [x] Implement PlanBadge with styling variants
- [x] Build PlanComparisonTable with feature matrix
- [x] Create UsageStats placeholder
- [x] Implement BillingEmailForm with validation
- [x] Compose BillingTab from sub-components
- [x] Write unit tests for each component

### Step 3: Build Enhanced General Tab Components (2-3 hours)
- [x] Implement TeamAvatarUpload with upload logic
- [x] Build TeamSlugDisplay with copy functionality
- [x] Create DangerZone with delete flow
- [x] Update GeneralTab to include new components
- [x] Write unit tests for new components

### Step 4: Build Advanced Settings Components (2-3 hours)
- [x] Implement DefaultRoleSelector dropdown
- [x] Build TimezoneSelector with search
- [x] Create NotificationPreferences with toggles
- [x] Compose AdvancedTab from sub-components
- [x] Write unit tests for each component

### Step 5: Integrate All Tabs into Main Page (1-2 hours)
- [x] Update tab navigation with new tabs
- [x] Add proper icons for each tab
- [x] Implement role-based tab visibility
- [x] Wire up tab content rendering
- [x] Test tab switching behavior

### Step 6: Update TeamSettings Type (30 minutes)
- [x] Extend TeamSettings interface if needed
- [x] Add defaultMemberRole to settings type
- [x] Verify API accepts all new settings fields
- [x] Update any TypeScript type exports

### Step 7: Testing & Polish (2-3 hours)
- [x] Write integration tests for full page
- [x] Test all permission scenarios
- [x] Verify mobile responsiveness
- [x] Test keyboard navigation
- [x] Fix any accessibility issues
- [ ] Manual QA of all flows

---

## Definition of Done

- [x] All three new tabs (Billing, Enhanced General, Advanced) are accessible from tab navigation
- [x] Billing tab shows current plan, comparison table, upgrade CTA, and billing email form
- [x] Team avatar can be uploaded and displays correctly
- [x] Team deletion works with confirmation dialog requiring name input
- [x] Team slug displays as read-only with copy button
- [x] Default role, timezone, and notification preferences are editable and persist
- [x] All components have unit tests with 80%+ coverage
- [x] Role-based access control is enforced (owner-only billing, admin/owner for advanced)
- [x] Page is fully responsive on mobile devices
- [x] No TypeScript errors or ESLint warnings
- [x] All existing team settings functionality continues to work

---

## Notes

### Tech Stack Decisions

| Technology | Why |
|------------|-----|
| React Hook Form | Not used - keeping inline state to match existing pattern in TeamSettingsPage |
| Lucide Icons | Already used throughout app (Settings, Users, Mail icons in existing page) |
| SettingsSection | Reusing existing component for consistent section styling |
| ConfirmDialog | Reusing existing component for delete confirmation |
| Tailwind CSS | Matches existing styling approach, no CSS modules for new components |

### Design Principles

1. **Progressive Enhancement** - Features degrade gracefully when not applicable (e.g., non-owners don't see billing tab at all)
2. **Immediate Feedback** - All form actions show loading/success/error states
3. **Confirmation for Destructive Actions** - Team deletion requires explicit confirmation
4. **Consistent Patterns** - Follow existing tab structure, form patterns, and component composition
5. **Mobile-First** - All new components must work on mobile viewports

### Best Practices

- **Component Composition:** Keep components small and focused, compose in parent components
- **Error Boundaries:** Wrap tabs in error boundaries to prevent full page crashes
- **Optimistic Updates:** Consider for toggle switches, with rollback on error
- **Accessible Forms:** All inputs need proper labels, error messages, and ARIA attributes
- **Settings Persistence:** Use debounced saves for frequently changed settings

---

## Next Steps

### Phase 2: Payment Integration (Future Sprint)
- Stripe Elements integration
- Subscription management
- Invoice history
- Plan upgrade/downgrade flows

### Phase 3: Usage Analytics (Future Sprint)
- Real-time usage metrics API
- Historical usage charts
- Usage alerts and notifications
- Admin dashboard for usage overview

### Phase 4: Team Collaboration Features (Future Sprint)
- Activity feed
- Team announcements
- Shared resource permissions
- Team-wide templates

### Phase 5: Enterprise Features (Future Sprint)
- SSO/SAML integration
- Custom domains
- Advanced audit logging
- Dedicated support channels
