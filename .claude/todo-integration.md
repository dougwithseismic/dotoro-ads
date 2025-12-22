# Dotoro Full-Stack Integration TODO

**Date:** 2025-12-22
**Status:** Planning
**Goal:** Wire frontend to API to database, replacing all mock/in-memory data with real PostgreSQL persistence

---

## Overview

The Dotoro application currently has:
- **Database Layer** (`packages/database`): Complete Drizzle schemas and seed data
- **API Layer** (`apps/api`): All routes implemented but using in-memory Maps
- **Frontend Layer** (`apps/web`): Complete UI but using hardcoded MOCK_ constants
- **Infrastructure**: Docker PostgreSQL ready on port 5432

This document tracks the work to connect all three layers.

---

## Phase 0: Infrastructure Setup

### 0.1 Docker and Database

- [ ] Start PostgreSQL container
  - Command: `docker compose up -d postgres`
  - Verify: `docker compose ps` shows healthy
  - File: `/docker-compose.yml`

- [ ] Verify database connection string
  - Expected: `postgres://postgres:postgres@localhost:5432/dotoro`
  - Set in `.env`: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/dotoro`

- [ ] Run database migrations
  - Command: `pnpm --filter @repo/database db:push`
  - File: `/packages/database/drizzle.config.ts`

- [ ] Seed initial data
  - Command: `pnpm --filter @repo/database db:seed`
  - File: `/packages/database/src/seed.ts`

- [ ] Verify with Drizzle Studio
  - Command: `pnpm --filter @repo/database db:studio`

### 0.2 Environment Configuration

- [ ] Create `/apps/api/.env`
  ```
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/dotoro
  PORT=3001
  ```

- [ ] Create `/apps/web/.env.local`
  ```
  NEXT_PUBLIC_API_URL=http://localhost:3001
  ```

---

## Phase 1: API Database Integration

Replace in-memory stores with Drizzle database queries.

### 1.1 Create Database Service Layer

- [ ] Create `/apps/api/src/services/db.ts`
  - Export database client from `@repo/database`
  - Handle connection initialization

### 1.2 Accounts Route (`/apps/api/src/routes/accounts.ts`)

**Current:** Uses `mockAccounts` Map (lines 16-48)

**Endpoints to wire:**
- [ ] `GET /api/v1/accounts` - List accounts
  - Replace: `Array.from(mockAccounts.values())`
  - With: `db.select().from(adAccounts).where(...)`
  - Schema: `packages/database/src/schema/ad-accounts.ts`

- [ ] `POST /api/v1/accounts/connect` - Initiate OAuth
  - Keep OAuth URL generation logic
  - No database change needed for this endpoint

- [ ] `DELETE /api/v1/accounts/{id}` - Disconnect account
  - Replace: `mockAccounts.delete(id)`
  - With: `db.delete(adAccounts).where(eq(adAccounts.id, id))`

- [ ] `GET /api/v1/accounts/{id}/status` - Check status
  - Replace: `mockAccounts.get(id)`
  - With: `db.select().from(adAccounts).where(eq(adAccounts.id, id))`

**Remove after wiring:**
- `export const mockAccounts = new Map<...>()`
- `export function seedMockAccounts()`
- Initial `seedMockAccounts()` call

### 1.3 Data Sources Route (`/apps/api/src/routes/data-sources.ts`)

**Current:** Uses `mockDataSources` and `mockDataRows` Maps (lines 40-78)

**Endpoints to wire:**
- [ ] `GET /api/v1/data-sources` - List data sources
  - Replace: `Array.from(mockDataSources.values())`
  - With: `db.select().from(dataSources)`
  - Schema: `packages/database/src/schema/data-sources.ts`

- [ ] `POST /api/v1/data-sources` - Create data source
  - Replace: `mockDataSources.set(newDataSource.id, newDataSource)`
  - With: `db.insert(dataSources).values(...).returning()`

- [ ] `GET /api/v1/data-sources/{id}` - Get by ID
  - Replace: `mockDataSources.get(id)`
  - With: `db.select().from(dataSources).where(eq(dataSources.id, id))`

- [ ] `PUT /api/v1/data-sources/{id}` - Update data source
  - Replace: `mockDataSources.set(id, updatedDataSource)`
  - With: `db.update(dataSources).set(...).where(...).returning()`

- [ ] `DELETE /api/v1/data-sources/{id}` - Delete data source
  - Replace: `mockDataSources.delete(id)` and `mockDataRows.delete(id)`
  - With: `db.delete(dataRows).where(...)` then `db.delete(dataSources).where(...)`

- [ ] `GET /api/v1/data-sources/{id}/rows` - Get data rows
  - Replace: `mockDataRows.get(id)`
  - With: `db.select().from(dataRows).where(eq(dataRows.dataSourceId, id))`
  - Note: Keep integration with `dataStore` for uploaded CSV data

- [ ] `POST /api/v1/data-sources/{id}/upload` - Upload CSV
  - Current: Stores in memory via `dataStore`
  - Wire: Also persist to `dataRows` table after processing

**Remove after wiring:**
- `export const mockDataSources = new Map<...>()`
- `export const mockDataRows = new Map<...>()`
- `export function seedMockData()`

### 1.4 Templates Route (`/apps/api/src/routes/templates.ts`)

**Current:** Uses `mockTemplates` Map (lines 26-68)

**Endpoints to wire:**
- [ ] `GET /api/v1/templates` - List templates
  - With: `db.select().from(campaignTemplates)`
  - Schema: `packages/database/src/schema/campaign-templates.ts`

- [ ] `POST /api/v1/templates` - Create template
  - With: `db.insert(campaignTemplates).values(...).returning()`

- [ ] `GET /api/v1/templates/{id}` - Get by ID
  - With: `db.select().from(campaignTemplates).where(...)`

- [ ] `PUT /api/v1/templates/{id}` - Update template
  - With: `db.update(campaignTemplates).set(...).where(...).returning()`

- [ ] `DELETE /api/v1/templates/{id}` - Delete template
  - With: `db.delete(campaignTemplates).where(...)`

- [ ] `POST /api/v1/templates/{id}/preview` - Preview ads
  - Update to fetch data source from database

**Variable Engine Routes (keep as-is, no database needed):**
- `POST /api/v1/templates/variables/extract`
- `POST /api/v1/templates/validate`
- `POST /api/v1/templates/variables/substitute`
- `POST /api/v1/templates/preview`

**Remove after wiring:**
- `export const mockTemplates = new Map<...>()`
- `export function seedMockTemplates()`

### 1.5 Rules Route (`/apps/api/src/routes/rules.ts`)

**Current:** Uses `mockRules` Map (lines 22-73)

**Endpoints to wire:**
- [ ] `GET /api/v1/rules` - List rules
  - With: `db.select().from(rules)`
  - Schema: `packages/database/src/schema/rules.ts`

- [ ] `POST /api/v1/rules` - Create rule
  - With: `db.insert(rules).values(...).returning()`

- [ ] `GET /api/v1/rules/{id}` - Get by ID
  - With: `db.select().from(rules).where(...)`

- [ ] `PUT /api/v1/rules/{id}` - Update rule
  - With: `db.update(rules).set(...).where(...).returning()`

- [ ] `DELETE /api/v1/rules/{id}` - Delete rule
  - With: `db.delete(rules).where(...)`

- [ ] `POST /api/v1/rules/{id}/test` - Test rule
  - Fetch rule from database, keep RuleEngine logic

- [ ] `POST /api/v1/rules/test-draft` - Test draft rule
  - No database needed (uses request body)

- [ ] `POST /api/v1/rules/evaluate` - Evaluate rules
  - Fetch rules from database by IDs or all enabled

**Remove after wiring:**
- `export const mockRules = new Map<...>()`
- `export function seedMockRules()`

### 1.6 Campaigns Route (`/apps/api/src/routes/campaigns.ts`)

**Current:** Uses `mockCampaigns` and `mockSyncRecords` Maps (lines 26-98)

**Endpoints to wire:**
- [ ] `GET /api/v1/campaigns` - List campaigns
  - With: `db.select().from(generatedCampaigns)`
  - Schema: `packages/database/src/schema/generated-campaigns.ts`

- [ ] `POST /api/v1/campaigns/generate` - Generate campaigns
  - With: `db.insert(generatedCampaigns).values(...).returning()`
  - Also insert sync records

- [ ] `GET /api/v1/campaigns/{id}` - Get by ID
  - With: `db.select().from(generatedCampaigns).where(...)`

- [ ] `POST /api/v1/campaigns/{id}/sync` - Sync to platform
  - With: `db.insert(syncRecords).values(...).returning()`
  - Update campaign status

- [ ] `GET /api/v1/campaigns/{id}/diff` - Get diff
  - Fetch from database, keep diff logic

- [ ] `POST /api/v1/campaigns/preview` - Preview generation
  - Update PreviewService to use database lookups

**Update PreviewService (`/apps/api/src/services/preview-service.ts`):**
- [ ] `getTemplate` callback - use database
- [ ] `getDataSource` callback - use database
- [ ] `getDataRows` callback - use database
- [ ] `getRule` callback - use database

**Remove after wiring:**
- `export const mockCampaigns = new Map<...>()`
- `export const mockSyncRecords = new Map<...>()`
- `export function seedMockCampaigns()`

### 1.7 Creatives Route (`/apps/api/src/routes/creatives.ts`)

**Current:** Uses `CreativeLibraryService` in-memory store

**Endpoints to wire:**
- [ ] Update `CreativeLibraryService` (`/apps/api/src/services/creative-library.ts`)
  - Replace in-memory storage with database
  - Schema: `packages/database/src/schema/creatives.ts`

- [ ] `POST /api/v1/creatives/upload` - Request upload URL
  - No database change (generates presigned URL)

- [ ] `POST /api/v1/creatives` - Register creative
  - With: `db.insert(creatives).values(...).returning()`

- [ ] `GET /api/v1/creatives` - List creatives
  - With: `db.select().from(creatives).where(...)`

- [ ] `GET /api/v1/creatives/{id}` - Get by ID
  - With: `db.select().from(creatives).where(...)`

- [ ] `PUT /api/v1/creatives/{id}` - Update creative
  - With: `db.update(creatives).set(...).where(...).returning()`

- [ ] `DELETE /api/v1/creatives/{id}` - Delete creative
  - With: `db.delete(creatives).where(...)`

- [ ] `POST /api/v1/creatives/{id}/tags` - Add tags
  - With: `db.insert(creativeTags).values(...)`

- [ ] `DELETE /api/v1/creatives/{id}/tags` - Remove tags
  - With: `db.delete(creativeTags).where(...)`

### 1.8 Reddit Route (`/apps/api/src/routes/reddit.ts`)

- [ ] Review for any in-memory storage
- [ ] Wire OAuth token storage to `oauthTokens` table
  - Schema: `packages/database/src/schema/ad-accounts.ts`

---

## Phase 2: Frontend API Integration

Replace mock data with API calls using fetch/React Query.

### 2.1 Setup API Client

- [ ] Create `/apps/web/lib/api-client.ts`
  - Base fetch wrapper with error handling
  - Type-safe API client

- [ ] Create `/apps/web/lib/hooks/` directory for React Query hooks

### 2.2 Accounts Page (`/apps/web/app/accounts/page.tsx`)

**Current:** Uses `MOCK_ACCOUNTS` constant (lines 15-52)

**Changes needed:**
- [ ] Create `/apps/web/lib/hooks/useAccounts.ts`
  - `useAccounts()` - fetch list
  - `useDisconnectAccount()` - delete mutation
  - `useRefreshAccount()` - sync mutation

- [ ] Update `fetchAccounts` (line 80)
  - Replace: mock data with `fetch(\`${API_BASE}/api/v1/accounts\`)`
  - Uncomment existing commented code (lines 91-101)

- [ ] Update `handleDisconnect` (line 144)
  - Replace: mock with real API call
  - Uncomment lines 153-158

- [ ] Update `handleRefresh` (line 176)
  - Replace: mock with real API call
  - Uncomment lines 181-185

- [ ] Remove `MOCK_ACCOUNTS` constant

### 2.3 Campaigns Page (`/apps/web/app/campaigns/page.tsx`)

**Current:** Uses `MOCK_CAMPAIGNS` and `MOCK_TEMPLATES` constants (lines 26-122)

**Changes needed:**
- [ ] Create `/apps/web/lib/hooks/useCampaigns.ts`
  - `useCampaigns(filters)` - fetch list with filters
  - `useSyncCampaign()` - sync mutation
  - `usePauseCampaign()` - pause mutation
  - `useDeleteCampaign()` - delete mutation

- [ ] Update `fetchCampaigns` (line 134)
  - Replace: mock data with real API call
  - Uncomment existing commented code (lines 144-177)

- [ ] Update `fetchTemplates` (line 185)
  - Uncomment API call (lines 187-203)

- [ ] Update `handleSyncSelected` (line 214)
  - Uncomment API call (lines 224-234)

- [ ] Update `handleDeleteSelected` (line 333)
  - Uncomment API call (lines 343-355)

- [ ] Remove `MOCK_CAMPAIGNS` and `MOCK_TEMPLATES` constants

### 2.4 Templates Page (`/apps/web/app/templates/page.tsx`)

**Current:** Already calls API but mock data returned from API

**Changes needed:**
- [ ] Create `/apps/web/lib/hooks/useTemplates.ts`
  - `useTemplates(filters)` - fetch list
  - `useCreateTemplate()` - create mutation
  - `useDeleteTemplate()` - delete mutation
  - `useDuplicateTemplate()` - duplicate mutation

- [ ] Verify API integration works after backend wiring
  - `fetchTemplates` (line 32) - already calls API
  - `handleDelete` (line 53) - already calls API
  - `handleDuplicate` (line 69) - already calls API

### 2.5 Rules Page (`/apps/web/app/rules/page.tsx`)

**Current:** Already calls API

**Changes needed:**
- [ ] Create `/apps/web/lib/hooks/useRules.ts`
  - `useRules(filters)` - fetch list
  - `useDeleteRule()` - delete mutation
  - `useToggleRule()` - update mutation

- [ ] Verify API integration works after backend wiring
  - `fetchRules` (line 65) - already calls API
  - `handleDelete` (line 86) - already calls API
  - `handleToggleEnabled` (line 101) - already calls API

### 2.6 Data Sources Page (`/apps/web/app/data-sources/page.tsx`)

**Current:** Already calls API

**Changes needed:**
- [ ] Create `/apps/web/lib/hooks/useDataSources.ts`
  - `useDataSources(pagination, filters)` - fetch list
  - `useUploadDataSource()` - upload mutation
  - `useDeleteDataSource()` - delete mutation

- [ ] Verify API integration works after backend wiring
  - `fetchDataSources` (line 48) - already calls API
  - `handleUpload` (line 94) - already calls API
  - `handleDelete` (line 143) - already calls API

### 2.7 Data Source Detail Page (`/apps/web/app/data-sources/[id]/page.tsx`)

- [ ] Review for mock data usage
- [ ] Ensure API calls work with database-backed API

### 2.8 Template Editor Pages

- [ ] `/apps/web/app/templates/editor/page.tsx`
- [ ] `/apps/web/app/templates/editor/[id]/page.tsx`
- [ ] `/apps/web/app/templates/[id]/edit/page.tsx`
- [ ] `/apps/web/app/templates/[id]/preview/page.tsx`

Review each for mock data and wire to API.

### 2.9 Rule Builder Pages

- [ ] `/apps/web/app/rules/builder/page.tsx`
- [ ] `/apps/web/app/rules/builder/[id]/page.tsx`

Review each for mock data and wire to API.

---

## Phase 3: Integration Testing

### 3.1 API Integration Tests

- [ ] Create `/apps/api/src/__tests__/integration/` directory

- [ ] Accounts integration tests
  - Test CRUD with real database
  - Test pagination and filtering

- [ ] Data Sources integration tests
  - Test CRUD with real database
  - Test CSV upload flow end-to-end

- [ ] Templates integration tests
  - Test CRUD with real database
  - Test preview generation

- [ ] Rules integration tests
  - Test CRUD with real database
  - Test rule evaluation

- [ ] Campaigns integration tests
  - Test CRUD with real database
  - Test generation flow

### 3.2 End-to-End Flow Tests

- [ ] Create campaign from scratch flow
  1. Upload data source (CSV)
  2. Create template
  3. Create rules
  4. Generate campaigns
  5. Verify campaigns created

- [ ] Account connection flow
  1. Initiate OAuth
  2. Handle callback
  3. Verify account saved

### 3.3 Data Migration Testing

- [ ] Test seed data loads correctly
- [ ] Test schema matches API expectations
- [ ] Verify foreign key relationships work

---

## Phase 4: Cleanup and Polish

### 4.1 Remove Dead Code

- [ ] Delete all `mock*` Maps from route files
- [ ] Delete all `seedMock*` functions
- [ ] Delete `MOCK_*` constants from frontend pages
- [ ] Remove commented-out API code (uncommented in Phase 2)

### 4.2 Error Handling

- [ ] Add database connection error handling in API
- [ ] Add retry logic for failed database operations
- [ ] Add user-friendly error messages in frontend

### 4.3 Performance

- [ ] Add database indexes for common queries
- [ ] Add pagination to all list endpoints
- [ ] Consider caching for frequently accessed data

### 4.4 Documentation

- [ ] Update API documentation with database requirements
- [ ] Document environment variables
- [ ] Add setup instructions to README

---

## Dependencies Between Tasks

```
Phase 0 (Infrastructure)
    |
    v
Phase 1 (API -> Database)
    |
    +---> 1.1 DB Service (required by all 1.x)
    |
    +---> 1.2 Accounts
    |
    +---> 1.3 Data Sources
    |     |
    |     v
    +---> 1.4 Templates (needs data sources for preview)
    |     |
    |     v
    +---> 1.5 Rules
    |     |
    |     v
    +---> 1.6 Campaigns (needs templates, data sources, rules)
    |
    +---> 1.7 Creatives
    |
    +---> 1.8 Reddit OAuth
    |
    v
Phase 2 (Frontend -> API)
    |
    +---> 2.1 API Client (required by all 2.x)
    |
    +---> 2.2-2.9 Pages (can be done in parallel)
    |
    v
Phase 3 (Testing)
    |
    v
Phase 4 (Cleanup)
```

---

## Quick Reference: File Locations

### API Routes (replace mock data)
- `/apps/api/src/routes/accounts.ts`
- `/apps/api/src/routes/data-sources.ts`
- `/apps/api/src/routes/templates.ts`
- `/apps/api/src/routes/rules.ts`
- `/apps/api/src/routes/campaigns.ts`
- `/apps/api/src/routes/creatives.ts`
- `/apps/api/src/routes/reddit.ts`

### API Services (update for database)
- `/apps/api/src/stores/data-store.ts` (to be replaced)
- `/apps/api/src/services/preview-service.ts` (update callbacks)
- `/apps/api/src/services/creative-library.ts` (update storage)

### Database Schemas (reference)
- `/packages/database/src/schema/ad-accounts.ts`
- `/packages/database/src/schema/data-sources.ts`
- `/packages/database/src/schema/campaign-templates.ts`
- `/packages/database/src/schema/rules.ts`
- `/packages/database/src/schema/generated-campaigns.ts`
- `/packages/database/src/schema/creatives.ts`

### Frontend Pages (remove mock data)
- `/apps/web/app/accounts/page.tsx` - MOCK_ACCOUNTS
- `/apps/web/app/campaigns/page.tsx` - MOCK_CAMPAIGNS, MOCK_TEMPLATES

### Frontend Pages (verify API works)
- `/apps/web/app/templates/page.tsx`
- `/apps/web/app/rules/page.tsx`
- `/apps/web/app/data-sources/page.tsx`

---

## Notes

### Database Client Usage
```typescript
import { db } from "@repo/database/client";
import { accounts, dataSources, ... } from "@repo/database/schema";
import { eq, and, or, desc, asc } from "drizzle-orm";

// Select example
const result = await db.select().from(accounts).where(eq(accounts.id, id));

// Insert example
const [newAccount] = await db.insert(accounts).values({...}).returning();

// Update example
const [updated] = await db.update(accounts)
  .set({ name: "new name" })
  .where(eq(accounts.id, id))
  .returning();

// Delete example
await db.delete(accounts).where(eq(accounts.id, id));
```

### API Response Format
All list endpoints should return:
```typescript
{
  data: T[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

### Frontend Data Fetching Pattern
```typescript
// Using React Query (recommended)
const { data, isLoading, error } = useQuery({
  queryKey: ['accounts'],
  queryFn: () => fetch(`${API_BASE}/api/v1/accounts`).then(r => r.json())
});

// Or with SWR
const { data, error, isLoading } = useSWR('/api/v1/accounts', fetcher);
```
