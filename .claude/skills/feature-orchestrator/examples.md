# Feature Orchestrator Examples

## Basic Usage

### Single Command, Multiple Features

```
User: Build auth, payments, and user dashboard for the app

Orchestrator:
1. Parses: ["auth", "payments", "user-dashboard"]
2. Spawns 3 todo-doc-generator agents in parallel
3. Collects: paths, dependencies, priorities
4. Detects: dashboard depends on auth + payments
5. Orders: [auth, payments, dashboard]
6. Creates MASTER.md
7. Executes each through TDD → Review → PR Review
```

### Numbered List Input

```
User:
1. Add Google OAuth login
2. Implement subscription billing with Stripe
3. Create admin dashboard for managing users
4. Add email notification system
5. Build analytics tracking

Orchestrator:
1. Parses all 5 features
2. Spawns 5 todo-doc-generators in parallel
3. Dependency analysis:
   - google-oauth: none
   - stripe-billing: google-oauth (needs user identity)
   - admin-dashboard: google-oauth, stripe-billing
   - email-notifications: google-oauth
   - analytics: none (can run parallel with oauth)
4. Execution order: [google-oauth, analytics, stripe-billing, email-notifications, admin-dashboard]
```

---

## Example Session Flow

### Initial Prompt
```
User: I need to build these features for my SaaS:
- User authentication with magic links
- Team workspaces with invites
- Usage-based billing
- Activity feed

Go ahead and plan these out then build them.
```

### Phase 1 Output (Planning)
```
---ORCHESTRATOR STATUS---
Phase: Planning (Parallel)
Spawning: 4 todo-doc-generator agents
---END---

[Agents complete in ~30 seconds]

---ORCHESTRATOR STATUS---
Phase: Planning Complete
Features planned: 4/4

Dependency Analysis:
- magic-link-auth: none (foundational)
- team-workspaces: depends on [magic-link-auth]
- usage-billing: depends on [magic-link-auth, team-workspaces]
- activity-feed: depends on [magic-link-auth]

Execution Order:
1. magic-link-auth (priority: 1, phases: 3)
2. team-workspaces (priority: 2, phases: 4)
3. activity-feed (priority: 3, phases: 2)
4. usage-billing (priority: 2, phases: 5)

Master doc created: .claude/MASTER.md
---END---
```

### Phase 2 Output (Execution - Feature 1)
```
---ORCHESTRATOR STATUS---
Phase: Execution
Current: magic-link-auth [1/4]
Sub-phase: TDD Implementation
---END---

[TDD agent completes]

---OUTPUT from tdd-task-executor---
phase: 3/3
phase_complete: true
files_changed: [src/auth/magic-link.ts, src/auth/token.ts, src/api/auth/routes.ts]
files_created: [src/auth/__tests__/magic-link.test.ts]
tests_added: 12
tests_passing: true
blockers: none
---END---

Proceeding to code review...

[Code reviewer completes]

---OUTPUT from code-reviewer---
approved: true
issues_total: 1
critical: none
major: none
minor: [Consider rate limiting magic link requests]
recommendation: approve
---END---

Proceeding to PR review...

[PR reviewer completes]

---OUTPUT from pr-review-toolkit---
ready_to_merge: true
blocking_issues: none
warnings: [Rate limiting suggestion noted for future]
final_recommendation: merge
---END---

Creating commit...
Commit: feat(auth): implement magic link authentication

---ORCHESTRATOR STATUS---
Phase: Execution
Features: 1/4 complete
Current: team-workspaces [2/4]
---END---
```

### Review Loop Example
```
[Code reviewer returns issues]

---OUTPUT from code-reviewer---
approved: false
issues_total: 2
critical: none
major: [Missing CSRF protection on invite endpoint, Team limit not enforced]
recommendation: revise
---END---

Sending issues to TDD agent for fixes...

[TDD agent fixes]

---OUTPUT from tdd-task-executor---
fixed: [CSRF protection added, Team limit check implemented]
tests_added: 3
tests_passing: true
---END---

Re-running code review (iteration 2/3)...

[Code reviewer returns]

---OUTPUT from code-reviewer---
approved: true
issues_total: 0
recommendation: approve
---END---

Proceeding to PR review...
```

