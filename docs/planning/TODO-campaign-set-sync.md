# Campaign Set Sync System - Complete Implementation

**Date:** 2025-12-25
**Status:** Planning
**Sprint Target:** 2-3 weeks

---

## Goal

Build a production-ready campaign synchronization system that pushes locally-created campaign sets to external advertising platforms (Reddit, Google Ads, Facebook), handles bidirectional sync, and provides real-time status updates without blocking API requests.

### Success Criteria

- [ ] Campaign sets can be synced to Reddit Ads API with real API calls (not mocks)
- [ ] Sync operations run in background jobs, returning immediately to the client
- [ ] Real-time progress updates available via polling or SSE/WebSocket
- [ ] Bidirectional sync pulls status changes from platforms back to local DB
- [ ] Failed syncs retry automatically with exponential backoff (max 3 retries)
- [ ] All sync operations have comprehensive audit logging

---

## What's Already Done

### Database Schema (Complete)

- `packages/database/src/schema/campaign-sets.ts`
  - `campaignSetStatusEnum`: draft, pending, syncing, active, paused, completed, archived, error
  - `campaignSetSyncStatusEnum`: pending, syncing, synced, failed, conflict
  - `campaignSets` table with status tracking, lastSyncedAt timestamp
  - Relations to `generatedCampaigns`, `dataSources`, `campaignTemplates`

- `packages/database/src/schema/generated-campaigns.ts`
  - `campaignStatusEnum`: draft, pending, active, paused, completed, error
  - `syncStatusEnum`: pending, syncing, synced, failed, conflict
  - `generatedCampaigns` table with `campaignSetId` foreign key
  - `syncRecords` table tracking per-platform sync status with:
    - `platformId` (ID from ad platform)
    - `syncStatus`
    - `lastSyncedAt`
    - `errorLog`

- `packages/database/src/schema/ad-groups.ts`, `ads.ts`, `keywords.ts`
  - Full hierarchy with `platformAdGroupId`, `platformAdId`, `platformKeywordId` columns
  - Status tracking for each entity level

### OAuth for Reddit (Complete)

- `apps/api/src/services/reddit/oauth.ts`
  - `RedditOAuthService` class with PKCE support
  - Token storage with AES-256-GCM encryption in database
  - Automatic token refresh when expired
  - `getValidTokens(adAccountId)` returns refreshed tokens
  - `storeTokens()`, `revokeTokens()`, `hasValidTokens()` methods

- `packages/reddit-ads/src/oauth.ts`
  - `RedditOAuth` class for OAuth flow
  - `getAuthorizationUrl()`, `exchangeCodeForTokens()`, `refreshAccessToken()`
  - Token expiration checking with buffer

### Reddit Ads SDK (Complete)

- `packages/reddit-ads/src/client.ts`
  - `RedditApiClient` with rate limiting (600 req/10 min)
  - Automatic retry with exponential backoff
  - Rate limit tracking from response headers

- `packages/reddit-ads/src/campaigns.ts`
  - `CampaignService.createCampaign()`, `updateCampaign()`, `deleteCampaign()`
  - `pauseCampaign()`, `activateCampaign()`, `listCampaigns()`
  - Input validation (name length, required fields)

- `packages/reddit-ads/src/ad-groups.ts`
  - `AdGroupService` with full CRUD operations
  - Validation for required fields

- `packages/reddit-ads/src/ads.ts`
  - `AdService` with full CRUD operations
  - Validation for headline, body, URL lengths

- `packages/reddit-ads/src/types.ts`
  - Complete Zod schemas for all Reddit Ads API types
  - `RedditApiException` with error codes and retry info

### Platform Adapter Pattern (Interface Complete)

- `packages/core/src/campaign-set/platform-adapter.ts`
  - `CampaignSetPlatformAdapter` interface defined
  - Methods: `createCampaign`, `updateCampaign`, `pauseCampaign`, `resumeCampaign`, `deleteCampaign`
  - Methods: `createAdGroup`, `updateAdGroup`, `deleteAdGroup`
  - Methods: `createAd`, `updateAd`, `deleteAd`
  - Methods: `createKeyword`, `updateKeyword`, `deleteKeyword`
  - Result types: `PlatformCampaignResult`, `PlatformAdGroupResult`, `PlatformAdResult`

