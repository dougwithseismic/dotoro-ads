# Dotoro - Programmatic Ad Campaign Builder

**Date:** 2025-12-21
**Status:** Planning - Phase 1 Reddit Ads Integration

---

## Goal

Build an internal programmatic ad campaign generation tool that enables marketing teams to create, manage, and deploy thousands of ad variations across multiple advertising platforms from a single data source. Starting with Reddit Ads API integration, then expanding to Google Ads and Facebook Ads.

### Success Criteria

- [ ] Users can upload CSV data and see it normalized into a row-based format within 5 seconds
- [ ] Users can create campaign templates with variable placeholders that auto-populate from data rows
- [ ] Users can define conditional rules that filter/transform data before ad generation
- [ ] Users can preview all generated campaign variations before pushing to Reddit Ads
- [ ] Users can sync campaigns to Reddit Ads with full CRUD operations and see sync status in real-time

---

## What's Already Done

### Monorepo Infrastructure (Complete)

- Turborepo setup with pnpm workspaces
- `apps/web` - Next.js 16 frontend application (React 19, TypeScript 5.9)
- `apps/docs` - Documentation site scaffold
- `packages/ui` - Shared UI component library (Button, Card, Code components)
- `packages/eslint-config` - Shared ESLint configurations
- `packages/typescript-config` - Shared TypeScript configurations
- pnpm workspace configuration ready for new packages

### Development Environment (Complete)

- Node.js 18+ requirement set
- Prettier formatting configured
- ESLint with Next.js and React rules
- TypeScript strict mode enabled
- Turbo caching for build/lint/check-types tasks

---

## What We're Building Now

### Phase 1: Core Infrastructure & Reddit Ads Integration (Current Sprint)

#### 1.1 Database Schema & ORM Setup
**Priority: HIGH** - Foundation for all data persistence

- [ ] Set up Drizzle ORM with PostgreSQL adapter
  - Create `packages/database` package
  - Configure connection pooling for production
  - Set up migration system with `drizzle-kit`

- [ ] Create core data source tables
  ```sql
  -- Data sources (CSV uploads, API connections)
  data_sources: id, name, type, config, created_at, updated_at

  -- Normalized data rows from sources
  data_rows: id, data_source_id, row_data (JSONB), row_index, created_at

  -- Column mappings for normalization
  column_mappings: id, data_source_id, source_column, normalized_name, data_type
  ```

- [ ] Create campaign template tables
  ```sql
  -- Campaign templates (structure definition)
  campaign_templates: id, name, platform, structure (JSONB), created_at, updated_at

  -- Ad group/ad set templates
  ad_group_templates: id, campaign_template_id, name, settings (JSONB)

  -- Ad templates with variable placeholders
  ad_templates: id, ad_group_template_id, headline, description, variables (JSONB)
  ```

- [ ] Create rule engine tables
  ```sql
  -- Rule definitions
  rules: id, name, type, conditions (JSONB), actions (JSONB), priority, enabled

  -- Rule-to-template associations
  template_rules: id, template_id, rule_id, execution_order
  ```

- [ ] Create generated campaign tables
  ```sql
  -- Generated campaigns (local state before sync)
  generated_campaigns: id, template_id, data_row_id, campaign_data (JSONB), status

  -- Platform sync records
  sync_records: id, generated_campaign_id, platform, platform_id, sync_status, last_synced_at, error_log
  ```

- [ ] Create ad account tables
  ```sql
  -- Connected ad accounts
  ad_accounts: id, platform, account_id, account_name, credentials (encrypted), status

  -- OAuth tokens (encrypted)
  oauth_tokens: id, ad_account_id, access_token, refresh_token, expires_at
  ```

**Example Use Cases:**
- Marketing manager uploads product catalog CSV with 500 products
- System normalizes columns: "Product Title" -> "product_name", "MSRP" -> "price"
- Each row becomes a data_row with JSONB containing normalized fields
- Template references `{product_name}` and `{price}` variables

