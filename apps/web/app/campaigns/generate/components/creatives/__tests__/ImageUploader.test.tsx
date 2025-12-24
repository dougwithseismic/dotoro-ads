import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ImageUploader } from "../ImageUploader";
import type { CreativeAsset, CreativeSpecs } from "@repo/core/creatives";

// Mock URL APIs
beforeEach(() => {
  let counter = 0;
  globalThis.URL.createObjectURL = vi.fn(() => `blob:test-${counter++}`);
  globalThis.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

// Helper to create mock file
function createMockFile(name: string, type: string): File {
  return new File(["test"], name, { type });
}

const defaultSpecs: CreativeSpecs = {
  aspectRatios: ["1.91:1", "1:1", "16:9"],
  minWidth: 400,
  minHeight: 300,
  recommendedWidth: 1200,
  recommendedHeight: 628,
  maxFileSize: 5 * 1024 * 1024,
  allowedFormats: ["jpg", "png", "gif"],
};

describe("ImageUploader", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("empty state", () => {
    it("renders drop zone when no value", () => {
      render(
        <ImageUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
          label="Primary Image"
        />
      );

      expect(screen.getByText("Primary Image")).toBeInTheDocument();
      expect(screen.getByTestId("image-uploader-dropzone")).toBeInTheDocument();
    });

    it("shows recommended size from specs", () => {
      render(
        <ImageUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByText(/1200.*628/)).toBeInTheDocument();
    });

    it("shows max file size from specs", () => {
      render(
        <ImageUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByText(/Max: 5 MB/i)).toBeInTheDocument();
    });
  });

  describe("mode selection", () => {
    it("defaults to upload mode", () => {
      render(
        <ImageUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
          showVariableOption
        />
      );

      const uploadTab = screen.getByRole("tab", { name: /upload/i });
      expect(uploadTab).toHaveAttribute("aria-selected", "true");
    });

    it("can switch to variable mode when enabled", () => {
      render(
        <ImageUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
          showVariableOption
          availableColumns={["image_url", "product_image"]}
        />
      );

      const variableTab = screen.getByRole("tab", { name: /variable/i });
      fireEvent.click(variableTab);

      expect(variableTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("variable-column-select")).toBeInTheDocument();
    });

    it("hides variable option when not enabled", () => {
      render(
        <ImageUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
          showVariableOption={false}
        />
      );

      expect(screen.queryByRole("tab", { name: /variable/i })).not.toBeInTheDocument();
    });
  });

  describe("with image asset", () => {
    const mockAsset: CreativeAsset = {
      id: "test-1",
      type: "image",
      source: { type: "blob", blobUrl: "blob:test-url", file: new File([""], "test.jpg", { type: "image/jpeg" }) },
      metadata: {
        fileName: "product-hero.jpg",
        mimeType: "image/jpeg",
        fileSize: 512000,
        width: 1200,
        height: 628,
        aspectRatio: "1.91:1",
      },
      validation: { isValid: true, errors: [], warnings: [] },
    };

    it("shows preview when asset is set", () => {
      render(
        <ImageUploader
          value={mockAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByTestId("image-preview")).toBeInTheDocument();
      expect(screen.getByText("product-hero.jpg")).toBeInTheDocument();
    });

    it("shows dimensions in preview", () => {
      render(
        <ImageUploader
          value={mockAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByText(/1200.*628/)).toBeInTheDocument();
      expect(screen.getByText(/1.91:1/)).toBeInTheDocument();
    });

    it("shows file size in preview", () => {
      render(
        <ImageUploader
          value={mockAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByText(/500 KB|512 KB/)).toBeInTheDocument();
    });

    it("shows change button when asset is set", () => {
      render(
        <ImageUploader
          value={mockAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByRole("button", { name: /change/i })).toBeInTheDocument();
    });

    it("shows remove button when asset is set", () => {
      render(
        <ImageUploader
          value={mockAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
    });

    it("calls onChange with null when remove is clicked", () => {
      render(
        <ImageUploader
          value={mockAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /remove/i }));
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe("with validation errors", () => {
    const invalidAsset: CreativeAsset = {
      id: "test-2",
      type: "image",
      source: { type: "blob", blobUrl: "blob:test-url", file: new File([""], "small.jpg", { type: "image/jpeg" }) },
      metadata: {
        fileName: "small.jpg",
        mimeType: "image/jpeg",
        fileSize: 100,
        width: 200,
        height: 150,
        aspectRatio: "4:3",
      },
      validation: {
        isValid: false,
        errors: [
          { code: "MIN_WIDTH", message: "Image width (200px) is below minimum (400px)", field: "width" },
          { code: "INVALID_ASPECT_RATIO", message: "Aspect ratio (4:3) not supported", field: "aspectRatio" },
        ],
        warnings: [],
      },
    };

    it("shows validation errors", () => {
      render(
        <ImageUploader
          value={invalidAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByText(/below minimum/i)).toBeInTheDocument();
      expect(screen.getByText(/not supported/i)).toBeInTheDocument();
    });

    it("shows error indicator on preview", () => {
      render(
        <ImageUploader
          value={invalidAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByTestId("image-preview")).toHaveAttribute("data-error", "true");
    });
  });

  describe("with validation warnings", () => {
    const warningAsset: CreativeAsset = {
      id: "test-3",
      type: "image",
      source: { type: "blob", blobUrl: "blob:test-url", file: new File([""], "medium.jpg", { type: "image/jpeg" }) },
      metadata: {
        fileName: "medium.jpg",
        mimeType: "image/jpeg",
        fileSize: 100,
        width: 800,
        height: 420,
        aspectRatio: "1.91:1",
      },
      validation: {
        isValid: true,
        errors: [],
        warnings: [
          {
            code: "BELOW_RECOMMENDED",
            message: "Image (800x420) is below recommended size",
            suggestion: "Use images at least 1200x628px",
          },
        ],
      },
    };

    it("shows validation warnings", () => {
      render(
        <ImageUploader
          value={warningAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByText(/below recommended/i)).toBeInTheDocument();
    });
  });

  describe("variable source", () => {
    const variableAsset: CreativeAsset = {
      id: "test-4",
      type: "image",
      source: { type: "variable", pattern: "{product_image}" },
      metadata: {},
      validation: { isValid: true, errors: [], warnings: [] },
    };

    it("shows variable pattern when source is variable", () => {
      render(
        <ImageUploader
          value={variableAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByText("{product_image}")).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables interactions when disabled", () => {
      render(
        <ImageUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
          disabled
        />
      );

      const dropzone = screen.getByTestId("image-uploader-dropzone");
      expect(dropzone).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("required state", () => {
    it("shows required indicator when required", () => {
      render(
        <ImageUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
          label="Primary Image"
          required
        />
      );

      expect(screen.getByText("*")).toBeInTheDocument();
    });
  });
});
