# Implementation Plan

## Overview

This document outlines a phased implementation plan for building out the enhanced campaign platform. Each phase delivers incremental value while building toward the complete feature set.

---

## Phase Summary

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| 1 | Foundation | Type system, registry architecture |
| 2 | Budget & Bidding | Enhanced budget UI, bidding strategies |
| 3 | Creative Assets | Image upload, preview, validation |
| 4 | Ad Type Selection | Ad type registry, selection UI |
| 5 | Thread Generation | Reddit thread builder, personas |
| 6 | Asset Storage | R2/S3 integration, asset library |
| 7 | Targeting | Location, audience, interest targeting |
| 8 | Polish | Testing, optimization, documentation |

---

## Phase 1: Foundation

### Objectives
- Establish type system for ad types, budgets, and creatives
- Create registry architecture for extensibility
- Set up database schema extensions

### Tasks

#### 1.1 Core Types
- [ ] Create `packages/core/src/ad-types/types.ts`
- [ ] Create `packages/core/src/budget/types.ts`
- [ ] Create `packages/core/src/creatives/types.ts`
- [ ] Create `packages/core/src/content-types/types.ts`

#### 1.2 Ad Type Registry
- [ ] Implement `AdTypeRegistry` class
- [ ] Define Google ad types
- [ ] Define Reddit ad types (including organic)
- [ ] Define Facebook ad types
- [ ] Export registry and types from `@dotoro/core`

#### 1.3 Budget Types
- [ ] Define `BudgetConfig` (enhanced)
- [ ] Define `BiddingConfig`
- [ ] Define `ScheduleConfig`
- [ ] Define platform-specific bidding strategies

#### 1.4 Database Schema
- [ ] Create migration for new enums
- [ ] Create migration for `creative_assets` table
- [ ] Create migration for `campaign_settings` table
- [ ] Create migration for `thread_content` table
- [ ] Create migration for `author_personas` table
- [ ] Update Drizzle schema types

#### 1.5 Validation
- [ ] Create `validateBudgetConfig()` function
- [ ] Create `validateBiddingConfig()` function
- [ ] Create `validateScheduleConfig()` function
- [ ] Create `validateAdType()` function

### Deliverables
- Type definitions exported from `@dotoro/core`
- Database migrations ready to run
- Validation functions for all new types

---

## Phase 2: Budget & Bidding UX

### Objectives
- Implement enhanced budget configuration UI
- Add bidding strategy selection
- Add schedule configuration

### Tasks

#### 2.1 Budget Configuration
- [ ] Create `BudgetTypeSelector` component
- [ ] Create `BudgetAmountInput` component (with variable support)
- [ ] Create `CurrencySelector` component
- [ ] Create `BudgetCapsConfig` component
- [ ] Create `PacingSelector` component

#### 2.2 Bidding Configuration
- [ ] Create `BiddingStrategySelector` component
- [ ] Create platform-specific strategy lists
- [ ] Create `TargetCpaInput` component
- [ ] Create `TargetRoasInput` component
- [ ] Create `MaxBidInput` component
- [ ] Create `BidAdjustments` component

#### 2.3 Schedule Configuration
- [ ] Create `DateRangePicker` component
- [ ] Create `TimezoneSelector` component
- [ ] Create `DayPartingEditor` component
- [ ] Create visual day parting grid

#### 2.4 Integration
- [ ] Create `BudgetBiddingConfig` compound component
- [ ] Update wizard state with new fields
- [ ] Update wizard reducer with new actions
- [ ] Add step 6 to wizard flow
- [ ] Update preview to show budget/bidding info

### Deliverables
- Full budget configuration UI
- Bidding strategy selection for all platforms
- Schedule and day parting configuration
- Wizard step 6 complete

---

## Phase 3: Creative Assets

### Objectives
- Implement image upload with client-side preview
- Add video upload support
- Create creative validation system

### Tasks

#### 3.1 Image Analysis
- [ ] Create `analyzeImage()` function (client-side)
- [ ] Create `calculateAspectRatio()` utility
- [ ] Create `mimeToFormat()` utility

#### 3.2 Video Analysis
- [ ] Create `analyzeVideo()` function (client-side)
- [ ] Create video thumbnail generator
- [ ] Add duration validation

#### 3.3 Validation
- [ ] Create `validateAsset()` function
- [ ] Implement dimension validation
- [ ] Implement aspect ratio validation
- [ ] Implement file size validation
- [ ] Implement format validation

#### 3.4 Upload Components
- [ ] Create `ImageUploader` component
- [ ] Create `VideoUploader` component
- [ ] Create `CreativePreview` component
- [ ] Add drag-and-drop support
- [ ] Add progress indicators

