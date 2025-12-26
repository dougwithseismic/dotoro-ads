# Data Source Types: CRUD-First Architecture

**Date:** 2025-12-26
**Status:** Planning

---

## Architectural Principle

A **Data Source is a container for items**. All ingestion methods are adapters that populate this container via a unified CRUD API.

```
Data Source = Container for Items
|
+-- CRUD API (the foundation)
|   +-- POST   /data-sources/:id/items      -> Add items (bulk)
|   +-- GET    /data-sources/:id/items      -> List items (paginated)
|   +-- PUT    /data-sources/:id/items/:id  -> Update item
|   +-- DELETE /data-sources/:id/items/:id  -> Delete item
|   +-- DELETE /data-sources/:id/items      -> Clear all (for re-sync)
|
+-- Ingestion Adapters (all feed into CRUD)
    +-- CSV Upload      -> parse -> bulk insert
    +-- CSV Paste       -> parse -> bulk insert
    +-- API Fetch       -> fetch -> flatten -> bulk insert (scheduled)
    +-- API Push        -> external system calls our API -> insert/upsert
    +-- Google Sheets   -> OAuth -> fetch -> bulk insert (scheduled)
    +-- Manual Entry    -> UI form -> single insert
```

This design means:
1. **One API to rule them all** - Items are managed through a single, well-tested CRUD API
2. **Ingestion is decoupled** - Each adapter is just a different way to call the CRUD API
3. **Sync is just "clear + bulk insert"** - Re-syncing from any source is trivial
4. **External systems can push** - API Push lets webhooks, Zapier, etc. write directly

---

## Scale-Aware Design

### Why Store Data (vs. Pass-Through)?

