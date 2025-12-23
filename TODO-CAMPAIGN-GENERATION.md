# Campaign Generation Feature - Complete Overhaul

**Date:** 2025-12-22
**Status:** Planning - Ready for Implementation

---

## Goal

Transform the campaign generation system from a template-first approach to a **campaign-first mental model** where users define campaigns with variable-driven names that automatically expand based on data sources. The system will use cascading GROUP BY operations to transform flat, denormalized rows from transforms into hierarchical campaign structures (Campaign > Ad Group > Ad).

### Success Criteria

- [ ] Users can create campaigns with variable patterns in names (e.g., `{brand_name}-performance`)
- [ ] System correctly groups flat rows into hierarchical structures using name pattern interpolation
- [ ] Preview accurately shows resulting campaign/ad group/ad counts before generation
- [ ] Keyword generation produces all prefix/suffix combinations with proper inheritance
- [ ] All existing tests pass and new functionality has >80% coverage

---

## What's Already Done

### Infrastructure (Complete)

- **Monorepo Structure**: Next.js frontend (`apps/web`), Hono API (`apps/api`), shared core (`packages/core`)
- **Database**: Supabase with tables for data_sources, templates, campaigns, rules, transforms
- **Authentication**: Supabase Auth integrated across stack

### Data Layer (Complete)

- **Data Sources** (`apps/web/app/data-sources/`)
  - CSV upload with validation
  - Column mapping UI
  - Data preview with pagination
  - API endpoints: `GET/POST /api/v1/data-sources`

- **Transforms** (`apps/web/app/transforms/`, `packages/core/src/transforms/`)
  - Transform builder UI with source selection
  - GroupBy picker for aggregation fields
  - Aggregation functions: COUNT, SUM, MIN, MAX, AVG, FIRST, LAST, CONCAT, COLLECT, etc.
  - Transform engine in `packages/core` that outputs flat, denormalized rows
  - API endpoints: `GET/POST /api/v1/transforms`, preview, execute

### Generation Infrastructure (Partial)

- **Wizard UI** (`apps/web/app/campaigns/generate/`)
  - Step indicator component
  - Template selector (needs replacement)
  - Data source selector (working)
  - Rule selector (working)
  - Generation preview component (needs overhaul)
  - State management via `useGenerateWizard` hook

- **Core Generation Engine** (`packages/core/src/generation/`)
  - `GenerationOrchestrator`: Combines rules + templates + data rows
  - `VariationGenerator`: Creates campaign variations from templates
  - `RuleEngine`: Processes data rows through rules (skip, modify, tag, group)
  - Variable interpolation via `VariableEngine`

- **API Layer** (`apps/api/src/`)
  - Preview service with template/data source fetching
  - Campaign schemas (generate, preview, sync)
  - Routes: `POST /api/v1/campaigns/preview`, `POST /api/v1/campaigns/generate`

### Rules System (Complete)

- Condition schema with AND/OR logic
- Actions: skip, modify, addTag, addGroup, setTargeting
- Rule engine processes dataset through ordered rules
- Rule builder UI and API

---

## What We're Building Now

### Phase 1: Campaign-First Wizard Overhaul (HIGH Priority)

**Why HIGH:** This is the foundational UX shift that enables all other features. Current template-first flow doesn't match the mental model.

#### 1.1 Campaign Configuration Step (replaces Template Selection)

**File:** `apps/web/app/campaigns/generate/components/CampaignConfig.tsx`

- [ ] Campaign name input with variable autocomplete
  - Text field with `{variable}` syntax support
  - Dropdown showing available variables from selected data source
  - Real-time validation of variable syntax
  - Example: `{brand_name}-performance-{region}`

- [ ] Platform selector (reddit, google, facebook)
  - Card-based selection matching existing UI patterns
  - Platform-specific validation hints

- [ ] Budget configuration (optional)
  - Type: daily/lifetime toggle
  - Amount input with currency selector
  - Support `{budget}` variable from data

