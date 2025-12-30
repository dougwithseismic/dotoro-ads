import type { RedditApiClient } from "./client.js";
import type {
  CreativeUpload,
  CreativeResponse,
  CreativeType,
  CreativeStatus,
  RedditApiResponse,
  RedditApiListResponse,
} from "./types.js";
import { RedditApiException } from "./types.js";

// ============================================================================
// Constants
// ============================================================================

const MAX_CREATIVE_NAME_LENGTH = 255;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MIN_IMAGE_WIDTH = 400;
const MIN_IMAGE_HEIGHT = 300;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);

// ============================================================================
// Types
// ============================================================================

export interface CreativeFilters {
  type?: CreativeType;
  status?: CreativeStatus;
  page?: number;
  limit?: number;
}

// ============================================================================
// Creative Service
// ============================================================================

export class CreativeService {
  private readonly client: RedditApiClient;

  constructor(client: RedditApiClient) {
    this.client = client;
  }

  /**
   * Upload a new creative
   */
  async uploadCreative(
    accountId: string,
    upload: CreativeUpload
  ): Promise<CreativeResponse> {
    this.validateUpload(upload);

    const payload = {
      name: upload.name,
      type: upload.type,
      file_url: upload.file_url,
    };

    const response = await this.client.post<RedditApiResponse<CreativeResponse>>(
      `/ad_accounts/${accountId}/creatives`,
      { data: payload }
    );

    return response.data;
  }

  /**
   * Get a creative by ID
   */
  async getCreative(
    accountId: string,
    creativeId: string
  ): Promise<CreativeResponse> {
    const response = await this.client.get<RedditApiResponse<CreativeResponse>>(
      `/ad_accounts/${accountId}/creatives/${creativeId}`
    );

    return response.data;
  }

  /**
   * Delete a creative
   */
  async deleteCreative(accountId: string, creativeId: string): Promise<void> {
    await this.client.delete(`/ad_accounts/${accountId}/creatives/${creativeId}`);
  }

  /**
   * List creatives with optional filters
   */
  async listCreatives(
    accountId: string,
    filters?: CreativeFilters
  ): Promise<CreativeResponse[]> {
    const params = this.buildQueryParams(filters);

    const response = await this.client.get<RedditApiListResponse<CreativeResponse>>(
      `/ad_accounts/${accountId}/creatives`,
      { params }
    );

    return response.data;
  }

  /**
   * Get the status of a creative
   */
  async getCreativeStatus(
    accountId: string,
    creativeId: string
  ): Promise<CreativeStatus> {
    const creative = await this.getCreative(accountId, creativeId);
    return creative.status;
  }

  /**
   * Validate image dimensions
   */
  validateImageDimensions(width: number, height: number): void {
    if (width < MIN_IMAGE_WIDTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Image width must be at least ${MIN_IMAGE_WIDTH} pixels`,
        statusCode: 400,
        retryable: false,
      });
    }

    if (height < MIN_IMAGE_HEIGHT) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Image height must be at least ${MIN_IMAGE_HEIGHT} pixels`,
        statusCode: 400,
        retryable: false,
      });
    }
  }

  /**
   * Validate file size
   */
  validateFileSize(sizeBytes: number): void {
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `File size must not exceed ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
        statusCode: 400,
        retryable: false,
      });
    }
  }

  /**
   * Validate upload data
   */
  private validateUpload(upload: CreativeUpload): void {
    if (upload.name.length > MAX_CREATIVE_NAME_LENGTH) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Creative name must not exceed ${MAX_CREATIVE_NAME_LENGTH} characters`,
        statusCode: 400,
        retryable: false,
      });
    }

    if (!upload.file_url && !upload.file_buffer && !upload.file_path) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: "Must provide file_url, file_buffer, or file_path",
        statusCode: 400,
        retryable: false,
      });
    }

    if (upload.mime_type && !ALLOWED_MIME_TYPES.has(upload.mime_type)) {
      throw new RedditApiException({
        code: "VALIDATION_ERROR",
        message: `Invalid mime type. Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}`,
        statusCode: 400,
        retryable: false,
      });
    }

    if (upload.file_buffer) {
      this.validateFileSize(upload.file_buffer.length);
    }
  }

  /**
   * Build query parameters from filters
   */
  private buildQueryParams(
    filters?: CreativeFilters
  ): Record<string, string | number> | undefined {
    if (!filters) {
      return undefined;
    }

    const params: Record<string, string | number> = {};

    if (filters.type) {
      params.type = filters.type;
    }

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.page) {
      params.page = filters.page;
    }

    if (filters.limit) {
      params.limit = filters.limit;
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }
}

export {
  MAX_CREATIVE_NAME_LENGTH,
  MAX_FILE_SIZE_BYTES,
  MIN_IMAGE_WIDTH,
  MIN_IMAGE_HEIGHT,
  ALLOWED_MIME_TYPES,
};
