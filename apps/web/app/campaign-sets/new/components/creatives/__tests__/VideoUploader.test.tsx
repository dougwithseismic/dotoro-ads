import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VideoUploader } from "../VideoUploader";
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

const defaultSpecs: CreativeSpecs = {
  aspectRatios: ["16:9", "1:1", "9:16"],
  minDuration: 5,
  maxDuration: 60,
  maxFileSize: 500 * 1024 * 1024,
  allowedFormats: ["mp4", "mov", "webm"],
};

describe("VideoUploader", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("empty state", () => {
    it("renders drop zone when no value", () => {
      render(
        <VideoUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
          label="Video Ad"
        />
      );

      expect(screen.getByText("Video Ad")).toBeInTheDocument();
      expect(screen.getByTestId("video-uploader-dropzone")).toBeInTheDocument();
    });

    it("shows duration range from specs", () => {
      render(
        <VideoUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByText(/5-60 seconds/i)).toBeInTheDocument();
    });

    it("shows video icon in drop zone", () => {
      render(
        <VideoUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByTestId("dropzone-icon-video")).toBeInTheDocument();
    });
  });

  describe("with video asset", () => {
    const mockAsset: CreativeAsset = {
      id: "test-1",
      type: "video",
      source: {
        type: "blob",
        blobUrl: "blob:test-url",
        file: new File([""], "product-launch.mp4", { type: "video/mp4" }),
      },
      metadata: {
        fileName: "product-launch.mp4",
        mimeType: "video/mp4",
        fileSize: 24 * 1024 * 1024,
        width: 1920,
        height: 1080,
        aspectRatio: "16:9",
        duration: 32,
      },
      validation: { isValid: true, errors: [], warnings: [] },
      thumbnailUrl: "data:image/jpeg;base64,test",
    };

    it("shows video preview with thumbnail", () => {
      render(
        <VideoUploader
          value={mockAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByTestId("video-preview")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: /thumbnail/i })).toBeInTheDocument();
    });

    it("shows video metadata", () => {
      render(
        <VideoUploader
          value={mockAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByText("product-launch.mp4")).toBeInTheDocument();
      expect(screen.getByText(/1920.*1080/)).toBeInTheDocument();
      expect(screen.getByText(/32s/)).toBeInTheDocument();
    });

    it("shows play button on thumbnail", () => {
      render(
        <VideoUploader
          value={mockAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByTestId("video-play-button")).toBeInTheDocument();
    });

    it("calls onChange with null when remove is clicked", () => {
      render(
        <VideoUploader
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
      type: "video",
      source: {
        type: "blob",
        blobUrl: "blob:test-url",
        file: new File([""], "short.mp4", { type: "video/mp4" }),
      },
      metadata: {
        fileName: "short.mp4",
        mimeType: "video/mp4",
        fileSize: 1024,
        width: 1920,
        height: 1080,
        aspectRatio: "16:9",
        duration: 2,
      },
      validation: {
        isValid: false,
        errors: [
          {
            code: "VIDEO_TOO_SHORT",
            message: "Video duration (2s) is below minimum (5s)",
            field: "duration",
          },
        ],
        warnings: [],
      },
    };

    it("shows validation errors", () => {
      render(
        <VideoUploader
          value={invalidAsset}
          onChange={onChange}
          specs={defaultSpecs}
        />
      );

      expect(screen.getByText(/below minimum/i)).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables interactions when disabled", () => {
      render(
        <VideoUploader
          value={null}
          onChange={onChange}
          specs={defaultSpecs}
          disabled
        />
      );

      const dropzone = screen.getByTestId("video-uploader-dropzone");
      expect(dropzone).toHaveAttribute("aria-disabled", "true");
    });
  });
});
