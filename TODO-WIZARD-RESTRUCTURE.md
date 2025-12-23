# Campaign Generation Wizard Restructure

**Date:** 2025-12-23
**Status:** Planning
**Feature:** Major UX/Architecture Overhaul of Campaign Generation Wizard

---

## Goal

Transform the campaign generation wizard from a rigid, single-platform flow into a flexible, multi-platform campaign builder with explicit ad group management, proper data filtering placement, and platform-agnostic configuration that enables generating identical campaign structures across multiple advertising platforms simultaneously.

### Success Criteria

- [ ] Users can select multiple platforms (Google, Reddit, Facebook) at the final step and generate campaigns for each
- [ ] Ad groups are explicitly defined with multiple ads per group (not implicitly derived from row grouping)
- [ ] Keywords are configured at the ad group level, matching Google Ads architecture
- [ ] Rules/filters are applied immediately after data source selection (before any campaign config)
- [ ] Budget is configured per-platform at export/generation stage, not during initial config
- [ ] Character limit fallback logic handles platform-specific constraints gracefully
- [ ] "Workflow" terminology replaced with clearer naming
- [ ] Template concept either removed or significantly clarified

---

## What's Already Done

### Frontend Wizard Infrastructure (Complete)
- [x] `web/app/campaigns/generate/types.ts` - WizardState, step definitions, validation functions
- [x] `web/app/campaigns/generate/hooks/useGenerateWizard.ts` - State management with useReducer
- [x] `web/app/campaigns/generate/components/GenerateWizard.tsx` - Main wizard orchestrator
- [x] `web/app/campaigns/generate/components/StepIndicator.tsx` - Step navigation UI
- [x] `web/app/campaigns/generate/components/DataSourceSelector.tsx` - Data source selection
- [x] `web/app/campaigns/generate/components/CampaignConfig.tsx` - Campaign name pattern + platform (single)
- [x] `web/app/campaigns/generate/components/HierarchyConfig.tsx` - Ad group pattern + ad field mappings
- [x] `web/app/campaigns/generate/components/KeywordConfig.tsx` - Keyword rule builder
- [x] `web/app/campaigns/generate/components/RuleSelector.tsx` - Rule selection
- [x] `web/app/campaigns/generate/components/GenerationPreview.tsx` - Preview + generate
- [x] `web/app/campaigns/generate/components/VariableAutocomplete.tsx` - Variable insertion UI

### Backend Generation Logic (Complete)
- [x] `packages/core/src/generation/hierarchical-grouper.ts` - Row-to-campaign grouping engine
- [x] `packages/core/src/generation/variation-generator.ts` - Ad variation generation
- [x] `packages/core/src/generation/orchestrator.ts` - Generation orchestration
- [x] `api/src/schemas/campaigns.ts` - Zod schemas for config-based generation

### API Endpoints (Complete)
- [x] `POST /api/v1/campaigns/preview-with-config` - Preview config-based generation
- [x] `POST /api/v1/campaigns/generate-from-config` - Execute config-based generation
- [x] `GET /api/v1/data-sources/:id/sample` - Sample data for hierarchy preview

### Current Step Order
1. Data Source (select CSV/transform)
2. Campaign Config (name pattern, platform, budget)
3. Hierarchy (ad group pattern, ad field mappings)
4. Keywords (optional)
5. Rules (optional)
6. Preview & Generate

---

## What We're Building Now

### Phase 1: Terminology and Conceptual Cleanup (Priority: HIGH)

**Why:** The current "workflow" and "template" terminology confuses users. Need clearer naming.

#### 1.1 Naming Decision: Replace "Workflow"
- [ ] Propose terminology options for the overall bundle:
  - Option A: **"Campaign Blueprint"** - emphasizes it's a reusable structure
  - Option B: **"Campaign Builder"** - action-oriented, clear intent
  - Option C: **"Campaign Recipe"** - data source + config = campaigns
  - Option D: **"Generation Profile"** - technical but accurate
  - Option E: **"Campaign Factory"** - inputs in, campaigns out

  **Recommendation:** "Campaign Builder" - simple, action-oriented, self-explanatory

#### 1.2 Template Removal/Clarification
- [ ] Analyze current template usage in `web/app/campaigns/generate/types.ts`:
  - `templateId` in WizardState (legacy)
  - Template interface with platform, structure, variables
