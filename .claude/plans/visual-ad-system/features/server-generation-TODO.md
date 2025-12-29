# Server-Side Batch Rendering (server-generation)

**Project:** Dotoro - Visual Ad System
**Date:** 2025-12-29
**Status:** Complete
**Depends On:** canvas-editor (template JSON format required for rendering)

---

## Overview

Server-side rendering system that batch generates images from visual templates combined with data source rows. Uses Fabric.js with node-canvas backend to render template JSON into PNG/JPEG images, upload to R2 storage, and track generation jobs.

**Why This Matters:**
- Enables dynamic ad creative generation at scale (100 products x 4 aspect ratios = 400 images)
- Decouples rendering from client, allowing batch processing and scheduling
- Provides CDN-ready assets for ad platform integrations

---

## Goal

Enable users to generate production-ready ad creatives by combining visual templates with dynamic data, producing CDN-hosted images ready for ad platform deployment.

### Success Criteria

- [ ] Single image preview renders in under 2 seconds (data URL response)
- [ ] Batch job processes 100 images/minute minimum throughput
- [ ] All text variables ({{variable}}) correctly interpolated from data rows
- [ ] Image URL variables load and composite into canvas correctly
- [ ] Generated images match aspect ratio specifications exactly
- [ ] R2 uploads succeed with CDN URLs returned
- [ ] Job progress tracking updates in real-time via existing pg-boss infrastructure
- [ ] Failed generations are logged with actionable error messages
- [ ] Memory usage stays under 512MB per worker during batch processing

---

## What's Already Done

### Infrastructure (Complete)

- [x] **pg-boss job queue** - `apps/api/src/jobs/queue.ts`
  - Promise-based singleton pattern
  - Handler registration with `setHandlersRegistrationPromise()`
  - Batch processing support in v10+

- [x] **R2 Storage service** - `apps/api/src/services/storage.ts`
  - `S3StorageService` and `MockStorageService` implementations
  - Presigned URL generation for uploads
  - CDN URL support via `CDN_URL` env var
  - Content type validation (image/jpeg, image/png, image/gif)

### Database Schema (Complete)

- [x] **Teams table** - `packages/database/src/schema/teams.ts`
  - Team-based resource ownership
  - Role-based permissions (owner, admin, editor, viewer)

- [x] **Data sources** - `packages/database/src/schema/data-sources.ts`
  - `dataSources` table with team_id, type, config JSONB
  - `dataRows` table with row_data JSONB, row_index
  - Support for CSV, API, manual, google-sheets types

- [x] **Creatives table** - `packages/database/src/schema/creatives.ts`
  - Existing pattern for `storageKey`, `cdnUrl`, `dimensions`
  - Status enum: PENDING, UPLOADED, PROCESSING, READY, FAILED

### Existing Job Handlers (Reference Patterns)

- [x] `sync-campaign-set.ts` - Job handler with events pattern
- [x] `sync-google-sheets.ts` - Data source job pattern
- [x] `types.ts` - JobStatus, JobState, QueuedJobResponse types

---

## What We're Building Now

### Phase 1: Database Schema

**Priority: HIGH** - Foundation for all generation tracking

#### 1.1 Generated Creatives Table

Location: `packages/database/src/schema/generated-creatives.ts`

- [x] Create `generatedCreativeStatusEnum` - pending, processing, completed, failed
- [x] Create `generatedCreatives` table with columns:
  - [x] `id` - UUID primary key
  - [x] `teamId` - UUID FK to teams (cascade delete)
  - [x] `templateId` - UUID (FK to visual_templates when canvas-editor complete)
  - [x] `variantId` - UUID nullable (for A/B variants)
  - [x] `dataSourceId` - UUID FK to data_sources (cascade delete)
  - [x] `dataRowId` - UUID FK to data_rows (cascade delete)
  - [x] `variableValues` - JSONB storing resolved variables snapshot
  - [x] `storageKey` - varchar(512) for R2 path
  - [x] `cdnUrl` - text for public CDN URL
  - [x] `width` - integer
  - [x] `height` - integer
  - [x] `fileSize` - integer in bytes
  - [x] `format` - varchar(10) - 'png' or 'jpeg'
  - [x] `generationBatchId` - UUID FK to generation_jobs
  - [x] `status` - enum (pending, processing, completed, failed)
  - [x] `errorMessage` - text nullable
  - [x] `renderDurationMs` - integer for performance tracking
  - [x] `createdAt` - timestamp with timezone
