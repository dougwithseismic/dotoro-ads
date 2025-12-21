# Dotoro - Data Transform Layer Implementation

**Date:** 2025-12-21
**Status:** Planning
**Feature:** Data Transform Layer for Row Aggregation/Grouping

---

## Goal

Enable users to aggregate and group raw data source rows before campaign generation, transforming granular data (e.g., 2,847 individual products) into meaningful business entities (e.g., 43 brand-level campaign rows) with computed aggregations like product counts, min/max prices, and concatenated values.

### Success Criteria

- [ ] Users can create transforms that group data by one or more fields (e.g., `item.brand`, `category`)
- [ ] Aggregation functions work correctly: COUNT, SUM, MIN, MAX, AVG, FIRST, LAST, CONCAT, COLLECT, DISTINCT_COUNT, COUNT_IF
- [ ] Transforms create persistent virtual data sources that can be used by templates and rules
- [ ] Live preview shows aggregated output before saving the transform
- [ ] Template variable extraction correctly identifies fields from virtual (aggregated) data sources

---

## What's Already Done

### Database Layer (`packages/database/`)
- [x] **Data Sources Schema** - `data-sources.ts` with `dataSources`, `dataRows`, `columnMappings` tables (Complete)
- [x] **Rules Schema** - `rules.ts` with JSONB config pattern for conditions/actions (Complete)
- [x] **Drizzle ORM Setup** - Relations, indexes, type exports established (Complete)

### Core Package (`packages/core/`)
- [x] **Rule Engine** - `rule-engine.ts` with condition evaluation, operator support, dataset processing (Complete)
- [x] **Variable Engine** - Template variable extraction and substitution (Complete)
- [x] **Validators** - Reddit ad validator with platform-specific limits (Complete)

### API Layer (`apps/api/`)
- [x] **Rules Routes** - Full CRUD + test/evaluate endpoints in `routes/rules.ts` (Complete)
- [x] **Zod Schemas** - Comprehensive validation in `schemas/rules.ts` with discriminated unions (Complete)
- [x] **Template Service** - `services/template-service.ts` with variable extraction, preview generation (Complete)
- [x] **OpenAPI Integration** - Hono with `@hono/zod-openapi` for typed routes (Complete)

### Frontend (`apps/web/`)
- [x] **Rules List Page** - `app/rules/page.tsx` with grid layout, enable/disable toggle (Complete)
- [x] **Rule Builder** - `app/rules/builder/RuleBuilder.tsx` with condition groups, action editor (Complete)
- [x] **Template Editor** - `app/templates/editor/TemplateEditor.tsx` with variable input, preview (Complete)

---

## What We're Building Now

### Phase 1: Database Schema & Types (HIGH Priority)

**File:** `packages/database/src/schema/transforms.ts`

Why HIGH: Foundation for all other work. Must be stable before API/core development.

- [ ] Create `transforms` table
  ```typescript
  // transforms table structure:
  // - id: uuid (primary key)
  // - name: varchar(255)
  // - description: text (optional)
  // - source_data_source_id: uuid (FK to data_sources)
  // - output_data_source_id: uuid (FK to data_sources, the virtual source)
  // - config: jsonb (TransformConfig type)
  // - enabled: boolean (default true)
  // - created_at, updated_at: timestamps
  ```

- [ ] Define `TransformConfig` TypeScript interface for JSONB column
  ```typescript
  interface TransformConfig {
    groupBy: string | string[];  // Field(s) to group by
    aggregations: AggregationConfig[];
    includeGroupKey: boolean;  // Include group key field(s) in output
    outputFieldPrefix?: string;  // Optional prefix for aggregated fields
  }

  interface AggregationConfig {
    sourceField: string;
    outputField: string;
    function: AggregationFunction;
    options?: {
      separator?: string;  // For CONCAT
      condition?: ConditionConfig;  // For COUNT_IF
      distinct?: boolean;  // For COUNT
    };
  }
  ```