#### 1.2 API Layer Setup
**Priority: HIGH** - Enables frontend-backend communication

- [ ] Create `apps/api` package with Hono.js framework
  - Configure OpenAPI/Swagger documentation generation
  - Set up request validation with Zod schemas
  - Implement consistent error response format
  - Add request logging and tracing

- [ ] Implement API routes structure:
  ```
  /api/v1/
    /data-sources
      GET /              - List all data sources
      POST /             - Create new data source
      GET /:id           - Get data source details
      PUT /:id           - Update data source
      DELETE /:id        - Delete data source
      POST /:id/upload   - Upload CSV file
      GET /:id/rows      - Get paginated data rows
      POST /:id/preview  - Preview first N rows

    /templates
      GET /              - List all templates
      POST /             - Create template
      GET /:id           - Get template with structure
      PUT /:id           - Update template
      DELETE /:id        - Delete template
      POST /:id/preview  - Preview generated ads

    /rules
      GET /              - List all rules
      POST /             - Create rule
      GET /:id           - Get rule details
      PUT /:id           - Update rule
      DELETE /:id        - Delete rule
      POST /:id/test     - Test rule against sample data

    /campaigns
      GET /              - List generated campaigns
      POST /generate     - Generate campaigns from template
      GET /:id           - Get campaign details
      POST /:id/sync     - Sync to platform
      GET /:id/diff      - Get diff with platform state

    /accounts
      GET /              - List connected accounts
      POST /connect      - Initiate OAuth flow
      DELETE /:id        - Disconnect account
      GET /:id/status    - Check account status

    /reddit
      GET /auth/callback - OAuth callback handler
      POST /campaigns    - Create Reddit campaign
      PUT /campaigns/:id - Update Reddit campaign
      DELETE /campaigns/:id - Delete Reddit campaign
      GET /campaigns/:id/status - Get campaign status
  ```

**Example Request/Response:**
```typescript
// POST /api/v1/templates
Request: {
  name: "Reddit Product Ads",
  platform: "reddit",
  structure: {
    campaign: {
      name: "{product_category} - Q1 2025",
      objective: "CONVERSIONS",
      budget_type: "DAILY",
      budget_amount: 50
    },
    ad_groups: [{
      name: "{product_name} AdGroup",
      targeting: { subreddits: ["{target_subreddit}"] }
    }],
    ads: [{
      headline: "Get {product_name} for ${price}",
      description: "{product_description}"
    }]
  }
}

Response: {
  id: "tmpl_abc123",
  name: "Reddit Product Ads",
  platform: "reddit",
  variables: ["product_category", "product_name", "target_subreddit", "price", "product_description"],
  created_at: "2025-12-21T10:00:00Z"
}
```

#### 1.3 Data Ingestion Layer
**Priority: HIGH** - First user-facing feature

- [ ] Implement CSV upload endpoint with streaming parser
  - File: `apps/api/src/services/csv-parser.ts`
  - Support files up to 100MB
  - Parse with Papa Parse for robust CSV handling
  - Return column headers and first 10 rows for preview

- [ ] Build data normalization service
  - File: `apps/api/src/services/data-normalizer.ts`
  - Auto-detect column types (string, number, date, URL)
  - Generate suggested normalized column names
  - Handle encoding issues (UTF-8, Latin-1)

- [ ] Create column mapping UI
  - File: `apps/web/app/data-sources/[id]/mapping/page.tsx`
  - Drag-drop interface for column assignment
  - Type validation with real-time feedback
  - Save/load mapping presets

- [ ] Implement validation service
  - File: `apps/api/src/services/data-validator.ts`
  - Check required fields are present
  - Validate data types match expected
  - Generate validation report with row-level errors

**Example Use Cases:**
- User uploads 10,000 row CSV of products in 3 seconds
- System auto-detects "Price ($)" as currency, suggests "price" as normalized name
- User maps "Product SKU" to required "product_id" field
- Validation catches 47 rows with missing product names, shows inline errors