- [x] Add indexes:
  - [x] `generated_creatives_team_idx` on teamId
  - [x] `generated_creatives_batch_idx` on generationBatchId
  - [x] `generated_creatives_status_idx` on status
  - [x] `generated_creatives_template_idx` on templateId
  - [x] `generated_creatives_data_row_idx` on dataRowId
- [x] Export types: `GeneratedCreative`, `NewGeneratedCreative`

#### 1.2 Generation Jobs Table

Location: `packages/database/src/schema/generation-jobs.ts`

- [x] Create `generationJobStatusEnum` - pending, processing, completed, failed, cancelled
- [x] Create `generationJobs` table with columns:
  - [x] `id` - UUID primary key
  - [x] `teamId` - UUID FK to teams (cascade delete)
  - [x] `templateId` - UUID (FK to visual_templates)
  - [x] `dataSourceId` - UUID FK to data_sources (cascade delete)
  - [x] `aspectRatios` - JSONB array e.g., [{width: 1080, height: 1080}, {width: 1200, height: 628}]
  - [x] `rowFilter` - JSONB nullable for filtering specific rows
  - [x] `outputFormat` - varchar(10) default 'png'
  - [x] `quality` - integer default 90 (for JPEG)
  - [x] `status` - enum
  - [x] `totalItems` - integer (rows x aspect ratios)
  - [x] `processedItems` - integer default 0
  - [x] `failedItems` - integer default 0
  - [x] `outputCreativeIds` - JSONB array of generated creative UUIDs
  - [x] `errorLog` - JSONB array of {rowId, aspectRatio, error}
  - [x] `startedAt` - timestamp nullable
  - [x] `completedAt` - timestamp nullable
  - [x] `createdAt` - timestamp with timezone
- [x] Add indexes:
  - [x] `generation_jobs_team_idx` on teamId
  - [x] `generation_jobs_status_idx` on status
  - [x] `generation_jobs_template_idx` on templateId
- [x] Define relations to teams, dataSources, generatedCreatives
- [x] Export types: `GenerationJob`, `NewGenerationJob`

#### 1.3 Schema Integration

- [x] Add to `packages/database/src/schema/index.ts`:
  - [x] Export `generatedCreatives`, `generationJobs` tables
  - [x] Export all related types and enums
- [ ] Create Drizzle migration: `pnpm db:generate`
- [ ] Test migration: `pnpm db:migrate`

---

### Phase 2: Generation Service Core

**Priority: HIGH** - Core rendering engine

Location: `apps/api/src/services/creative-generation.ts`

#### 2.1 Fabric.js Node-Canvas Setup

- [x] Install dependencies: `pnpm add fabric canvas`
- [x] Create `initializeFabricCanvas(width: number, height: number): StaticCanvas`
  - [x] Configure node-canvas backend
  - [x] Set default background color (transparent)
  - [x] Return StaticCanvas instance (not interactive Canvas)
- [x] Create cleanup helper to dispose canvas and free memory
- [ ] Add memory usage logging for debugging

#### 2.2 Template Loading

- [x] Create `loadTemplateIntoCanvas(canvas: StaticCanvas, templateJson: object): Promise<void>`
  - [x] Parse Fabric.js JSON format from canvas-editor
  - [x] Load all objects (rect, text, image, group, etc.)
  - [x] Preserve layer ordering (z-index)
  - [ ] Handle missing fonts gracefully (fallback to Arial)
- [x] Create template validation helper:
  - [x] Verify JSON structure
  - [x] Extract list of variable placeholders
  - [ ] Validate dimensions match aspect ratio

#### 2.3 Variable Interpolation Engine

- [x] Create `extractVariables(templateJson: object): string[]`
  - [x] Find all `{{variable_name}}` patterns in text layers
  - [x] Find all `{image_url_variable}` patterns in image sources
  - [x] Return deduplicated list

- [x] Create `interpolateTextVariables(canvas: StaticCanvas, data: Record<string, unknown>): void`
  - [x] Iterate all text objects in canvas
  - [x] Replace `{{variable}}` with data values
  - [x] Handle missing values with fallback (empty string or "[missing]")
  - [x] Preserve text styling (font, size, color, alignment)

- [x] Create `loadImageVariables(canvas: StaticCanvas, data: Record<string, unknown>): Promise<void>`
  - [x] Find image objects with variable URL sources
  - [x] Fetch images from URLs with timeout (10s)
  - [x] Handle image load failures gracefully (placeholder or skip)
  - [ ] Support CORS proxying if needed

