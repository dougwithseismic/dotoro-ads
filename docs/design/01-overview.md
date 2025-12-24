# Dotoro Campaign Platform - Architecture Overview

## Vision

Transform Dotoro into the best open-source paid ad generation platform, supporting:

- **Multi-platform campaigns** - Google, Reddit, Facebook, and extensible to others
- **Rich creative assets** - Images, videos, GIFs, carousels
- **Flexible monetization** - Budgets, bidding strategies, scheduling
- **Organic content** - Reddit threads, social posts, promotional content
- **Data-driven generation** - Variable interpolation from data sources

---

## Current State

### Existing Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Campaign Generation Flow                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1         Step 2        Step 3         Step 4        Step 5    Step 6 │
│ ┌────────┐    ┌────────┐    ┌─────────┐    ┌─────────┐   ┌────────┐ ┌──────┐│
│ │  Data  │───▶│ Rules  │───▶│Campaign │───▶│Hierarchy│──▶│Platform│─▶│Preview│
│ │ Source │    │(Optl)  │    │ Config  │    │ Config  │   │ Select │ │Generate│
│ └────────┘    └────────┘    └─────────┘    └─────────┘   └────────┘ └──────┘│
│                                                                              │
│  • CSV/API     • Filter     • Name pattern  • Ad Groups   • Google   • Live  │
│  • Columns     • Transform  • Objective     • Ads         • Reddit   • Stats │
│  • Samples     • Skip rows                  • Keywords    • Facebook • Tabs  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Current Capabilities

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-platform selection | ✅ | Google, Reddit, Facebook |
| Per-platform budgets | ✅ | Daily/Lifetime toggle |
| Variable interpolation | ✅ | Filters, fallbacks |
| Character limit validation | ✅ | Per-platform limits |
| Session persistence | ✅ | LocalStorage with restore |
| Inline rules | ✅ | Filter/transform data |
| Multi-ad-group support | ✅ | Hierarchical structure |

### Current Gaps

| Feature | Status | Priority |
|---------|--------|----------|
| Bidding strategies | ❌ | High |
| Creative assets (images/video) | ❌ | High |
| Platform-specific ad types | ❌ | High |
| Organic content (Reddit threads) | ❌ | Medium |
| Advanced budget controls | ❌ | Medium |
| Targeting configuration | ❌ | Medium |
| Asset storage/library | ❌ | Low |

---

## Proposed Architecture

### High-Level Overview

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

### Core Principles

1. **Registry-Based Extension** - New platforms and ad types added via configuration, not code changes
2. **Progressive Disclosure** - Simple by default, advanced when needed
3. **Preview-First Creatives** - Client-side preview without infrastructure
4. **Type-Safe Throughout** - Full TypeScript coverage with Zod validation
5. **Platform Abstraction** - Common interface, platform-specific implementations

---

## Document Structure

| Document | Description |
|----------|-------------|
| [01-overview.md](./01-overview.md) | This document - architecture overview |
| [02-ad-types.md](./02-ad-types.md) | Ad type system and registry |
| [03-budget-bidding.md](./03-budget-bidding.md) | Budget and bidding configuration |
| [04-creative-assets.md](./04-creative-assets.md) | Creative asset handling |
| [05-content-types.md](./05-content-types.md) | Extended content types (threads, organic) |
| [06-database-schema.md](./06-database-schema.md) | Database schema extensions |
| [07-ux-flows.md](./07-ux-flows.md) | UX flows and component design |
| [08-implementation-plan.md](./08-implementation-plan.md) | Phased implementation plan |

---

## Technology Stack

### Current Stack

- **Frontend**: Next.js 14, React, TypeScript, CSS Modules
- **Backend**: Hono API, Drizzle ORM
- **Database**: PostgreSQL (Supabase)
- **State**: React useReducer, LocalStorage persistence
- **Validation**: Zod schemas

### Additions for New Features

- **Asset Storage**: Cloudflare R2 or AWS S3 (optional, Phase 6)
- **Image Processing**: Sharp (server-side) or browser Canvas API
- **Video Thumbnails**: FFmpeg (optional) or external service