- [ ] Decision: Remove templates entirely since config-mode is primary
- [ ] Update `useGenerateWizard.ts` to remove template-related actions
- [ ] Update `GenerateWizard.tsx` to remove template fallback paths
- [ ] Update API schemas in `api/src/schemas/campaigns.ts` to remove template references from new endpoints

**Files to modify:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/types.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/hooks/useGenerateWizard.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/GenerateWizard.tsx`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/TemplateSelector.tsx` (delete)

---

### Phase 2: Step Reordering - Move Rules Earlier (Priority: HIGH)

**Why:** Rules filter/modify data. Logically, this should happen BEFORE any campaign configuration so users work with the filtered dataset.

#### 2.1 Update Step Order
- [ ] Modify `WIZARD_STEPS` in `types.ts`:
  ```typescript
  // FROM:
  ['data-source', 'campaign-config', 'hierarchy', 'keywords', 'rules', 'preview']

  // TO:
  ['data-source', 'rules', 'campaign-config', 'hierarchy', 'keywords', 'preview']
  ```
- [ ] Update `STEP_LABELS` to match new order
- [ ] Update `OPTIONAL_STEPS` - rules should remain optional

#### 2.2 Update Wizard Logic
- [ ] Modify `GenerateWizard.tsx` step rendering to reflect new order
- [ ] Update validation flow in `validateWizardStep()` for new step sequence
- [ ] Update `StepIndicator.tsx` if any hardcoded step logic exists

#### 2.3 Apply Rules to Sample Data
- [ ] When rules are selected in Step 2, apply them to preview data
- [ ] Update sample data fetching to optionally include rule application
- [ ] Consider API endpoint: `GET /api/v1/data-sources/:id/sample?rules=rule1,rule2`

**Files to modify:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/types.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/GenerateWizard.tsx`

---

### Phase 3: Platform Selection - Move to End, Enable Multi-Select (Priority: HIGH)

**Why:** Users want to generate the SAME campaign structure for multiple platforms. Platform selection at config time is premature.

#### 3.1 Remove Platform from CampaignConfig
- [ ] Update `CampaignConfig` interface in `types.ts`:
  ```typescript
  // REMOVE platform from CampaignConfig
  export interface CampaignConfig {
    namePattern: string;
    objective?: string;
    // platform: Platform;  <- REMOVE
    // budget?: BudgetConfig; <- MOVE TO PHASE 4
  }
  ```
- [ ] Update `CampaignConfig.tsx` component to remove platform selector section
- [ ] Update validation functions to not require platform at config step

#### 3.2 Create New Platform Selection Step (Before Preview)
- [ ] Create new component: `PlatformSelector.tsx`
  ```typescript
  interface PlatformSelectorProps {
    selectedPlatforms: Platform[];
    onPlatformsChange: (platforms: Platform[]) => void;
    platformBudgets: Map<Platform, BudgetConfig>;
    onBudgetChange: (platform: Platform, budget: BudgetConfig) => void;
  }
  ```
- [ ] UI Features:
  - Multi-select checkboxes/cards for platforms (Google, Reddit, Facebook)
  - Per-platform budget configuration (expands when platform selected)
  - Platform-specific settings preview
  - Estimated campaign counts per platform

#### 3.3 Update Wizard State for Multi-Platform
- [ ] Update `WizardState` in `types.ts`:
  ```typescript
  export interface WizardState {
    // ...existing fields
    selectedPlatforms: Platform[];  // NEW: array instead of single
    platformBudgets: Record<Platform, BudgetConfig | null>;  // NEW: per-platform budgets
  }
  ```
- [ ] Update `useGenerateWizard.ts` with new actions:
  - `TOGGLE_PLATFORM`
  - `SET_PLATFORMS`
  - `SET_PLATFORM_BUDGET`

#### 3.4 Update Step Sequence
- [ ] New step order becomes:
  ```typescript
  ['data-source', 'rules', 'campaign-config', 'hierarchy', 'keywords', 'platform-budget', 'preview']
  ```
- [ ] Update STEP_LABELS for new 'platform-budget' step

**Files to create:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/PlatformSelector.tsx`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/PlatformSelector.module.css`

**Files to modify:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/types.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/hooks/useGenerateWizard.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/GenerateWizard.tsx`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/CampaignConfig.tsx`

---

### Phase 4: Budget - Move to Platform Selection Step (Priority: MEDIUM)

**Why:** Different platforms have different budget requirements and constraints. Budget should be set per-platform.

#### 4.1 Remove Budget from CampaignConfig
- [ ] Already addressed in Phase 3.1 - remove budget from CampaignConfig interface
- [ ] Update `CampaignConfig.tsx` to remove budget toggle and fields

#### 4.2 Add Per-Platform Budget UI
- [ ] Enhance `PlatformSelector.tsx` with expandable budget sections per platform
- [ ] Include platform-specific budget constraints:
  - Google Ads: daily or campaign budget, various currencies
  - Reddit: daily budget minimum $5
  - Facebook: daily or lifetime budget
- [ ] Show budget summary for each selected platform

#### 4.3 Update API Schemas
- [ ] Modify `generateFromConfigRequestSchema` in `api/src/schemas/campaigns.ts`:
  ```typescript
  export const generateFromConfigRequestSchema = z.object({
    dataSourceId: uuidSchema,
    campaignConfig: campaignConfigSchema,
    hierarchyConfig: hierarchyConfigSchema,
    keywordConfig: keywordConfigSchema.optional(),
    ruleIds: z.array(uuidSchema).optional(),
    // NEW: platforms array with per-platform settings
    platforms: z.array(z.object({
      platform: platformSchema,
      budget: budgetConfigSchema.optional(),
      // platform-specific settings
    })),
  });
  ```

**Files to modify:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/api/src/schemas/campaigns.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/CampaignConfig.tsx`