#### 2.4 Render and Export

- [x] Create `renderToBuffer(canvas: StaticCanvas, format: 'png' | 'jpeg', quality?: number): Promise<Buffer>`
  - [x] Use canvas.toBuffer() with appropriate options
  - [x] Apply quality setting for JPEG (1-100)
  - [x] Return raw image buffer
- [x] Create `renderToDataUrl(canvas: StaticCanvas, format: 'png' | 'jpeg'): string`
  - [x] For preview endpoint (no upload needed)
  - [x] Return base64 data URL

#### 2.5 Storage Integration

- [x] Create `uploadGeneratedCreative(buffer: Buffer, metadata: UploadMetadata): Promise<UploadResult>`
  - [x] Generate storage key: `generated/${teamId}/${jobId}/${creativeId}.${format}`
  - [x] Upload buffer to R2 using putObject (not presigned URL)
  - [x] Return CDN URL and storage key
- [ ] Implement streaming upload for large images (> 5MB)

#### 2.6 Service Class

- [x] Create `CreativeGenerationService` class:
  ```typescript
  class CreativeGenerationService {
    // Preview single image (returns data URL)
    async generatePreview(templateId: string, variableData: Record<string, unknown>, aspectRatio: AspectRatio): Promise<string>;

    // Generate and upload single image
    async generateSingle(params: SingleGenerationParams): Promise<GeneratedCreative>;

    // Start batch generation job
    async startBatchJob(params: BatchJobParams): Promise<GenerationJob>;

    // Process single item within batch (called by job handler)
    async processItem(jobId: string, rowId: string, aspectRatio: AspectRatio): Promise<GeneratedCreative>;
  }
  ```
- [x] Add proper TypeScript interfaces for all params/results
- [x] Implement singleton pattern with `getCreativeGenerationService()`

---

### Phase 3: API Routes

**Priority: HIGH** - External interface for generation

Location: `apps/api/src/routes/generate.ts`

#### 3.1 Zod Schemas

Location: `apps/api/src/schemas/generate.ts`

- [x] Create `aspectRatioSchema` - { width: number, height: number }
- [x] Create `previewRequestSchema`:
  - [x] templateId: z.string().uuid()
  - [x] variableData: z.record(z.string(), z.unknown())
  - [x] aspectRatio: aspectRatioSchema
- [x] Create `previewResponseSchema`:
  - [x] dataUrl: z.string()
  - [x] width: z.number()
  - [x] height: z.number()
  - [x] renderDurationMs: z.number()
- [x] Create `singleGenerationRequestSchema`:
  - [x] templateId, dataSourceId, dataRowId
  - [x] aspectRatio
  - [x] format: z.enum(['png', 'jpeg']).default('png')
  - [x] quality: z.number().min(1).max(100).default(90)
- [x] Create `batchGenerationRequestSchema`:
  - [x] templateId, dataSourceId
  - [x] aspectRatios: z.array(aspectRatioSchema)
  - [x] rowFilter: z.object({...}).optional()
  - [x] format, quality
- [x] Create `generationJobSchema` - matches DB table
- [x] Create `generatedCreativeSchema` - matches DB table

#### 3.2 Route Definitions

- [x] POST `/api/v1/generate/preview`
  - [x] Request: previewRequestSchema
  - [x] Response: previewResponseSchema
  - [x] No auth required for preview (rate limited)
  - [x] Returns data URL directly (no storage)

- [x] POST `/api/v1/generate/single`
  - [x] Request: singleGenerationRequestSchema
  - [x] Response: generatedCreativeSchema
  - [x] Auth required, team context
  - [x] Synchronous - waits for generation

- [x] POST `/api/v1/generate/batch`
  - [x] Request: batchGenerationRequestSchema
  - [x] Response: QueuedJobResponse (jobId, status: 'queued')
  - [x] Auth required, team context
  - [x] Async - queues job and returns immediately

- [x] GET `/api/v1/generate/jobs`
  - [x] Query: page, limit, status filter
  - [x] Response: paginated generationJobSchema[]
  - [x] Auth required, filtered by team

- [x] GET `/api/v1/generate/jobs/:id`
  - [x] Response: generationJobSchema with progress
  - [x] Auth required, team ownership check

