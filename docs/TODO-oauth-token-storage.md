# OAuth Token Storage Implementation

**Date:** 2025-12-27
**Status:** Planning
**Priority:** HIGH - Blocking Google Sheets integration

---

## Goal

Implement secure, persistent OAuth token storage so that Google OAuth credentials survive beyond a single session. Users should be able to connect their Google account once and have that connection persist, enabling automatic data syncing from Google Sheets without re-authenticating.

### Success Criteria

- [ ] OAuth tokens are stored in PostgreSQL with encryption at rest
- [ ] `getGoogleCredentials(userId)` returns stored credentials when they exist
- [ ] `hasGoogleCredentials(userId)` returns `true` after user completes OAuth flow
- [ ] Token refresh happens automatically when tokens are near expiration
- [ ] All sensitive data (accessToken, refreshToken) is encrypted using AES-256-GCM
- [ ] Tests achieve 90%+ coverage for encryption and storage logic

---

## What's Already Done

### Database Package (`packages/database/`)
- [x] Drizzle ORM setup with PostgreSQL (Complete)
- [x] `oauthTokens` table schema exists in `src/schema/ad-accounts.ts` (Partial - needs modification)
  - Current schema ties tokens to `adAccountId`, not directly to `userId + provider`
  - Needs refactoring to support standalone OAuth tokens for data sources
- [x] Database client with lazy initialization (`src/client.ts`)
- [x] Migration workflow: `pnpm db:generate` and `pnpm db:push`

### API Package (`apps/api/`)
- [x] OAuth flow routes in `src/routes/google.ts` (Complete)
  - `/api/v1/auth/google/connect` - initiates OAuth
  - `/api/v1/auth/google/callback` - handles token exchange
  - `/api/v1/auth/google/status` - checks connection status
  - `/api/v1/auth/google/disconnect` - revokes tokens
- [x] Placeholder service in `src/services/oauth-tokens.ts` (Placeholder only)
- [x] Google Sheets service in `src/services/google-sheets-service.ts` (Complete)
  - Token refresh logic already implemented
  - Data fetching and ingestion working
- [x] Environment variables defined in `.env.example`:
  - `ENCRYPTION_KEY` - 64 hex chars (256-bit key)
  - `ENCRYPTION_SALT` - 32 hex chars

### What's NOT Working
- `storeGoogleCredentials()` only logs, doesn't persist
- `getGoogleCredentials()` always returns `null`
- `hasGoogleCredentials()` always returns `false`
- No encryption service exists

---

## What We're Building Now

### Phase 1: Database Schema Update
**Priority: HIGH** - Foundation for all other work

#### 1.1 Create User OAuth Tokens Table
Create a new `user_oauth_tokens` table that stores tokens per `userId + provider` (independent of ad accounts).

**File:** `packages/database/src/schema/user-oauth-tokens.ts`

**Schema:**
```typescript
export const userOAuthTokens = pgTable(
  "user_oauth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(), // 'google', 'reddit', etc.
    accessToken: text("access_token").notNull(), // encrypted
    refreshToken: text("refresh_token"), // encrypted
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: text("scopes"), // space-separated scopes
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_oauth_tokens_user_provider_idx").on(table.userId, table.provider),
    index("user_oauth_tokens_provider_idx").on(table.provider),
    index("user_oauth_tokens_expires_idx").on(table.expiresAt),
  ]
);
```

**Deliverables:**
- [ ] Create `packages/database/src/schema/user-oauth-tokens.ts`
- [ ] Export from `packages/database/src/schema/index.ts`
- [ ] Run `pnpm db:generate` to create migration
- [ ] Run `pnpm db:push` to apply (or `pnpm db:migrate` in production)

**Why a new table instead of modifying existing `oauthTokens`?**
The existing table is designed for ad account tokens (linked via `adAccountId`). Data source OAuth (Google Sheets) needs tokens linked directly to `userId + provider` without requiring an ad account. This keeps concerns separate.

---

### Phase 2: Encryption Service
**Priority: HIGH** - Security requirement, must complete before storage

#### 2.1 Create Encryption Utility
**File:** `apps/api/src/lib/encryption.ts`

**Implementation:**
```typescript
// Use Node.js built-in crypto module
// Algorithm: AES-256-GCM (authenticated encryption)
// - 256-bit key from ENCRYPTION_KEY env var
// - Random 12-byte IV per encryption
// - 16-byte auth tag for integrity

export function encrypt(plaintext: string): string;
export function decrypt(ciphertext: string): string;
export function isEncryptionConfigured(): boolean;
```

**Storage format:** `iv:authTag:ciphertext` (base64 encoded, colon-separated)

