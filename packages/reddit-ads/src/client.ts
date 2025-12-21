import { RedditApiException, RedditApiErrorCode } from "./types.js";

// ============================================================================
// Constants
// ============================================================================

const REDDIT_ADS_API_BASE_URL = "https://ads-api.reddit.com/api/v2.0";

// Rate limit: 600 requests per 10 minutes
const DEFAULT_RATE_LIMIT = {
  maxRequests: 600,
  windowMs: 10 * 60 * 1000, // 10 minutes
};

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface RedditClientConfig {
  accessToken: string;
  userAgent?: string;
  baseUrl?: string;
  rateLimit?: Partial<RateLimitConfig>;
  retry?: Partial<RetryConfig>;
  onRequest?: (request: RequestInfo) => void;
  onResponse?: (response: ResponseInfo) => void;
}

export interface RequestOptions {
  maxRetries?: number;
  timeout?: number;
  params?: Record<string, string | number>;
}

export interface RequestInfo {
  method: string;
  url: string;
  body?: unknown;
  timestamp: Date;
}

export interface ResponseInfo {
  status: number;
  ok: boolean;
  durationMs: number;
  timestamp: Date;
}

export interface RateLimitStatus {
  remaining: number;
  resetInSeconds: number;
  isLimited: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapStatusCodeToErrorCode(status: number): RedditApiErrorCode {
  switch (status) {
    case 400:
      return "VALIDATION_ERROR";
    case 401:
      return "INVALID_TOKEN";
    case 403:
      return "PERMISSION_DENIED";
    case 404:
      return "RESOURCE_NOT_FOUND";
    case 429:
      return "RATE_LIMIT_EXCEEDED";
    case 500:
      return "INTERNAL_ERROR";
    case 503:
      return "SERVICE_UNAVAILABLE";
    default:
      return status >= 500 ? "INTERNAL_ERROR" : "INVALID_REQUEST";
  }
}

function isRetryableStatus(status: number): boolean {
  // Retry on 429 (rate limit), 500, 502, 503, 504
  return status === 429 || (status >= 500 && status <= 504);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Reddit API Client
// ============================================================================

export class RedditApiClient {
  private accessToken: string;
  private readonly userAgent: string;
  private readonly baseUrl: string;
  private readonly onRequest?: (request: RequestInfo) => void;
  private readonly onResponse?: (response: ResponseInfo) => void;

  // Rate limit configuration
  private readonly rateLimitConfig: RateLimitConfig;
  private readonly retryConfig: RetryConfig;

  // Rate limit tracking
  private rateLimitRemaining: number;
  private rateLimitResetSeconds: number;

  constructor(config: RedditClientConfig) {
    this.accessToken = config.accessToken;
    this.userAgent = config.userAgent ?? "dotoro-reddit-ads/1.0";
    this.baseUrl = config.baseUrl ?? REDDIT_ADS_API_BASE_URL;
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;

    // Merge rate limit config with defaults
    this.rateLimitConfig = {
      ...DEFAULT_RATE_LIMIT,
      ...config.rateLimit,
    };

    // Merge retry config with defaults
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config.retry,
    };

    // Initialize rate limit tracking
    this.rateLimitRemaining = this.rateLimitConfig.maxRequests;
    this.rateLimitResetSeconds = this.rateLimitConfig.windowMs / 1000;
  }

  /**
   * Make a GET request
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }

  /**
   * Make a DELETE request
   */
  async delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }

  /**
   * Update the access token (for token refresh)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus {
    return {
      remaining: this.rateLimitRemaining,
      resetInSeconds: this.rateLimitResetSeconds,
      isLimited: this.rateLimitRemaining <= 0,
    };
  }

  /**
   * Core request method with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;

    // Append query params if provided
    if (options?.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        searchParams.set(key, String(value));
      }
      url += `?${searchParams.toString()}`;
    }

    const maxRetries = options?.maxRetries ?? this.retryConfig.maxRetries;

    let lastError: RedditApiException | undefined;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        return await this.executeRequest<T>(method, url, body);
      } catch (error) {
        if (error instanceof RedditApiException) {
          lastError = error;

          // Only retry on retryable errors
          if (!error.retryable || attempt >= maxRetries) {
            throw error;
          }

          // Calculate delay with exponential backoff
          const delay = Math.min(
            this.retryConfig.initialDelayMs *
              Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelayMs
          );

          // Use retry-after header if available for rate limits
          const actualDelay =
            error.retryAfter && error.code === "RATE_LIMIT_EXCEEDED"
              ? error.retryAfter * 1000
              : delay;

          await sleep(actualDelay);
          attempt++;
        } else {
          throw error;
        }
      }
    }

    throw lastError ?? new RedditApiException({
      code: "INTERNAL_ERROR",
      message: "Request failed with unknown error",
      statusCode: 500,
      retryable: false,
    });
  }

  /**
   * Execute a single HTTP request
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<T> {
    const startTime = Date.now();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "User-Agent": this.userAgent,
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const requestInit: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    // Log request
    if (this.onRequest) {
      this.onRequest({
        method,
        url,
        body,
        timestamp: new Date(),
      });
    }

    const response = await fetch(url, requestInit);

    const durationMs = Date.now() - startTime;

    // Update rate limit tracking from headers
    this.updateRateLimitFromHeaders(response.headers);

    // Log response
    if (this.onResponse) {
      this.onResponse({
        status: response.status,
        ok: response.ok,
        durationMs,
        timestamp: new Date(),
      });
    }

    if (!response.ok) {
      let errorBody: Record<string, unknown> = {};
      try {
        errorBody = await response.json();
      } catch {
        try {
          const rawText = await response.text();
          errorBody = { rawError: rawText.slice(0, 500) };
        } catch {
          errorBody = { parseError: "Unable to parse error response" };
        }
      }
      const errorCode = mapStatusCodeToErrorCode(response.status);

      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

      throw new RedditApiException({
        code: errorCode,
        message: (errorBody.message as string) ?? `HTTP ${response.status} error`,
        statusCode: response.status,
        details: errorBody,
        retryable: isRetryableStatus(response.status),
        retryAfter,
      });
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Update rate limit tracking from response headers
   */
  private updateRateLimitFromHeaders(headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");

    if (remaining) {
      this.rateLimitRemaining = parseInt(remaining, 10);
    }

    if (reset) {
      this.rateLimitResetSeconds = parseInt(reset, 10);
    }
  }
}

export { REDDIT_ADS_API_BASE_URL };