- [x] GET `/api/v1/generate/jobs/:id/results`
  - [x] Query: page, limit
  - [x] Response: paginated generatedCreativeSchema[]
  - [x] Auth required, team ownership check

- [x] DELETE `/api/v1/generate/jobs/:id`
  - [x] Cancel job if status is pending/processing
  - [x] Auth required (admin or owner)
  - [x] Returns success/failure

#### 3.3 Route Implementation

- [x] Create `generateApp` OpenAPIHono instance
- [x] Implement all route handlers with proper error handling
- [x] Add team context validation from auth middleware
- [x] Register in `apps/api/src/routes/index.ts`
- [x] Add to OpenAPI tags

---

### Phase 4: Job Handler

**Priority: HIGH** - Background batch processing

Location: `apps/api/src/jobs/handlers/generate-creatives.ts`

#### 4.1 Job Types

Add to `apps/api/src/jobs/types.ts`:

- [x] Create `GenerateCreativesJob` interface:
  - [x] jobId: string (generation_jobs.id)
  - [x] teamId: string
  - [x] templateId: string
  - [x] dataSourceId: string
  - [x] aspectRatios: AspectRatio[]
  - [x] rowFilter?: RowFilter
  - [x] format: 'png' | 'jpeg'
  - [x] quality: number

- [x] Create `GenerateCreativesResult` interface:
  - [x] processed: number
  - [x] failed: number
  - [x] creativeIds: string[]
  - [x] errors: { rowId: string, aspectRatio: AspectRatio, error: string }[]

#### 4.2 Handler Implementation

- [x] Create `GENERATE_CREATIVES_JOB` constant
- [x] Create `createGenerateCreativesHandler()` factory function:
  - [x] Fetch template JSON from database
  - [x] Fetch data rows (with optional filter)
  - [x] Calculate total items (rows x aspect ratios)
  - [x] Update job status to 'processing'