### Sync Service (Logic Complete, Not Wired)

- `packages/core/src/campaign-set/sync-service.ts`
  - `CampaignSetSyncService` interface
  - `DefaultCampaignSetSyncService` implementation with:
    - `syncCampaignSet()` - sync entire set
    - `syncCampaign()` - sync single campaign
    - `pauseCampaignSet()`, `resumeCampaignSet()`
  - `CampaignSetRepository` interface defined but not implemented
  - Handles create vs update based on `platformCampaignId` presence
  - Recursive sync of adGroups -> ads -> keywords

### API Endpoints (Stubs Only)

- `apps/api/src/routes/campaign-sets.ts`
  - `POST /api/v1/campaign-sets/{setId}/sync` - returns dummy `{ synced: 0, failed: 0, errors: [] }`
  - `POST /api/v1/campaign-sets/{setId}/pause` - updates local DB only
  - `POST /api/v1/campaign-sets/{setId}/resume` - updates local DB only
  - Full CRUD for campaign sets and campaigns working

### Core Types (Complete)

- `packages/core/src/campaign-set/types.ts`
  - `CampaignSet`, `Campaign`, `AdGroup`, `Ad`, `Keyword` types
  - Status enums aligned with database
  - `CampaignSetConfig` for wizard state snapshot

---

## What We're Building Now

### Phase 1: Reddit Adapter Implementation (HIGH Priority)

**Why:** Reddit OAuth is working and SDK exists. This is the critical path to a working sync.

#### 1.1 Create Reddit Platform Adapter
**File:** `packages/core/src/campaign-set/reddit-adapter.ts`

- [ ] Implement `CampaignSetPlatformAdapter` interface for Reddit
- [ ] Inject `RedditApiClient` and `accountId` via constructor
- [ ] Transform our `Campaign` type to Reddit's `RedditCampaign` format
  - Map `name`, `budget`, `status` fields
  - Convert budget from dollars to micro-units (multiply by 1,000,000)
  - Map our `objective` to Reddit's `AWARENESS`/`CONSIDERATION`/`CONVERSIONS`
- [ ] Transform our `AdGroup` type to Reddit's `RedditAdGroup` format
  - Map targeting from our format to Reddit's subreddits/interests/locations/devices
  - Map bidding strategy to Reddit's `AUTOMATIC`/`MANUAL_CPC`/`MANUAL_CPM`
- [ ] Transform our `Ad` type to Reddit's `RedditAd` format
  - Map `headline`, `description` -> Reddit's `headline`, `body`
  - Map `finalUrl` -> `click_url`, `displayUrl` -> `display_url`
  - Map `callToAction` to Reddit's CTA enum values
- [ ] Handle Reddit API errors and map to our error format
- [ ] Reddit doesn't support keywords at ad group level - return success no-op for keyword methods

**Example transformation:**
```typescript
// Our Campaign
{ name: "Summer Sale", budget: { type: "daily", amount: 50, currency: "USD" } }
// Reddit Campaign
{ name: "Summer Sale", daily_budget_micro: 50000000, ... }
```

**Use cases:**
1. User creates campaign set with 10 campaigns, clicks sync -> all 10 pushed to Reddit
2. User updates a synced campaign name -> update pushed to Reddit
3. User pauses campaign set -> all campaigns paused on Reddit
4. Sync fails for 2/10 campaigns -> partial success reported, 2 marked as failed

#### 1.2 Add Funding Instrument Support
**Files:** `packages/reddit-ads/src/funding-instruments.ts`, `packages/database/src/schema/ad-accounts.ts`

- [ ] Create `FundingInstrumentService` in reddit-ads package
  - `listFundingInstruments(accountId)` - get available payment methods
  - Cache funding instrument IDs per account
- [ ] Add `fundingInstrumentId` column to `adAccounts` table
- [ ] During OAuth callback, fetch and store default funding instrument
- [ ] Reddit requires `funding_instrument_id` for campaign creation

#### 1.3 Handle Reddit Account Context
**File:** `packages/core/src/campaign-set/reddit-adapter.ts`

- [ ] Accept `adAccountId` in adapter constructor
- [ ] Use `RedditOAuthService.getValidTokens()` to get fresh access token
- [ ] Create new `RedditApiClient` instance with token
- [ ] Fetch Reddit's account ID from token if not stored

