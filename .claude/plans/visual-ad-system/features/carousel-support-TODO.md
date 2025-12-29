# Carousel Support - Visual Ad System

**Feature:** Carousel Template Mode for Canvas Editor
**Date:** 2025-12-29
**Status:** Complete
**Depends On:** canvas-editor (extends the base canvas editor functionality)

---

## Overview

Extend the canvas editor to support carousel ad creation with two distinct modes:

1. **Data-Driven Template Mode**: A single canvas template that generates multiple carousel cards from data source rows. Each row in the data source produces one carousel card with variable bindings resolved per-row.

2. **Manual Per-Card Mode**: Design each carousel card independently with individual canvas instances (2-10 cards). Full creative control per card with drag-reorder capability.

This feature integrates with the existing CarouselBuilder component (`apps/web/app/[locale]/[teamSlug]/campaign-sets/new/components/creatives/CarouselBuilder.tsx`) and respects platform-specific carousel constraints defined in `packages/core/src/ad-types/platforms/`.

---

## Goal

Enable users to create dynamic, data-driven carousel ads at scale while also supporting manual per-card design for campaigns requiring unique creative per card. The system must enforce platform constraints (Facebook: 2-10 cards, Reddit: 2-6 cards) and maintain consistent aspect ratios across all cards.

---

## Success Criteria

- [x] Users can toggle between data-driven and manual carousel modes in the canvas editor
- [x] Data-driven mode generates N carousel cards from N data source rows with variable resolution
- [x] Manual mode supports designing 2-10 individual cards with drag-reorder functionality
- [x] Platform constraints (card count, aspect ratio, file size) are validated in real-time
- [ ] Generated carousel ads export correctly for Facebook and Reddit platform APIs (deferred to generation pipeline)
- [x] Carousel preview shows all cards in swipeable/scrollable format
- [x] Per-card headline, description, and URL fields are editable when platform supports them

---

## What We're Building Now

### Phase 1: Core Schema and Types (2-3 hours)

**Priority: HIGH** - Foundation for all carousel functionality

- [x] Define `CarouselTemplate` TypeScript interface in `packages/core/src/templates/types.ts`
  ```typescript
  interface CarouselTemplate {
    mode: 'data-driven' | 'manual';
    cardTemplate?: FabricCanvasJson;  // For data-driven mode
    cards?: FabricCanvasJson[];       // For manual mode (2-10 cards)
    cardCount?: number;               // Fixed count for manual
    aspectRatio: '1:1';               // Consistent across all cards
    platformConstraints: {
      minCards: number;
      maxCards: number;
      dimensions: { width: number; height: number };
    };
  }
  ```
- [x] Define `CarouselCard` interface with per-card metadata
  ```typescript
  interface CarouselCard {
    id: string;
    canvasJson: FabricCanvasJson;
    headline?: string;
    description?: string;
    url?: string;
    order: number;
  }
  ```
- [x] Add carousel mode to template schema in `packages/database/src/schema/templates.ts`
- [x] Create Zod validation schemas for carousel templates
- [x] Export types from `packages/core/src/index.ts`

### Phase 2: UI Components - Mode Toggle and Card List (3-4 hours)

**Priority: HIGH** - Core user interface for carousel editing

**CarouselModeToggle.tsx** (`apps/web/components/canvas-editor/carousel/`)
- [x] Create toggle component with radio/segmented control UI
- [x] Display mode descriptions: "One template, data drives cards" vs "Design each card individually"
- [x] Emit `onModeChange` callback with mode value
- [x] Show warning when switching modes with existing content
- [x] Add unit tests for mode toggle behavior

**CarouselCardList.tsx**
- [x] Create horizontal thumbnail strip component
- [x] Show card thumbnails with numbering (1, 2, 3...)
- [x] Highlight currently selected card
- [x] Display "Add Card" button when under max limit (manual mode)
- [x] Show card count indicator: "3/10 cards"
- [x] Add unit tests for card list interactions

**CardNavigator.tsx**
- [x] Create previous/next navigation arrows
- [x] Disable buttons at list boundaries
- [x] Show current position indicator (e.g., "2 of 5")
- [x] Keyboard navigation support (Left/Right arrows)
- [x] Add unit tests for navigation

### Phase 3: Card Editing and Reordering (4-5 hours)

