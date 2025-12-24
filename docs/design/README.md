# Dotoro Campaign Platform - Design Documentation

## Vision

Transform Dotoro into the best open-source paid ad generation platform, supporting multi-platform campaigns, rich creative assets, flexible monetization, and organic content generation.

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [01-overview.md](./01-overview.md) | Architecture overview, current state, and design principles |
| [02-ad-types.md](./02-ad-types.md) | Ad type system, registry pattern, and platform-specific definitions |
| [03-budget-bidding.md](./03-budget-bidding.md) | Budget configuration, bidding strategies, and scheduling |
| [04-creative-assets.md](./04-creative-assets.md) | Creative asset handling, upload, validation, and preview |
| [05-content-types.md](./05-content-types.md) | Extended content types including Reddit threads |
| [06-database-schema.md](./06-database-schema.md) | Database schema extensions and migrations |
| [07-ux-flows.md](./07-ux-flows.md) | UX flows, component architecture, and wireframes |
| [08-implementation-plan.md](./08-implementation-plan.md) | Phased implementation plan with tasks and deliverables |

---

## Quick Links

### Key Concepts

- **Ad Type Registry** - Extensible system for defining ad formats ([02-ad-types.md](./02-ad-types.md))
- **Bidding Strategies** - Platform-specific bidding options ([03-budget-bidding.md](./03-budget-bidding.md))
- **Creative Assets** - Preview-first image/video handling ([04-creative-assets.md](./04-creative-assets.md))
- **Thread Builder** - Reddit thread generation with personas ([05-content-types.md](./05-content-types.md))

### UX Components

- **AdTypeSelector** - Select ad formats per platform ([07-ux-flows.md](./07-ux-flows.md#adtypeselector))
- **BudgetBiddingConfig** - Budget and bidding configuration ([07-ux-flows.md](./07-ux-flows.md#budgetbiddingconfig))
- **CreativeUploader** - Image/video upload with preview ([04-creative-assets.md](./04-creative-assets.md#ux-components))
- **ThreadBuilder** - Reddit thread creation ([05-content-types.md](./05-content-types.md#ux-design-thread-builder))

### Database

- **New Tables** - `creative_assets`, `campaign_settings`, `thread_content`, `author_personas` ([06-database-schema.md](./06-database-schema.md))
- **Drizzle Schema** - TypeScript schema definitions ([06-database-schema.md](./06-database-schema.md#drizzle-schema))

---

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Foundation | Not Started | Type system, registry architecture |
| Phase 2: Budget & Bidding | Not Started | Enhanced budget UI, bidding strategies |
| Phase 3: Creative Assets | Not Started | Image upload, preview, validation |
| Phase 4: Ad Type Selection | Not Started | Ad type registry, selection UI |
| Phase 5: Thread Generation | Not Started | Reddit thread builder, personas |
| Phase 6: Asset Storage | Not Started | R2/S3 integration, asset library |
| Phase 7: Targeting | Not Started | Location, audience, interest targeting |
| Phase 8: Polish | Not Started | Testing, optimization, documentation |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Dotoro Campaign Platform                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Platform Registry                             │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │  Google   │  │  Reddit   │  │ Facebook  │  │  Future   │        │   │
│  │  │           │  │           │  │           │  │ Platforms │        │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Ad Type Registry                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Search  │ │  Image   │ │  Video   │ │ Carousel │ │  Thread  │  │   │
│  │  │   Ads    │ │   Ads    │ │   Ads    │ │   Ads    │ │ (Organic)│  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Campaign Generation Engine                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Data    │ │ Variable │ │ Creative │ │  Budget  │ │ Bidding  │  │   │
│  │  │  Source  │ │  Engine  │ │  Assets  │ │  Config  │ │ Strategy │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Platform Sync Layer                           │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │   │
│  │  │  Google Ads API  │  │  Reddit Ads API  │  │ Facebook Ads API │  │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

1. **Read the Overview** - Start with [01-overview.md](./01-overview.md) to understand the architecture
2. **Explore Ad Types** - See [02-ad-types.md](./02-ad-types.md) for the extensibility model
3. **Review UX Flows** - Check [07-ux-flows.md](./07-ux-flows.md) for component designs
4. **Check Implementation Plan** - See [08-implementation-plan.md](./08-implementation-plan.md) for phased approach

---

## Contributing

When extending this platform:

1. **New Platform** - Add to Platform Registry and define ad types
2. **New Ad Type** - Add to Ad Type Registry with field and creative definitions
3. **New Bidding Strategy** - Add to platform-specific strategy list
4. **New Content Type** - Add to Content Type Registry

See individual documents for detailed extension guidelines.
