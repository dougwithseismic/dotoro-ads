/**
 * OAuth Provider Types
 *
 * Shared type definitions for OAuth providers used in data source integrations.
 * Using a union type prevents typos and enables type-safe provider handling.
 */

/**
 * Supported OAuth providers for data source tokens
 */
export const OAUTH_PROVIDERS = ["google"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/**
 * Validate if a string is a valid OAuth provider
 *
 * @param provider - The string to validate
 * @returns true if the provider is a valid OAuthProvider, false otherwise
 *
 * @example
 * ```typescript
 * if (isValidOAuthProvider(userInput)) {
 *   // userInput is now typed as OAuthProvider
 *   await getTokens(userId, userInput);
 * }
 * ```
 */
export function isValidOAuthProvider(provider: string): provider is OAuthProvider {
  return OAUTH_PROVIDERS.includes(provider as OAuthProvider);
}