**Deliverables:**
- [ ] Create `apps/api/src/lib/encryption.ts`
- [ ] Implement `encrypt(plaintext: string): string`
- [ ] Implement `decrypt(ciphertext: string): string`
- [ ] Implement `isEncryptionConfigured(): boolean`
- [ ] Handle missing/invalid `ENCRYPTION_KEY` gracefully
- [ ] Add clear error messages for misconfiguration

**Test Cases (`apps/api/src/lib/__tests__/encryption.test.ts`):**
- [ ] Encrypts and decrypts string successfully
- [ ] Different plaintexts produce different ciphertexts (random IV)
- [ ] Same plaintext encrypted twice produces different ciphertexts
- [ ] Tampered ciphertext throws authentication error
- [ ] Invalid ciphertext format throws descriptive error
- [ ] Missing ENCRYPTION_KEY throws configuration error
- [ ] Invalid ENCRYPTION_KEY length throws error

---

### Phase 3: OAuth Token Repository
**Priority: HIGH** - Core storage logic

#### 3.1 Create Token Repository
**File:** `apps/api/src/repositories/oauth-token-repository.ts`

**Interface:**
```typescript
interface StoredCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string | null;
}

// Store or update tokens for a user+provider
async function upsertTokens(
  userId: string,
  provider: string,
  credentials: StoredCredentials
): Promise<void>;

// Retrieve tokens (decrypted)
async function getTokens(
  userId: string,
  provider: string
): Promise<StoredCredentials | null>;

// Check if tokens exist
async function hasTokens(
  userId: string,
  provider: string
): Promise<boolean>;

// Delete tokens
async function deleteTokens(
  userId: string,
  provider: string
): Promise<boolean>;
```

**Deliverables:**
- [ ] Create `apps/api/src/repositories/oauth-token-repository.ts`
- [ ] Implement `upsertTokens()` with encryption
- [ ] Implement `getTokens()` with decryption
- [ ] Implement `hasTokens()` (existence check, no decryption needed)
- [ ] Implement `deleteTokens()`
- [ ] Handle database errors with appropriate error types
- [ ] Log operations (without sensitive data)

**Test Cases (`apps/api/src/repositories/__tests__/oauth-token-repository.test.ts`):**
- [ ] `upsertTokens` - inserts new token record
- [ ] `upsertTokens` - updates existing token record (same userId+provider)
- [ ] `getTokens` - returns null for non-existent user
- [ ] `getTokens` - returns decrypted credentials for existing user
- [ ] `hasTokens` - returns false for non-existent user
- [ ] `hasTokens` - returns true for existing user
- [ ] `deleteTokens` - removes token record
- [ ] `deleteTokens` - returns false if no record to delete
- [ ] All operations handle database errors gracefully

---

### Phase 4: Update OAuth Tokens Service
**Priority: HIGH** - Wire everything together

#### 4.1 Implement Real Storage Functions
**File:** `apps/api/src/services/oauth-tokens.ts`

Replace placeholder implementations with real ones:

**Deliverables:**
- [ ] `storeGoogleCredentials(userId, credentials)` - calls repository.upsertTokens
- [ ] `getGoogleCredentials(userId)` - calls repository.getTokens, returns in expected format
- [ ] `hasGoogleCredentials(userId)` - calls repository.hasTokens
- [ ] `revokeGoogleCredentials(userId)` - calls Google revoke endpoint, then repository.deleteTokens
- [ ] Add token refresh on retrieval if near expiration (optional, can defer)
- [ ] Update credentials in DB after successful refresh

**Test Cases (`apps/api/src/services/__tests__/oauth-tokens.test.ts`):**
- [ ] `storeGoogleCredentials` - stores encrypted credentials
- [ ] `getGoogleCredentials` - returns null when no credentials
- [ ] `getGoogleCredentials` - returns credentials in correct format
- [ ] `hasGoogleCredentials` - returns correct boolean
- [ ] `revokeGoogleCredentials` - calls Google revoke API
- [ ] `revokeGoogleCredentials` - deletes from database
- [ ] Integration: store then retrieve returns same values

---

### Phase 5: Integration Testing
**Priority: MEDIUM** - Verify end-to-end flow

#### 5.1 Manual Integration Test Script
**File:** `apps/api/scripts/test-oauth-storage.ts`

A script to manually verify the complete flow works:
```typescript
// 1. Store test credentials
// 2. Verify hasGoogleCredentials returns true
// 3. Retrieve and verify decryption
// 4. Revoke and verify deletion
```

#### 5.2 Verify OAuth Callback Flow
- [ ] Complete Google OAuth flow in browser
- [ ] Verify tokens are stored in database (check `user_oauth_tokens` table)
- [ ] Verify `GET /api/v1/auth/google/status?userId=xxx` returns `connected: true`
- [ ] Verify Google Sheets data fetch works with stored credentials