- [x] Implement batch processing loop:
  - [x] For each data row:
    - [x] For each aspect ratio:
      - [x] Create canvas with aspect ratio dimensions
      - [x] Load template
      - [x] Interpolate variables from row data
      - [x] Render to buffer
      - [x] Upload to R2
      - [x] Create generated_creative record
      - [x] Update job progress (processedItems++)
      - [x] Emit progress event
  - [x] Handle individual item failures:
    - [x] Log error to job.errorLog
    - [x] Increment failedItems
    - [x] Continue processing (don't fail entire job)
  - [x] Cleanup canvas after each render (prevent memory leaks)

- [x] Implement `registerGenerateCreativesHandler(boss: PgBoss)`:
  - [x] Create queue: `boss.createQueue(GENERATE_CREATIVES_JOB)`
  - [x] Register worker with batch processing

#### 4.3 Progress Events

- [x] Add to `apps/api/src/jobs/events.ts`:
  - [x] `GenerationProgressEvent` type
  - [x] `emitGenerationProgress()` function
- [ ] Support SSE streaming for job progress

#### 4.4 Job Registration

- [x] Export from `apps/api/src/jobs/index.ts`
- [ ] Register in app startup (where other handlers registered)

---

### Phase 5: Memory Management and Performance

**Priority: MEDIUM** - Production readiness

#### 5.1 Memory Optimization

- [ ] Implement canvas pooling (reuse canvas instances)
- [ ] Add explicit garbage collection hints after batch items
- [ ] Limit concurrent renders per worker (max 3)
- [ ] Stream large images directly to R2 (avoid buffering)

#### 5.2 Rate Limiting

- [ ] Limit R2 uploads to 50/second (avoid 429s)
- [ ] Add backoff on R2 rate limit errors
- [ ] Implement job throttling for large batches

#### 5.3 Error Handling

- [ ] Retry failed image fetches (3 attempts)
- [ ] Timeout image fetches at 10 seconds
- [ ] Graceful degradation for missing variables
- [ ] Capture stack traces in error logs

---

## Not In Scope

### Template Editor Integration

- Will be handled in `canvas-editor` feature
- This feature assumes template JSON format is already defined
- **Why:** Separation of concerns - editor is frontend, generation is backend

### Real-time Preview in Editor

- Canvas editor will have its own client-side preview
- Server-side preview is for programmatic/API use only
- **Why:** Client-side rendering is faster for interactive editing

### Image Optimization/Compression

- No automatic image optimization beyond quality setting
- No WebP/AVIF format support initially
- **Why:** Keep initial scope focused; add optimization layer later

### Variant A/B Testing

- variantId column exists but variant logic not implemented
- No automatic variant distribution
- **Why:** Phase 2 feature after core generation works

### Scheduling/Automation

- No scheduled generation jobs
- No trigger-on-data-change automation
- **Why:** Can be built on top of existing job infrastructure later

### Multi-Template Batch Jobs

- One template per job
- No template composition or merging
- **Why:** Simplifies initial implementation

---

## Implementation Plan

### Step 1: Database Schema (2-3 hours)

1. Create `generated-creatives.ts` schema file
2. Create `generation-jobs.ts` schema file
3. Update schema index exports
4. Generate and run migration
5. Verify tables in database

### Step 2: Generation Service Foundation (4-6 hours)

1. Install and configure fabric + canvas packages
2. Implement canvas initialization and cleanup
3. Implement template loading from JSON
4. Write unit tests for template loading

### Step 3: Variable Interpolation (3-4 hours)

1. Implement text variable extraction and replacement
2. Implement image URL variable loading
3. Handle edge cases (missing variables, failed images)
4. Write unit tests for interpolation

### Step 4: Render and Upload (2-3 hours)

1. Implement buffer rendering (PNG/JPEG)
2. Implement data URL rendering for preview
3. Implement R2 upload with proper key generation
4. Write integration tests with mock storage

### Step 5: API Routes (3-4 hours)

1. Create Zod schemas for all endpoints
2. Implement preview endpoint
3. Implement single generation endpoint
4. Implement batch job endpoints
5. Add OpenAPI documentation

### Step 6: Job Handler (4-5 hours)

1. Define job types
2. Implement handler with progress tracking
3. Implement batch processing loop
4. Add error handling and logging
5. Register handler in startup
6. Write integration tests

### Step 7: Memory and Performance (2-3 hours)

1. Add memory monitoring
2. Implement canvas cleanup
3. Add rate limiting for R2
4. Load test with 100+ item batch

---

## Definition of Done

- [ ] All database migrations run successfully on fresh database
- [ ] Preview endpoint returns valid PNG data URL in < 2 seconds
- [ ] Single generation creates database record with valid CDN URL
- [ ] Batch job with 10 rows x 2 aspect ratios completes successfully
- [ ] Job progress updates visible via GET /jobs/:id
- [ ] Failed items logged with actionable error messages
- [ ] Memory stays under 512MB during 100-item batch
- [ ] All endpoints documented in OpenAPI spec
- [ ] Unit tests cover: template loading, variable interpolation, rendering
- [ ] Integration tests cover: full generation flow, job lifecycle
- [ ] No TypeScript errors, ESLint clean

---

## Notes

### Tech Stack Choices

| Technology | Why |
|------------|-----|
| **Fabric.js** | Industry-standard canvas library with excellent JSON serialization, same as canvas-editor frontend |
| **node-canvas** | Cairo-backed Node.js canvas implementation, production-proven |
| **pg-boss** | Already used for job queue, PostgreSQL-backed, no Redis needed |
| **R2 Storage** | Already configured via storage service, S3-compatible |

### Design Principles

1. **Stateless Workers** - Each generation is independent, no shared state between renders
2. **Fail Fast, Log Everything** - Individual item failures don't stop batch, but are logged
3. **Memory Conscious** - Explicit cleanup, no canvas accumulation
4. **Idempotent Operations** - Re-running failed items produces same result

### API Design

- Preview endpoint is synchronous for immediate feedback
- Batch generation is async with job tracking
- All endpoints use team context from auth middleware
- Results paginated for large batches

### Performance Targets

| Metric | Target |
|--------|--------|
| Preview render | < 2 seconds |
| Single generation | < 5 seconds (including upload) |
| Batch throughput | 100 images/minute |
| Memory per worker | < 512MB |
| R2 upload rate | 50/second max |

---

## Next Steps

### Phase 2: Template Editor Integration

- Wire up canvas-editor output to generation service
- Add template preview in editor using server-side render
- Support template versioning

### Phase 3: Optimization Layer

- Add WebP/AVIF output format support
- Implement image optimization pipeline
- Add thumbnail generation

### Phase 4: Automation

- Trigger generation on data source update
- Scheduled generation jobs
- Webhook notifications on completion

### Phase 5: Analytics

- Track generation metrics (time, success rate)
- Dashboard for job history
- Cost estimation (storage, compute)