---

### Phase 5: Explicit Ad Group Structure (Priority: HIGH)

**Why:** Current system implicitly groups rows by pattern matching. Users need explicit control over ad group definitions with multiple ads per group.

#### 5.1 Redesign Ad Group Configuration
- [ ] Create new data structure for explicit ad groups:
  ```typescript
  export interface AdGroupDefinition {
    id: string;
    name: string;  // Static name or pattern like "{product}"
    ads: AdDefinition[];  // Multiple ads per group
    keywords?: KeywordRule[];  // Keywords at ad group level (Phase 6)
  }

  export interface AdDefinition {
    id: string;
    headline: string;  // Pattern like "{headline}" or static text
    description: string;
    displayUrl?: string;
    finalUrl?: string;
    callToAction?: string;
  }

  export interface HierarchyConfig {
    adGroupNamePattern: string;  // Pattern for grouping rows
    adGroups: AdGroupDefinition[];  // Explicit ad group definitions
  }
  ```

#### 5.2 Create Ad Group Builder Component
- [ ] Create `AdGroupBuilder.tsx`:
  - Add/remove ad group definitions
  - Within each ad group: add/remove ad variations
  - Drag-and-drop reordering
  - Real-time preview of how rows map to ad groups

- [ ] UI Features:
  - Accordion-style ad group cards
  - "Add Ad Group" button
  - Per-group ad list with "Add Ad" button
  - Variable autocomplete in all fields
  - Collapse/expand for managing many groups

#### 5.3 Update HierarchyConfig Component
- [ ] Refactor `HierarchyConfig.tsx`:
  - Replace single ad mapping with AdGroupBuilder
  - Keep ad group name pattern for row grouping
  - Add section explaining grouping logic
  - Preview shows explicit ad groups with their ads

#### 5.4 Update Hierarchical Grouper
- [ ] Modify `hierarchical-grouper.ts` to support explicit ad groups:
  - Each row is still grouped by campaign pattern
  - Each row is still grouped by ad group pattern
  - But ads come from AdGroupDefinition, not ad mapping per row
  - Multiple ads created per row based on AdDefinition list

**Files to create:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/AdGroupBuilder.tsx`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/AdGroupBuilder.module.css`

**Files to modify:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/types.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/HierarchyConfig.tsx`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/packages/core/src/generation/hierarchical-grouper.ts`

---

### Phase 6: Keywords at Ad Group Level (Priority: MEDIUM)

**Why:** Google Ads and other platforms associate keywords with ad groups, not campaigns. This matches industry-standard architecture.