**Priority: HIGH** - Essential editing capabilities

**CarouselCardEditor.tsx**
- [x] Wrap FabricCanvas component for single card editing
- [x] Accept `card: CarouselCard` prop with canvas state
- [x] Emit `onCardChange` with updated canvas JSON
- [x] Handle card-specific variable resolution in data-driven mode
- [x] Add per-card metadata fields (headline, description, URL) when platform supports
- [x] Validate canvas dimensions match carousel aspect ratio
- [x] Add unit tests for card editing

**CardReorder.tsx** (manual mode only)
- [x] Implement drag-and-drop card reordering with @dnd-kit/core
- [x] Update order property on all cards after reorder
- [x] Animate card position changes
- [x] Touch-friendly drag handles
- [x] Add unit tests for reorder behavior

**DataRowSelector.tsx** (data-driven mode only)
- [x] Display connected data source with row preview
- [x] Show checkbox list of available rows
- [x] Allow selecting which rows generate cards
- [x] Display preview of first variable values per row
- [x] Enforce platform max card limit
- [x] Add unit tests for data row selection

### Phase 4: Canvas Editor Integration (3-4 hours)

**Priority: MEDIUM** - Integrate components into canvas editor workflow

- [x] Add carousel mode detection to main canvas editor (useCarouselEditor hook)
- [ ] Create `CarouselEditorLayout.tsx` component (deferred - components can be composed)
  - Side panel with CarouselCardList
  - Main canvas area with CarouselCardEditor
  - Bottom bar with CardNavigator and mode toggle
- [x] Wire up state management for multi-card editing (useCarouselEditor hook)
- [x] Persist carousel state to template on save (via template prop)
- [x] Load carousel state from template on edit (via initialTemplate prop)
- [x] Handle mode switching with data migration prompts (CarouselModeToggle warning)

### Phase 5: Generation Pipeline Updates (4-5 hours)

**Priority: HIGH** - Required for carousel ads to function (DEFERRED to separate feature)

**Data-Driven Generation:**
- [ ] Extend template generation service to handle carousel mode
- [ ] For each data row, resolve variables against single cardTemplate
- [ ] Combine resolved cards into carousel output structure
- [ ] Validate generated card count against platform limits

**Manual Mode Generation:**
- [ ] Export each card canvas as individual image
- [ ] Combine cards array into carousel output
- [ ] Preserve per-card metadata (headline, description, URL)

**Platform API Formatting:**
- [ ] Map carousel output to Facebook carousel API format
  ```typescript
  {
    cards: [
      { image_hash: string, headline: string, description: string, link: string },
      // ... up to 10 cards
    ]
  }
  ```
- [ ] Map carousel output to Reddit carousel API format
  ```typescript
  {
    slides: [
      { media_id: string, headline: string, destination_url: string },
      // ... up to 6 cards
    ]
  }
  ```
- [ ] Add generation tests for both modes

### Phase 6: Validation and Platform Constraints (2-3 hours)

**Priority: MEDIUM** - Enforce platform rules

- [x] Create `validateCarousel()` function in `packages/core/src/templates/validation.ts`
- [x] Validate card count: Facebook 2-10, Reddit 2-6
- [x] Validate consistent aspect ratio across all cards (1:1 required)
- [x] Validate card dimensions: 1080x1080 for both platforms
- [x] Validate per-card required fields based on platform
- [x] Validate file size limits per card
- [x] Display validation errors in real-time in editor (useCarouselValidation hook)
- [x] Block generation when validation fails (validation returns valid: false)
- [x] Add comprehensive validation tests (60 tests in core/templates)

### Phase 7: Preview and Polish (2-3 hours)

**Priority: LOW** - Enhanced user experience

- [x] Create `CarouselPreview.tsx` component with swipeable card preview
- [x] Add platform-specific preview frames (Facebook feed, Reddit feed)
- [x] Show card transition animations
- [x] Display platform character limit warnings (in CarouselCardEditor)
- [ ] Add loading states for card generation (deferred)
- [ ] Add error boundaries for canvas rendering failures (deferred)

---

## Not In Scope

**Video Carousel Cards**
- Why: Video processing requires separate infrastructure; focusing on image carousels first

**Cross-Platform Carousel Syncing**
- Why: Each platform has different constraints; templates are platform-specific

