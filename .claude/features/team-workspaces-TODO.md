# Team Workspaces - Multi-Tenant Team Management

**Date:** 2025-12-28
**Status:** Planning
**Depends On:** Authentication (not yet implemented)

---

## Goal

Enable users to create and manage team workspaces where multiple team members can collaborate on ad campaigns, templates, and data sources with role-based access control. This transforms the platform from single-user to multi-tenant, allowing agencies and marketing teams to work together effectively.

### Success Criteria

- [ ] Users can create new teams and become the team owner
- [ ] Team owners can invite members via email with specific roles (admin, editor, viewer)
- [ ] All existing resources (campaigns, templates, data sources, etc.) are scoped to teams
- [ ] Role-based permissions correctly restrict actions based on member role
- [ ] Users can switch between multiple teams they belong to
- [ ] Team billing and usage can be tracked per workspace (for future monetization)

---

## What's Already Done

### Database Schema (Partial)
- [x] `userId` column exists on most tables (`dataSources`, `campaignTemplates`, `rules`, `transforms`, `adAccounts`, `campaignSets`, `generatedCampaigns`)
  - Currently nullable with comment: "Nullable for now, will be required when auth is implemented"
  - Indexed via `*_user_idx` indexes
- [x] `userOAuthTokens` table stores per-user OAuth tokens for integrations
- [x] `oauthTokens` table stores OAuth tokens for ad accounts

### API Layer
- [x] Hono API framework setup at `apps/api/`
- [x] API routes for: data-sources, templates, rules, campaigns, accounts, creatives, transforms, campaign-sets, jobs
- [x] API key authentication middleware exists at `apps/api/src/middleware/api-key-auth.ts`
- [x] Error handling utilities at `apps/api/src/lib/errors.ts`

### Frontend
- [x] Next.js 16 app at `apps/web/`
- [x] App layout with theme provider at `apps/web/app/layout.tsx`
- [x] Components for all major features (campaigns, templates, data sources, rules, transforms, accounts)

---

## What We're Building Now

### Phase 1: Database Schema for Teams and Memberships

**Priority:** HIGH - Foundation for all team functionality

#### 1.1 Teams Table
`packages/database/src/schema/teams.ts`

- [ ] Create `teams` table with fields:
  - `id` (uuid, primary key)
  - `name` (varchar 255, required) - Team display name
  - `slug` (varchar 100, unique) - URL-friendly identifier
  - `description` (text, optional) - Team description
  - `avatarUrl` (text, optional) - Team logo/avatar
  - `settings` (jsonb) - Team-level settings (timezone, defaults, etc.)
  - `billingEmail` (varchar 255, optional) - For future billing
  - `plan` (enum: 'free', 'pro', 'enterprise') - For future billing tiers
  - `createdAt`, `updatedAt` timestamps

- [ ] Create indexes:
  - Unique index on `slug`
  - Index on `plan`

**Example Use Cases:**
1. Marketing agency "Acme Digital" creates team with slug `acme-digital`
2. In-house team at a brand creates "Nike Performance Marketing" team
3. Freelancer creates personal workspace "John's Campaigns"

#### 1.2 Team Memberships Table
`packages/database/src/schema/team-memberships.ts`

- [ ] Create `teamMemberships` table with fields:
  - `id` (uuid, primary key)
  - `teamId` (uuid, FK to teams, required)
  - `userId` (uuid, FK to users when auth exists, required)
  - `role` (enum: 'owner', 'admin', 'editor', 'viewer')
  - `invitedBy` (uuid, optional) - Who invited this member
  - `invitedAt` (timestamp) - When invitation was sent
  - `acceptedAt` (timestamp, optional) - When invitation was accepted
  - `createdAt`, `updatedAt` timestamps

