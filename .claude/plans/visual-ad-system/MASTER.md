# Visual Ad System - Master Tracking Document

**Project:** Dotoro - Dynamic Ads Platform
**Created:** 2025-12-29
**Status:** In Progress
**Orchestrator:** Feature Orchestrator v2

---

## Executive Summary

The Visual Ad System enables users to create dynamic, data-driven ad creatives through a Fabric.js-based canvas editor, server-side batch rendering, and seamless integration into the campaign creation workflow. Assets are stored in Cloudflare R2 with CDN delivery.

**Key Outcomes:**
- Visual template editor with variable bindings (`{{product_name}}`, `{product_image}`)
- Server-side batch generation (100+ images/minute)
- Carousel ad support for Facebook and Reddit
- Full integration into campaign wizard workflow

---

## Feature Inventory

| Feature | Status | Priority | Est. Hours | Dependencies |
|---------|--------|----------|------------|--------------|
| [r2-storage](#r2-storage) | ✅ Complete | 1 (Start) | 8-12 | None |
| [asset-library](#asset-library) | ✅ Complete | 2 | 35-45 | r2-storage |
| [canvas-editor](#canvas-editor) | Pending | 3 | 40-55 | asset-library |
| [server-generation](#server-generation) | Pending | 4 | 20-28 | canvas-editor |
| [carousel-support](#carousel-support) | Pending | 4 (parallel) | 27-32 | canvas-editor |
| [wizard-integration](#wizard-integration) | Pending | 5 (final) | 22-30 | canvas-editor, server-generation |

**Total Estimated Hours:** 152-202

---

## Dependency Graph

```
                    ┌─────────────────────────────┐
                    │        r2-storage           │
                    │   (Cloudflare R2 Backend)   │
                    │       Priority: 1           │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │       asset-library         │
                    │   (Folder-based Assets)     │
                    │       Priority: 2           │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │       canvas-editor         │
                    │   (Fabric.js Template UI)   │
                    │       Priority: 3           │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴───────────────┐
                    │                             │
                    ▼                             ▼
    ┌───────────────────────┐     ┌───────────────────────┐
    │   server-generation   │     │   carousel-support    │
    │  (Batch Image Render) │     │  (Multi-Card Editor)  │
    │     Priority: 4       │     │   Priority: 4 (||)    │
    └───────────┬───────────┘     └───────────────────────┘
                │
                ▼
    ┌───────────────────────┐
    │  wizard-integration   │
    │ (Campaign Set Wizard) │
    │     Priority: 5       │
    └───────────────────────┘
```

**Legend:**
- Priority 1: Start immediately, no blockers
- Priority 4 (||): Can run in parallel after canvas-editor
- Priority 5: Final integration, requires all prior features

---

## Feature Details

### r2-storage

**File:** `features/r2-storage-TODO.md`
**Status:** Pending
**Blockers:** None

**Summary:**
Implement production-ready Cloudflare R2 storage operations in the existing `S3StorageService` abstraction. Replace placeholder implementations with AWS SDK v3 operations.

**Key Deliverables:**
- [ ] AWS SDK v3 packages installed (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- [ ] S3 client factory with R2-compatible configuration
- [ ] `generateUploadUrl()` implementation
- [ ] `generateDownloadUrl()` with CDN fallback
- [ ] `deleteObject()` implementation
- [ ] `headObject()` for metadata retrieval
- [ ] Unit tests with >80% coverage
- [ ] Integration tests with R2

**Files to Create/Modify:**
- `apps/api/src/services/storage.ts` (modify)
- `apps/api/src/__tests__/services/storage.test.ts` (create)
- `apps/api/.env.example` (modify)

---

### asset-library

**File:** `features/asset-library-TODO.md`
**Status:** Pending
**Blockers:** r2-storage

**Summary:**
Build a complete asset library system with hierarchical folder organization, search capabilities, and modern UI for browsing, uploading, and organizing creative assets.

**Key Deliverables:**
- [ ] `asset_folders` table with materialized paths
- [ ] `folder_id` column added to `creatives` table
- [ ] Folder CRUD API endpoints
- [ ] Asset listing with folder/search filters
- [ ] Bulk move operations
- [ ] Folder sidebar component with tree view
- [ ] Asset grid/list view with selection
- [ ] Upload zone with progress tracking
- [ ] Asset preview modal
- [ ] Full unit test coverage

**Files to Create:**
- `packages/database/src/schema/asset-folders.ts`
- `apps/api/src/routes/assets.ts`
- `apps/api/src/schemas/assets.ts`
- `apps/api/src/services/asset-folders.ts`
- `apps/web/app/[locale]/[teamSlug]/assets/page.tsx`
- `apps/web/app/[locale]/[teamSlug]/assets/components/*.tsx`
- `apps/web/lib/hooks/useAssetFolders.ts`
- `apps/web/lib/hooks/useAssets.ts`
- `apps/web/lib/hooks/useAssetUpload.ts`

---

### canvas-editor

**File:** `features/canvas-editor-TODO.md`
**Status:** Pending
**Blockers:** asset-library

**Summary:**
Professional-grade visual template editor built on Fabric.js. Supports text variables (`{{variable}}`), image bindings (`{image_url}`), multiple aspect ratios with auto-generated variants, and undo/redo history.

**Key Deliverables:**
- [ ] `design_templates` and `template_variants` database tables
- [ ] Design templates CRUD API routes
- [ ] Variant auto-generation API
- [ ] Fabric.js React wrapper component
- [ ] Canvas state management with undo/redo
- [ ] Editor toolbar, layers panel, properties panel
- [ ] Variables panel with autocomplete
- [ ] Aspect ratio variants with safe zones
- [ ] Template gallery, create, and edit pages
- [ ] Asset picker modal (integration with asset-library)
- [ ] Comprehensive test coverage

**Files to Create:**
- `packages/database/src/schema/design-templates.ts`
- `apps/api/src/routes/design-templates.ts`
- `apps/api/src/schemas/design-templates.ts`
- `apps/api/src/services/design-template-service.ts`
- `apps/web/components/canvas-editor/FabricCanvas.tsx`
- `apps/web/components/canvas-editor/CanvasContext.tsx`
- `apps/web/components/canvas-editor/EditorToolbar.tsx`
- `apps/web/components/canvas-editor/LayersPanel.tsx`
- `apps/web/components/canvas-editor/PropertiesPanel.tsx`
- `apps/web/components/canvas-editor/VariablesPanel.tsx`
- `apps/web/components/canvas-editor/AspectRatioPanel.tsx`
- `apps/web/components/canvas-editor/hooks/*.ts`
- `apps/web/app/[locale]/[teamSlug]/templates/page.tsx`
- `apps/web/app/[locale]/[teamSlug]/templates/new/page.tsx`
- `apps/web/app/[locale]/[teamSlug]/templates/[templateId]/edit/page.tsx`

---

### server-generation

**File:** `features/server-generation-TODO.md`
**Status:** Pending
**Blockers:** canvas-editor

**Summary:**
Server-side batch rendering system that generates images from visual templates combined with data source rows. Uses Fabric.js with node-canvas backend, uploads to R2, and tracks generation jobs via pg-boss.

**Key Deliverables:**
- [ ] `generated_creatives` table
- [ ] `generation_jobs` table for batch tracking
- [ ] Fabric.js node-canvas integration
- [ ] Variable interpolation engine
- [ ] Buffer rendering (PNG/JPEG)
- [ ] R2 upload integration
- [ ] Generation API routes (preview, single, batch)
- [ ] pg-boss job handler for batch processing
- [ ] Memory management and rate limiting
- [ ] Unit and integration tests

**Files to Create:**
- `packages/database/src/schema/generated-creatives.ts`
- `packages/database/src/schema/generation-jobs.ts`
- `apps/api/src/services/creative-generation.ts`
- `apps/api/src/routes/generate.ts`
- `apps/api/src/schemas/generate.ts`
- `apps/api/src/jobs/handlers/generate-creatives.ts`

**Performance Targets:**
- Preview render: < 2 seconds
- Batch throughput: 100 images/minute
- Memory per worker: < 512MB

---

### carousel-support

**File:** `features/carousel-support-TODO.md`
**Status:** Pending
**Blockers:** canvas-editor

**Summary:**
Extend canvas editor for carousel ad creation with two modes: data-driven templates (one template, N cards from N rows) and manual per-card design (2-10 independent cards). Respects Facebook (2-10 cards) and Reddit (2-6 cards) constraints.

**Key Deliverables:**
- [ ] `CarouselTemplate` and `CarouselCard` TypeScript interfaces
- [ ] Carousel mode toggle component
- [ ] Card list with thumbnails
- [ ] Card navigator with keyboard support
- [ ] Per-card canvas editor
- [ ] Drag-drop card reordering
- [ ] Data row selector for data-driven mode
- [ ] Platform constraint validation
- [ ] Carousel preview component
- [ ] Generation pipeline updates for both modes
- [ ] Platform API format mapping (Facebook, Reddit)

**Files to Create:**
- `packages/core/src/templates/types.ts` (extend)
- `apps/web/components/canvas-editor/carousel/CarouselModeToggle.tsx`
- `apps/web/components/canvas-editor/carousel/CarouselCardList.tsx`
- `apps/web/components/canvas-editor/carousel/CardNavigator.tsx`
- `apps/web/components/canvas-editor/carousel/CarouselCardEditor.tsx`
- `apps/web/components/canvas-editor/carousel/CardReorder.tsx`
- `apps/web/components/canvas-editor/carousel/DataRowSelector.tsx`
- `apps/web/components/canvas-editor/carousel/CarouselPreview.tsx`
- `packages/core/src/ad-types/validation.ts` (extend)

---

### wizard-integration

**File:** `features/wizard-integration-TODO.md`
**Status:** Pending
**Blockers:** canvas-editor, server-generation

**Summary:**
Add "Creatives" step to campaign set creation wizard. Supports three modes: direct upload, template selection, and variable mapping to data source columns. Integrates canvas editor for inline template creation.

**Key Deliverables:**
- [ ] 'creatives' added to `WizardStep` type
- [ ] `CreativeConfig` type definition
- [ ] Wizard hook extensions (actions, reducers)
- [ ] Creative validation function
- [ ] `CreativesStep.tsx` component
- [ ] Mode selection UI (upload/template/variable)
- [ ] Creative requirements display
- [ ] Upload mode with ImageUploader/VideoUploader
- [ ] Template picker with filtering
- [ ] Column mapper for variable mode
- [ ] Inline canvas editor integration
- [ ] Generation payload integration
- [ ] Comprehensive tests

**Files to Modify:**
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/types.ts`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/hooks/useGenerateWizard.ts`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/GenerateWizard.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/WizardSidePanel.tsx`

**Files to Create:**
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/CreativesStep.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/CreativesStep.module.css`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/TemplatePicker.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/CreativeColumnMapper.tsx`
- `apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/InlineCanvasEditor.tsx`

---

## Execution Plan

### Phase 1: Foundation (r2-storage)
**Estimated Duration:** 8-12 hours

1. Install AWS SDK v3 packages
2. Implement S3 client factory
3. Implement all storage methods
4. Write unit and integration tests
5. Update environment documentation

**Exit Criteria:**
- All `S3StorageService` methods functional
- Presigned URLs work from browser
- Tests pass with >80% coverage

---

### Phase 2: Asset Management (asset-library)
**Estimated Duration:** 35-45 hours

1. Create database schema and migrations
2. Implement folder API endpoints
3. Implement asset API enhancements
4. Build folder sidebar UI
5. Build asset grid/list view
6. Implement upload system
7. Implement bulk actions
8. Build search and filter
9. Build preview modal
10. Integration and polish

**Exit Criteria:**
- Users can upload, organize, search assets
- Folder hierarchy works correctly
- All API endpoints documented

---

### Phase 3: Canvas Editor (canvas-editor)
**Estimated Duration:** 40-55 hours

1. Create database schema
2. Implement API routes
3. Build Fabric.js integration
4. Build state management with undo/redo
5. Build editor UI panels
6. Implement variable system
7. Implement aspect ratio variants
8. Build template pages
9. Integrate asset library picker
10. Testing and polish

**Exit Criteria:**
- Canvas editor fully functional
- Templates persist and reload correctly
- Variables auto-complete from data sources
- Undo/redo works reliably

---

### Phase 4a: Server Generation (server-generation)
**Estimated Duration:** 20-28 hours

1. Create database schema
2. Build generation service core
3. Implement variable interpolation
4. Implement render and upload
5. Create API routes
6. Build job handler
7. Optimize memory and performance

**Exit Criteria:**
- Preview renders in <2 seconds
- Batch processes 100 images/minute
- Job progress tracking works

---

### Phase 4b: Carousel Support (carousel-support)
**Estimated Duration:** 27-32 hours
**Note:** Can run in parallel with server-generation

1. Define TypeScript types
2. Build mode toggle and card list
3. Build card navigation
4. Build card editor and reorder
5. Build data row selector
6. Integrate into canvas editor
7. Update generation pipeline
8. Implement validation
9. Build preview component

**Exit Criteria:**
- Both carousel modes work
- Platform constraints enforced
- Export correct for Facebook/Reddit

---

### Phase 5: Wizard Integration (wizard-integration)
**Estimated Duration:** 22-30 hours

1. Update wizard step types
2. Extend wizard hook
3. Add validation
4. Build CreativesStep component
5. Implement all three modes
6. Integrate inline canvas editor
7. Connect to generation pipeline
8. Testing

**Exit Criteria:**
- Creatives step in wizard flow
- All three modes functional
- Generated campaigns include creatives

---

## Progress Tracking

### Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| R2 Storage Complete | - | ✅ Complete |
| Asset Library MVP | 2025-12-29 | ✅ Complete |
| Canvas Editor MVP | - | Pending |
| Server Generation MVP | - | Pending |
| Carousel Support Complete | - | Pending |
| Wizard Integration Complete | - | Pending |
| Full System Integration | - | Pending |

### Overall Progress

```
[██████████░░░░░░░░░░] 50%
```

- **Features Completed:** 2/6 (r2-storage, asset-library)
- **Tests Passing:** Yes
- **Build Status:** Passing

### Progress Log

| Date | Feature | Event |
|------|---------|-------|
| 2025-12-29T18:45:00Z | r2-storage | Completed - AWS SDK v3 integration, presigned URLs, full test coverage |
| 2025-12-29 | asset-library | Phase 1 - DB Schema (2bd2dd6) - asset_folders table with materialized paths |
| 2025-12-29 | asset-library | Phase 2 - Folder API (5204083) - CRUD endpoints for folder operations |
| 2025-12-29 | asset-library | Phase 3 - Asset API Enhancements (f364882) - Enhanced asset endpoints with folder support |
| 2025-12-29 | asset-library | Phase 4 - Frontend Page (61b0541) - Asset library UI with folder sidebar and grid view |
| 2025-12-29 | asset-library | Phases 5-7 (f445938) - Upload, search, filter, and preview components |
| 2025-12-29 | asset-library | Completed - All phases done, navigation link added |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Fabric.js server-side performance | HIGH | Test early with 100+ item batches, implement pooling |
| R2 rate limits during batch generation | MEDIUM | Implement rate limiting, backoff strategy |
| Canvas state complexity | MEDIUM | Thorough testing, limit undo history to 50 states |
| Cross-browser canvas rendering | MEDIUM | Test Chrome, Firefox, Safari early |
| Memory leaks in batch jobs | HIGH | Explicit cleanup, monitoring, canvas disposal |

---

## Notes

### Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Storage | Cloudflare R2 (S3-compatible) |
| Canvas | Fabric.js (browser + node-canvas) |
| Job Queue | pg-boss (PostgreSQL-backed) |
| Database | PostgreSQL with Drizzle ORM |
| Frontend | Next.js 15, React 18, CSS Modules |
| Validation | Zod schemas |

### Key Patterns

1. **Team-scoped resources** - All tables include `team_id` FK with cascade delete
2. **OpenAPI-first API** - Hono with Zod OpenAPI for all routes
3. **Hook-based state** - React Query/SWR for data fetching
4. **CSS Modules** - Scoped styling with `.module.css` files

---

## Next Session Checkpoint

**When resuming, continue from:**
- [ ] Start canvas-editor feature - Fabric.js template editor
- Asset library complete: All phases done
- Next task: Build canvas editor database schema and API routes

**Command to resume:**
```
Resume visual-ad-system orchestration from canvas-editor
```
