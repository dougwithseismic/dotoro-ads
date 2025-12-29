'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { CarouselCard, FabricCanvasJson } from '@repo/core';
import { FabricCanvas, type FabricCanvasRef, type FabricCanvasJSON } from '../index';
import styles from './CarouselCardEditor.module.css';

export interface CarouselCardEditorProps {
  /** Card being edited */
  card: CarouselCard;
  /** Callback when card canvas changes */
  onCanvasChange: (canvasJson: FabricCanvasJson) => void;
  /** Callback when card metadata changes */
  onMetadataChange?: (metadata: CardMetadata) => void;
  /** Whether to show metadata fields (headline, description, URL) */
  showMetadataFields?: boolean;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Read-only mode */
  readOnly?: boolean;
  /** CSS class name */
  className?: string;
}

export interface CardMetadata {
  headline?: string;
  description?: string;
  url?: string;
}

/**
 * CarouselCardEditor - Single card editor wrapping FabricCanvas
 *
 * Provides canvas editing for a single carousel card with optional
 * per-card metadata fields (headline, description, URL).
 */
export function CarouselCardEditor({
  card,
  onCanvasChange,
  onMetadataChange,
  showMetadataFields = false,
  width = 1080,
  height = 1080,
  readOnly = false,
  className,
}: CarouselCardEditorProps) {
  const canvasRef = useRef<FabricCanvasRef>(null);
  const lastJsonRef = useRef<string>('');

  // Load canvas JSON when card changes
  useEffect(() => {
    if (canvasRef.current && card.canvasJson) {
      const currentJson = JSON.stringify(card.canvasJson);
      if (currentJson !== lastJsonRef.current) {
        lastJsonRef.current = currentJson;
        canvasRef.current.loadFromJson(card.canvasJson as FabricCanvasJSON);
      }
    }
  }, [card.canvasJson]);

  const handleCanvasChange = useCallback(
    (json: FabricCanvasJSON) => {
      const jsonString = JSON.stringify(json);
      if (jsonString !== lastJsonRef.current) {
        lastJsonRef.current = jsonString;
        onCanvasChange(json as FabricCanvasJson);
      }
    },
    [onCanvasChange]
  );

  const handleHeadlineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onMetadataChange?.({
        headline: e.target.value,
        description: card.description,
        url: card.url,
      });
    },
    [card.description, card.url, onMetadataChange]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onMetadataChange?.({
        headline: card.headline,
        description: e.target.value,
        url: card.url,
      });
    },
    [card.headline, card.url, onMetadataChange]
  );

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onMetadataChange?.({
        headline: card.headline,
        description: card.description,
        url: e.target.value,
      });
    },
    [card.headline, card.description, onMetadataChange]
  );

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      <div className={styles.canvasWrapper}>
        <FabricCanvas
          ref={canvasRef}
          initialJson={card.canvasJson as FabricCanvasJSON}
          width={width}
          height={height}
          onChange={handleCanvasChange}
          readOnly={readOnly}
          className={styles.canvas}
        />
      </div>

      {showMetadataFields && !readOnly && (
        <div className={styles.metadataFields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`headline-${card.id}`}>
              Headline
              <span className={styles.charCount}>
                {card.headline?.length ?? 0}/100
              </span>
            </label>
            <input
              id={`headline-${card.id}`}
              type="text"
              className={styles.input}
              value={card.headline ?? ''}
              onChange={handleHeadlineChange}
              maxLength={100}
              placeholder="Card headline"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`description-${card.id}`}>
              Description
              <span className={styles.charCount}>
                {card.description?.length ?? 0}/200
              </span>
            </label>
            <textarea
              id={`description-${card.id}`}
              className={styles.textarea}
              value={card.description ?? ''}
              onChange={handleDescriptionChange}
              maxLength={200}
              placeholder="Card description"
              rows={2}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`url-${card.id}`}>
              Destination URL
            </label>
            <input
              id={`url-${card.id}`}
              type="url"
              className={styles.input}
              value={card.url ?? ''}
              onChange={handleUrlChange}
              placeholder="https://example.com/product"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CarouselCardEditor;