**Example Use Cases:**
1. "Nike Performance Campaign" - User types `{brand_name}-performance`, selects Nike data source with 10 brands -> 10 campaigns
2. "Regional Campaigns" - User types `{brand_name}-{region}`, data has 3 brands x 4 regions -> 12 campaigns
3. "Product Launch" - User types `{product_name}-launch-{date}`, system generates campaign per product per launch date

#### 1.2 Hierarchy Configuration Step (NEW)

**File:** `apps/web/app/campaigns/generate/components/HierarchyConfig.tsx`

- [ ] Ad Group name pattern input
  - Variable autocomplete from data source columns
  - Shows how rows will group into ad groups
  - Example: `{product_name}` groups all rows with same product

- [ ] Ad field mapping
  - Map data columns to ad fields (headline, description, display_url, final_url)
  - Support multiple headline/description variants if data has them
  - Variable syntax for computed fields

- [ ] Hierarchy preview (real-time)
  - Tree visualization showing sample grouping
  - Campaign count, ad group count, ad count estimates

**Data Flow Visualization:**
```
Flat rows from transform:
| brand | product | headline | description |
|-------|---------|----------|-------------|
| Nike  | Air Max | Run Fast | Best shoe   |
| Nike  | Air Max | Speed Up | Top rated   |
| Nike  | Jordan  | Jump High| Classic     |

With patterns:
- Campaign: {brand}-performance
- Ad Group: {product}
- Ad: headline={headline}, description={description}

Results in:
Nike-performance (Campaign)
  Air Max (Ad Group)
    Ad: "Run Fast" / "Best shoe"
    Ad: "Speed Up" / "Top rated"
  Jordan (Ad Group)
    Ad: "Jump High" / "Classic"
```

#### 1.3 Updated Wizard Flow

**File:** `apps/web/app/campaigns/generate/types.ts`

```typescript
// New wizard steps
export type WizardStep =
  | 'data-source'      // Step 1: Select data source (moved first)
  | 'campaign-config'  // Step 2: Campaign name pattern + platform
  | 'hierarchy'        // Step 3: Ad group + ad configuration
  | 'keywords'         // Step 4: Keyword rules (optional)
  | 'rules'            // Step 5: Filtering/modification rules
  | 'preview';         // Step 6: Final preview + generate

export interface CampaignConfig {
  namePattern: string;           // e.g., "{brand_name}-performance"
  platform: Platform;
  objective?: string;
  budget?: {
    type: 'daily' | 'lifetime';
    amountPattern: string;       // Can be variable like "{budget}" or fixed "100"
    currency: string;
  };
}

export interface HierarchyConfig {
  adGroupNamePattern: string;    // e.g., "{product_name}"
  adMapping: {
    headline: string;            // Column name or pattern
    description: string;
    displayUrl?: string;
    finalUrl?: string;
    callToAction?: string;
  };
}
```

**File:** `apps/web/app/campaigns/generate/hooks/useGenerateWizard.ts`

- [ ] Update reducer to handle new state shape
- [ ] Add actions for campaign config and hierarchy config
- [ ] Update step navigation logic
- [ ] Add validation for each step

---

### Phase 2: Grouping Engine (HIGH Priority)

**Why HIGH:** This is the core algorithm that transforms flat rows into hierarchical campaigns. Everything depends on this.

#### 2.1 Hierarchical Grouper Service

**File:** `packages/core/src/generation/hierarchical-grouper.ts`

- [ ] `groupRowsIntoCampaigns(rows, config)` function
  - Takes flat denormalized rows
  - Groups by interpolated campaign name pattern
  - Within each campaign, groups by ad group pattern
  - Returns hierarchical structure

```typescript
export interface GroupingConfig {
  campaignNamePattern: string;
  adGroupNamePattern: string;
  adMapping: AdFieldMapping;
}

export interface GroupedCampaign {
  name: string;                    // Interpolated campaign name
  groupingKey: string;             // Raw key used for grouping
  sourceRows: Record<string, unknown>[];  // All rows in this campaign
  adGroups: GroupedAdGroup[];
}

export interface GroupedAdGroup {
  name: string;                    // Interpolated ad group name
  groupingKey: string;
  sourceRows: Record<string, unknown>[];
  ads: GroupedAd[];
}

export interface GroupedAd {
  headline: string;
  description: string;
  displayUrl?: string;
  finalUrl?: string;
  sourceRowId: string;
}
```