#### 3.5 Integration
- [ ] Add creative slots to ad editor
- [ ] Update wizard state for creatives
- [ ] Add creative previews to campaign preview
- [ ] Show platform compliance status

### Deliverables
- Image upload with instant preview
- Video upload with thumbnail generation
- Validation against platform specs
- Integration with ad editor

---

## Phase 4: Ad Type Selection

### Objectives
- Implement ad type selection UI
- Create dynamic form generation from ad type definitions
- Add ad type previews

### Tasks

#### 4.1 Ad Type Selector
- [ ] Create `AdTypeSelector` component
- [ ] Create `PlatformTabs` component
- [ ] Create `AdTypeCard` component
- [ ] Create `AdTypeGrid` layout

#### 4.2 Dynamic Form Generation
- [ ] Create `AdTypeFormGenerator` component
- [ ] Map field types to form components
- [ ] Handle array fields (multiple headlines)
- [ ] Handle creative requirements

#### 4.3 Ad Type Previews
- [ ] Create `GoogleSearchAdPreview` component
- [ ] Create `GoogleDisplayAdPreview` component
- [ ] Create `RedditLinkAdPreview` component
- [ ] Create `RedditImageAdPreview` component
- [ ] Create `RedditVideoAdPreview` component
- [ ] Create `FacebookSingleImagePreview` component
- [ ] Create `FacebookCarouselPreview` component

#### 4.4 Integration
- [ ] Add step 4 to wizard flow
- [ ] Store selected ad types in state
- [ ] Pass ad type to ad structure step
- [ ] Update generation to use ad type definitions

### Deliverables
- Ad type selection UI for all platforms
- Dynamic form rendering from definitions
- Platform-accurate ad previews
- Wizard step 4 complete

---

## Phase 5: Thread Generation

### Objectives
- Implement Reddit thread builder
- Add persona management
- Create thread preview

### Tasks

#### 5.1 Thread Builder
- [ ] Create `ThreadBuilder` component
- [ ] Create `PostEditor` component
- [ ] Create `CommentEditor` component
- [ ] Create `CommentTree` component (hierarchical)
- [ ] Add drag-and-drop comment reordering

#### 5.2 Persona Management
- [ ] Create `PersonaManager` component
- [ ] Create `PersonaCard` component
- [ ] Create `PersonaEditor` modal
- [ ] Add default personas
- [ ] Store personas in database

#### 5.3 Thread Preview
- [ ] Create `RedditThreadPreview` component
- [ ] Style like authentic Reddit thread
- [ ] Show comment hierarchy
- [ ] Apply variable interpolation

#### 5.4 Integration
- [ ] Add thread builder to ad structure step
- [ ] Show when "Reddit Thread" ad type selected
- [ ] Update wizard state for thread config
- [ ] Generate thread content to database

### Deliverables
- Full thread builder UI
- Persona management system
- Reddit-style thread preview
- Thread generation to database

---

## Phase 6: Asset Storage

### Objectives
- Set up R2/S3 storage bucket
- Implement upload API
- Create asset library UI

### Tasks

#### 6.1 Storage Setup
- [ ] Configure Cloudflare R2 bucket
- [ ] Set up access credentials
- [ ] Configure CORS policies
- [ ] Set up CDN for public URLs

#### 6.2 Upload API
- [ ] Create `POST /api/v1/creatives/upload` endpoint
- [ ] Implement multipart upload handling
- [ ] Generate storage keys
- [ ] Return public URLs
- [ ] Add file type validation

#### 6.3 Asset Management API
- [ ] Create `GET /api/v1/creatives` endpoint (list)
- [ ] Create `DELETE /api/v1/creatives/:id` endpoint
- [ ] Create `GET /api/v1/creatives/:id/url` (signed URL)
- [ ] Add pagination and filtering

#### 6.4 Asset Library UI
- [ ] Create `AssetLibrary` component
- [ ] Create `AssetGrid` component
- [ ] Create `AssetCard` component
- [ ] Add folder support
- [ ] Add search and filter

#### 6.5 Integration
- [ ] Update `ImageUploader` to persist
- [ ] Add "Choose from library" option
- [ ] Show storage usage
- [ ] Clean up unused assets

### Deliverables
- R2/S3 storage integration
- Upload and management API
- Asset library with folders
- Persistent creative storage

---

## Phase 7: Targeting

### Objectives
- Implement location targeting
- Add audience/interest targeting
- Create targeting preview

### Tasks

#### 7.1 Targeting Types
- [ ] Define `TargetingConfig` type
- [ ] Define `LocationTarget` type
- [ ] Define `AudienceTarget` type
- [ ] Define `InterestTarget` type