---

### Phase 2: Campaign Set Repository Implementation (HIGH Priority)

**Why:** Sync service needs database access. This bridges the gap.

#### 2.1 Implement DrizzleCampaignSetRepository
**File:** `apps/api/src/repositories/campaign-set-repository.ts`

- [ ] Implement `CampaignSetRepository` interface from sync-service.ts
- [ ] `getCampaignSetWithRelations(setId)`:
  - Query `campaignSets` with campaigns, adGroups, ads, keywords
  - Use Drizzle's relational queries or manual joins
  - Transform DB types to core `CampaignSet` type
  - Include `platformCampaignId`, `platformAdGroupId`, etc. for update detection
- [ ] `getCampaignById(campaignId)`:
  - Query single campaign with parent set ID
  - Return `CampaignWithSet` type
- [ ] `updateCampaignSetStatus(setId, status, syncStatus)`:
  - Update both `status` and `syncStatus` columns
  - Update `updatedAt` timestamp
- [ ] `updateCampaignSyncStatus(campaignId, syncStatus, error?)`:
  - Update campaign's sync status
  - Store error message if failed
- [ ] `updateCampaignPlatformId(campaignId, platformId)`:
  - Store Reddit's campaign ID after successful create
  - Used for subsequent updates
- [ ] `updateAdGroupPlatformId(adGroupId, platformId)`
- [ ] `updateAdPlatformId(adId, platformId)`
- [ ] `updateKeywordPlatformId(keywordId, platformId)`

**Database queries needed:**
```sql
-- Get campaign set with full hierarchy
SELECT cs.*, gc.*, ag.*, ads.*, kw.*
FROM campaign_sets cs
LEFT JOIN generated_campaigns gc ON gc.campaign_set_id = cs.id
LEFT JOIN ad_groups ag ON ag.campaign_id = gc.id
LEFT JOIN ads ON ads.ad_group_id = ag.id
LEFT JOIN keywords kw ON kw.ad_group_id = ag.id
WHERE cs.id = $1;
```

---

### Phase 3: Wire Up Sync Endpoint (HIGH Priority)

**Why:** Makes the sync button actually work.

#### 3.1 Connect API to Sync Service
**File:** `apps/api/src/routes/campaign-sets.ts`

- [ ] Import and instantiate `DrizzleCampaignSetRepository`
- [ ] Import and instantiate `RedditPlatformAdapter`
- [ ] Create adapter map: `Map<string, CampaignSetPlatformAdapter>`
- [ ] Instantiate `DefaultCampaignSetSyncService` with adapters and repository
- [ ] Update `/sync` handler to call `syncService.syncCampaignSet(setId)`
- [ ] Return real `CampaignSetSyncResult` from service

**Initial implementation (blocking):**
```typescript
campaignSetsApp.openapi(syncCampaignsRoute, async (c) => {
  const { setId } = c.req.valid("param");
  const result = await syncService.syncCampaignSet(setId);
  return c.json({
    synced: result.synced,
    failed: result.failed,
    errors: result.errors.map(e => ({ campaignId: e.campaignId, message: e.message })),
  }, 200);
});
```

#### 3.2 Add Sync Record Tracking
**File:** `apps/api/src/repositories/campaign-set-repository.ts`

- [ ] Create/update `syncRecords` entries during sync
- [ ] Track per-platform sync status for each campaign
- [ ] Store `platformId` from successful syncs
- [ ] Store `errorLog` from failed syncs

---

### Phase 4: Background Job System (MEDIUM Priority)

**Why:** Syncing 100+ campaigns can take minutes. Don't block HTTP requests.

#### 4.1 Add Job Queue Infrastructure
**Files:** `apps/api/src/jobs/queue.ts`, `apps/api/src/jobs/worker.ts`

- [ ] Evaluate options: BullMQ (Redis), Postgres-based (pg-boss), or simple in-memory queue
- [ ] For MVP: Use pg-boss (already have Postgres, no Redis needed)
- [ ] Install pg-boss: `pnpm add pg-boss`
- [ ] Create job queue singleton with connection to existing DB
- [ ] Define job types with TypeScript:
  ```typescript
  interface SyncCampaignSetJob {
    type: 'sync-campaign-set';
    campaignSetId: string;
    userId: string;
    initiatedAt: string;
  }
  ```