- [ ] Variable interpolation with fallback handling
  - Missing variable -> warning + skip or default
  - Empty value -> configurable behavior

- [ ] Deduplication options
  - Campaign-level: same interpolated name = same campaign
  - Ad-level: same headline+description = dedupe within ad group

#### 2.2 Integration with Orchestrator

**File:** `packages/core/src/generation/orchestrator.ts`

- [ ] Add new `generateFromConfig()` method that uses hierarchical grouper
- [ ] Keep existing `generate()` for backward compatibility
- [ ] Update preview method to use new grouping logic

#### 2.3 API Updates

**File:** `apps/api/src/schemas/campaigns.ts`

- [ ] New `generateFromConfigRequestSchema`:
```typescript
export const generateFromConfigRequestSchema = z.object({
  dataSourceId: uuidSchema,
  campaignConfig: z.object({
    namePattern: z.string().min(1),
    platform: platformSchema,
    objective: z.string().optional(),
    budget: z.object({
      type: z.enum(['daily', 'lifetime']),
      amountPattern: z.string(),
      currency: z.string().max(3),
    }).optional(),
  }),
  hierarchyConfig: z.object({
    adGroupNamePattern: z.string().min(1),
    adMapping: z.object({
      headline: z.string(),
      description: z.string(),
      displayUrl: z.string().optional(),
      finalUrl: z.string().optional(),
      callToAction: z.string().optional(),
    }),
  }),
  keywordConfig: keywordConfigSchema.optional(),
  ruleIds: z.array(uuidSchema).optional(),
});
```

**File:** `apps/api/src/routes/campaigns.ts`

- [ ] New endpoint: `POST /api/v1/campaigns/generate-from-config`
- [ ] Update preview endpoint to accept new config format

---

### Phase 3: Enhanced Preview System (MEDIUM Priority)

**Why MEDIUM:** Preview is critical for UX but depends on Phase 1 and 2 being complete.

#### 3.1 Real-time Preview Component

**File:** `apps/web/app/campaigns/generate/components/HierarchyPreview.tsx`

- [ ] Tree visualization of generated structure
  - Collapsible campaign nodes
  - Ad group nodes showing ad count
  - Sample ads with truncated content

- [ ] Statistics panel
  - Total campaigns to be created
  - Total ad groups
  - Total ads
  - Rows processed / skipped

- [ ] Warning display
  - Missing variables in rows
  - Empty interpolation results
  - Platform limit warnings

#### 3.2 Variable Availability Indicator

**File:** `apps/web/app/campaigns/generate/components/VariableAutocomplete.tsx`

- [ ] Fetch columns from selected data source
- [ ] Show which variables are available at current level
- [ ] Highlight variables used vs available
- [ ] Show sample values on hover

---

### Phase 4: Keyword Generation System (MEDIUM Priority)

**Why MEDIUM:** Keywords are a separate system that adds significant value but can be built after core campaign generation works.

#### 4.1 Keyword Rule Types

**File:** `packages/core/src/keywords/types.ts`

```typescript
export interface KeywordRule {
  id: string;
  name: string;
  scope: 'campaign' | 'ad-group';  // Where rule is defined
  coreTermPattern: string;          // e.g., "{product_name}"
  prefixes: string[];               // e.g., ["buy", "cheap", "best"]
  suffixes: string[];               // e.g., ["online", "sale", "near me"]
  matchTypes: MatchType[];          // broad, phrase, exact
  negativeKeywords?: string[];
}

export type MatchType = 'broad' | 'phrase' | 'exact';

export interface GeneratedKeyword {
  keyword: string;
  matchType: MatchType;
  adGroupId: string;
  sourceRuleId: string;
}
```

#### 4.2 Combinatorial Generator

