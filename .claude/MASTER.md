# Project Orchestration: Dotoro Auth Migration
Generated: 2025-12-28
Status: In Progress

## Execution Queue (Dependency-Ordered)

| # | Feature | Status | TODO Doc | Dependencies | Phases | Checkboxes |
|---|---------|--------|----------|--------------|--------|------------|
| 1 | better-auth-migration | 🔄 In Progress | [TODO](features/better-auth-migration-TODO.md) | none | 6 | 0/62 |

## Status Legend
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being implemented
- 🔍 In Review - Code review or PR suite in progress
- ✅ Complete - Implemented, reviewed, validated, committed
- ❌ Blocked - Waiting on dependency, regression, or user input

## Dependency Graph
```
better-auth-migration (no dependencies)
         │
         └── Ready to start
```

## Progress Log
| Timestamp | Feature | Phase | Action | Notes |
|-----------|---------|-------|--------|-------|
| 2025-12-28T00:00:00Z | better-auth-migration | Planning | TODO doc generated | 62 checkboxes, 6 phases |

## Orchestrator Commands
- Start: `/feature-orchestrator [features]`
- Resume: `/feature-orchestrator --resume`

## Feature Summary

### better-auth-migration
**Goal:** Replace custom authentication with Better Auth library to fix session persistence issues

**Key Deliverables:**
1. Better Auth server configuration with Hono adapter
2. Database schema migration to Better Auth tables
3. Magic link plugin integration with existing Resend email
4. Frontend migration to Better Auth React client
5. Updated auth middleware for protected routes

**Success Criteria:**
- Sessions persist across browser refreshes
- Magic link flow works end-to-end
- Existing users retain access
- No TypeScript errors, build passes