#### 6.1 Move Keywords into Ad Group Definition
- [ ] Update `AdGroupDefinition` interface to include keywords:
  ```typescript
  export interface AdGroupDefinition {
    id: string;
    name: string;
    ads: AdDefinition[];
    keywordRules?: KeywordRule[];  // Keywords belong to ad groups
  }
  ```

#### 6.2 Update KeywordConfig Integration
- [ ] Embed keyword configuration within AdGroupBuilder
- [ ] For each ad group, show collapsible keyword rules section
- [ ] Allow copying keyword rules between ad groups
- [ ] Show keyword preview per ad group

#### 6.3 Remove Standalone Keywords Step
- [ ] Decision: Either remove keywords step entirely OR
- [ ] Keep as "default keywords" that apply to all ad groups
- [ ] Show inheritance: "These keywords will apply to all ad groups unless overridden"

#### 6.4 Update Backend Generation
- [ ] Modify generation logic to attach keywords to ad groups
- [ ] Update preview response to show keywords per ad group

**Files to modify:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/types.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/KeywordConfig.tsx`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/AdGroupBuilder.tsx` (from Phase 5)

---

### Phase 7: Character Limit Fallback Logic (Priority: MEDIUM)

**Why:** Different platforms have different character limits. Need graceful handling when content exceeds limits.

#### 7.1 Define Platform Character Limits
- [ ] Create `platform-constraints.ts`:
  ```typescript
  export const PLATFORM_LIMITS = {
    google: {
      headline: 30,
      headline2: 30,
      headline3: 30,
      description: 90,
      description2: 90,
      displayUrl: 35,
    },
    facebook: {
      headline: 40,
      primaryText: 125,  // recommended
      description: 30,
    },
    reddit: {
      title: 300,
      text: 500,
    },
  } as const;
  ```

#### 7.2 Create Fallback Configuration UI
- [ ] Add fallback options per field in AdDefinition:
  ```typescript
  export interface AdDefinition {
    id: string;
    headline: string;
    headlineFallback?: {
      strategy: 'truncate' | 'alternative_field' | 'error';
      alternativeField?: string;  // For 'alternative_field' strategy
      truncateWithEllipsis?: boolean;
    };
    // ... same pattern for other fields
  }
  ```
- [ ] UI: Per-field dropdown for fallback strategy
- [ ] Preview: Show which rows would trigger fallback

#### 7.3 Implement Fallback Logic in Generation
- [ ] Update `hierarchical-grouper.ts`:
  - After interpolation, check against platform limits
  - Apply fallback strategy
  - Collect warnings for truncations/substitutions

#### 7.4 Validation Warnings
- [ ] Show real-time warnings in preview:
  - "5 headlines exceed 30 characters (will be truncated)"
  - "3 rows will use alternative headline field"
- [ ] Color-code problematic items in preview

**Files to create:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/packages/core/src/generation/platform-constraints.ts`

**Files to modify:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/types.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/packages/core/src/generation/hierarchical-grouper.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/AdGroupBuilder.tsx`

---

### Phase 8: Transform Edge Cases (Priority: LOW)

**Why:** Users have questions about transform behavior that need documentation/handling.

#### 8.1 Chain Transforms (Transform of Transform)
- [ ] Investigate current behavior: Can a transform use another transform as data source?
- [ ] If not supported, add support:
  - UI: Allow selecting transforms in data source picker
  - Backend: Recursive resolution of transform chains
- [ ] Add documentation/tooltips explaining capability
- [ ] Consider depth limit (max 3 levels?) to prevent infinite loops

#### 8.2 Orphaned Transform Handling
- [ ] When deleting a data source that a transform depends on:
  - Option A: Prevent deletion, show error
  - Option B: Mark dependent transforms as "broken"
  - Option C: Cascade delete transforms (with confirmation)
- [ ] Implement chosen strategy
- [ ] Add UI indication for orphaned transforms

**Example use case:**
```
CSV: "products.csv"
   |
   v
Transform A: "Filter expensive products" (depends on products.csv)
   |
   v
Transform B: "Add region column" (depends on Transform A)
```

If products.csv is deleted, what happens to Transform A and B?

**Files to modify:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/api/src/routes/data-sources.ts` (deletion logic)
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/data-sources/` (UI for broken state)

---