**File:** `packages/core/src/keywords/keyword-generator.ts`

- [ ] `generateKeywords(rule, context)` function
  - Interpolate core term with row data
  - Generate all prefix/suffix combinations
  - Apply match type variations
  - Deduplicate results

**Example:**
```
Rule: {
  coreTermPattern: "{product_name}",
  prefixes: ["buy", ""],
  suffixes: ["online", ""],
  matchTypes: ["broad", "exact"]
}

Row: { product_name: "air max" }

Generates:
- "air max" (broad)
- "air max" (exact)
- "buy air max" (broad)
- "buy air max" (exact)
- "air max online" (broad)
- "air max online" (exact)
- "buy air max online" (broad)
- "buy air max online" (exact)
```

#### 4.3 Inheritance System

**File:** `packages/core/src/keywords/keyword-resolver.ts`

- [ ] Campaign-level rules apply to all ad groups by default
- [ ] Ad group can override with own rules
- [ ] Merge strategy: replace, extend, or merge
- [ ] Negative keywords cascade down

```typescript
export interface KeywordInheritance {
  campaignRules: KeywordRule[];
  adGroupOverrides: Map<string, {
    mode: 'replace' | 'extend' | 'merge';
    rules: KeywordRule[];
  }>;
}
```

#### 4.4 Keyword Configuration UI

**File:** `apps/web/app/campaigns/generate/components/KeywordConfig.tsx`

- [ ] Rule builder with prefix/suffix inputs
- [ ] Match type checkboxes
- [ ] Negative keyword input
- [ ] Preview of generated keywords for sample row
- [ ] Inheritance visualization

---

### Phase 5: Template System Refactor (LOW Priority)

**Why LOW:** The new campaign-first approach makes templates implicit. This phase makes saved configs reusable but isn't blocking.

#### 5.1 Campaign Config as Template

- [ ] "Save as Template" button after successful generation
- [ ] Template = saved CampaignConfig + HierarchyConfig + KeywordConfig
- [ ] Templates list in sidebar for quick access
- [ ] "Duplicate from Template" option on create

#### 5.2 Migration Path

- [ ] Keep existing template system working during transition
- [ ] Provide migration tool to convert old templates to new format
- [ ] Deprecation warnings on old endpoints

---

## Not In Scope

### Ad Creative Assets
- Image/video upload and management
- Creative library integration
- Asset variation testing

**Why:** Requires significant infrastructure (storage, CDN, image processing). Will be separate feature after core generation is solid.

### Platform Sync
- Reddit Ads API integration
- Google Ads API integration
- Facebook Ads API integration
- Two-way sync with conflict resolution

**Why:** Already have sync infrastructure in `packages/core/src/sync/`. Sync is a separate workflow from generation. Prioritizing generation UX first.

### Advanced Keyword Features
- Search term analysis
- Keyword bid suggestions
- Quality score predictions
- Automated negative keyword discovery

**Why:** Requires external data sources and ML models. Basic keyword generation must work first.

### Bulk Operations
- Mass edit generated campaigns
- Bulk status changes
- Batch rule application

**Why:** Can be added after generation is working. Current focus is single generation flow.

### A/B Testing
- Experiment setup
- Statistical significance calculations
- Winner selection automation

**Why:** Separate feature requiring experiment tracking infrastructure.

---

## Implementation Plan

### Step 1: Update Types and State Management (2-3 hours)

1. Update `apps/web/app/campaigns/generate/types.ts` with new interfaces
2. Modify `useGenerateWizard` hook to handle new state shape
3. Update `WIZARD_STEPS` to new flow order
4. Add validation functions for each step

### Step 2: Data Source First Step (1-2 hours)

1. Move DataSourceSelector to be first step
2. Add column fetching when data source selected
3. Store available columns in wizard state for later steps

### Step 3: Campaign Config Component (3-4 hours)

1. Create `CampaignConfig.tsx` with name pattern input
2. Implement variable autocomplete dropdown
3. Add platform selector cards
4. Add budget configuration (optional)
5. Write tests for variable parsing and validation

