import { describe, it, expect, beforeEach, vi } from "vitest";
import { CreativeService } from "../creatives.js";
import { RedditApiClient } from "../client.js";
import type { CreativeUpload, CreativeResponse } from "../types.js";

// Mock the client
vi.mock("../client.js", () => ({
  RedditApiClient: vi.fn(),
}));

describe("CreativeService", () => {
  let creativeService: CreativeService;
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    uploadFile: ReturnType<typeof vi.fn>;
  };

  const mockCreativeResponse: CreativeResponse = {
    id: "cr_123",
    account_id: "acc_456",
    name: "Test Creative",
    type: "IMAGE",
    status: "ACTIVE",
    url: "https://cdn.reddit.com/images/cr_123.jpg",
    width: 1200,
    height: 628,
    file_size: 150000,
    rejection_reason: null,
    created_at: "2025-01-10T00:00:00Z",
    updated_at: "2025-01-10T00:00:00Z",
  };

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      uploadFile: vi.fn(),
    };

    creativeService = new CreativeService(mockClient as unknown as RedditApiClient);
    vi.clearAllMocks();
  });

  describe("uploadCreative", () => {
    it("should upload a creative from URL", async () => {
      const upload: CreativeUpload = {
        name: "My Image",
        type: "IMAGE",
        file_url: "https://example.com/image.jpg",
      };

      mockClient.post.mockResolvedValueOnce({ data: mockCreativeResponse });

      const result = await creativeService.uploadCreative("acc_456", upload);

      // v3 API wraps payload in { data: ... }
      expect(mockClient.post).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/creatives",
        { data: expect.objectContaining({
          name: "My Image",
          type: "IMAGE",
          file_url: "https://example.com/image.jpg",
        }) }
      );
      expect(result).toEqual(mockCreativeResponse);
    });

    it("should validate creative name length", async () => {
      const invalidUpload: CreativeUpload = {
        name: "x".repeat(256),
        type: "IMAGE",
        file_url: "https://example.com/image.jpg",
      };

      await expect(
        creativeService.uploadCreative("acc_456", invalidUpload)
      ).rejects.toThrow("Creative name must not exceed 255 characters");
    });

    it("should validate file type when mime_type is provided", async () => {
      const invalidUpload: CreativeUpload = {
        name: "Invalid File",
        type: "IMAGE",
        file_buffer: Buffer.from("test"),
        mime_type: "image/bmp" as "image/jpeg", // Invalid type
      };

      await expect(
        creativeService.uploadCreative("acc_456", invalidUpload)
      ).rejects.toThrow("Invalid mime type");
    });
  });

  describe("getCreative", () => {
    it("should fetch a creative by ID", async () => {
      mockClient.get.mockResolvedValueOnce({ data: mockCreativeResponse });

      const result = await creativeService.getCreative("acc_456", "cr_123");

      expect(mockClient.get).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/creatives/cr_123"
      );
      expect(result).toEqual(mockCreativeResponse);
    });
  });

  describe("deleteCreative", () => {
    it("should delete a creative", async () => {
      mockClient.delete.mockResolvedValueOnce(undefined);

      await creativeService.deleteCreative("acc_456", "cr_123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/creatives/cr_123"
      );
    });
  });

  describe("listCreatives", () => {
    it("should list creatives without filters", async () => {
      const mockList = [mockCreativeResponse];
      mockClient.get.mockResolvedValueOnce({
        data: mockList,
        pagination: { count: 1 },
      });

      const result = await creativeService.listCreatives("acc_456");

      expect(mockClient.get).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/creatives",
        expect.objectContaining({})
      );
      expect(result).toEqual(mockList);
    });

    it("should list creatives with type filter", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [mockCreativeResponse],
        pagination: { count: 1 },
      });

      await creativeService.listCreatives("acc_456", { type: "IMAGE" });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/ad_accounts/acc_456/creatives",
        expect.objectContaining({
          params: expect.objectContaining({
            type: "IMAGE",
          }),
        })
      );
    });
  });

  describe("getCreativeStatus", () => {
    it("should return creative status", async () => {
      mockClient.get.mockResolvedValueOnce({ data: mockCreativeResponse });

      const status = await creativeService.getCreativeStatus("acc_456", "cr_123");

      expect(status).toBe("ACTIVE");
    });

    it("should return PENDING for creatives under review", async () => {
      const pendingCreative = { ...mockCreativeResponse, status: "PENDING" as const };
      mockClient.get.mockResolvedValueOnce({ data: pendingCreative });

      const status = await creativeService.getCreativeStatus("acc_456", "cr_123");

      expect(status).toBe("PENDING");
    });

    it("should return REJECTED for rejected creatives with reason", async () => {
      const rejectedCreative = {
        ...mockCreativeResponse,
        status: "REJECTED" as const,
        rejection_reason: "Image does not meet guidelines",
      };
      mockClient.get.mockResolvedValueOnce({ data: rejectedCreative });

      const status = await creativeService.getCreativeStatus("acc_456", "cr_123");

      expect(status).toBe("REJECTED");
    });
  });

  describe("validateImageDimensions", () => {
    it("should validate minimum dimensions", () => {
      expect(() =>
        creativeService.validateImageDimensions(200, 200)
      ).toThrow("Image width must be at least 400 pixels");

      expect(() =>
        creativeService.validateImageDimensions(400, 100)
      ).toThrow("Image height must be at least 300 pixels");
    });

    it("should pass for valid dimensions", () => {
      expect(() =>
        creativeService.validateImageDimensions(1200, 628)
      ).not.toThrow();
    });
  });

  describe("validateFileSize", () => {
    it("should reject files exceeding 20MB", () => {
      const largeSize = 21 * 1024 * 1024; // 21 MB

      expect(() =>
        creativeService.validateFileSize(largeSize)
      ).toThrow("File size must not exceed 20 MB");
    });

    it("should accept files under 20MB", () => {
      const validSize = 5 * 1024 * 1024; // 5 MB

      expect(() =>
        creativeService.validateFileSize(validSize)
      ).not.toThrow();
    });
  });
});