---

## Not In Scope

### Multi-provider abstraction layer
- **Excluded:** Generic provider interface for OAuth storage
- **Why:** Only Google OAuth needed now. Reddit OAuth has separate implementation in `apps/api/src/services/reddit/oauth.ts`. Abstract when third provider is added.

### Token rotation/key rotation
- **Excluded:** Ability to rotate encryption keys without data loss
- **Why:** Adds significant complexity. Can be addressed later if needed. For now, recommend secure key management practices.

### User authentication system
- **Excluded:** User login, sessions, JWT tokens
- **Why:** Currently using header-based `x-user-id` for development. Full auth is a separate epic.

### Encrypted column types in Drizzle
- **Excluded:** Using Drizzle custom types for automatic encryption
- **Why:** Application-layer encryption is more portable and explicit. Drizzle custom types add complexity without significant benefit here.

### Caching layer for credentials
- **Excluded:** Redis/memory cache for decrypted tokens
- **Why:** Database calls are fast enough for current scale. Add caching if performance becomes an issue.

---

## Implementation Plan

### Step 1: Schema & Migration (1-2 hours)
1. Create `user-oauth-tokens.ts` schema file
2. Export from schema index
3. Build package: `pnpm --filter @repo/database build`
4. Generate migration: `pnpm --filter @repo/database db:generate`
5. Apply to local database: `pnpm --filter @repo/database db:push`

### Step 2: Encryption Service (2-3 hours)
1. Write tests first (`encryption.test.ts`)
2. Implement encryption module
3. Ensure all tests pass
4. Test edge cases (missing key, invalid key, tampered data)

### Step 3: Repository Layer (2-3 hours)
1. Write tests first (mock database)
2. Implement repository functions
3. Run tests
4. Integration test with real database

### Step 4: Update Service Layer (1-2 hours)
1. Write tests first (mock repository)
2. Replace placeholder implementations
3. Run tests
4. Remove placeholder comments

### Step 5: End-to-End Verification (1 hour)
1. Start local development environment
2. Complete OAuth flow in browser
3. Verify database contains encrypted tokens
4. Verify status endpoint returns connected
5. Verify Google Sheets sync works

**Total Estimated Time:** 7-11 hours

---

## Definition of Done

- [ ] `user_oauth_tokens` table exists in database with correct schema
- [ ] All encryption tests pass (100% coverage of encryption module)
- [ ] All repository tests pass (including database integration tests)
- [ ] All service tests pass
- [ ] OAuth flow works end-to-end:
  1. User clicks "Connect Google" and completes OAuth
  2. Tokens are stored encrypted in database
  3. User refreshes page, connection status shows "Connected"
  4. Google Sheets sync successfully uses stored credentials
- [ ] No sensitive tokens are logged anywhere
- [ ] Encryption key absence prevents server start with clear error message
- [ ] Code reviewed and merged to main branch

---

## Notes

### Tech Stack
| Component | Technology | Why |
|-----------|------------|-----|
| Database | PostgreSQL + Drizzle ORM | Existing infrastructure, type-safe queries |
| Encryption | Node.js `crypto` (AES-256-GCM) | Built-in, no extra dependencies, authenticated encryption |
| Testing | Vitest | Already used across the monorepo |

### Security Considerations
- **Key Storage:** `ENCRYPTION_KEY` must be stored securely (not in git). Use environment variables or secret management.
- **Key Length:** Must be exactly 64 hex characters (256 bits)
- **IV Uniqueness:** Each encryption uses a random 12-byte IV
- **Auth Tag:** GCM mode provides integrity verification

### Design Decisions
1. **Separate table from `oauthTokens`:** The existing table is for ad account tokens. Data source OAuth is a different concern.
2. **Application-layer encryption:** More explicit than database encryption. Tokens are encrypted before any database operation.
3. **Repository pattern:** Separates data access from business logic. Makes testing easier.
4. **TDD approach:** Write tests first to ensure correct behavior and prevent regressions.

### Environment Variables Required
```bash
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=<64 hex characters>
```

---

## Next Steps (Future Work)

### Phase 6: Token Refresh on Retrieval
Automatically refresh tokens when retrieved if they're within 5 minutes of expiration. Update stored tokens after refresh.

### Phase 7: Periodic Token Cleanup
Background job to:
- Remove tokens that have been expired for > 30 days
- Log/alert on tokens that repeatedly fail refresh

### Phase 8: Multi-Provider Support
When adding a third OAuth provider, consider:
- Generic `OAuthProvider` interface
- Provider-specific refresh logic
- Unified revocation handling