- [ ] Create indexes:
  - Unique index on (`teamId`, `userId`)
  - Index on `userId` (for finding user's teams)
  - Index on `role`

- [ ] Create role enum `teamRoleEnum`:
  ```
  'owner'  - Full access, can delete team, manage billing
  'admin'  - Manage members, all CRUD operations
  'editor' - Create/edit campaigns, templates, data sources
  'viewer' - Read-only access to all resources
  ```

**Example Use Cases:**
1. Agency owner adds client as "viewer" to see campaign performance
2. Senior marketer added as "admin" to manage team and campaigns
3. Junior marketer added as "editor" to create campaigns but not manage team

#### 1.3 Team Invitations Table
`packages/database/src/schema/team-invitations.ts`

- [ ] Create `teamInvitations` table with fields:
  - `id` (uuid, primary key)
  - `teamId` (uuid, FK to teams, required)
  - `email` (varchar 255, required) - Invitee's email
  - `role` (teamRoleEnum, required) - Role to assign upon acceptance
  - `token` (varchar 64, unique) - Secure invitation token
  - `invitedBy` (uuid, required) - User who sent invitation
  - `expiresAt` (timestamp) - Invitation expiry (default 7 days)
  - `acceptedAt` (timestamp, optional)
  - `createdAt` timestamp

- [ ] Create indexes:
  - Unique index on `token`
  - Index on (`teamId`, `email`) for deduplication
  - Index on `expiresAt` for cleanup jobs

**Example Use Cases:**
1. Admin invites `jane@agency.com` as editor, email contains unique link
2. Invitation expires after 7 days if not accepted
3. User accepts invitation, membership created, invitation marked accepted

#### 1.4 Update Existing Tables for Team Scope
`packages/database/src/schema/*.ts`

- [ ] Add `teamId` column to all resource tables:
  - `dataSources` - Add `teamId uuid` FK to teams
  - `campaignTemplates` - Add `teamId uuid` FK to teams
  - `rules` - Add `teamId uuid` FK to teams
  - `transforms` - Add `teamId uuid` FK to teams
  - `adAccounts` - Add `teamId uuid` FK to teams
  - `campaignSets` - Add `teamId uuid` FK to teams
  - `generatedCampaigns` - Add `teamId uuid` FK to teams
  - `creatives` - Add `teamId uuid` FK to teams

- [ ] Create migration to:
  1. Add nullable `teamId` column to each table
  2. Create default team for existing data
  3. Backfill `teamId` for all existing records
  4. Make `teamId` NOT NULL after backfill
  5. Add FK constraint and index

- [ ] Add indexes: `*_team_idx` on teamId for each table

---

### Phase 2: API Routes for Team Management

**Priority:** HIGH - Core CRUD operations

#### 2.1 Teams API
`apps/api/src/routes/teams.ts`

**Endpoints:**

```
GET    /api/teams              - List user's teams
POST   /api/teams              - Create new team
GET    /api/teams/:id          - Get team details
PATCH  /api/teams/:id          - Update team
DELETE /api/teams/:id          - Delete team (owner only)
GET    /api/teams/:id/members  - List team members
POST   /api/teams/:id/members  - Add member (from invitation)
PATCH  /api/teams/:id/members/:userId - Update member role
DELETE /api/teams/:id/members/:userId - Remove member
```

- [ ] Create `apps/api/src/routes/teams.ts` with Hono router
- [ ] Implement team CRUD with Zod validation schemas
- [ ] Add to route exports in `apps/api/src/routes/index.ts`

**Request/Response Schemas:**

```typescript
// POST /api/teams
interface CreateTeamRequest {
  name: string;          // "Acme Digital"
  slug?: string;         // auto-generated if not provided
  description?: string;
}

// Response
interface TeamResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  memberCount: number;
  role: TeamRole;  // Current user's role
  createdAt: string;
}
```

#### 2.2 Invitations API
`apps/api/src/routes/invitations.ts`

**Endpoints:**

```
POST   /api/teams/:id/invitations        - Send invitation
GET    /api/teams/:id/invitations        - List pending invitations
DELETE /api/teams/:id/invitations/:invId - Revoke invitation
GET    /api/invitations/:token           - Get invitation details (public)
POST   /api/invitations/:token/accept    - Accept invitation
POST   /api/invitations/:token/decline   - Decline invitation
```

- [ ] Create `apps/api/src/routes/invitations.ts`
- [ ] Implement invitation send/accept flow
- [ ] Add secure token generation with crypto
- [ ] Add email integration hook (email sending deferred to future)

**Request/Response Schemas:**

```typescript
// POST /api/teams/:id/invitations
interface SendInvitationRequest {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  message?: string;  // Personal message in invite email
}

// GET /api/invitations/:token
interface InvitationDetailsResponse {
  teamName: string;
  teamSlug: string;
  inviterName: string;
  role: TeamRole;
  expiresAt: string;
}
```

#### 2.3 Authentication Middleware
`apps/api/src/middleware/team-auth.ts`

- [ ] Create team context middleware that:
  1. Extracts team from header `X-Team-Id` or query `?teamId=`
  2. Verifies user is member of team
  3. Attaches team and role to request context

- [ ] Create role-based permission middleware:
  ```typescript
  requireRole('admin')      // Must be admin or owner
  requireRole('editor')     // Must be editor, admin, or owner
  requireRole('viewer')     // Any team member
  requireOwner()            // Must be team owner
  ```

- [ ] Update existing routes to use team context middleware

---

### Phase 3: Frontend - Team Management UI

**Priority:** MEDIUM - User-facing functionality

#### 3.1 Team Switcher Component
`apps/web/components/layout/TeamSwitcher.tsx`

- [ ] Create dropdown component showing current team
- [ ] List all teams user belongs to with role badges
- [ ] "Create new team" option in dropdown
- [ ] Integrate into `AppLayout.tsx` header

**Example UI:**
```
[Acme Digital v]
  - Acme Digital (Owner)
  - Nike Marketing (Editor)
  - Personal Workspace (Owner)
  ---
  + Create new team
```

#### 3.2 Team Settings Page
`apps/web/app/settings/team/page.tsx`

- [ ] Create team settings page with tabs:
  - General: Name, slug, description, avatar upload
  - Members: List, invite, remove, change roles
  - Invitations: Pending invitations, resend, revoke
  - (Future) Billing: Plan, usage, invoices

- [ ] Create supporting components:
  - `TeamGeneralSettings.tsx` - Edit team details form
  - `TeamMembersList.tsx` - Table of members with actions
  - `InviteMemberModal.tsx` - Modal form to send invitations
  - `PendingInvitations.tsx` - List of pending invites

#### 3.3 Accept Invitation Page
`apps/web/app/invite/[token]/page.tsx`

- [ ] Create public invitation acceptance page
- [ ] Show team info, inviter, role being offered
- [ ] Accept/decline buttons
- [ ] Handle expired/invalid tokens gracefully
- [ ] Redirect to team dashboard on success

#### 3.4 Team Creation Flow
`apps/web/app/teams/new/page.tsx`

- [ ] Multi-step team creation:
  1. Team name and slug
  2. (Optional) Invite initial members
  3. Confirmation and redirect to dashboard

---

### Phase 4: Resource Scoping and Migration

**Priority:** HIGH - Data integrity

#### 4.1 Update All API Routes for Team Scope
`apps/api/src/routes/*.ts`

For each existing route file, update queries to filter by `teamId`:

- [ ] `data-sources.ts` - All queries include `where eq(dataSources.teamId, teamId)`
- [ ] `templates.ts` - Filter templates by team
- [ ] `rules.ts` - Filter rules by team
- [ ] `campaigns.ts` - Filter campaigns by team
- [ ] `campaign-sets.ts` - Filter campaign sets by team
- [ ] `accounts.ts` - Filter ad accounts by team
- [ ] `creatives.ts` - Filter creatives by team
- [ ] `transforms.ts` - Filter transforms by team

- [ ] Add team validation to all create/update operations
- [ ] Ensure cross-team access returns 404 (not 403 to prevent enumeration)

#### 4.2 Data Migration Strategy
`packages/database/drizzle/XXXX_add_team_workspaces.sql`

- [ ] Create migration script:
  ```sql
  -- 1. Create teams table
  -- 2. Create team_memberships table
  -- 3. Create team_invitations table
  -- 4. Add teamId columns (nullable) to resource tables
  -- 5. Create "default" team for existing users
  -- 6. Backfill teamId for all existing records
  -- 7. Make teamId NOT NULL
  -- 8. Add FK constraints and indexes
  ```

- [ ] Create rollback script for safety

---

## Not In Scope

### Authentication System
- User registration, login, password reset
- Session management, JWT tokens
- OAuth providers (Google, GitHub login)

**Why:** Authentication is a separate foundational feature. Team workspaces will use whatever user identity system is implemented. Currently using placeholder `userId` values.

### Email Service Integration
- Sending invitation emails
- Email templates
- Bounce handling, delivery tracking

**Why:** Requires email service setup (SendGrid, Resend, etc.). Invitations will be created with tokens that can be shared manually initially.

### Billing and Subscriptions
- Payment processing
- Plan limits enforcement
- Usage metering and invoicing

**Why:** Monetization is Phase 2. Team `plan` field is included for future use but not enforced.

### Audit Logging
- Tracking who changed what and when
- Activity feed per team
- Compliance reporting

**Why:** Important for enterprise but not MVP. Can be added later without schema changes.

### Advanced Permissions
- Custom roles beyond owner/admin/editor/viewer
- Resource-level permissions (e.g., view only specific campaigns)
- Permission inheritance and delegation

**Why:** RBAC with four fixed roles covers 90% of use cases. Custom permissions add significant complexity.

### Team Templates/Presets
- Shareable team configuration templates
- Onboarding wizards for new teams

**Why:** Nice-to-have feature that can be added after core functionality works.

---

## Implementation Plan

### Step 1: Database Schema (4-6 hours)
1. Create `packages/database/src/schema/teams.ts` with teams table
2. Create `packages/database/src/schema/team-memberships.ts`
3. Create `packages/database/src/schema/team-invitations.ts`
4. Export new schemas from `packages/database/src/schema/index.ts`
5. Update existing schema files to add `teamId` column
6. Run `pnpm db:generate` to create migration
7. Write tests for schema relationships

### Step 2: API - Teams CRUD (3-4 hours)
1. Create `apps/api/src/routes/teams.ts` with all endpoints
2. Add Zod schemas for request/response validation
3. Implement team creation with owner membership
4. Add to route index and app initialization
5. Write integration tests

### Step 3: API - Team Auth Middleware (2-3 hours)
1. Create `apps/api/src/middleware/team-auth.ts`
2. Implement team context extraction and validation
3. Implement role-based permission checks
4. Create helper functions for common patterns
5. Write unit tests for middleware

### Step 4: API - Invitations (2-3 hours)
1. Create `apps/api/src/routes/invitations.ts`
2. Implement secure token generation
3. Implement invitation CRUD
4. Implement accept/decline flow
5. Write integration tests

### Step 5: Update Existing Routes (3-4 hours)
1. Add team middleware to all resource routes
2. Update queries to filter by teamId
3. Update create operations to set teamId
4. Test all existing functionality still works
5. Update existing API tests

### Step 6: Frontend - Team Switcher (2-3 hours)
1. Create `TeamSwitcher.tsx` component
2. Add team context provider
3. Integrate into `AppLayout.tsx`
4. Handle team switching and persistence
5. Write component tests

### Step 7: Frontend - Team Settings (4-5 hours)
1. Create team settings page layout
2. Implement general settings form
3. Implement members list with actions
4. Implement invitation modal
5. Write component tests

### Step 8: Frontend - Invitation Flow (2-3 hours)
1. Create invitation acceptance page
2. Handle token validation states
3. Implement accept/decline actions
4. Add success/error feedback
5. Write E2E tests

### Step 9: Data Migration (2-3 hours)
1. Write migration script
2. Write rollback script
3. Test migration on copy of production data
4. Document migration procedure
5. Plan maintenance window if needed

---

## Definition of Done

- [ ] All database schema changes are complete with migrations
- [ ] Team CRUD API endpoints return correct responses
- [ ] Invitation flow works end-to-end (create, accept, decline)
- [ ] All existing resources are scoped to teams
- [ ] Role-based permissions are enforced on all API routes
- [ ] Team switcher component is integrated in the app layout
- [ ] Team settings page allows managing members and invitations
- [ ] All new code has unit/integration test coverage > 80%
- [ ] API documentation is updated with new endpoints
- [ ] No regressions in existing functionality

---

## Notes

### Tech Stack Choices

| Component | Choice | Why |
|-----------|--------|-----|
| Database | PostgreSQL + Drizzle ORM | Already in use, supports JSONB for settings |
| API Framework | Hono | Already in use, lightweight and fast |
| Auth Middleware | Custom + Context | Matches existing patterns in codebase |
| Frontend State | React Context | Simple, no additional dependencies |
| Token Generation | Node crypto | Secure, built-in, no dependencies |

### Design Principles

1. **Team-First Architecture:** Resources belong to teams, not users. Users access resources through team membership.

2. **Least Privilege:** Default to viewer role, require explicit elevation for higher permissions.

3. **Soft Boundaries:** Teams are logical, not physical partitions. Same database, filtered queries.

4. **Progressive Enhancement:** Core functionality works without email. Invitations use shareable links.

### Best Practices

1. **Always filter by teamId:** Every query for resources MUST include team filter. Never rely solely on userId.

2. **Check permissions early:** Validate role in middleware before route handler runs.

3. **Return 404 for unauthorized:** Prevents enumeration attacks. User shouldn't know if resource exists in another team.

4. **Slugs are permanent:** Once set, team slugs shouldn't change (would break URLs, integrations).

5. **Invitation tokens are one-time:** After acceptance or expiry, tokens are invalidated.

---

## Next Steps

### Phase 2: Authentication Integration
- Integrate with chosen auth provider (Clerk, Auth.js, etc.)
- Replace placeholder userId with actual user identities
- Add SSO support for enterprise teams

### Phase 3: Email Notifications
- Send invitation emails
- Team activity digests
- Notification preferences

### Phase 4: Billing Integration
- Stripe integration for subscriptions
- Plan limits enforcement
- Usage-based billing

### Phase 5: Audit and Compliance
- Activity logging
- Export functionality
- Data retention policies
