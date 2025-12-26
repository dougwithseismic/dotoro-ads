import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CreativeSlot } from "../CreativeSlot";
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

const imageSpecs: CreativeSpecs = {
  aspectRatios: ["1.91:1", "1:1"],
  minWidth: 400,
  minHeight: 300,
  recommendedWidth: 1200,
  recommendedHeight: 628,
  maxFileSize: 5 * 1024 * 1024,
  allowedFormats: ["jpg", "png"],
};

const videoSpecs: CreativeSpecs = {
  aspectRatios: ["16:9", "1:1"],
  minDuration: 5,
  maxDuration: 60,
  maxFileSize: 500 * 1024 * 1024,
  allowedFormats: ["mp4", "mov"],
};

describe("CreativeSlot", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("image type", () => {
    it("renders ImageUploader for image type", () => {
      render(
        <CreativeSlot
          type="image"
          value={null}
          onChange={onChange}
          specs={imageSpecs}
          label="Primary Image"
        />
      );

      expect(screen.getByText("Primary Image")).toBeInTheDocument();
      expect(screen.getByTestId("creative-slot-image")).toBeInTheDocument();
    });

    it("shows specs-based requirements", () => {
      render(
        <CreativeSlot
          type="image"
          value={null}
          onChange={onChange}
          specs={imageSpecs}
        />
      );

      expect(screen.getByText(/1200.*628/)).toBeInTheDocument();
    });
  });

  describe("video type", () => {
    it("renders VideoUploader for video type", () => {
      render(
        <CreativeSlot
          type="video"
          value={null}
          onChange={onChange}
          specs={videoSpecs}
          label="Video Ad"
        />
      );

      expect(screen.getByText("Video Ad")).toBeInTheDocument();
      expect(screen.getByTestId("creative-slot-video")).toBeInTheDocument();
    });

    it("shows duration requirements for video", () => {
      render(
        <CreativeSlot
          type="video"
          value={null}
          onChange={onChange}
          specs={videoSpecs}
        />
      );

      expect(screen.getByText(/5-60 seconds/i)).toBeInTheDocument();
    });
  });

  describe("with value", () => {
    const mockAsset: CreativeAsset = {
      id: "test-1",
      type: "image",
      source: {
        type: "blob",
        blobUrl: "blob:test-url",
        file: new File([""], "test.jpg", { type: "image/jpeg" }),
      },
      metadata: {
        fileName: "test.jpg",
        width: 1200,
        height: 628,
      },
      validation: { isValid: true, errors: [], warnings: [] },
    };

    it("shows preview when value is set", () => {
      render(
        <CreativeSlot
          type="image"
          value={mockAsset}
          onChange={onChange}
          specs={imageSpecs}
        />
      );

      expect(screen.getByText("test.jpg")).toBeInTheDocument();
    });
  });

  describe("required state", () => {
    it("shows required indicator", () => {
      render(
        <CreativeSlot
          type="image"
          value={null}
          onChange={onChange}
          specs={imageSpecs}
          label="Image"
          required
        />
      );

      expect(screen.getByText("*")).toBeInTheDocument();
    });
  });

  describe("variable support", () => {
    it("shows variable option when enabled", () => {
      render(
        <CreativeSlot
          type="image"
          value={null}
          onChange={onChange}
          specs={imageSpecs}
          showVariableOption
          availableColumns={["image_url"]}
        />
      );

      expect(screen.getByRole("tab", { name: /variable/i })).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables uploader when disabled", () => {
      render(
        <CreativeSlot
          type="image"
          value={null}
          onChange={onChange}
          specs={imageSpecs}
          disabled
        />
      );

      const dropzone = screen.getByTestId("image-uploader-dropzone");
      expect(dropzone).toHaveAttribute("aria-disabled", "true");
    });
  });
});