### Phase 9: Preview & Generation Updates (Priority: HIGH)

**Why:** Preview needs to reflect multi-platform generation and new ad group structure.

#### 9.1 Update Preview Response Structure
- [ ] Modify preview to show per-platform output:
  ```typescript
  interface MultiPlatformPreview {
    platforms: {
      platform: Platform;
      campaigns: PreviewCampaign[];
      stats: { campaigns: number; adGroups: number; ads: number };
      warnings: ValidationWarning[];
    }[];
    totalStats: { campaigns: number; adGroups: number; ads: number };
  }
  ```

#### 9.2 Update GenerationPreview Component
- [ ] Show tabbed interface: one tab per selected platform
- [ ] Show combined stats at top
- [ ] Per-platform campaign tree with new ad group structure
- [ ] Highlight platform-specific issues (character limits, etc.)

#### 9.3 Update Generation Endpoint
- [ ] Modify `POST /api/v1/campaigns/generate-from-config`:
  - Accept array of platforms with budgets
  - Generate campaigns for each platform
  - Return aggregated results

#### 9.4 Export Options
- [ ] Add export format selection per platform:
  - Google Ads Editor format (.csv)
  - Facebook Business Manager format
  - Reddit Ads format
  - JSON for API import

**Files to modify:**
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/api/src/schemas/campaigns.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/api/src/routes/campaigns.ts`
- `/Users/godzillaaa/Documents/WEB_PROJECTS/withSeismic_tools/dotoro/apps/web/app/campaigns/generate/components/GenerationPreview.tsx`

---

## Not In Scope

### Real-time Platform API Integration
- Will NOT connect to Google Ads API, Facebook Marketing API, Reddit Ads API
- **Why:** Scope creep; requires OAuth, API credentials management, rate limiting
- **Future:** Phase 10+ will add push-to-platform capability

### A/B Test Configuration
- Will NOT add A/B test setup for ad variations
- **Why:** Complex feature that deserves its own dedicated implementation
- **Future:** Can build on explicit ad group structure once complete

### Campaign Scheduling
- Will NOT add scheduling for campaign activation
- **Why:** Requires platform API integration (out of scope)
- **Future:** After platform API integration is complete

### Budget Optimization / Recommendations
- Will NOT add AI-powered budget recommendations
- **Why:** Requires historical data and ML infrastructure
- **Future:** Separate analytics/optimization feature

### Bulk Edit of Generated Campaigns
- Will NOT add post-generation bulk editing
- **Why:** Current scope is generation flow, not campaign management
- **Future:** Campaigns list page enhancement

---

## Implementation Plan

### Sprint 1: Foundation (Estimated: 2-3 days)
1. [ ] Terminology decision and template removal (Phase 1) - 4 hours
2. [ ] Step reordering - move rules to Step 2 (Phase 2) - 3 hours
3. [ ] Write tests for new step order - 2 hours

### Sprint 2: Platform & Budget (Estimated: 3-4 days)
4. [ ] Remove platform from CampaignConfig (Phase 3.1) - 2 hours
5. [ ] Create PlatformSelector component (Phase 3.2) - 4 hours
6. [ ] Update wizard state for multi-platform (Phase 3.3) - 3 hours
7. [ ] Add per-platform budget UI (Phase 4) - 4 hours
8. [ ] Update API schemas (Phase 4.3) - 2 hours
9. [ ] Write tests for multi-platform selection - 3 hours

### Sprint 3: Ad Group Structure (Estimated: 4-5 days)
10. [ ] Design and build AdGroupBuilder component (Phase 5.2) - 6 hours
11. [ ] Update HierarchyConfig to use AdGroupBuilder (Phase 5.3) - 3 hours
12. [ ] Update hierarchical-grouper for explicit ad groups (Phase 5.4) - 4 hours
13. [ ] Move keywords to ad group level (Phase 6) - 4 hours
14. [ ] Write comprehensive tests for ad group structure - 4 hours

### Sprint 4: Polish & Edge Cases (Estimated: 3-4 days)
15. [ ] Implement character limit fallbacks (Phase 7) - 5 hours
16. [ ] Update preview for multi-platform (Phase 9.1, 9.2) - 4 hours
17. [ ] Update generation endpoint (Phase 9.3) - 3 hours
18. [ ] Add export format options (Phase 9.4) - 4 hours
19. [ ] Handle transform edge cases (Phase 8) - 3 hours

### Sprint 5: Testing & Documentation (Estimated: 2 days)
20. [ ] End-to-end testing of full wizard flow - 4 hours
21. [ ] Update any existing documentation - 2 hours
22. [ ] Bug fixes and polish - 4 hours
23. [ ] Performance testing with large datasets - 2 hours

---

## Definition of Done

- [ ] All new components have unit tests with >80% coverage
- [ ] E2E tests cover happy path for multi-platform generation
- [ ] Wizard flow works without console errors
- [ ] Accessibility: keyboard navigation works through all steps
- [ ] Preview correctly shows structure for all selected platforms
- [ ] Character limit warnings appear before generation
- [ ] Rules applied to data are reflected in subsequent step previews
- [ ] API accepts and processes multi-platform requests correctly
- [ ] No regressions in existing single-platform generation
- [ ] Mobile-responsive design maintained

---

## Notes

### Tech Stack
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **State Management:** useReducer hook pattern (already in place)
- **Styling:** CSS Modules (existing pattern)
- **Validation:** Zod schemas (frontend type extraction + backend validation)
- **Testing:** Jest + React Testing Library

### Design Principles
1. **Platform Agnostic Core:** Campaign structure should be defined once, exported to many platforms
2. **Progressive Disclosure:** Show complexity only when needed (e.g., fallback options)
3. **Real-time Feedback:** Preview updates should feel immediate
4. **Reversibility:** Users should be able to go back and modify any step

### Best Practices
- Keep each component focused on a single responsibility
- Use controlled components for all form inputs
- Debounce expensive operations (preview generation)
- Memoize computed values (useMemo for preview calculations)
- Provide clear error messages with actionable suggestions

---

## Next Steps

### Immediate Actions (After Approval)
1. Get stakeholder sign-off on "Campaign Builder" terminology
2. Create feature branch: `feat/wizard-restructure`
3. Start with Phase 1 (template removal) as it unblocks other phases
4. Set up parallel work: Phase 2 (step reordering) can start immediately

### Questions to Resolve
- [ ] Confirm final terminology choice ("Campaign Builder" recommended)
- [ ] Confirm template removal approach (full removal vs deprecation)
- [ ] Clarify expected behavior for transform chains
- [ ] Define export format specifications per platform

---

## Appendix: File Structure After Restructure

```
web/app/campaigns/generate/
  |-- components/
  |     |-- AdGroupBuilder.tsx           # NEW: Explicit ad group configuration
  |     |-- AdGroupBuilder.module.css    # NEW
  |     |-- CampaignConfig.tsx           # MODIFIED: Remove platform, remove budget
  |     |-- CampaignConfig.module.css
  |     |-- DataSourceSelector.tsx
  |     |-- GenerateWizard.tsx           # MODIFIED: New step order
  |     |-- GenerationPreview.tsx        # MODIFIED: Multi-platform tabs
  |     |-- HierarchyConfig.tsx          # MODIFIED: Uses AdGroupBuilder
  |     |-- HierarchyConfig.module.css
  |     |-- KeywordConfig.tsx            # MODIFIED: Integrated into ad groups
  |     |-- KeywordConfig.module.css
  |     |-- PlatformSelector.tsx         # NEW: Multi-platform + per-platform budget
  |     |-- PlatformSelector.module.css  # NEW
  |     |-- RuleSelector.tsx
  |     |-- StepIndicator.tsx
  |     |-- TemplateSelector.tsx         # DELETED
  |     |-- ValidationMessage.tsx
  |     |-- VariableAutocomplete.tsx
  |-- hooks/
  |     |-- useGenerateWizard.ts         # MODIFIED: New actions for multi-platform
  |-- types.ts                           # MODIFIED: New interfaces, removed template
  |-- GenerateWizard.module.css

packages/core/src/generation/
  |-- hierarchical-grouper.ts            # MODIFIED: Support explicit ad groups
  |-- platform-constraints.ts            # NEW: Character limits per platform
  |-- index.ts                           # MODIFIED: Export new modules

api/src/schemas/
  |-- campaigns.ts                       # MODIFIED: Multi-platform request schema
```