- [ ] Add relations to `dataSources` (source and output)
- [ ] Create indexes: `transforms_source_idx`, `transforms_output_idx`, `transforms_enabled_idx`
- [ ] Export types: `Transform`, `NewTransform`, `TransformConfig`, `AggregationConfig`
- [ ] Update `packages/database/src/schema/index.ts` to export transforms

**Example Use Cases:**
1. Group products by brand: `groupBy: "item.brand"` with aggregations for product_count, avg_price
2. Group by category + subcategory: `groupBy: ["category", "subcategory"]`
3. Collect all SKUs per brand: `{ function: "COLLECT", sourceField: "sku", outputField: "all_skus" }`

---

### Phase 2: Core Transform Engine (HIGH Priority)

**Directory:** `packages/core/src/transforms/`

Why HIGH: Business logic must be correct and performant for grouping/aggregation.

#### 2a. Aggregation Functions (`aggregations.ts`)

- [ ] Define `AggregationFunction` enum/type
  ```typescript
  type AggregationFunction =
    | "COUNT"           // Count rows in group
    | "SUM"             // Sum numeric values
    | "MIN"             // Minimum value
    | "MAX"             // Maximum value
    | "AVG"             // Average of numeric values
    | "FIRST"           // First value encountered
    | "LAST"            // Last value encountered
    | "CONCAT"          // Concatenate string values (with separator)
    | "COLLECT"         // Collect all values into array
    | "DISTINCT_COUNT"  // Count unique values
    | "COUNT_IF";       // Count rows matching condition
  ```

- [ ] Implement `AggregationExecutor` class with method for each function
  ```typescript
  class AggregationExecutor {
    execute(
      fn: AggregationFunction,
      values: unknown[],
      options?: AggregationOptions
    ): unknown;

    // Internal methods:
    private count(values: unknown[]): number;
    private sum(values: unknown[]): number;
    private min(values: unknown[]): number | string | null;
    private max(values: unknown[]): number | string | null;
    private avg(values: unknown[]): number | null;
    private first(values: unknown[]): unknown;
    private last(values: unknown[]): unknown;
    private concat(values: unknown[], separator: string): string;
    private collect(values: unknown[]): unknown[];
    private distinctCount(values: unknown[]): number;
    private countIf(values: unknown[], condition: ConditionConfig): number;
  }
  ```

- [ ] Handle edge cases: empty arrays, null values, type coercion for numeric functions
- [ ] Export types and executor class

#### 2b. Transform Engine (`transform-engine.ts`)

- [ ] Implement `TransformEngine` class
  ```typescript
  interface TransformResult {
    rows: Record<string, unknown>[];
    groupCount: number;
    sourceRowCount: number;
    errors: TransformError[];
    warnings: TransformWarning[];
  }

  class TransformEngine {
    constructor(private aggregationExecutor: AggregationExecutor);

    // Main execution method
    execute(
      config: TransformConfig,
      sourceRows: Record<string, unknown>[]
    ): TransformResult;

    // Preview with limited rows
    preview(
      config: TransformConfig,
      sourceRows: Record<string, unknown>[],
      limit?: number
    ): TransformResult;

    // Internal methods
    private groupRows(
      rows: Record<string, unknown>[],
      groupBy: string | string[]
    ): Map<string, Record<string, unknown>[]>;

    private buildGroupKey(
      row: Record<string, unknown>,
      groupBy: string | string[]
    ): string;

    private aggregateGroup(
      groupKey: string,
      groupRows: Record<string, unknown>[],
      config: TransformConfig
    ): Record<string, unknown>;

    private getFieldValue(
      row: Record<string, unknown>,
      fieldPath: string
    ): unknown;  // Supports dot notation: "item.brand"
  }
  ```

- [ ] Support nested field access via dot notation (e.g., `item.brand`, `pricing.msrp`)
- [ ] Generate composite group keys for multi-field grouping
- [ ] Return detailed errors/warnings for debugging

