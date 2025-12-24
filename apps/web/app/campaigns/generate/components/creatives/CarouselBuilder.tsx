"use client";

import { useState, useCallback } from "react";
import type { CarouselSlide, CreativeSpecs, CreativeAsset } from "@repo/core/creatives";
import { DropZone } from "./DropZone";
import { useCreativeUpload } from "../../hooks/useCreativeUpload";
import styles from "./CarouselBuilder.module.css";

interface CarouselBuilderProps {
  /** Current slides */
  slides: CarouselSlide[];
  /** Called when slides change */
  onChange: (slides: CarouselSlide[]) => void;
  /** Image specs for carousel slides */
  specs: CreativeSpecs;
  /** Minimum number of slides required */
  minSlides: number;
  /** Maximum number of slides allowed */
  maxSlides: number;
  /** Whether slides can have individual URLs */
  supportsIndividualUrls?: boolean;
  /** Whether slides can have individual headlines */
  supportsIndividualHeadlines?: boolean;
  /** Available columns for variable selection */
  availableColumns?: string[];
  /** Whether the component is disabled */
  disabled?: boolean;
}

export function CarouselBuilder({
  slides,
  onChange,
  specs,
  minSlides,
  maxSlides,
  supportsIndividualUrls = false,
  supportsIndividualHeadlines = false,
  availableColumns = [],
  disabled = false,
}: CarouselBuilderProps) {
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);

  const { handleFileSelect } = useCreativeUpload({
    specs,
    onAssetChange: (asset) => {
      if (asset) {
        handleAddSlide(asset);
      }
    },
  });

  const handleAddSlide = useCallback(
    (image: CreativeAsset) => {
      if (slides.length >= maxSlides) return;

      const newSlide: CarouselSlide = {
        id: crypto.randomUUID(),
        image,
        order: slides.length,
      };

      onChange([...slides, newSlide]);
      setExpandedSlide(slides.length);
    },
    [slides, maxSlides, onChange]
  );

  const handleRemoveSlide = useCallback(
    (index: number) => {
      const removedSlide = slides[index];
      // Revoke blob URL to prevent memory leak
      if (removedSlide?.image.source.type === "blob") {
        URL.revokeObjectURL(removedSlide.image.source.blobUrl);
      }
      const newSlides = slides
        .filter((_, i) => i !== index)
        .map((slide, i) => ({ ...slide, order: i }));
      onChange(newSlides);
      setExpandedSlide(null);
    },
    [slides, onChange]
  );

  const handleUpdateSlide = useCallback(
    (index: number, updates: Partial<CarouselSlide>) => {
      const newSlides = slides.map((slide, i) =>
        i === index ? { ...slide, ...updates } : slide
      );
      onChange(newSlides);
    },
    [slides, onChange]
  );

  const handleSlideClick = useCallback((index: number) => {
    setExpandedSlide((current) => (current === index ? null : index));
  }, []);

  // Build accept types
  const acceptTypes = (specs.allowedFormats || ["jpg", "png"]).map((f) => {
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
    };
    return mimeMap[f] || `image/${f}`;
  });

  const slidesNeeded = Math.max(0, minSlides - slides.length);
  const canAddMore = slides.length < maxSlides;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Carousel Cards</span>
        <span className={styles.count}>
          {slides.length}/{maxSlides}
          {slidesNeeded > 0 && (
            <span className={styles.required}> ({minSlides} required)</span>
          )}
        </span>
      </div>

      {/* Slides grid */}
      <div className={styles.slidesGrid}>
        {slides.map((slide, index) => (
          <div key={slide.id} className={styles.slideWrapper}>
            {/* Thumbnail */}
            <button
              type="button"
              className={`${styles.slideThumbnail} ${expandedSlide === index ? styles.expanded : ""}`}
              onClick={() => handleSlideClick(index)}
              data-testid={`slide-${index}`}
              disabled={disabled}
            >
              <div className={styles.dragHandle} data-testid={`drag-handle-${index}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="6" r="2" />
                  <circle cx="12" cy="6" r="2" />
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="5" cy="18" r="2" />
                  <circle cx="12" cy="18" r="2" />
                </svg>
              </div>

              <span className={styles.slideNumber}>{index + 1}</span>

              {slide.image.source.type === "blob" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.image.source.blobUrl}
                  alt={`Slide ${index + 1}`}
                  className={styles.slideImage}
                />
              ) : (
                <div className={styles.slidePlaceholder}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
            </button>

            {/* Expanded details */}
            {expandedSlide === index && (
              <div className={styles.slideDetails} data-testid={`slide-details-${index}`}>
                {supportsIndividualHeadlines && (
                  <>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel} htmlFor={`headline-${index}`}>
                        Headline
                      </label>
                      <input
                        id={`headline-${index}`}
                        type="text"
                        className={styles.fieldInput}
                        value={slide.headline || ""}
                        onChange={(e) =>
                          handleUpdateSlide(index, { headline: e.target.value })
                        }
                        placeholder="Enter headline..."
                        disabled={disabled}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel} htmlFor={`description-${index}`}>
                        Description
                      </label>
                      <textarea
                        id={`description-${index}`}
                        className={styles.fieldTextarea}
                        value={slide.description || ""}
                        onChange={(e) =>
                          handleUpdateSlide(index, { description: e.target.value })
                        }
                        placeholder="Enter description..."
                        rows={2}
                        disabled={disabled}
                      />
                    </div>
                  </>
                )}

                {supportsIndividualUrls && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor={`url-${index}`}>
                      URL
                    </label>
                    <input
                      id={`url-${index}`}
                      type="url"
                      className={styles.fieldInput}
                      value={slide.url || ""}
                      onChange={(e) =>
                        handleUpdateSlide(index, { url: e.target.value })
                      }
                      placeholder="https://..."
                      disabled={disabled}
                    />
                  </div>
                )}

                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => handleRemoveSlide(index)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add card area */}
        <div
          className={styles.addButton}
          data-disabled={disabled || !canAddMore ? "true" : "false"}
        >
          <DropZone
            label=""
            accept={acceptTypes}
            onFileSelect={handleFileSelect}
            maxSize={specs.maxFileSize}
            disabled={disabled || !canAddMore}
            testId="carousel-add-dropzone"
          />
          <span className={styles.addLabel}>Add Card</span>
        </div>
      </div>

      {/* Validation message */}
      {slidesNeeded > 0 && (
        <div className={styles.validationMessage}>
          {slidesNeeded} more card{slidesNeeded !== 1 ? "s" : ""} required
        </div>
      )}
    </div>
  );
}