#### 1.4 Campaign Template System
**Priority: HIGH** - Core value proposition

- [ ] Build template editor component
  - File: `apps/web/app/templates/editor/TemplateEditor.tsx`
  - Visual campaign structure builder
  - Variable insertion with autocomplete from data source columns
  - Real-time validation of variable syntax

- [x] Implement variable substitution engine ✅ (2025-12-21)
  - File: `packages/core/src/services/variable-engine.ts`
  - Parse `{variable_name}` syntax
  - Support nested variables: `{category.{lang}}`
  - Support filters: `{price|currency}`, `{name|uppercase}` (12 built-in filters)
  - Support fallbacks: `{sale_price|price}`
  - DoS prevention (max template size, variable count, nesting depth)
  - 214 tests passing

- [ ] Create template preview system (frontend)
  - File: `apps/web/app/templates/[id]/preview/page.tsx`
  - Show sample generated ads with real data
  - Paginate through all variations
  - Highlight variable substitutions

- [x] Implement platform-specific template validation ✅ (2025-12-21)
  - File: `packages/core/src/validators/reddit-validator.ts`
  - Validate headline length (max 100 chars for Reddit)
  - Validate description length (max 500 chars)
  - Check required fields per platform spec
  - 29 validator tests passing

- [x] Implement template service & API routes ✅ (2025-12-21)
  - File: `apps/api/src/services/template-service.ts`
  - File: `apps/api/src/routes/templates.ts`
  - Template CRUD operations
  - Variable extraction API (`POST /templates/variables/extract`)
  - Template validation API (`POST /templates/validate`)
  - Variable substitution API (`POST /templates/variables/substitute`)
  - Preview generation API (`POST /templates/preview`)
  - 148 API tests passing

**Example Use Cases:**
- User creates template: "Shop {product_name} - {discount}% Off!"
- Preview shows: "Shop Nike Air Max - 25% Off!" for row 1
- Validation warns: Row 47 headline exceeds 100 characters after substitution
- User adds fallback: `{sale_price|regular_price}` for products without sales

#### 1.5 Rule Engine
**Priority: MEDIUM** - Enables advanced automation

- [ ] Design rule condition schema
  - File: `packages/core/src/rules/condition-schema.ts`
  ```typescript
  type Condition = {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex' | 'in' | 'not_in';
    value: string | number | string[];
    logic?: 'AND' | 'OR';
    children?: Condition[];
  }
  ```

- [ ] Implement rule evaluation engine
  - File: `packages/core/src/rules/rule-engine.ts`
  - Evaluate conditions against data rows
  - Support complex nested AND/OR logic
  - Return matching rows with applied transformations