#### 2c. Transform Validator (`transform-validator.ts`)

- [ ] Implement `TransformValidator` class
  ```typescript
  interface ValidationResult {
    valid: boolean;
    errors: Array<{
      code: string;
      field: string;
      message: string;
    }>;
    warnings: Array<{
      field: string;
      message: string;
    }>;
    inferredSchema: FieldSchema[];  // Output field types
  }

  class TransformValidator {
    // Validate config against source schema
    validateConfig(
      config: TransformConfig,
      sourceSchema: FieldSchema[]
    ): ValidationResult;

    // Validate groupBy fields exist in source
    private validateGroupByFields(
      groupBy: string | string[],
      sourceSchema: FieldSchema[]
    ): void;

    // Validate aggregation source fields exist
    private validateAggregationFields(
      aggregations: AggregationConfig[],
      sourceSchema: FieldSchema[]
    ): void;

    // Validate function compatibility with field types
    private validateFunctionTypeCompatibility(
      fn: AggregationFunction,
      fieldType: string
    ): void;

    // Infer output schema from config
    inferOutputSchema(
      config: TransformConfig,
      sourceSchema: FieldSchema[]
    ): FieldSchema[];
  }
  ```

- [ ] Validate numeric functions (SUM, AVG) are only applied to numeric fields
- [ ] Warn about potential data loss (e.g., FIRST on non-deterministic ordering)
- [ ] Infer output field types for downstream validation

#### 2d. Core Exports (`index.ts`)

- [ ] Update `packages/core/src/transforms/index.ts` to export all transform modules
- [ ] Update `packages/core/src/index.ts` to re-export transforms

**Example Use Cases:**
1. Product feed with 2,847 products grouped by brand (43 brands):
   - Input: `{ sku: "ABC123", brand: "Nike", price: 99.99, category: "Shoes" }`
   - Config: `{ groupBy: "brand", aggregations: [{ fn: "COUNT", output: "product_count" }, { fn: "MIN", source: "price", output: "min_price" }] }`
   - Output: `{ brand: "Nike", product_count: 127, min_price: 49.99 }`

2. Multi-field grouping (category + brand):
   - Config: `{ groupBy: ["category", "brand"], aggregations: [...] }`
   - Output: `{ category: "Shoes", brand: "Nike", product_count: 45 }`

---

### Phase 3: API Layer (MEDIUM Priority)

**Directory:** `apps/api/src/`

Why MEDIUM: Depends on core engine. Standard CRUD pattern already established.

#### 3a. Zod Schemas (`schemas/transforms.ts`)

- [ ] Define aggregation function enum schema
  ```typescript
  export const aggregationFunctionSchema = z.enum([
    "COUNT", "SUM", "MIN", "MAX", "AVG",
    "FIRST", "LAST", "CONCAT", "COLLECT",
    "DISTINCT_COUNT", "COUNT_IF"
  ]);
  ```

- [ ] Define aggregation config schema
  ```typescript
  export const aggregationConfigSchema = z.object({
    sourceField: z.string().min(1),
    outputField: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    function: aggregationFunctionSchema,
    options: z.object({
      separator: z.string().optional(),
      condition: conditionSchema.optional(),  // Reuse from rules schema
      distinct: z.boolean().optional(),
    }).optional(),
  });
  ```

- [ ] Define transform config schema
  ```typescript
  export const transformConfigSchema = z.object({
    groupBy: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    aggregations: z.array(aggregationConfigSchema).min(1),
    includeGroupKey: z.boolean().default(true),
    outputFieldPrefix: z.string().optional(),
  });
  ```

- [ ] Create/Update/Response schemas following `rules.ts` patterns
- [ ] Preview request/response schemas
- [ ] Execute request/response schemas with row limit

#### 3b. Transform Service (`services/transform-service.ts`)

