import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CreativePreview } from "../CreativePreview";
import type { CreativeAsset } from "@repo/core/creatives";

// Mock URL APIs
beforeEach(() => {
  globalThis.URL.createObjectURL = vi.fn(() => "blob:test-url");
  globalThis.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CreativePreview", () => {
  describe("image asset", () => {
    const imageAsset: CreativeAsset = {
      id: "img-1",
      type: "image",
      source: {
        type: "blob",
        blobUrl: "blob:test-url",
        file: new File([""], "test.jpg", { type: "image/jpeg" }),
      },
      metadata: {
        fileName: "product.jpg",
        mimeType: "image/jpeg",
        fileSize: 256000,
        width: 1200,
        height: 628,
        aspectRatio: "1.91:1",
      },
      validation: { isValid: true, errors: [], warnings: [] },
    };

    it("displays image preview", () => {
      render(<CreativePreview asset={imageAsset} />);

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "blob:test-url");
    });

    it("displays metadata", () => {
      render(<CreativePreview asset={imageAsset} />);

      expect(screen.getByText("product.jpg")).toBeInTheDocument();
      expect(screen.getByText(/1200.*628/)).toBeInTheDocument();
      expect(screen.getByText(/1.91:1/)).toBeInTheDocument();
    });

    it("displays file size", () => {
      render(<CreativePreview asset={imageAsset} />);

      expect(screen.getByText(/250 KB|256 KB/)).toBeInTheDocument();
    });

    it("shows valid indicator when validation passes", () => {
      render(<CreativePreview asset={imageAsset} />);

      expect(screen.getByTestId("validation-status")).toHaveAttribute(
        "data-valid",
        "true"
      );
    });
  });

  describe("video asset", () => {
    const videoAsset: CreativeAsset = {
      id: "vid-1",
      type: "video",
      source: {
        type: "blob",
        blobUrl: "blob:test-video",
        file: new File([""], "ad.mp4", { type: "video/mp4" }),
      },
      metadata: {
        fileName: "ad.mp4",
        mimeType: "video/mp4",
        fileSize: 24 * 1024 * 1024,
        width: 1920,
        height: 1080,
        aspectRatio: "16:9",
        duration: 30,
      },
      validation: { isValid: true, errors: [], warnings: [] },
      thumbnailUrl: "data:image/jpeg;base64,test",
    };

    it("displays video thumbnail", () => {
      render(<CreativePreview asset={videoAsset} />);

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "data:image/jpeg;base64,test");
    });

    it("displays duration", () => {
      render(<CreativePreview asset={videoAsset} />);

      // Duration appears twice - in badge and metadata - just check at least one exists
      expect(screen.getAllByText(/30s|0:30/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("variable source", () => {
    const variableAsset: CreativeAsset = {
      id: "var-1",
      type: "image",
      source: { type: "variable", pattern: "{image_url}" },
      metadata: {},
      validation: { isValid: true, errors: [], warnings: [] },
    };

    it("displays variable pattern", () => {
      render(<CreativePreview asset={variableAsset} />);

      expect(screen.getByText("{image_url}")).toBeInTheDocument();
    });

    it("shows variable icon", () => {
      render(<CreativePreview asset={variableAsset} />);

      expect(screen.getByTestId("variable-icon")).toBeInTheDocument();
    });
  });

  describe("remote URL source", () => {
    const remoteAsset: CreativeAsset = {
      id: "remote-1",
      type: "image",
      source: { type: "remote", url: "https://example.com/image.jpg" },
      metadata: {},
      validation: { isValid: true, errors: [], warnings: [] },
    };

    it("displays remote URL image", () => {
      render(<CreativePreview asset={remoteAsset} />);

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
    });
  });

  describe("validation errors", () => {
    const invalidAsset: CreativeAsset = {
      id: "invalid-1",
      type: "image",
      source: {
        type: "blob",
        blobUrl: "blob:test",
        file: new File([""], "small.jpg", { type: "image/jpeg" }),
      },
      metadata: {
        fileName: "small.jpg",
        width: 200,
        height: 100,
      },
      validation: {
        isValid: false,
        errors: [
          { code: "MIN_WIDTH", message: "Width below minimum", field: "width" },
        ],
        warnings: [],
      },
    };

    it("shows error indicator", () => {
      render(<CreativePreview asset={invalidAsset} />);

      expect(screen.getByTestId("validation-status")).toHaveAttribute(
        "data-valid",
        "false"
      );
    });

    it("displays error messages", () => {
      render(<CreativePreview asset={invalidAsset} />);

      expect(screen.getByText("Width below minimum")).toBeInTheDocument();
    });
  });

  describe("validation warnings", () => {
    const warningAsset: CreativeAsset = {
      id: "warning-1",
      type: "image",
      source: {
        type: "blob",
        blobUrl: "blob:test",
        file: new File([""], "medium.jpg", { type: "image/jpeg" }),
      },
      metadata: {
        fileName: "medium.jpg",
        width: 800,
        height: 400,
      },
      validation: {
        isValid: true,
        errors: [],
        warnings: [
          {
            code: "BELOW_RECOMMENDED",
            message: "Below recommended size",
            suggestion: "Use larger image",
          },
        ],
      },
    };

    it("displays warning messages", () => {
      render(<CreativePreview asset={warningAsset} />);

      expect(screen.getByText("Below recommended size")).toBeInTheDocument();
    });
  });

  describe("remove button", () => {
    const asset: CreativeAsset = {
      id: "test-1",
      type: "image",
      source: {
        type: "blob",
        blobUrl: "blob:test",
        file: new File([""], "test.jpg", { type: "image/jpeg" }),
      },
      metadata: { fileName: "test.jpg" },
      validation: { isValid: true, errors: [], warnings: [] },
    };

    it("calls onRemove when remove button clicked", () => {
      const onRemove = vi.fn();
      render(<CreativePreview asset={asset} onRemove={onRemove} />);

      fireEvent.click(screen.getByRole("button", { name: /remove/i }));
      expect(onRemove).toHaveBeenCalled();
    });

    it("hides remove button when showRemove is false", () => {
      render(<CreativePreview asset={asset} showRemove={false} />);

      expect(
        screen.queryByRole("button", { name: /remove/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    const asset: CreativeAsset = {
      id: "test-1",
      type: "image",
      source: {
        type: "blob",
        blobUrl: "blob:test",
        file: new File([""], "test.jpg", { type: "image/jpeg" }),
      },
      metadata: { fileName: "test.jpg", width: 100, height: 100 },
      validation: { isValid: true, errors: [], warnings: [] },
    };

    it("applies compact styling when compact is true", () => {
      render(<CreativePreview asset={asset} compact />);

      expect(screen.getByTestId("creative-preview")).toHaveAttribute(
        "data-compact",
        "true"
      );
    });
  });
});
