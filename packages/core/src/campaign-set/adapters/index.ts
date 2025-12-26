/**
 * Platform Adapters
 *
 * Exports all platform-specific adapters for syncing campaign sets.
 */

// Mock adapter for testing
export { MockPlatformAdapter } from "./mock-adapter.js";
export type { MockAdapterOptions } from "./mock-adapter.js";

// Google Ads adapter
export { GoogleAdsAdapter } from "./google-adapter.js";
export type { GoogleAdsAdapterConfig } from "./google-adapter.js";

// Facebook (Meta) Ads adapter
export { FacebookAdsAdapter } from "./facebook-adapter.js";
export type { FacebookAdsAdapterConfig } from "./facebook-adapter.js";

// Reddit Ads adapter
export { RedditAdsAdapter } from "./reddit-adapter.js";
export type { RedditAdsAdapterConfig } from "./reddit-adapter.js";