- [ ] Implement `TransformService` class
  ```typescript
  class TransformService {
    private transformEngine: TransformEngine;
    private validator: TransformValidator;

    // Create transform with virtual data source
    async create(
      config: CreateTransformInput
    ): Promise<Transform>;

    // Execute transform and populate virtual data source
    async execute(
      transformId: string
    ): Promise<ExecuteResult>;

    // Preview transform without persisting
    async preview(
      config: TransformConfig,
      sourceDataSourceId: string,
      limit?: number
    ): Promise<PreviewResult>;

    // Get output schema (for variable extraction)
    getOutputSchema(
      transformId: string
    ): Promise<FieldSchema[]>;

    // Validate config against source
    async validateConfig(
      config: TransformConfig,
      sourceDataSourceId: string
    ): Promise<ValidationResult>;
  }
  ```

- [ ] Create virtual data source record when transform is created
- [ ] Populate `dataRows` in virtual source when transform is executed
- [ ] Clear and repopulate on re-execution

#### 3c. API Routes (`routes/transforms.ts`)

- [ ] `GET /api/v1/transforms` - List all transforms with pagination
  - Query params: `page`, `limit`, `sourceDataSourceId`, `enabled`
  - Response: Paginated list with source/output data source names

- [ ] `POST /api/v1/transforms` - Create new transform
  - Body: `{ name, description, sourceDataSourceId, config }`
  - Creates transform record AND virtual data source record
  - Returns transform with output data source ID

- [ ] `GET /api/v1/transforms/{id}` - Get transform by ID
  - Include source/output data source metadata
  - Include last execution timestamp and row counts

- [ ] `PUT /api/v1/transforms/{id}` - Update transform
  - Validate config against current source schema
  - Mark output data source as stale if config changed

- [ ] `DELETE /api/v1/transforms/{id}` - Delete transform
  - Cascade delete to virtual data source and its rows

- [ ] `POST /api/v1/transforms/{id}/execute` - Execute transform
  - Fetch source rows, run engine, persist to virtual data source
  - Return execution stats: row counts, timing, errors

- [ ] `POST /api/v1/transforms/{id}/preview` - Preview transform
  - Query param: `limit` (default 10, max 100)
  - Does NOT persist - returns sample output rows

- [ ] `POST /api/v1/transforms/preview` - Preview draft transform (not persisted)
  - Body: `{ sourceDataSourceId, config, limit }`
  - For testing config before creating

- [ ] Update `apps/api/src/routes/index.ts` to mount transforms routes

**API Response Examples:**