#### 4.2 Create Sync Job Handler
**File:** `apps/api/src/jobs/handlers/sync-campaign-set.ts`

- [ ] Register job handler with pg-boss
- [ ] Instantiate sync service within job handler
- [ ] Handle job completion/failure
- [ ] Update campaign set status when job completes
- [ ] Store job result for client polling

#### 4.3 Update API to Enqueue Jobs
**File:** `apps/api/src/routes/campaign-sets.ts`

- [ ] Change `/sync` endpoint to enqueue job instead of sync directly
- [ ] Return job ID for tracking: `{ jobId: "uuid", status: "queued" }`
- [ ] Add `GET /api/v1/campaign-sets/{setId}/sync-status` endpoint
  - Returns current sync progress
  - Polls job queue for status

#### 4.4 Add Job Status Endpoint
**File:** `apps/api/src/routes/jobs.ts`

- [ ] `GET /api/v1/jobs/{jobId}` - get job status
- [ ] Return: `{ status: "queued" | "running" | "completed" | "failed", progress?: { synced: 5, total: 10 }, result?: {...} }`

---

### Phase 5: Real-Time Status Updates (MEDIUM Priority)

**Why:** Users need to see sync progress, not just poll every 5 seconds.

#### 5.1 Server-Sent Events for Sync Progress
**File:** `apps/api/src/routes/campaign-sets.ts`

- [ ] Add `GET /api/v1/campaign-sets/{setId}/sync-stream` SSE endpoint
- [ ] Use Hono's streaming response
- [ ] Emit events as campaigns sync:
  ```typescript
  event: sync-progress
  data: {"campaignId":"uuid","status":"synced","platformId":"t3_abc123"}

  event: sync-complete
  data: {"synced":8,"failed":2,"errors":[...]}
  ```
- [ ] Job handler publishes events to Redis pub/sub or in-memory EventEmitter

#### 5.2 Alternative: WebSocket Support
**File:** `apps/api/src/websocket/sync-updates.ts`

- [ ] If SSE doesn't work well with infrastructure, add WebSocket
- [ ] Use Hono's WebSocket helper or separate ws server
- [ ] Subscribe to campaign set ID channel
- [ ] Push updates as they happen

---

### Phase 6: Bidirectional Sync (MEDIUM Priority)

**Why:** Campaigns can be modified on platform (paused, budget changed). Need to sync back.

#### 6.1 Add Platform Polling Service
**File:** `packages/core/src/campaign-set/platform-poller.ts`

- [ ] Define `PlatformPoller` interface:
  ```typescript
  interface PlatformPoller {
    fetchCampaignStatus(platformCampaignId: string): Promise<PlatformCampaignStatus>;
    fetchAllCampaignStatuses(accountId: string): Promise<PlatformCampaignStatus[]>;
  }
  ```
- [ ] `PlatformCampaignStatus`: id, status, budget, lastModified, etc.

#### 6.2 Implement Reddit Poller
**File:** `packages/core/src/campaign-set/reddit-poller.ts`

- [ ] Use `CampaignService.listCampaigns()` to fetch all campaigns
- [ ] Use `CampaignService.getCampaign()` for single campaign
- [ ] Transform Reddit status back to our format

#### 6.3 Create Sync Back Job
**File:** `apps/api/src/jobs/handlers/sync-from-platform.ts`

- [ ] Scheduled job (cron: every 15 minutes)
- [ ] For each active campaign set with synced campaigns:
  - Fetch current status from platform
  - Compare with local status
  - Update local DB if platform changed
  - Mark as "conflict" if both changed

#### 6.4 Add Conflict Detection
**File:** `packages/core/src/campaign-set/conflict-resolver.ts`

- [ ] Detect when local and platform have diverged
- [ ] Store conflict details: `{ localStatus, platformStatus, detectedAt }`
- [ ] Mark syncStatus as "conflict"
- [ ] User can resolve via API: "use local" or "use platform"

---

### Phase 7: Error Handling & Retry Logic (HIGH Priority)

**Why:** Network failures, rate limits, and API errors are inevitable.

#### 7.1 Enhance Adapter Error Handling
**File:** `packages/core/src/campaign-set/reddit-adapter.ts`