We considered pass-through (fetch on demand) but rejected it because ad campaign generation requires:
1. **Fast random access** - templates pull specific rows instantly
2. **Consistent data** during campaign runs (products can't disappear mid-generation)
3. **Queryable/filterable** data for dynamic feeds
4. **Transformations** - data often needs enrichment before use

Pass-through would make us dependent on source API rate limits, uptime, and latency.

### Expected Scale Tiers

| Tier | Rows | Example Use Case | Storage Est. |
|------|------|------------------|--------------|
| Small | <10K | Local shop, small catalog | ~10MB |
| Medium | 10K-100K | Mid-size e-commerce | ~100MB |
| Large | 100K-1M | Large retailer | ~1GB |
| Enterprise | 1M+ | Marketplace, aggregator | 1GB+ |

### Scale-Conscious Implementation Requirements

These requirements are incorporated into Phase 0:

1. **Streaming Sync (never load all into memory)**
   - Process CSV/API responses in chunks of 100-1000 rows
   - Use streaming parsers for large files
   - Database inserts in batches, not single mega-transaction

2. **Row Limits per Data Source**
   - Default limit: 500,000 rows per data source
   - Configurable via environment variable
   - Return clear error when limit exceeded
   - Show warning in UI when approaching limit (>80%)

3. **Efficient Bulk Operations**
   - Use PostgreSQL `COPY` or multi-row INSERT for massive inserts
   - Batch size: 100 rows per INSERT statement
   - Transaction chunking: commit every 10,000 rows to avoid long locks

4. **Sync Progress Tracking**
   - For large syncs, store progress in data source config
   - `syncProgress: { processed: number, total: number, startedAt: string }`
   - Enables UI progress indicators and resumable syncs (future)

5. **Cursor-Based Pagination**
   - Already using offset pagination for GET /items
   - Add cursor-based option for large datasets (future enhancement)

### Future Enhancements (Not in Scope Now)

- **Delta/Incremental Sync** - Only update changed rows (requires source support)
- **Column Pruning** - Only store columns used in campaigns
- **Data Archival** - Compress or archive old sync snapshots
- **Sharding** - Partition dataRows by dataSourceId for very large deployments

---

## Goal

Build a CRUD-first data source system where ingestion methods (CSV, API Fetch, API Push, Google Sheets) are adapters that populate a unified item container.

### Success Criteria

- [ ] Data sources have a full CRUD API for managing items (`POST/GET/PUT/DELETE /data-sources/:id/items`)
- [ ] Users can paste CSV content directly into a text area and create a data source
- [ ] Users can configure API Fetch sources that pull data on a schedule
- [ ] External systems can push data via authenticated API endpoints (API Push)
- [ ] Users can connect Google Sheets and sync on a schedule
- [ ] `/data-sources` page shows sync status, last synced, and manual sync button
- [ ] All ingestion adapters use the same underlying CRUD operations

---

## What's Already Done

### Database Schema (Complete)
- `packages/database/src/schema/data-sources.ts`
- `dataSourceTypeEnum` supports: `csv`, `api`, `manual`
- `dataSources` table stores: `id`, `userId`, `name`, `type`, `config` (JSONB), timestamps
- `dataRows` table stores normalized row data with `rowData` JSONB field
- `columnMappings` table tracks column metadata and type detection

### API Routes (Partial - needs CRUD extension)
- `apps/api/src/routes/data-sources.ts`
- CRUD for data sources themselves (create, read, update, delete)
- CSV file upload via `POST /api/v1/data-sources/{id}/upload`
- CSV preview via `POST /api/v1/data-sources/preview-csv`
- Paginated row retrieval via `GET /api/v1/data-sources/{id}/rows`
- **Missing:** Bulk item insert, individual item CRUD, clear all items

### Frontend Components (Partial)
- `apps/web/app/campaign-sets/new/components/CreateDataSourceDrawer.tsx`
  - Currently supports CSV file upload only
  - API option shown as "Coming soon" (disabled)
- `apps/web/app/campaign-sets/new/components/DataSourceCombobox.tsx`
  - Dropdown selector with type badges
- `apps/web/app/data-sources/page.tsx` - List page with table, search, pagination
- `apps/web/app/data-sources/components/DataSourcesTable.tsx` - Table with type badges, status
- **Missing:** Sync status, last synced column, sync button

### Job Queue Infrastructure (Complete)
- `apps/api/src/jobs/queue.ts` - pg-boss singleton with PostgreSQL backend
- `apps/api/src/jobs/types.ts` - Job type definitions
- `apps/api/src/jobs/handlers/sync-from-platform.ts` - Example scheduled job pattern
- Retry configuration (3 retries, 30s delay), expiration (24h), archival (7 days)

---

## What We're Building Now

### Phase 0: Data Item CRUD API (Foundation)

**Why FIRST:** This is the foundation. Every ingestion method calls these endpoints. Build once, test thoroughly, use everywhere.

**Priority:** CRITICAL

#### 0A: Item CRUD Endpoints

Path: `apps/api/src/routes/data-sources.ts` (extend existing)

**Endpoints:**

```
POST /api/v1/data-sources/{id}/items
Description: Bulk insert items into a data source
Request: {
  items: Record<string, unknown>[],
  mode: 'append' | 'replace'  // 'replace' clears existing first
}
Response: { inserted: number, total: number }

GET /api/v1/data-sources/{id}/items
Description: List items with pagination (already exists as /rows)
Query: { page?: number, limit?: number }
Response: { data: DataRow[], total: number, page: number, totalPages: number }

PUT /api/v1/data-sources/{id}/items/{itemId}
Description: Update a single item
Request: { data: Record<string, unknown> }
Response: DataRow

DELETE /api/v1/data-sources/{id}/items/{itemId}
Description: Delete a single item
Response: 204 No Content

DELETE /api/v1/data-sources/{id}/items
Description: Clear all items (for re-sync)
Response: { deleted: number }
```

**Deliverables:**
- [ ] `POST /items` endpoint with bulk insert (batch size 100)
- [ ] `PUT /items/:itemId` endpoint for single item updates
- [ ] `DELETE /items/:itemId` endpoint for single item deletion
- [ ] `DELETE /items` endpoint to clear all items (with confirmation query param)
- [ ] Zod schemas for all request/response types
- [ ] OpenAPI documentation for all endpoints
- [ ] Unit tests for each endpoint

**Scale-Aware Requirements (incorporated):**
- [ ] Row limit enforcement (500K default, configurable via `DATA_SOURCE_MAX_ROWS` env var)
- [ ] Batch inserts in chunks of 100 rows per INSERT statement
- [ ] Transaction chunking: commit every 10,000 rows to avoid long locks
- [ ] Return `{ inserted, total, limitReached?: boolean }` response
- [ ] Stream processing: never load entire payload into memory at once
- [ ] Row count validation before insert (reject if would exceed limit)

**Bulk Insert Implementation Details:**
```typescript
// Pseudo-code for scale-aware bulk insert
async function bulkInsert(dataSourceId: string, items: unknown[], mode: 'append' | 'replace') {
  const MAX_ROWS = parseInt(process.env.DATA_SOURCE_MAX_ROWS ?? '500000');
  const BATCH_SIZE = 100;
  const COMMIT_EVERY = 10000;

  // Check current count + new items won't exceed limit
  const currentCount = await getRowCount(dataSourceId);
  const wouldExceed = mode === 'append' && (currentCount + items.length > MAX_ROWS);
  if (wouldExceed) {
    throw new Error(`Would exceed row limit of ${MAX_ROWS}. Current: ${currentCount}, Adding: ${items.length}`);
  }

  if (mode === 'replace') {
    await clearAllItems(dataSourceId);
  }

  // Insert in batches with periodic commits
  let inserted = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await insertBatch(dataSourceId, batch);
    inserted += batch.length;

    if (inserted % COMMIT_EVERY === 0) {
      // Periodic commit to release locks
    }
  }

  return { inserted, total: await getRowCount(dataSourceId) };
}
```

#### 0B: API Key Authentication for External Push

Path: `apps/api/src/routes/data-sources.ts` and `apps/api/src/middleware/api-key-auth.ts`

**Deliverables:**
- [ ] API key generation endpoint: `POST /api/v1/data-sources/{id}/api-key`
- [ ] API key storage in data source config (hashed)
- [ ] API key header validation middleware (`X-API-Key` header)
- [ ] API key regeneration endpoint: `POST /api/v1/data-sources/{id}/api-key/regenerate`
- [ ] Rate limiting per API key (100 req/min default)

**Config Structure:**
```typescript
interface DataSourceConfig {
  // For API Push sources
  apiKey?: {
    keyHash: string;           // bcrypt hash of the key
    createdAt: string;         // ISO timestamp
    lastUsedAt?: string;       // ISO timestamp
    rateLimit?: number;        // requests per minute
  };
  // ... other config fields
}
```

---

### Phase 1: Ingestion Adapters

**Priority:** HIGH

#### 1A: CSV Paste Form

Path: `apps/web/app/campaign-sets/new/components/CsvPasteForm.tsx`

**Why:** Quick win. Reuses existing CSV parsing. Users can paste from email, other apps, etc.

**Deliverables:**
- [ ] Large textarea for pasting CSV content (min 300px height)
- [ ] Character count display with warning at 500KB+
- [ ] "Preview" button to validate CSV before creation
- [ ] Preview table showing first 5 rows with headers
- [ ] Error handling for malformed CSV
- [ ] Integration with `CreateDataSourceDrawer.tsx`
- [ ] On submit: calls `POST /data-sources`, then `POST /data-sources/:id/items` with `mode: 'replace'`

**Example Use Cases:**
1. User copies product data from a Google Sheet and pastes directly
2. User receives CSV data via email and pastes the content
3. User wants to quickly test with a small dataset without creating a file
4. User pastes data exported from another marketing tool

**API Flow:**
```
1. POST /api/v1/data-sources/preview-csv  (validate)
   Request: { content: string, rows?: number }
   Response: { headers: string[], preview: Record<string, string>[] }

2. POST /api/v1/data-sources  (create source)
   Request: { name: string, type: 'csv', config: { source: 'paste' } }
   Response: DataSource

3. POST /api/v1/data-sources/{id}/items  (insert data)
   Request: { items: parsedRows, mode: 'replace' }
   Response: { inserted: number, total: number }
```

#### 1B: API Push Endpoint

Path: External systems POST to `POST /api/v1/data-sources/{id}/items`

**Why:** Enables Zapier, webhooks, custom integrations to push data directly.

**Deliverables:**
- [ ] Accept `X-API-Key` header for authentication
- [ ] Support both single item and bulk item insertion
- [ ] Return clear error messages for auth failures
- [ ] Log API key usage for debugging
- [ ] UI to display API key (once) and copy to clipboard
- [ ] UI to show API endpoint URL for external systems

**Request Examples:**
```bash
# Single item
curl -X POST https://api.dotoro.io/api/v1/data-sources/abc123/items \
  -H "X-API-Key: ds_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"product": "Widget", "price": 29.99}]}'

# Bulk items
curl -X POST https://api.dotoro.io/api/v1/data-sources/abc123/items \
  -H "X-API-Key: ds_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"items": [...], "mode": "append"}'
```

**UI Component: `ApiPushConfig.tsx`**
- Display API endpoint URL
- Generate/regenerate API key button
- Show key once after generation (with copy button)
- Show last used timestamp
- Show usage count (requests in last 24h)

---

### Phase 2: API Fetch Data Source

**Priority:** HIGH

**Why:** Core differentiating feature. Enables dynamic campaign data from CRM, PIM, inventory APIs.

#### 2A: Config TypeScript Interfaces

Path: `packages/database/src/schema/data-sources.ts` (TypeScript interfaces only, no schema changes)

```typescript
interface ApiFetchConfig {
  url: string;                              // Endpoint URL
  method: 'GET' | 'POST';                   // HTTP method
  headers?: Record<string, string>;         // Custom headers
  body?: string;                            // Request body for POST (JSON string)
  syncFrequency: SyncFrequency;             // How often to re-fetch
  lastSyncAt?: string;                      // ISO timestamp of last sync
  lastSyncStatus?: 'success' | 'error' | 'syncing';
  lastSyncError?: string;                   // Error message if failed
  lastSyncDuration?: number;                // Duration in ms
  flattenConfig?: JsonFlattenConfig;
  authType?: 'none' | 'bearer' | 'api-key' | 'basic';
  authCredentials?: string;                 // Token or encoded credentials
}

type SyncFrequency =
  | 'manual'      // Only sync when user requests
  | '1h'          // Every hour
  | '6h'          // Every 6 hours
  | '24h'         // Daily
  | '7d';         // Weekly

interface JsonFlattenConfig {
  dataPath?: string;          // JSONPath to array (e.g., "data.items", "results")
  maxDepth?: number;          // Max nesting depth (default: 3)
  arrayHandling: 'join' | 'first' | 'expand';
  arraySeparator?: string;    // For 'join' mode (default: ", ")
}
```

#### 2B: JSON Flattening Utility

Path: `packages/core/src/data/json-flatten.ts`

**Deliverables:**
- [ ] `flattenJson(data: unknown, config: JsonFlattenConfig): Record<string, unknown>[]`
- [ ] Support for nested object flattening with dot-notation keys
- [ ] Configurable array handling (join, first element, or expand into rows)
- [ ] Path extraction for targeting nested arrays (e.g., `response.data.items`)
- [ ] Type preservation for numbers, booleans, dates
- [ ] Unit tests with comprehensive edge cases

**Example Input:**
```json
{
  "data": {
    "items": [
      {
        "id": 1,
        "product": { "name": "Widget", "price": 29.99 },
        "tags": ["sale", "new"]
      }
    ]
  }
}
```

**Example Output (with `dataPath: "data.items"`, `arrayHandling: "join"`):**
```json
[
  {
    "id": 1,
    "product.name": "Widget",
    "product.price": 29.99,
    "tags": "sale, new"
  }
]
```

**Edge Cases to Test:**
- Empty arrays
- Null values at various depths
- Arrays of primitives
- Mixed types in arrays
- Circular references (should throw)
- Very deep nesting (respect maxDepth)

#### 2C: API Fetch Service

Path: `apps/api/src/services/api-fetch-service.ts`

**Deliverables:**
- [ ] `fetchAndIngest(dataSourceId: string, config: ApiFetchConfig): Promise<FetchResult>`
- [ ] HTTP client with timeout (30s default)
- [ ] Header injection (including auth headers)
- [ ] Response validation (JSON content type)
- [ ] Error handling with descriptive messages
- [ ] Rate limiting awareness (respect 429 responses with Retry-After)
- [ ] Flatten JSON response using core utility
- [ ] Call `DELETE /items` then `POST /items` (replace mode)

**Interface:**
```typescript
interface FetchResult {
  success: boolean;
  rowCount: number;
  columns: string[];
  duration: number;      // ms
  error?: string;
}
```

#### 2D: Sync Job Handler

Path: `apps/api/src/jobs/handlers/sync-api-data-source.ts`

**Deliverables:**
- [ ] Job type: `sync-api-data-source`
- [ ] Job data: `{ dataSourceId: string, userId: string, triggeredBy: 'schedule' | 'manual' }`
- [ ] Fetch data using API fetch service
- [ ] Update `lastSyncAt`, `lastSyncStatus`, `lastSyncError` in data source config
- [ ] Clear existing items and insert new ones (atomic replace)
- [ ] Log sync metrics (duration, row count)

**Job Registration:**
```typescript
export const SYNC_API_DATA_SOURCE_JOB = "sync-api-data-source";

export async function registerSyncApiDataSourceHandler(boss: PgBoss): Promise<void> {
  await boss.createQueue(SYNC_API_DATA_SOURCE_JOB);
  boss.work<SyncApiDataSourceJob, SyncResult>(
    SYNC_API_DATA_SOURCE_JOB,
    async (job) => { /* handler implementation */ }
  );
}
```

#### 2E: Scheduled Sync Orchestrator

Path: `apps/api/src/jobs/handlers/schedule-api-syncs.ts`

**Deliverables:**
- [ ] Cron-style job that runs every 15 minutes
- [ ] Query all API data sources where `syncFrequency` is not `manual`
- [ ] Check if sync is due based on `lastSyncAt` and `syncFrequency`
- [ ] Enqueue `sync-api-data-source` jobs for due sources
- [ ] Avoid duplicate jobs (check if job already pending)
- [ ] Stagger job start times to avoid thundering herd

**Scheduling Logic:**
```typescript
function isSyncDue(frequency: SyncFrequency, lastSyncAt: Date | null): boolean {
  if (!lastSyncAt) return true; // Never synced
  const now = Date.now();
  const lastSync = lastSyncAt.getTime();
  const intervals = {
    '1h': 3600000,
    '6h': 21600000,
    '24h': 86400000,
    '7d': 604800000
  };
  return now - lastSync >= intervals[frequency];
}
```

#### 2F: API Routes Extension

Path: `apps/api/src/routes/data-sources.ts` (extend existing)

**New Endpoints:**

```
POST /api/v1/data-sources (type: 'api')
Request: {
  name: string,
  type: 'api',
  config: ApiFetchConfig
}
Response: DataSourceSchema

POST /api/v1/data-sources/{id}/sync
Description: Trigger manual sync for API data source
Response: { jobId: string, status: 'queued' }

POST /api/v1/data-sources/{id}/test-connection
Description: Test API connection and preview response
Request: { url, method, headers, body }
Response: { success: boolean, preview: unknown, error?: string }
```

**Deliverables:**
- [ ] Validate API config on creation (URL format, valid method, etc.)
- [ ] Test connection endpoint for previewing API response
- [ ] Manual sync endpoint that enqueues job
- [ ] Trigger initial sync job on creation

#### 2G: API Fetch Form UI

Path: `apps/web/app/campaign-sets/new/components/ApiDataSourceForm.tsx`

**Deliverables:**
- [ ] URL input with validation
- [ ] Method dropdown (GET/POST)
- [ ] Headers editor (key-value pairs, add/remove)
- [ ] Body textarea for POST requests (with JSON validation)
- [ ] Auth type selector (None, Bearer Token, API Key, Basic)
- [ ] Sync frequency selector
- [ ] "Test Connection" button to preview response
- [ ] Response preview with column detection
- [ ] JSON path input for nested data extraction
- [ ] Flatten options UI (array handling mode)
- [ ] Integration with `CreateDataSourceDrawer.tsx`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| URL | text | Yes | API endpoint URL |
| Method | select | Yes | GET or POST |
| Headers | key-value | No | Custom headers |
| Body | textarea | POST only | JSON request body |
| Auth Type | select | No | Authentication method |
| Auth Value | text | Conditional | Token or credentials |
| Data Path | text | No | JSONPath to data array |
| Array Handling | select | No | join / first / expand |
| Sync Frequency | select | Yes | How often to sync |

---

### Phase 3: Google Sheets Integration

**Priority:** MEDIUM

**Why:** Very common request. Users already have data in Sheets. Once OAuth is set up, the sync mechanism is identical to API Fetch.

#### 3A: Google OAuth Setup

**Deliverables:**
- [ ] Google Cloud project with Sheets API enabled
- [ ] OAuth 2.0 credentials (client ID, client secret)
- [ ] Environment variables for credentials
- [ ] OAuth callback route: `GET /api/v1/auth/google/callback`
- [ ] Token storage in database (encrypted)
- [ ] Token refresh mechanism

**OAuth Flow:**
```
1. User clicks "Connect Google Sheets"
2. Redirect to Google OAuth consent screen
3. User grants access to Sheets (read-only scope)
4. Callback receives code, exchanges for tokens
5. Store refresh token in database
6. User can now select sheets to sync
```

#### 3B: Google Sheets Service

Path: `apps/api/src/services/google-sheets-service.ts`

**Deliverables:**
- [ ] `listSpreadsheets(userId: string): Promise<Spreadsheet[]>`
- [ ] `listSheets(spreadsheetId: string): Promise<Sheet[]>`
- [ ] `fetchSheetData(spreadsheetId: string, sheetName: string): Promise<Row[]>`
- [ ] Automatic token refresh on 401
- [ ] Rate limiting awareness
- [ ] Convert sheet data to standard row format

**Config Structure:**
```typescript
interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetName: string;      // For display
  sheetName: string;            // Tab name
  syncFrequency: SyncFrequency;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'error' | 'syncing';
  lastSyncError?: string;
  headerRow?: number;           // Default: 1
}
```

#### 3C: Google Sheets Sync Job

Path: `apps/api/src/jobs/handlers/sync-google-sheets.ts`

**Deliverables:**
- [ ] Job type: `sync-google-sheets`
- [ ] Reuse existing schedule orchestrator pattern
- [ ] Fetch sheet data using Google Sheets service
- [ ] Clear and replace items (same as API Fetch)
- [ ] Update sync status in config

#### 3D: Google Sheets Picker UI

Path: `apps/web/app/campaign-sets/new/components/GoogleSheetsForm.tsx`

**Deliverables:**
- [ ] "Connect Google Account" button (if not connected)
- [ ] Spreadsheet picker dropdown (searchable)
- [ ] Sheet/tab picker dropdown
- [ ] Preview of first 5 rows
- [ ] Sync frequency selector
- [ ] Header row selector (default: row 1)
- [ ] Integration with `CreateDataSourceDrawer.tsx`

---

### Phase 4: Data Sources List UI Enhancement

**Priority:** HIGH (essential for sync visibility)

Path: `apps/web/app/data-sources/page.tsx` and `apps/web/app/data-sources/components/DataSourcesTable.tsx`

#### 4A: Table Column Enhancements

**New Columns:**
| Column | Description |
|--------|-------------|
| Name | Data source name (link to detail) |
| Type | Badge: `CSV`, `API Fetch`, `API Push`, `Google Sheets` |
| Rows | Row count |
| Last Synced | Relative timestamp ("2 hours ago", "Never") + status badge |
| Sync Freq | For scheduled: `Hourly`, `Daily`, etc. For manual: `--` |
| Actions | Sync button, Edit, Delete |

**Deliverables:**
- [ ] Add `lastSyncAt` column with relative time formatting (use date-fns `formatDistanceToNow`)
- [ ] Add sync status badge: `synced` (green), `syncing` (blue/animated), `error` (red), `pending` (gray)
- [ ] Add sync frequency column for API/Sheets sources
- [ ] Extend DataSource type to include sync fields from config

#### 4B: Manual Sync Button

**Deliverables:**
- [ ] "Sync" button in actions column (only for API Fetch and Google Sheets types)
- [ ] Button states:
  - Default: `Sync` (refresh icon)
  - In Progress: `Syncing...` (spinner, disabled)
  - Just Completed: `Synced` (checkmark, auto-revert after 3s)
  - Error: `Retry` (warning icon)
- [ ] On click: `POST /api/v1/data-sources/{id}/sync`
- [ ] Poll for status updates every 3s while syncing
- [ ] Toast notification on completion/error

**Sync Button Component:**
```tsx
interface SyncButtonProps {
  dataSourceId: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  onSync: () => void;
}
```

#### 4C: Real-time Status Updates

**Deliverables:**
- [ ] Polling mechanism: refresh sync status every 10s for sources with `syncing` status
- [ ] Optimistic UI update when sync button clicked
- [ ] Toast notifications for sync complete/error
- [ ] Auto-refresh table after any sync completes

#### 4D: Error Display

**Deliverables:**
- [ ] Error badge with hover tooltip showing error message
- [ ] Click on error badge opens detail modal with full error
- [ ] "View logs" link to sync history (future enhancement)

---

## Not In Scope

### Real-time Webhooks (Inbound)
- **Why:** Requires persistent webhook endpoint, security considerations (signature verification), complex error handling
- **Future Consideration:** Phase 5 - could trigger immediate sync on webhook receipt

### Data Transformation Pipeline
- **Why:** Complex feature that deserves its own project (already exists as "transforms" feature)
- **Current State:** Users can create transforms that reference data sources

### Multi-tenant Data Isolation
- **Why:** Authentication system not yet implemented (userId is nullable)
- **Note:** Current implementation prepares for this with userId field

### Encrypted Credential Storage
- **Why:** Requires key management infrastructure
- **Workaround:** API keys are hashed. OAuth tokens should be encrypted at rest.
- **Future Consideration:** Use AWS KMS or similar for encryption keys

### Database Connections
- **Why:** Security complexity (credential management, network access, SQL injection)
- **Future Consideration:** Phase 6 with proper security review

---

## Implementation Plan

### Step 1: Item CRUD API (3-4 hours)
1. Add `POST /data-sources/:id/items` endpoint (bulk insert)
2. Add `DELETE /data-sources/:id/items` endpoint (clear all)
3. Add `PUT /data-sources/:id/items/:id` endpoint (update single)
4. Add `DELETE /data-sources/:id/items/:id` endpoint (delete single)
5. Add Zod schemas and OpenAPI docs
6. Write unit tests for each endpoint

### Step 2: API Key Authentication (2-3 hours)
1. Create API key generation endpoint
2. Add API key middleware with header validation
3. Store hashed key in data source config
4. Add rate limiting per API key
5. Write tests for auth flow

### Step 3: CSV Paste Form (2-3 hours)
1. Create `CsvPasteForm.tsx` component with textarea and preview
2. Integrate with `CreateDataSourceDrawer.tsx` as new source type option
3. Use existing preview endpoint, then call new items API
4. Add tests for component

### Step 4: JSON Flattening Utility (3-4 hours)
1. Create `packages/core/src/data/json-flatten.ts`
2. Implement recursive flattening with dot-notation
3. Handle array modes (join, first, expand)
4. Add comprehensive unit tests
5. Export from package

### Step 5: API Fetch Service (3-4 hours)
1. Create `apps/api/src/services/api-fetch-service.ts`
2. Implement fetch with timeout and error handling
3. Integrate JSON flattening
4. Add authentication header injection
5. Write integration tests

### Step 6: Sync Job Infrastructure (3-4 hours)
1. Create `sync-api-data-source` job handler
2. Create scheduler job that runs every 15 minutes
3. Register jobs in `apps/api/src/jobs/index.ts`
4. Add job queue configuration for new job types
5. Write tests for job handlers

### Step 7: API Fetch Form UI (4-5 hours)
1. Create `ApiDataSourceForm.tsx` with all fields
2. Add "Test Connection" functionality
3. Build headers editor component
4. Add JSON path selector with response preview
5. Integrate with drawer component
6. Add form validation

### Step 8: Data Sources List Enhancement (3-4 hours)
1. Add lastSyncAt and sync status columns to table
2. Create SyncButton component with states
3. Add polling for sync status updates
4. Add toast notifications for sync events
5. Test end-to-end sync flow

### Step 9: Google Sheets Integration (6-8 hours)
1. Set up Google Cloud project and OAuth
2. Create OAuth callback route
3. Implement Google Sheets service
4. Create sync job handler
5. Build sheet picker UI
6. Integration testing

**Total Estimated Time:** 30-40 hours

---

## Definition of Done

### Core Infrastructure
- [ ] Item CRUD API is complete with bulk insert, clear all, and single-item operations
- [ ] API key authentication enables external systems to push data
- [ ] All endpoints have OpenAPI documentation

### Ingestion Adapters
- [ ] CSV Paste works end-to-end (paste -> preview -> create -> items inserted)
- [ ] API Fetch syncs data from external APIs on schedule
- [ ] API Push accepts authenticated requests from external systems
- [ ] Google Sheets OAuth flow works and data syncs on schedule

### UI Requirements
- [ ] `/data-sources` page shows Last Synced timestamp (relative format)
- [ ] `/data-sources` page shows sync status badges (synced, syncing, error)
- [ ] Manual "Sync" button triggers immediate sync for API/Sheets sources
- [ ] Sync button shows loading state while job is in progress
- [ ] Error states are clearly displayed with actionable messages

### Quality
- [ ] Unit tests cover JSON flattening edge cases
- [ ] Integration tests cover API data source lifecycle
- [ ] No regression in existing CSV upload functionality
- [ ] Error handling provides clear, actionable messages

---

## Notes

### Tech Stack
| Layer | Technology | Why |
|-------|------------|-----|
| Database | PostgreSQL + Drizzle ORM | Existing stack, JSONB for flexible config |
| Job Queue | pg-boss | Already in use, PostgreSQL-backed (no Redis needed) |
| HTTP Client | Native fetch | Available in Node 18+, no dependencies |
| Validation | Zod | Consistent with existing API schemas |
| UI Framework | React + Next.js | Existing frontend stack |
| Date Formatting | date-fns | `formatDistanceToNow` for relative timestamps |

### Design Principles
- **CRUD First:** All data manipulation goes through the item CRUD API
- **Progressive Disclosure:** Show advanced options only when needed
- **Fail Fast:** Validate configuration on creation, provide immediate feedback
- **Graceful Degradation:** If sync fails, show last successful data with error indicator
- **Audit Trail:** Store sync history for debugging and compliance

### Best Practices
- **Credential Handling:** Never log full API keys/tokens; hash keys before storage; mask in UI
- **Rate Limiting:** Respect 429 responses with exponential backoff; limit API Push requests per key
- **Timeout Handling:** 30-second default timeout; configurable per data source
- **Error Messages:** Provide actionable error messages (e.g., "401 Unauthorized - check your API key")
- **Idempotency:** Sync operations should be idempotent (re-running produces same result)

---

## File Reference

### Files to Create
```
packages/core/src/data/json-flatten.ts
packages/core/src/data/__tests__/json-flatten.test.ts
apps/api/src/services/api-fetch-service.ts
apps/api/src/services/google-sheets-service.ts
apps/api/src/services/__tests__/api-fetch-service.test.ts
apps/api/src/middleware/api-key-auth.ts
apps/api/src/jobs/handlers/sync-api-data-source.ts
apps/api/src/jobs/handlers/sync-google-sheets.ts
apps/api/src/jobs/handlers/schedule-api-syncs.ts
apps/api/src/jobs/handlers/__tests__/sync-api-data-source.test.ts
apps/web/app/campaign-sets/new/components/CsvPasteForm.tsx
apps/web/app/campaign-sets/new/components/CsvPasteForm.module.css
apps/web/app/campaign-sets/new/components/ApiDataSourceForm.tsx
apps/web/app/campaign-sets/new/components/ApiDataSourceForm.module.css
apps/web/app/campaign-sets/new/components/GoogleSheetsForm.tsx
apps/web/app/campaign-sets/new/components/GoogleSheetsForm.module.css
apps/web/app/campaign-sets/new/components/HeadersEditor.tsx
apps/web/app/campaign-sets/new/components/ApiPushConfig.tsx
apps/web/app/data-sources/components/SyncButton.tsx
apps/web/app/data-sources/components/SyncButton.module.css
```

### Files to Modify
```
packages/database/src/schema/data-sources.ts (add TypeScript interfaces)
apps/api/src/schemas/data-sources.ts (add item CRUD and sync schemas)
apps/api/src/routes/data-sources.ts (add item CRUD endpoints, sync endpoint)
apps/api/src/jobs/index.ts (register new job handlers)
apps/web/app/campaign-sets/new/components/CreateDataSourceDrawer.tsx (add new forms)
apps/web/app/data-sources/page.tsx (add sync polling, toasts)
apps/web/app/data-sources/components/DataSourcesTable.tsx (add sync columns, button)
apps/web/app/data-sources/types.ts (extend DataSource type with sync fields)
```