### Step 4: Hierarchy Config Component (4-5 hours)

1. Create `HierarchyConfig.tsx` with ad group pattern input
2. Implement ad field mapping UI
3. Add real-time hierarchy preview
4. Create tree visualization component
5. Write tests for grouping preview

### Step 5: Hierarchical Grouper in Core (4-5 hours)

1. Create `packages/core/src/generation/hierarchical-grouper.ts`
2. Implement `groupRowsIntoCampaigns` function
3. Add variable interpolation with error handling
4. Write comprehensive unit tests
5. Integrate with existing VariableEngine

### Step 6: Update API Layer (2-3 hours)

1. Add new schemas to `apps/api/src/schemas/campaigns.ts`
2. Create new route handler for config-based generation
3. Update preview endpoint
4. Write API tests

### Step 7: Enhanced Preview (3-4 hours)

1. Update `GenerationPreview.tsx` for new data shape
2. Add tree visualization
3. Improve statistics display
4. Add warning categorization

### Step 8: Keyword System (6-8 hours)

1. Create keyword types in `packages/core/src/keywords/`
2. Implement combinatorial generator
3. Build inheritance resolver
4. Create keyword config UI component
5. Integrate with campaign generation flow
6. Write tests

### Step 9: Integration Testing (2-3 hours)

1. End-to-end wizard flow tests
2. API integration tests
3. Large dataset performance tests

**Total Estimated Time:** 28-37 hours

---

## Definition of Done

- [ ] User can complete full wizard flow: data source -> campaign config -> hierarchy -> keywords (optional) -> rules (optional) -> preview -> generate
- [ ] Variable interpolation works correctly with all data types (string, number, null)
- [ ] Grouping produces correct hierarchy matching the documented algorithm
- [ ] Preview shows accurate counts matching what will be generated
- [ ] Keyword generation produces all expected combinations
- [ ] All new components have unit tests with >80% coverage
- [ ] API endpoints have request/response validation
- [ ] Existing functionality (data sources, transforms, rules) continues to work
- [ ] No TypeScript errors, ESLint passes
- [ ] Manual testing confirms UX flows smoothly

---

## Notes

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router) | Already in use, excellent DX |
| State | useReducer + Context | Simple, predictable, no external deps |
| Styling | CSS Modules | Already in use, scoped styles |
| API | Hono | Already in use, fast, TypeScript-first |
| Validation | Zod | Already in use, runtime + static types |
| Core Logic | Pure TypeScript | Testable, framework-agnostic |
| Testing | Vitest + React Testing Library | Already configured |

### Design Principles

1. **Campaign-First Thinking**: Users think about campaigns, not templates. The system should reflect this.

2. **Flat to Hierarchical**: Transforms output flat rows. Campaign generation groups them. Keep these concerns separate.

3. **Variables Everywhere**: Any column from the data source should be usable at any level (campaign name, ad group name, ad fields).

4. **Progressive Disclosure**: Show complexity only when needed. Keywords and rules are optional steps.

5. **Preview Before Commit**: Never generate without showing the user exactly what will be created.

### Best Practices

- **Variable Syntax**: Use `{variable_name}` consistently. Support `{variable|default}` for fallbacks.
- **Error Handling**: Missing variables should warn, not fail. Let users decide how to handle.
- **Performance**: Use pagination for previews. Limit displayed campaigns but show accurate total counts.
- **Accessibility**: All form inputs need labels. Keyboard navigation for tree views. ARIA live regions for dynamic counts.

---

## Next Steps (Future Phases)

### Phase 6: Platform Sync Integration
- Connect generated campaigns to Reddit/Google/Facebook Ads APIs
- Implement push workflow
- Handle API rate limits and errors
- Build sync status dashboard

### Phase 7: Campaign Templates Library
- Save successful campaign configs as reusable templates
- Template sharing between team members
- Template versioning and rollback

### Phase 8: Advanced Analytics
- Track generation history
- Show performance metrics for generated campaigns
- Suggest optimizations based on data patterns