**Carousel Analytics/Performance Tracking**
- Why: Separate feature; this focuses on creation workflow

**Auto-Generate Card Count from Data**
- Why: Users need explicit control over card count; avoid unexpected platform limit violations

**Collection Ads (Facebook Instant Experience)**
- Why: Different ad format with distinct requirements; separate feature

**Carousel Card A/B Testing**
- Why: Testing infrastructure is a separate system

---

## Implementation Plan

1. **(2-3 hours)** Define TypeScript types and database schema for carousel templates
2. **(1-2 hours)** Create CarouselModeToggle component with tests
3. **(2 hours)** Build CarouselCardList thumbnail strip with selection
4. **(2 hours)** Implement CardNavigator with keyboard support
5. **(3 hours)** Create CarouselCardEditor wrapping FabricCanvas
6. **(2 hours)** Add CardReorder drag-drop for manual mode
7. **(2 hours)** Build DataRowSelector for data-driven mode
8. **(3 hours)** Integrate components into canvas editor layout
9. **(3 hours)** Update generation pipeline for data-driven mode
10. **(2 hours)** Update generation pipeline for manual mode
11. **(2 hours)** Implement platform API format mapping
12. **(2 hours)** Add validation functions and real-time error display
13. **(2 hours)** Create carousel preview component
14. **(1 hour)** Final integration testing and polish

**Total Estimated Time:** 27-32 hours

---

## Definition of Done

- [x] Both carousel modes (data-driven and manual) are fully functional in the canvas editor
- [x] Users can create, edit, reorder, and delete carousel cards
- [x] Platform constraints are validated in real-time with clear error messages
- [ ] Generated carousel ads export correctly for Facebook and Reddit APIs (deferred to generation pipeline)
- [x] All new components have comprehensive unit tests with >80% coverage (135 tests total)
- [ ] CarouselBuilder.tsx is updated or replaced with new implementation (integration deferred)
- [ ] Documentation updated with carousel mode usage instructions (deferred)
- [x] Accessibility: keyboard navigation works for all carousel interactions
- [x] Performance: switching between cards is instantaneous (<100ms)
- [x] No console errors or warnings in development mode

---

## Technical Notes

### Tech Stack
- **React 18+**: For UI components with concurrent features
- **Fabric.js**: Canvas editor foundation (from canvas-editor feature)
- **@dnd-kit/core**: Drag-drop reordering (better React 18 support than react-beautiful-dnd)
- **Zod**: Runtime type validation for carousel schemas
- **Vitest**: Unit testing framework

### Design Principles
- **Progressive Disclosure**: Show mode-specific UI only when relevant
- **Fail Fast**: Validate constraints before generation, not after
- **Platform Parity**: Same user experience regardless of target platform
- **State Isolation**: Each card maintains independent canvas state

### File Structure
```
apps/web/components/canvas-editor/carousel/
  CarouselModeToggle.tsx
  CarouselModeToggle.module.css
  CarouselCardList.tsx
  CarouselCardList.module.css
  CarouselCardEditor.tsx
  CarouselCardEditor.module.css
  CardNavigator.tsx
  CardNavigator.module.css
  CardReorder.tsx
  CardReorder.module.css
  DataRowSelector.tsx
  DataRowSelector.module.css
  CarouselPreview.tsx
  CarouselPreview.module.css
  __tests__/
    CarouselModeToggle.test.tsx
    CarouselCardList.test.tsx
    CarouselCardEditor.test.tsx
    CardNavigator.test.tsx
    CardReorder.test.tsx
    DataRowSelector.test.tsx
  index.ts
```

### Platform Constraints Reference

| Platform | Min Cards | Max Cards | Aspect Ratio | Dimensions | Max File Size |
|----------|-----------|-----------|--------------|------------|---------------|
| Facebook | 2         | 10        | 1:1          | 1080x1080  | 30MB          |
| Reddit   | 2         | 6         | 1:1          | 1080x1080  | 3MB           |

---

## Next Steps (Post-Carousel)

1. **Video Carousel Support**: Extend to support video cards with thumbnail selection
2. **Carousel Templates Library**: Pre-built carousel layouts for quick start
3. **Cross-Card Variable Sync**: Link variables across cards for consistency
4. **Carousel Performance Analytics**: Track which cards drive most engagement