---

## Continuation Example

### Context Approaching Limit
```
---CONTINUATION REQUIRED---
Context usage: 85%
Saving state for resume...

State saved to: .claude/orchestrator-state.json
MASTER.md updated with current progress.

Progress Summary:
- Completed: 2/4 features (magic-link-auth, team-workspaces)
- In Progress: activity-feed (phase 2/2, in code review)
- Pending: usage-billing

To resume:
/feature-orchestrator --resume

Or continue manually:
1. Read .claude/MASTER.md for status
2. Read .claude/features/activity-feed-TODO.md for current feature
---END---
```

### Resume Session
```
User: /feature-orchestrator --resume

Orchestrator:
Loading state from .claude/orchestrator-state.json...

Resuming:
- Feature: activity-feed
- Phase: Code Review (iteration 1)
- Last action: TDD phase 2 complete

Continuing code review...
```

---

## Handling Blockers

### Circular Dependency Detected
```
---BLOCKER DETECTED---
Type: Circular Dependency
Features involved: [notifications, preferences, notifications]
Graph:
  notifications → depends on → preferences
  preferences → depends on → notifications

Resolution options:
1. Merge into single feature
2. Break cycle by implementing shared module first
3. Manual ordering override

Awaiting user input...
---END---
```

### External Dependency Missing
```
---BLOCKER DETECTED---
Type: Missing External Dependency
Feature: stripe-billing
Missing: stripe package not installed

Suggested fix:
pnpm add stripe@latest

Should I install and continue? (requires user confirmation for external installs)
---END---
```

### Max Review Iterations
```
---BLOCKER DETECTED---
Type: Review Loop Limit
Feature: team-workspaces
Iterations: 3/3

Persistent issues:
1. Database migration not idempotent
2. Race condition in concurrent invite handling

These may require architectural discussion.
Awaiting user input...
---END---
```

---

## Complex Project Example

### Input
```
User: Build a complete video platform MVP:
- User accounts with OAuth
- Video upload with S3 storage
- Transcoding pipeline with webhooks
- Video player with adaptive streaming
- Comments and reactions
- Creator analytics dashboard
- Monetization with Stripe Connect
```

### Dependency Graph
```
user-accounts ─────────────┬─────────────┐
       │                   │             │
       ▼                   ▼             │
video-upload ──────► transcoding        │
       │                   │             │
       ▼                   ▼             │
video-player ◄──── adaptive-streaming   │
       │                                 │
       ▼                                 │
comments-reactions                       │
       │                                 │
       ▼                                 ▼
creator-analytics ◄─────────────── monetization
```

### Execution Order
1. user-accounts (foundational)
2. video-upload (needs auth)
3. transcoding (needs upload)
4. adaptive-streaming (needs transcoding)
5. video-player (needs streaming)
6. comments-reactions (needs player)
7. monetization (needs auth)
8. creator-analytics (needs everything)

---

## Tips for Effective Use

### Good Feature Descriptions
```
✅ "User authentication with magic links and OAuth"
✅ "Real-time notifications using websockets"
✅ "Admin dashboard with user management and analytics"
```

### Vague Descriptions (Orchestrator Will Ask for Clarification)
```
⚠️ "Better auth" → What specifically? Magic links? OAuth? 2FA?
⚠️ "Dashboard" → What data? What users? What actions?
⚠️ "Fix the API" → Which endpoints? What's broken?
```

### Scope Control
```
User: Build auth, payments, and dashboard - but keep it simple for MVP

Orchestrator notes "MVP" context and instructs todo-doc-generator to:
- Minimal viable implementations
- Explicit "Not In Scope" sections
- Phase 1 only, defer advanced features
```