- [ ] Catch `RedditApiException` and map to our error types
- [ ] Rate limit errors (429): Mark as retryable, include retry-after
- [ ] Validation errors (400): Mark as non-retryable, include field details
- [ ] Auth errors (401): Attempt token refresh, retry once
- [ ] Server errors (5xx): Mark as retryable

#### 7.2 Add Retry Queue for Failed Campaigns
**File:** `apps/api/src/jobs/handlers/retry-failed-syncs.ts`

- [ ] Scheduled job (cron: every 5 minutes)
- [ ] Query campaigns with `syncStatus = 'failed'` and `retryCount < 3`
- [ ] Attempt re-sync with exponential backoff
- [ ] After 3 failures, mark as permanent failure, alert user

#### 7.3 Implement Circuit Breaker
**File:** `packages/core/src/campaign-set/circuit-breaker.ts`

- [ ] Track failure rate per platform
- [ ] If >50% failures in 5 minutes, open circuit
- [ ] Reject new sync requests until circuit closes
- [ ] Prevents hammering a broken API

---

### Phase 8: Testing (HIGH Priority)

**Why:** Sync touches external APIs, database, and background jobs. Must be tested.

#### 8.1 Unit Tests for Reddit Adapter
**File:** `packages/core/src/campaign-set/__tests__/reddit-adapter.test.ts`

- [ ] Test data transformation (our types -> Reddit types)
- [ ] Test error mapping
- [ ] Mock `RedditApiClient` responses
- [ ] Test create vs update path selection

#### 8.2 Unit Tests for Repository
**File:** `apps/api/src/repositories/__tests__/campaign-set-repository.test.ts`

- [ ] Test `getCampaignSetWithRelations` with various data shapes
- [ ] Test status update methods
- [ ] Use test database or mock Drizzle

#### 8.3 Integration Tests for Sync Service
**File:** `packages/core/src/campaign-set/__tests__/sync-service.integration.test.ts`

- [ ] Test full sync flow with mock adapter
- [ ] Test partial failure handling
- [ ] Test status updates through repository

#### 8.4 E2E Tests for API Endpoints
**File:** `apps/api/src/__tests__/routes/campaign-sets-sync.e2e.test.ts`

- [ ] Test `/sync` endpoint end-to-end
- [ ] Mock external Reddit API at HTTP level (msw or nock)
- [ ] Verify database state after sync
- [ ] Test job queuing if background jobs enabled

#### 8.5 Create Mock Adapter for Development
**File:** `packages/core/src/campaign-set/mock-adapter.ts`

- [ ] Implement `CampaignSetPlatformAdapter` with fake delays
- [ ] Configurable success/failure rates
- [ ] Return realistic platform IDs
- [ ] Useful for UI development without hitting real APIs

---

## Not In Scope

### Google Ads Adapter
- **What:** `packages/core/src/campaign-set/google-adapter.ts`
- **Why:** Google Ads API requires OAuth setup, developer tokens, and different data model. Reddit is simpler to start.
- **When:** Phase 2 after Reddit is stable

### Facebook/Meta Adapter
- **What:** `packages/core/src/campaign-set/facebook-adapter.ts`
- **Why:** Facebook Marketing API has complex access requirements and review process.
- **When:** Phase 3 after Google

### Webhook Receivers
- **What:** Receive push notifications from platforms
- **Why:** Reddit doesn't support webhooks. Polling is sufficient for MVP.
- **When:** If a platform supports it and polling becomes a bottleneck

### Campaign Editing on Platform
- **What:** Two-way sync where platform edits are preserved
- **Why:** Complex conflict resolution. For MVP, local is source of truth.
- **When:** After bidirectional read sync is stable

### Bulk Operations API
- **What:** `POST /api/v1/campaign-sets/bulk-sync` for multiple sets
- **Why:** Single set sync covers 95% of use cases
- **When:** When users have 50+ campaign sets

### Historical Sync Audit Log UI
- **What:** UI to view all past sync operations
- **Why:** API logging is sufficient for debugging. UI is nice-to-have.
- **When:** After core sync is stable

---

## Implementation Plan

### Step 1: Reddit Adapter (4-6 hours)
1. Create `reddit-adapter.ts` with type transformations
2. Add `FundingInstrumentService` to reddit-ads package
3. Write unit tests for transformations
4. Test with real Reddit API in sandbox mode

