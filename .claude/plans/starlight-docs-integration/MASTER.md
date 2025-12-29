# Project Orchestration: Starlight Documentation Integration
Workflow: starlight-docs-integration
Generated: 2025-12-29
Status: Complete
Parallelization: Enabled

## Overview

Integrate Starlight documentation framework into the existing Dotoro marketing site (apps/marketing) to provide customer-facing documentation with API playground capabilities.

### Goals
- Documentation lives at /docs/* path
- Matches Dotoro design system (coral brand, Instrument Sans/Space Grotesk typography)
- Interactive API playground using OpenAPI spec from Hono API
- Guides, tutorials, and API reference content

## Execution Levels (Parallel Groups)

### Level 0 (No Dependencies) - SEQUENTIAL
| Feature | Status | TODO Doc | Phases | Checkboxes |
|---------|--------|----------|--------|------------|
| starlight-setup | ✅ Complete | [TODO](features/starlight-setup-TODO.md) | 2 | 27/27 |

### Level 1 (Depends on Level 0) - PARALLEL
| Feature | Status | TODO Doc | Dependencies | Phases | Checkboxes |
|---------|--------|----------|--------------|--------|------------|
| custom-theming | ✅ Complete | [TODO](features/custom-theming-TODO.md) | starlight-setup | 5 | 52/52 |
| openapi-integration | ✅ Complete | [TODO](features/openapi-integration-TODO.md) | starlight-setup | 2 | 18/18 |

### Level 2 (Depends on Level 1) - PARALLEL
| Feature | Status | TODO Doc | Dependencies | Phases | Checkboxes |
|---------|--------|----------|--------------|--------|------------|
| docs-content | ✅ Complete | [TODO](features/docs-content-TODO.md) | starlight-setup, custom-theming | 6 | All pages created |
| nav-integration | ✅ Complete | [TODO](features/nav-integration-TODO.md) | starlight-setup, docs-content | 1 | 8/8 |

## Status Legend
- ⏳ Pending - Ready to start (no blocking deps)
- ⏳ Waiting - Blocked by incomplete dependencies
- 🔄 In Progress - Currently being implemented
- 🔍 In Review - Code review or PR suite in progress
- ✅ Complete - Implemented, reviewed, validated, committed
- ❌ Blocked - Error or user input required

## Dependency Graph

```
Level 0:  [starlight-setup]
               │
         ┌─────┴─────┐
         ▼           ▼
Level 1: [custom-theming] [openapi-integration]
               │           │
         ┌─────┴───────────┘
         ▼
Level 2: [docs-content] ──► [nav-integration]
```

## Key Technical Decisions

1. **Subpath Integration**: Starlight configured at /documentation/* within existing Astro site
2. **Shared Design Tokens**: Import existing tokens.css into Starlight custom theme
3. **OpenAPI Source**: Fetch from http://localhost:3001/api/v1/openapi.json (dev) / production API URL
4. **i18n**: Leverage existing i18n setup (en, es, fr, de, ja locales)

## Progress Log
| Timestamp | Feature | Phase | Action | Notes |
|-----------|---------|-------|--------|-------|
| 2025-12-29 | - | Planning | TODO docs generating | 5 features identified |
| 2025-12-29 | starlight-setup | Complete | Starlight installed | Root locale for English, 5 locales configured |
| 2025-12-29 | custom-theming | Complete | Dotoro design system | Custom CSS with brand colors and typography |
| 2025-12-29 | openapi-integration | Complete | API playground | starlight-openapi with auth docs |
| 2025-12-29 | docs-content | Complete | 17 pages created | Core Concepts, Platform Guides, Tutorials |
| 2025-12-29 | nav-integration | Complete | Header/Footer updated | Internal /docs/ links |

## Files Created/Modified

### Documentation Content (17 pages)
- `apps/marketing/src/content/docs/docs/index.mdx` - Welcome page
- `apps/marketing/src/content/docs/docs/getting-started.mdx` - Quick start
- `apps/marketing/src/content/docs/docs/concepts/*.mdx` - 5 Core Concept pages
- `apps/marketing/src/content/docs/docs/platforms/**/*.mdx` - 4 Platform Guide pages
- `apps/marketing/src/content/docs/docs/tutorials/*.mdx` - 3 Tutorial pages
- `apps/marketing/src/content/docs/docs/api/*.mdx` - 3 API Reference pages

### Styling
- `apps/marketing/src/styles/starlight-custom.css` - Dotoro theme overrides
- `apps/marketing/src/styles/openapi-overrides.css` - API playground styling

### Configuration
- `apps/marketing/astro.config.mjs` - Starlight integration with sidebar
- `apps/marketing/package.json` - @astrojs/starlight, starlight-openapi

### Navigation
- `apps/marketing/src/components/navigation/Header.astro` - Docs link to /docs/
- `apps/marketing/src/components/navigation/Footer.astro` - Documentation link to /docs/

## Orchestrator Commands
- Resume: `/feature-orchestrator --resume starlight-docs-integration`