```typescript
// POST /api/v1/transforms
{
  "name": "Products by Brand",
  "sourceDataSourceId": "uuid-of-product-feed",
  "config": {
    "groupBy": "brand",
    "aggregations": [
      { "function": "COUNT", "outputField": "product_count" },
      { "function": "MIN", "sourceField": "price", "outputField": "min_price" },
      { "function": "MAX", "sourceField": "price", "outputField": "max_price" },
      { "function": "COLLECT", "sourceField": "sku", "outputField": "all_skus" }
    ],
    "includeGroupKey": true
  }
}

// Response
{
  "id": "uuid-of-transform",
  "name": "Products by Brand",
  "sourceDataSourceId": "uuid-of-product-feed",
  "outputDataSourceId": "uuid-of-virtual-source",  // Auto-created
  "config": { ... },
  "enabled": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### Phase 4: Frontend Transform Builder (MEDIUM Priority)

**Directory:** `apps/web/app/transforms/`

Why MEDIUM: User-facing feature. Depends on API completion.

#### 4a. Transform List Page (`page.tsx`)

- [ ] Create `app/transforms/page.tsx`
  - Grid layout matching rules page style
  - Show transform name, source -> output visualization
  - Display row counts (source rows -> output rows)
  - Show last execution timestamp and status
  - Enable/disable toggle
  - Edit/Delete actions

- [ ] Create `TransformList.module.css` following existing patterns

#### 4b. Transform Builder (`builder/TransformBuilder.tsx`)

- [ ] Create main builder component
  ```typescript
  interface TransformBuilderProps {
    initialTransform?: Transform;
    transformId?: string;
  }
  ```

- [ ] **Source Selector Section**
  - Dropdown to select source data source
  - Show source schema (field names and types)
  - Display source row count

- [ ] **Group By Configurator**
  - Field picker from source schema
  - Support single or multiple fields
  - Drag-and-drop reordering for multi-field
  - Preview of unique group count

- [ ] **Aggregation Builder**
  - Add/remove aggregation rows
  - Function dropdown (COUNT, SUM, MIN, MAX, etc.)
  - Source field picker (filtered by function compatibility)
  - Output field name input with validation
  - Options panel (separator for CONCAT, condition for COUNT_IF)

- [ ] **Live Preview Panel**
  - Fetch preview on config change (debounced)
  - Show sample output rows
  - Display aggregation results
  - Error/warning display

- [ ] **Output Schema Display**
  - Show inferred output field names and types
  - Highlight which fields are available for templates

#### 4c. Supporting Components

- [ ] `components/SourceSelector.tsx` - Data source dropdown with schema preview
- [ ] `components/GroupByPicker.tsx` - Multi-select field picker
- [ ] `components/AggregationRow.tsx` - Single aggregation config row
- [ ] `components/AggregationList.tsx` - List of aggregation configs
- [ ] `components/TransformPreview.tsx` - Live preview table
- [ ] `components/OutputSchema.tsx` - Output field schema display

#### 4d. Route Pages

- [ ] `app/transforms/page.tsx` - List page
- [ ] `app/transforms/builder/page.tsx` - Create new transform
- [ ] `app/transforms/builder/[id]/page.tsx` - Edit existing transform

---

### Phase 5: Integration & Polish (LOW Priority)

Why LOW: Polish and integration after core functionality works.

#### 5a. Template Service Integration

- [ ] Update `TemplateService.extractVariables()` to work with virtual data sources
- [ ] Ensure variable dropdown shows aggregated field names
- [ ] Add "Virtual Source" indicator in template builder

#### 5b. Navigation & UX

- [ ] Add "Transforms" link to main navigation
- [ ] Add "Create Transform" action from data sources page
- [ ] Show transform indicator on data sources that are virtual

#### 5c. Error Handling & Edge Cases

- [ ] Handle source data source deletion (warn about dependent transforms)
- [ ] Handle empty source data (0 rows)
- [ ] Handle very large datasets (pagination in engine)
- [ ] Add execution timeout for large transforms

---

## Not In Scope

### Transform Chaining
- **What:** Ability to create a transform on top of another transform's output
- **Why:** Adds significant complexity. If needed, user can create a transform on the virtual source manually. Revisit in v2 based on user feedback.

### Real-time Transform Updates
- **What:** Automatically re-execute transform when source data changes
- **Why:** Adds complexity around scheduling, notifications, and partial updates. Users will manually trigger execution for v1.

### Custom Aggregation Functions
- **What:** User-defined aggregation expressions or scripts
- **Why:** Security concerns with arbitrary code execution. The 11 built-in functions cover most use cases. Revisit if users request specific functions.

### Transform Scheduling
- **What:** Scheduled automatic execution of transforms
- **Why:** Requires job scheduling infrastructure. Out of scope for initial release.

### Conditional Aggregations (beyond COUNT_IF)
- **What:** Complex conditional logic for SUM_IF, AVG_IF, etc.
- **Why:** COUNT_IF covers the primary use case. Can extend aggregation functions later.

### Transform Versioning
- **What:** Keeping history of transform config changes
- **Why:** Adds significant storage and complexity. Users can create new transforms for different configurations.

---

## Implementation Plan

### Step 1: Database Schema (2-3 hours)
- [ ] Create `packages/database/src/schema/transforms.ts`
- [ ] Define tables, relations, indexes
- [ ] Export types
- [ ] Generate and run migration

### Step 2: Core Aggregation Functions (3-4 hours)
- [ ] Implement `AggregationExecutor` class
- [ ] Write unit tests for each aggregation function
- [ ] Handle edge cases (nulls, empty arrays, type coercion)

### Step 3: Transform Engine (4-5 hours)
- [ ] Implement `TransformEngine` class
- [ ] Support single and multi-field grouping
- [ ] Support nested field access (dot notation)
- [ ] Write integration tests with sample data

### Step 4: Transform Validator (2-3 hours)
- [ ] Implement `TransformValidator` class
- [ ] Validate field existence and type compatibility
- [ ] Infer output schema
- [ ] Write validation tests

### Step 5: API Schemas (2 hours)
- [ ] Create Zod schemas in `schemas/transforms.ts`
- [ ] Follow existing patterns from `rules.ts`

### Step 6: Transform Service (3-4 hours)
- [ ] Implement `TransformService` class
- [ ] Handle virtual data source lifecycle
- [ ] Integrate with database layer

### Step 7: API Routes (3-4 hours)
- [ ] Implement CRUD routes
- [ ] Implement execute and preview routes
- [ ] Add OpenAPI documentation
- [ ] Write API tests

### Step 8: Frontend List Page (2-3 hours)
- [ ] Create transform list page
- [ ] Style with CSS modules
- [ ] Add enable/disable toggle

### Step 9: Frontend Builder (5-6 hours)
- [ ] Build TransformBuilder component
- [ ] Implement aggregation configurator
- [ ] Add live preview
- [ ] Create supporting components

### Step 10: Integration & Testing (2-3 hours)
- [ ] Update template service for virtual sources
- [ ] Add navigation links
- [ ] End-to-end testing

**Total Estimated Time:** 28-37 hours

---

## Definition of Done

- [ ] Database migration runs successfully and schema is correct
- [ ] All aggregation functions pass unit tests with edge cases
- [ ] Transform engine correctly groups and aggregates sample data
- [ ] API routes pass OpenAPI validation and return correct responses
- [ ] Frontend builder allows creating transforms with live preview
- [ ] Templates can use variables from virtual (transformed) data sources
- [ ] No TypeScript errors in any package
- [ ] API tests cover CRUD operations and error cases
- [ ] Documentation updated with transform feature overview

---

## Notes

### Tech Stack
- **Database:** PostgreSQL with Drizzle ORM (following existing schema patterns)
- **Validation:** Zod schemas with discriminated unions for aggregation types
- **API:** Hono.js with `@hono/zod-openapi` for typed routes and documentation
- **Frontend:** React 19 / Next.js 16 with CSS Modules (matching existing components)
- **Testing:** Vitest for unit tests (matching existing test patterns)

### Design Principles
- **Explicit over implicit:** Transforms create real database records for virtual sources, making them debuggable and queryable
- **Validation-first:** Config is validated against source schema before execution
- **Fail-fast:** Invalid configurations are rejected at creation time, not execution time
- **Progressive disclosure:** Simple transforms (single groupBy, few aggregations) should be easy; complex configs are possible but not required

### Best Practices
- Use existing schema patterns from `rules.ts` and `data-sources.ts`
- Follow the service pattern from `template-service.ts`
- Match frontend component patterns from `RuleBuilder.tsx`
- Keep core engine stateless - all state in database
- Return detailed errors with actionable messages
- Support field dot notation consistently across engine and validator

---

## Next Steps

### v2: Transform Enhancements
- Transform chaining with dependency resolution
- Conditional aggregations (SUM_IF, AVG_IF)
- Transform scheduling with cron expressions
- Incremental execution for large datasets

### v3: Advanced Features
- Custom aggregation expressions (sandboxed)
- Transform templates (pre-built common patterns)
- Transform sharing across workspaces
- Performance optimization for 100k+ row sources