#### 7.2 Location Targeting
- [ ] Create `LocationTargeting` component
- [ ] Add country selector
- [ ] Add region/state selector
- [ ] Add city selector
- [ ] Add radius targeting
- [ ] Show targeting on map

#### 7.3 Audience Targeting
- [ ] Create `AudienceTargeting` component
- [ ] Add custom audience selector
- [ ] Add lookalike audience support
- [ ] Add demographic targeting

#### 7.4 Interest Targeting
- [ ] Create `InterestTargeting` component
- [ ] Add interest category browser
- [ ] Add interest search
- [ ] Show estimated reach

#### 7.5 Integration
- [ ] Add step 7 to wizard flow
- [ ] Update wizard state for targeting
- [ ] Pass targeting to generation
- [ ] Show targeting summary in preview

### Deliverables
- Location targeting with map
- Audience and interest selection
- Estimated reach display
- Wizard step 7 complete

---

## Phase 8: Polish & Integration

### Objectives
- Comprehensive testing
- Performance optimization
- Documentation

### Tasks

#### 8.1 Testing
- [ ] Unit tests for all new components
- [ ] Unit tests for validation functions
- [ ] Unit tests for type utilities
- [ ] Integration tests for wizard flow
- [ ] E2E tests for full generation flow

#### 8.2 Performance
- [ ] Optimize bundle size
- [ ] Add code splitting for wizard steps
- [ ] Optimize image preview loading
- [ ] Add skeleton loading states
- [ ] Profile and fix bottlenecks

#### 8.3 Error Handling
- [ ] Add error boundaries
- [ ] Improve validation messages
- [ ] Add retry logic for API calls
- [ ] Handle edge cases (empty data, etc.)

#### 8.4 Accessibility
- [ ] ARIA labels for all interactive elements
- [ ] Keyboard navigation testing
- [ ] Screen reader testing
- [ ] Color contrast verification

#### 8.5 Documentation
- [ ] API documentation
- [ ] Component storybook
- [ ] User guide
- [ ] Developer guide
- [ ] Migration guide

### Deliverables
- Full test coverage
- Optimized performance
- Accessible UI
- Complete documentation

---

## Technical Considerations

### Dependencies to Add

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.x",        // For S3/R2 uploads
    "sharp": "^0.33.x",                   // Server-side image processing
    "date-fns": "^3.x",                   // Date handling
    "date-fns-tz": "^3.x",                // Timezone support
    "react-dropzone": "^14.x",            // Drag-and-drop uploads
    "react-beautiful-dnd": "^13.x"        // Drag-and-drop reordering
  }
}
```

### Environment Variables

```bash
# Storage (R2/S3)
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=dotoro-assets
R2_PUBLIC_URL=https://assets.dotoro.app

# Optional: S3 fallback
S3_REGION=us-east-1
S3_BUCKET_NAME=dotoro-assets
```

### API Changes

New endpoints:
- `POST /api/v1/creatives/upload`
- `GET /api/v1/creatives`
- `DELETE /api/v1/creatives/:id`
- `GET /api/v1/ad-types`
- `GET /api/v1/ad-types/:platform`
- `GET /api/v1/bidding-strategies/:platform`

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Large file uploads timeout | Use presigned URLs for direct upload |
| Browser memory with large videos | Limit video size, use streaming |
| Complex state management | Use Zustand/Jotai if reducer grows |
| Database performance | Add indexes, paginate queries |

### UX Risks

| Risk | Mitigation |
|------|------------|
| Wizard too long | Progressive disclosure, smart defaults |
| Feature overwhelm | Hide advanced options by default |
| Creative upload friction | Allow skip, use from data source |
| Mobile experience | Mobile-first responsive design |

---

## Success Metrics

### Phase Completion Criteria

- All tasks completed and tested
- No critical bugs
- Performance within targets
- Accessibility audit passed
- Code review approved

### Quality Targets

- Test coverage: >80%
- Lighthouse performance: >90
- Accessibility score: 100%
- Bundle size increase: <50KB per phase
- API response time: <200ms p95

---

## Getting Started

### Prerequisites

1. Run database migrations
2. Set up storage credentials (Phase 6)
3. Install new dependencies

### Development Workflow

```bash
# Start development
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Feature Flags

Use feature flags to roll out incrementally:

```typescript
const FEATURES = {
  ENHANCED_BUDGET: true,
  CREATIVE_UPLOADS: true,
  AD_TYPE_SELECTION: false,  // Enable after Phase 4
  THREAD_BUILDER: false,     // Enable after Phase 5
  ASSET_LIBRARY: false,      // Enable after Phase 6
  TARGETING: false,          // Enable after Phase 7
};
```
