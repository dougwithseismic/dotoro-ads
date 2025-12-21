# Dotoro - Programmatic Ad Campaign Builder

An internal programmatic ad campaign generation tool that enables marketing teams to create, manage, and deploy thousands of ad variations across multiple advertising platforms from a single data source.

## Features

- **Data Ingestion**: Upload CSV data and normalize it into a row-based format
- **Campaign Templates**: Create templates with variable placeholders that auto-populate from data rows
- **Rule Engine**: Define conditional rules to filter/transform data before ad generation
- **Creative Management**: Upload and manage creative assets with S3-compatible storage
- **Reddit Ads Integration**: Full CRUD operations with OAuth 2.0 and sync engine
- **Preview & Sync**: Preview all generated campaign variations before pushing to ad platforms

## Tech Stack

| Component | Technology |
|-----------|------------|
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 16, React 19, Tailwind CSS |
| API | Hono.js with OpenAPI/Swagger |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod |
| File Storage | S3-compatible (AWS S3, Cloudflare R2, MinIO) |

## Prerequisites

- **Node.js**: >= 18.x
- **pnpm**: 9.x (installed via `corepack enable`)
- **PostgreSQL**: 14+ (for production)
- **Redis**: (optional, for production OAuth session storage)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd dotoro
pnpm install
```

### 2. Set Up Environment Variables

Create `.env` files in the appropriate directories:

#### `apps/api/.env`

```bash
# Server
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Database
DATABASE_URL=postgres://localhost:5432/dotoro

# Reddit OAuth (get from https://www.reddit.com/prefs/apps)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_REDIRECT_URI=http://localhost:3001/api/v1/reddit/auth/callback

# Token Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_64_character_hex_string_here
ENCRYPTION_SALT=your_32_character_hex_string_here

# Storage (S3-compatible) - Optional for development
# Development uses mock storage if not configured
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_BUCKET=your-bucket-name
STORAGE_ACCESS_KEY=your_access_key
STORAGE_SECRET_KEY=your_secret_key
STORAGE_REGION=us-east-1
CDN_URL=https://cdn.yourdomain.com  # Optional
```

#### `apps/web/.env`

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Set Up Database

```bash
# Start PostgreSQL (using Docker)
docker run --name dotoro-db -e POSTGRES_DB=dotoro -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14

# Generate and run migrations
cd packages/database
pnpm db:generate
pnpm db:push
```

### 4. Start Development Servers

```bash
# From root directory - starts all apps
pnpm dev

# Or start individually:
cd apps/api && pnpm dev     # API on http://localhost:3001
cd apps/web && pnpm dev     # Web on http://localhost:3000
```

### 5. Verify Setup

- **API Health**: http://localhost:3001/health
- **API Docs**: http://localhost:3001/api/v1/docs
- **Web App**: http://localhost:3000

## Project Structure

```
dotoro/
├── apps/
│   ├── api/                 # Hono.js API server
│   │   ├── src/
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── services/    # Business logic
│   │   │   ├── schemas/     # Zod validation schemas
│   │   │   └── lib/         # Utilities (encryption, errors)
│   │   └── package.json
│   ├── web/                 # Next.js frontend
│   │   ├── app/             # App router pages
│   │   └── package.json
│   └── docs/                # Documentation site
├── packages/
│   ├── core/                # Shared business logic
│   │   ├── src/
│   │   │   ├── services/    # CSV parser, variable engine, creative linker
│   │   │   ├── validators/  # Platform validators, creative validator
│   │   │   ├── rules/       # Rule engine
│   │   │   └── sync/        # Sync engine
│   │   └── package.json
│   ├── database/            # Drizzle ORM schemas
│   │   ├── src/schema/      # Table definitions
│   │   └── drizzle.config.ts
│   ├── reddit-ads/          # Reddit Ads API client
│   │   ├── src/
│   │   │   ├── oauth.ts     # OAuth 2.0 with PKCE
│   │   │   ├── client.ts    # API client with rate limiting
│   │   │   ├── campaigns.ts # Campaign CRUD
│   │   │   ├── ad-groups.ts # Ad Group CRUD
│   │   │   ├── ads.ts       # Ad CRUD
│   │   │   └── creatives.ts # Creative upload
│   │   └── package.json
│   ├── ui/                  # Shared UI components
│   ├── eslint-config/       # Shared ESLint config
│   └── typescript-config/   # Shared TypeScript config
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Available Scripts

### Root

```bash
pnpm dev          # Start all apps in development
pnpm build        # Build all packages and apps
pnpm lint         # Lint all packages
pnpm check-types  # Type check all packages
pnpm format       # Format code with Prettier
```

### API (`apps/api`)

```bash
pnpm dev          # Start dev server with hot reload
pnpm build        # Compile TypeScript
pnpm start        # Start production server
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
```