### Step 2: Repository Implementation (3-4 hours)
1. Create `DrizzleCampaignSetRepository` class
2. Implement all interface methods
3. Write unit tests with test database
4. Verify queries return correct data shapes

### Step 3: Wire Up Endpoint (2-3 hours)
1. Update `/sync` handler to use real services
2. Test sync flow manually
3. Verify database updates correctly
4. Handle and return errors properly

### Step 4: Background Jobs (4-5 hours)
1. Install and configure pg-boss
2. Create job handler for sync
3. Update endpoint to enqueue
4. Add job status endpoint
5. Test queue behavior

### Step 5: SSE/Real-time Updates (2-3 hours)
1. Add SSE endpoint
2. Connect job handler to event stream
3. Test in browser

### Step 6: Bidirectional Sync (4-5 hours)
1. Create poller service
2. Implement Reddit poller
3. Create scheduled sync-back job
4. Add conflict detection

### Step 7: Error Handling (2-3 hours)
1. Enhance adapter error handling
2. Add retry job
3. Test failure scenarios

### Step 8: Testing (4-6 hours)
1. Write all unit tests
2. Write integration tests
3. Write E2E tests
4. Create mock adapter

**Total Estimate:** 25-35 hours (2-3 weeks with other work)

---

## Definition of Done

- [ ] User can click "Sync" and campaigns are created on Reddit Ads platform
- [ ] Sync status is visible in real-time (via polling or SSE)
- [ ] Failed campaigns are retried automatically up to 3 times
- [ ] Platform IDs are stored locally for subsequent updates
- [ ] Bidirectional sync runs every 15 minutes and updates local status
- [ ] Conflicts are detected and marked for user resolution
- [ ] All sync operations are logged with timestamps and results
- [ ] Unit test coverage > 80% for adapter, repository, and sync service
- [ ] E2E tests pass for happy path and common failure cases
- [ ] Documentation updated with sync architecture and troubleshooting

---

## Notes

### Tech Stack Decisions

| Component | Choice | Why |
|-----------|--------|-----|
| Job Queue | pg-boss | Already have Postgres, no Redis needed, good for MVP |
| Real-time | SSE | Simpler than WebSocket, works with HTTP/2, Hono supports it |
| Error Tracking | Console + DB | Simple for MVP, can add Sentry later |
| Conflict Resolution | Manual via API | Automatic resolution is complex, let users decide |

### Design Principles

1. **Local is source of truth** - Platform is a destination, not the master
2. **Eventual consistency** - Sync may take time, that's OK
3. **Fail loudly** - Make errors visible, don't silently fail
4. **Idempotent operations** - Safe to retry any sync operation
5. **Minimal locking** - Don't lock campaign sets during sync

### Best Practices

1. **Always check platformCampaignId** before deciding create vs update
2. **Store platform IDs immediately** after successful create, before proceeding
3. **Log every API call** to platform for debugging
4. **Use transactions** for database updates during sync
5. **Test with small sets first** (1-2 campaigns) before bulk

### Reddit API Specifics

- Rate limit: 600 requests per 10 minutes
- Campaigns require `funding_instrument_id`
- Budgets are in micro-units (1 USD = 1,000,000 micro)
- No keyword support at ad group level
- Status values: ACTIVE, PAUSED, COMPLETED, DELETED
- Ads require creative_id for images (separate upload flow)

---

## Next Steps (Immediate)

1. **Create Reddit Adapter** - Start with campaign create/update
2. **Test with Reddit Sandbox** - Verify API integration works
3. **Implement Repository** - Wire up database access
4. **Manual Sync Test** - Sync one campaign set end-to-end
5. **Add Background Jobs** - Move sync to job queue

---

## Future Phases

### Phase 2: Google Ads Integration
- Implement Google Ads OAuth flow
- Create Google Ads adapter
- Handle Google's complex campaign structure

### Phase 3: Facebook/Meta Integration
- Implement Facebook OAuth flow
- Create Facebook adapter
- Handle Facebook's ad account structure

### Phase 4: Advanced Features
- Sync scheduling (run at specific times)
- Sync templates (pre-configured platform settings)
- Bulk sync API
- Sync history UI
