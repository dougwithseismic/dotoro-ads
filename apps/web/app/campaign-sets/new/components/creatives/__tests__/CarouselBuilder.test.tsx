import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CarouselBuilder } from "../CarouselBuilder";
import type { CarouselSlide, CreativeSpecs } from "@repo/core/creatives";

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
  aspectRatios: ["1:1"],
  minWidth: 400,
  minHeight: 400,
  maxFileSize: 5 * 1024 * 1024,
  allowedFormats: ["jpg", "png"],
};

const mockSlide: CarouselSlide = {
  id: "slide-1",
  image: {
    id: "img-1",
    type: "image",
    source: {
      type: "blob",
      blobUrl: "blob:test",
      file: new File([""], "slide1.jpg", { type: "image/jpeg" }),
    },
    metadata: {
      fileName: "slide1.jpg",
      width: 1080,
      height: 1080,
    },
    validation: { isValid: true, errors: [], warnings: [] },
  },
  headline: "Slide 1",
  description: "Description 1",
  url: "https://example.com/1",
  order: 0,
};

describe("CarouselBuilder", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("empty state", () => {
    it("renders empty state with add button", () => {
      render(
        <CarouselBuilder
          slides={[]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      expect(screen.getByText(/add card/i)).toBeInTheDocument();
    });

    it("shows minimum slides requirement", () => {
      render(
        <CarouselBuilder
          slides={[]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      // Multiple elements show requirement info - check at least one exists
      expect(screen.getAllByText(/required/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("with slides", () => {
    it("renders slide thumbnails", () => {
      render(
        <CarouselBuilder
          slides={[mockSlide]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      expect(screen.getByTestId("slide-0")).toBeInTheDocument();
    });

    it("shows slide count", () => {
      render(
        <CarouselBuilder
          slides={[mockSlide, { ...mockSlide, id: "slide-2", order: 1 }]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      expect(screen.getByText(/2\/10/)).toBeInTheDocument();
    });

    it("expands slide details when clicked", () => {
      render(
        <CarouselBuilder
          slides={[mockSlide]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      fireEvent.click(screen.getByTestId("slide-0"));
      expect(screen.getByTestId("slide-details-0")).toBeInTheDocument();
    });

    it("shows headline and description inputs when expanded", () => {
      render(
        <CarouselBuilder
          slides={[mockSlide]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
          supportsIndividualHeadlines
        />
      );

      fireEvent.click(screen.getByTestId("slide-0"));
      expect(screen.getByLabelText(/headline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("shows URL input when expanded", () => {
      render(
        <CarouselBuilder
          slides={[mockSlide]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
          supportsIndividualUrls
        />
      );

      fireEvent.click(screen.getByTestId("slide-0"));
      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
    });
  });

  describe("add slide", () => {
    it("shows add dropzone for adding cards", () => {
      render(
        <CarouselBuilder
          slides={[]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      // The add functionality uses a DropZone inside the button
      expect(screen.getByTestId("carousel-add-dropzone")).toBeInTheDocument();
    });

    it("disables add when max slides reached", () => {
      const slides = Array.from({ length: 10 }, (_, i) => ({
        ...mockSlide,
        id: `slide-${i}`,
        order: i,
      }));

      render(
        <CarouselBuilder
          slides={slides}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      // The add functionality is handled by the DropZone which has aria-disabled
      const dropzone = screen.getByTestId("carousel-add-dropzone");
      expect(dropzone).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("remove slide", () => {
    it("calls onChange without the slide when remove is clicked", () => {
      render(
        <CarouselBuilder
          slides={[mockSlide]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      fireEvent.click(screen.getByTestId("slide-0"));
      fireEvent.click(screen.getByRole("button", { name: /remove/i }));

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe("reorder slides", () => {
    it("shows drag handle on slides", () => {
      render(
        <CarouselBuilder
          slides={[mockSlide]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      expect(screen.getByTestId("drag-handle-0")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows error when below minimum slides", () => {
      render(
        <CarouselBuilder
          slides={[mockSlide]}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      expect(screen.getByText(/1 more card required/i)).toBeInTheDocument();
    });

    it("shows valid state when minimum slides met", () => {
      const slides = [
        mockSlide,
        { ...mockSlide, id: "slide-2", order: 1 },
      ];

      render(
        <CarouselBuilder
          slides={slides}
          onChange={onChange}
          specs={defaultSpecs}
          minSlides={2}
          maxSlides={10}
        />
      );

      expect(screen.queryByText(/more card required/i)).not.toBeInTheDocument();
    });
  });
});