- [ ] Build rule action system
  - File: `packages/core/src/rules/actions.ts`
  - Skip row (don't generate ad)
  - Modify field value
  - Add/remove from ad group
  - Set custom targeting

- [ ] Create rule builder UI
  - File: `apps/web/app/rules/builder/RuleBuilder.tsx`
  - Visual condition builder (similar to Notion filters)
  - Test rule against current data source
  - Show matching row count in real-time

**Example Use Cases:**
- Rule: IF `price > 100` AND `category = 'Electronics'` THEN `add to "Premium Tech" ad group`
- Rule: IF `stock_quantity < 10` THEN `skip row`
- Rule: IF `product_name contains 'Bundle'` THEN `set headline = "Save on {product_name}!"`

#### 1.6 Reddit Ads API Integration
**Priority: HIGH** - Primary platform for Phase 1

- [ ] Implement Reddit OAuth 2.0 flow
  - File: `apps/api/src/services/reddit/oauth.ts`
  - Authorization URL generation with proper scopes
  - Token exchange endpoint
  - Token refresh mechanism
  - Secure token storage (encrypted)

  ```typescript
  // Required Reddit OAuth scopes
  scopes: ['ads_read', 'ads_write', 'account']

  // OAuth endpoints
  authorize: 'https://www.reddit.com/api/v1/authorize'
  token: 'https://www.reddit.com/api/v1/access_token'
  ```

- [ ] Create Reddit API client wrapper
  - File: `packages/reddit-ads/src/client.ts`
  - Rate limiting (600 requests per 10 minutes)
  - Automatic retry with exponential backoff
  - Request/response logging
  - Error normalization

- [ ] Implement Campaign CRUD operations
  - File: `packages/reddit-ads/src/campaigns.ts`
  ```typescript
  // Reddit Campaign API
  createCampaign(accountId: string, campaign: RedditCampaign): Promise<CampaignResponse>
  getCampaign(accountId: string, campaignId: string): Promise<Campaign>
  updateCampaign(accountId: string, campaignId: string, updates: Partial<Campaign>): Promise<Campaign>
  deleteCampaign(accountId: string, campaignId: string): Promise<void>
  listCampaigns(accountId: string, filters?: CampaignFilters): Promise<Campaign[]>
  ```

- [ ] Implement Ad Group CRUD operations
  - File: `packages/reddit-ads/src/ad-groups.ts`
  ```typescript
  // Reddit Ad Group API
  createAdGroup(campaignId: string, adGroup: RedditAdGroup): Promise<AdGroupResponse>
  getAdGroup(campaignId: string, adGroupId: string): Promise<AdGroup>
  updateAdGroup(campaignId: string, adGroupId: string, updates: Partial<AdGroup>): Promise<AdGroup>
  deleteAdGroup(campaignId: string, adGroupId: string): Promise<void>
  ```

- [ ] Implement Ad CRUD operations
  - File: `packages/reddit-ads/src/ads.ts`
  ```typescript
  // Reddit Ad API
  createAd(adGroupId: string, ad: RedditAd): Promise<AdResponse>
  getAd(adGroupId: string, adId: string): Promise<Ad>
  updateAd(adGroupId: string, adId: string, updates: Partial<Ad>): Promise<Ad>
  deleteAd(adGroupId: string, adId: string): Promise<void>
  ```

- [ ] Implement Creative upload
  - File: `packages/reddit-ads/src/creatives.ts`
  - Image upload (JPEG, PNG, GIF - max 20MB)
  - Thumbnail generation
  - Creative library management

- [ ] Build sync engine
  - File: `packages/core/src/sync/sync-engine.ts`
  - Diff local state vs platform state
  - Generate create/update/delete operations
  - Execute with transaction-like behavior
  - Record sync history and errors

**Example API Usage:**
```typescript
// Create a Reddit campaign
const campaign = await redditClient.campaigns.create(accountId, {
  name: "Electronics Sale Q1",
  objective: "CONVERSIONS",
  funding_instrument_id: "fi_123",
  start_date: "2025-01-01",
  end_date: "2025-03-31",
  daily_budget_micro: 50_000_000, // $50 in micros
  status: "PAUSED"
});
```

#### 1.7 Creative Management
**Priority: MEDIUM** - Required for complete ad creation

- [ ] Set up file storage (S3-compatible)
  - File: `apps/api/src/services/storage.ts`
  - Configure presigned upload URLs
  - Implement file type validation
  - Set up CDN for creative delivery

- [ ] Build creative upload API
  - File: `apps/api/src/routes/creatives.ts`
  ```
  POST /api/v1/creatives/upload - Get presigned URL
  POST /api/v1/creatives - Register uploaded creative
  GET /api/v1/creatives - List creative library
  DELETE /api/v1/creatives/:id - Remove creative
  ```

- [ ] Create creative library UI
  - File: `apps/web/app/creatives/page.tsx`
  - Grid view of all uploaded assets
  - Filter by type, date, usage
  - Bulk upload support

- [ ] Implement creative-to-ad linking
  - File: `packages/core/src/creative-linker.ts`
  - Map creative IDs to ad templates
  - Support dynamic creative selection based on rules

**Example Use Cases:**
- User uploads 50 product images in bulk
- System generates thumbnails and validates dimensions
- Template references `{product_image}` variable
- Rule: IF `category = 'Shoes'` THEN use `lifestyle_shoes.jpg` as background

#### 1.8 Generation Engine
**Priority: HIGH** - Core functionality

- [ ] Build generation orchestrator
  - File: `packages/core/src/generation/orchestrator.ts`
  - Accept template + data source + rules
  - Execute rules to filter/transform data
  - Generate all campaign variations
  - Return preview with estimated counts

- [ ] Implement variation generator
  - File: `packages/core/src/generation/variation-generator.ts`
  - Cartesian product of variations when needed
  - Deduplication of identical ads
  - Campaign structure optimization

- [ ] Create preview API
  - File: `apps/api/src/routes/preview.ts`
  ```
  POST /api/v1/campaigns/preview
  Request: { template_id, data_source_id, rules: [] }
  Response: {
    campaign_count: 5,
    ad_group_count: 25,
    ad_count: 125,
    preview: [...first 20 variations],
    warnings: ["3 ads exceed headline length"]
  }
  ```

- [ ] Build sync diff calculator
  - File: `packages/core/src/sync/diff-calculator.ts`
  - Compare local generated state with platform state
  - Categorize: to_create, to_update, to_delete, unchanged
  - Estimate API calls needed

**Example Use Cases:**
- User clicks "Preview" with 500 products
- System shows: "This will generate 500 campaigns, 1500 ad groups, 4500 ads"
- Diff shows: "Create 450 new, Update 40 existing, Delete 10 stale"

#### 1.9 Frontend Application
**Priority: HIGH** - User interface

- [ ] Set up application layout and navigation
  - File: `apps/web/app/layout.tsx`
  - Sidebar navigation with sections: Data, Templates, Rules, Campaigns, Accounts
  - Top bar with account switcher
  - Dark mode support

- [ ] Build Dashboard page
  - File: `apps/web/app/dashboard/page.tsx`
  - Quick stats: Active campaigns, Pending syncs, Recent uploads
  - Activity feed
  - Quick actions

- [ ] Build Data Sources list page
  - File: `apps/web/app/data-sources/page.tsx`
  - Table with pagination
  - Upload button with drag-drop zone
  - Row count and last updated

- [ ] Build Data Source detail page
  - File: `apps/web/app/data-sources/[id]/page.tsx`
  - Data preview table with virtual scrolling
  - Column mapping interface
  - Validation status

- [ ] Build Templates list page
  - File: `apps/web/app/templates/page.tsx`
  - Card grid with template previews
  - Platform filter
  - Create new button

- [ ] Build Template editor page
  - File: `apps/web/app/templates/[id]/edit/page.tsx`
  - Campaign structure builder
  - Variable picker panel
  - Live preview panel

- [ ] Build Campaigns page
  - File: `apps/web/app/campaigns/page.tsx`
  - Generated campaigns list
  - Sync status indicators
  - Batch sync actions

- [ ] Build Accounts page
  - File: `apps/web/app/accounts/page.tsx`
  - Connected accounts list
  - OAuth connect buttons per platform
  - Account health status

---

## Not In Scope

### Google Ads Integration
- Google Ads API client implementation
- Google OAuth flow
- Google-specific template validation

**Why:** Starting with Reddit to validate core architecture. Google Ads complexity (nested campaign structures, extensive targeting options) would delay MVP by 3-4 weeks. Planned for Phase 2.

### Facebook/Meta Ads Integration
- Facebook Marketing API client
- Facebook OAuth flow
- Facebook-specific creative requirements

**Why:** Meta's API has additional complexity (Business Manager hierarchy, creative hub requirements). Planned for Phase 3.

### Advanced Analytics Dashboard
- Campaign performance metrics
- ROI calculations
- A/B test analysis

**Why:** Focus on campaign creation first. Analytics requires separate data pipeline and can be added once campaigns are running.

### Multi-user Collaboration
- Team workspaces
- Role-based permissions
- Audit logging
- Approval workflows

**Why:** Internal tool starting with single-user use case. Collaboration features add significant complexity and are not needed for initial validation.

### Automated Bidding Optimization
- Bid adjustments based on performance
- Budget reallocation algorithms
- ML-based optimization

**Why:** Requires historical performance data. Cannot implement until campaigns have been running for sufficient time.

### White-label/Multi-tenant
- Custom branding
- Tenant isolation
- Usage billing

**Why:** Internal tool, not a SaaS product. Would add unnecessary infrastructure complexity.

### Creative Generation (AI)
- AI-generated headlines
- Image generation/editing
- Dynamic creative optimization

**Why:** Significant additional scope. Users will provide their own creatives for Phase 1.

---

## Implementation Plan

### Week 1: Foundation (40 hours)

1. **Database & Package Setup** (8 hours)
   - Create `packages/database` with Drizzle ORM
   - Create `packages/core` for shared business logic
   - Create `packages/reddit-ads` for Reddit API client
   - Set up PostgreSQL locally with Docker

2. **Schema Implementation** (8 hours)
   - Define all Drizzle schemas
   - Create initial migrations
   - Set up seed data scripts
   - Test CRUD operations

3. **API Foundation** (8 hours)
   - Create `apps/api` with Hono.js
   - Configure OpenAPI generation
   - Set up Zod validation
   - Implement base route handlers

4. **Basic Frontend Layout** (8 hours)
   - Update `apps/web` with new layout
   - Add navigation components
   - Set up API client (React Query)
   - Create basic page shells

5. **Development Infrastructure** (8 hours)
   - Add Turborepo package configs
   - Set up environment variable handling
   - Configure dev/prod environments
   - Add basic logging

### Week 2: Data Ingestion & Templates (40 hours)

6. **CSV Upload System** (8 hours)
   - Implement streaming CSV parser
   - Build upload API endpoint
   - Create upload UI with progress
   - Add file validation

7. **Data Normalization** (8 hours)
   - Build auto-detection logic
   - Implement column mapping API
   - Create mapping UI component
   - Add validation reporting

8. **Template System Backend** (8 hours)
   - Implement template CRUD API
   - Build variable substitution engine
   - Create platform validators
   - Add template versioning

9. **Template Editor UI** (12 hours)
   - Build campaign structure editor
   - Implement variable autocomplete
   - Create preview component
   - Add validation feedback

10. **Integration Testing** (4 hours)
    - Test upload-to-template flow
    - Verify variable substitution
    - Check error handling

### Week 3: Rule Engine & Generation (40 hours)

11. **Rule Engine Core** (12 hours)
    - Implement condition evaluator
    - Build action executor
    - Create rule ordering system
    - Add rule testing API

12. **Rule Builder UI** (8 hours)
    - Create visual condition builder
    - Add action configuration
    - Implement rule testing interface
    - Show affected row counts

13. **Generation Engine** (12 hours)
    - Build orchestrator service
    - Implement variation generator
    - Create deduplication logic
    - Add preview API

14. **Preview & Diff UI** (8 hours)
    - Build preview table component
    - Create diff visualization
    - Add warning displays
    - Implement pagination

### Week 4: Reddit Integration (40 hours)

15. **Reddit OAuth Implementation** (8 hours)
    - Set up OAuth flow
    - Implement token storage
    - Add refresh mechanism
    - Create connect UI

16. **Reddit API Client** (12 hours)
    - Implement campaign operations
    - Add ad group operations
    - Build ad operations
    - Handle rate limiting

17. **Sync Engine** (12 hours)
    - Build diff calculator
    - Implement sync executor
    - Add rollback capability
    - Create sync history

18. **Testing & Polish** (8 hours)
    - End-to-end testing
    - Error handling review
    - Performance optimization
    - Documentation

---

## Definition of Done

- [ ] User can upload a CSV and see normalized data within 5 seconds for files up to 10MB
- [ ] User can create a template with variables and preview generated ads
- [ ] User can define rules that filter data rows before generation
- [ ] User can connect Reddit Ads account via OAuth with tokens securely stored
- [ ] User can generate campaigns and sync to Reddit with create/update/delete operations
- [ ] All API endpoints have OpenAPI documentation
- [ ] All components have TypeScript types with no `any` usage
- [ ] Unit test coverage >80% for core business logic
- [ ] Integration tests pass for full upload-to-sync flow
- [ ] Error states are handled with user-friendly messages

---

## Notes

### Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Monorepo | Turborepo + pnpm | Already configured, excellent caching and task orchestration |
| Frontend | Next.js 16, React 19 | Already set up, App Router for modern patterns, RSC for performance |
| API | Hono.js | Lightweight, TypeScript-first, OpenAPI support, works in Edge |
| Database | PostgreSQL + Drizzle ORM | Type-safe queries, excellent migration tooling, JSONB for flexible data |
| Validation | Zod | Runtime + compile-time validation, integrates with Hono and React Hook Form |
| State | React Query (TanStack Query) | Caching, optimistic updates, great DX for API interactions |
| UI Components | shadcn/ui + Tailwind | Already have @repo/ui, shadcn is flexible and customizable |
| File Storage | S3-compatible (Cloudflare R2 or AWS) | Cost-effective, presigned URLs for direct upload |
| Auth | Custom OAuth handlers | Each platform has different OAuth flows, custom is more flexible |

### Design Principles

1. **Data First** - The data source is the single source of truth. Templates and rules operate on normalized data.

2. **Preview Before Push** - Always show users exactly what will be created/modified before any API calls.

3. **Sync, Don't Push** - Treat platform state as authoritative. Calculate diffs and sync rather than just pushing.

4. **Platform Abstraction** - Core logic (templates, rules, generation) is platform-agnostic. Platform specifics are isolated in adapter packages.

5. **Fail Gracefully** - Individual row failures shouldn't stop entire batch. Report errors at row level.

### Best Practices

- **API Error Handling:** All API errors return consistent `{ error: string, code: string, details?: object }` format
- **Rate Limiting:** Implement per-account rate limiting for platform APIs with queue system
- **Logging:** Structured JSON logging with request IDs for traceability
- **Secrets:** All OAuth tokens encrypted at rest with application-level encryption key
- **Testing:** Each package has its own test setup; integration tests in `apps/api`
- **Migrations:** Never modify existing migrations; always create new ones

### Reddit Ads API Reference

```
Base URL: https://ads-api.reddit.com/api/v2.0

Key Endpoints:
- GET /accounts - List ad accounts
- GET /accounts/{account_id}/campaigns - List campaigns
- POST /accounts/{account_id}/campaigns - Create campaign
- PUT /accounts/{account_id}/campaigns/{campaign_id} - Update campaign
- DELETE /accounts/{account_id}/campaigns/{campaign_id} - Delete campaign

Rate Limits:
- 600 requests per 10 minutes per user
- Campaigns: max 10,000 per account
- Ad groups: max 100 per campaign
- Ads: max 50 per ad group

Required Fields (Campaign):
- name: string (max 255 chars)
- objective: AWARENESS | CONSIDERATION | CONVERSIONS
- funding_instrument_id: string
- start_date: ISO 8601 date

Required Fields (Ad):
- headline: string (max 100 chars)
- call_to_action: LEARN_MORE | SIGN_UP | SHOP_NOW | etc.
```

---

## Next Steps

### Phase 2: Google Ads Integration (Weeks 5-7)
- Google Ads API client package
- Campaign, Ad Group, Ad CRUD operations
- Keyword management
- Google-specific template validation
- Shared sync engine integration

### Phase 3: Meta Ads Integration (Weeks 8-10)
- Facebook Marketing API client
- Campaign, Ad Set, Ad CRUD operations
- Audience management
- Creative hub integration
- Cross-platform campaign management

### Phase 4: Analytics & Optimization (Weeks 11-14)
- Performance data ingestion
- Dashboard with key metrics
- Cross-platform comparison views
- Budget optimization recommendations