### Database (`packages/database`)

```bash
pnpm db:generate  # Generate migrations from schema changes
pnpm db:migrate   # Run pending migrations
pnpm db:push      # Push schema directly (dev only)
pnpm db:studio    # Open Drizzle Studio GUI
```

## API Endpoints

### Data Sources
- `GET /api/v1/data-sources` - List all data sources
- `POST /api/v1/data-sources/:id/upload` - Upload CSV file
- `GET /api/v1/data-sources/:id/rows` - Get paginated data rows

### Templates
- `GET /api/v1/templates` - List all templates
- `POST /api/v1/templates` - Create template
- `POST /api/v1/templates/preview` - Preview generated ads
- `POST /api/v1/templates/validate` - Validate template

### Rules
- `GET /api/v1/rules` - List all rules
- `POST /api/v1/rules` - Create rule
- `POST /api/v1/rules/test-draft` - Test rule against data

### Creatives
- `POST /api/v1/creatives/upload` - Get presigned upload URL
- `POST /api/v1/creatives` - Register uploaded creative
- `GET /api/v1/creatives` - List creatives with filters
- `DELETE /api/v1/creatives/:id` - Delete creative

### Reddit Integration
- `POST /api/v1/reddit/auth/init` - Initialize OAuth flow
- `GET /api/v1/reddit/auth/callback` - OAuth callback
- `POST /api/v1/reddit/campaigns` - Create campaign
- `POST /api/v1/reddit/sync` - Sync campaigns to Reddit

Full API documentation available at `/api/v1/docs` when running the API server.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | API server port |
| `NODE_ENV` | No | development | Environment mode |
| `DATABASE_URL` | Yes* | - | PostgreSQL connection string |
| `REDDIT_CLIENT_ID` | Yes** | - | Reddit OAuth app client ID |
| `REDDIT_CLIENT_SECRET` | Yes** | - | Reddit OAuth app secret |
| `REDDIT_REDIRECT_URI` | No | localhost callback | OAuth redirect URI |
| `ENCRYPTION_KEY` | Yes*** | - | 64-char hex for token encryption |
| `ENCRYPTION_SALT` | Yes*** | - | 32-char hex for key derivation |
| `STORAGE_ENDPOINT` | No | - | S3 endpoint URL |
| `STORAGE_BUCKET` | No | - | S3 bucket name |
| `STORAGE_ACCESS_KEY` | No | - | S3 access key |
| `STORAGE_SECRET_KEY` | No | - | S3 secret key |
| `STORAGE_REGION` | No | auto | S3 region |
| `CDN_URL` | No | - | CDN URL for creative delivery |
| `CORS_ORIGINS` | No | localhost | Allowed CORS origins |

\* Required for production
\** Required for Reddit integration
\*** Required when using Reddit OAuth

### Generating Encryption Keys

```bash
# Generate ENCRYPTION_KEY (64 hex chars = 32 bytes)
openssl rand -hex 32

# Generate ENCRYPTION_SALT (32 hex chars = 16 bytes)
openssl rand -hex 16
```

## Testing

```bash
# Run all tests
pnpm -r test

# Run tests for specific package
cd packages/core && pnpm test
cd packages/reddit-ads && pnpm test
cd apps/api && pnpm test

# Run tests in watch mode
pnpm test:watch
```

Current test coverage:
- **packages/core**: 390 tests
- **packages/reddit-ads**: 92 tests
- **apps/api**: 235 tests
- **Total**: 717+ tests

## Development Notes

### Storage in Development

In development, if storage environment variables are not configured, the API uses an in-memory mock storage. This means:
- Files are stored in memory and lost on restart
- Good for testing the upload flow
- **Not suitable for production**

For production, configure S3-compatible storage (AWS S3, Cloudflare R2, or MinIO).

### Reddit API Rate Limits

The Reddit Ads API has the following limits:
- 600 requests per 10 minutes per user
- Max 10,000 campaigns per account
- Max 100 ad groups per campaign
- Max 50 ads per ad group

The client includes automatic rate limiting and retry logic.

### OAuth Token Storage

OAuth tokens are encrypted with AES-256-GCM before storage. In the current implementation, tokens are stored in memory. For production multi-instance deployments, implement Redis or database storage (see TODO comments in `apps/api/src/services/reddit/oauth.ts`).

## Roadmap

- [x] Phase 1.5: Rule Engine
- [x] Phase 1.6: Reddit Ads API Integration
- [x] Phase 1.7: Creative Management
- [ ] Phase 1.8: Generation Engine
- [ ] Phase 1.9: Frontend Application
- [ ] Phase 2: Google Ads Integration
- [ ] Phase 3: Meta Ads Integration

## License

Private - Internal Use Only
