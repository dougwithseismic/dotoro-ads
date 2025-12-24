# Creative Asset System

## Overview

The Creative Asset System handles images, videos, GIFs, and carousels for ad campaigns. It supports two modes:

1. **Preview Mode** - Client-side only, no server uploads (minimal infrastructure)
2. **Storage Mode** - Persistent storage in R2/S3 (future enhancement)

---

## Design Principles

### 1. Preview-First Approach

The recommended implementation starts with preview-only mode:

- User uploads a file
- File is read into memory as a blob URL
- Preview is rendered immediately
- No server upload until campaign sync
- Zero infrastructure cost for previews

### 2. Data Source Integration

Creative assets can come from:

- **Direct Upload** - User uploads a file
- **Data Source Variable** - URL column like `{image_url}`
- **Remote URL** - User provides a URL directly

### 3. Platform Compliance

All assets are validated against platform-specific requirements:

- Dimensions (min/max, aspect ratios)
- File size limits
- Format restrictions
- Duration limits (for video)

---

## Type Definitions

### CreativeAsset

```typescript
// packages/core/src/creatives/types.ts

export type CreativeType = 'image' | 'video' | 'gif';

export type AssetSource =
  | { type: 'blob'; blobUrl: string; file: File }
  | { type: 'remote'; url: string }
  | { type: 'variable'; pattern: string }
  | { type: 'stored'; storageKey: string; url: string };

export interface CreativeAsset {
  id: string;
  type: CreativeType;

  // Source of the asset
  source: AssetSource;

  // Metadata (populated after analysis)
  metadata: AssetMetadata;

  // Validation results
  validation: AssetValidation;

  // Thumbnail (for video)
  thumbnailUrl?: string;
}

export interface AssetMetadata {
  // File info
  fileName?: string;
  mimeType?: string;
  fileSize?: number;

  // Dimensions
  width?: number;
  height?: number;
  aspectRatio?: string;

  // Video-specific
  duration?: number;  // seconds
  bitrate?: number;   // kbps
  codec?: string;

  // Analysis timestamp
  analyzedAt?: string;
}

export interface AssetValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}
```

### CarouselAsset

```typescript
export interface CarouselAsset {
  id: string;
  slides: CarouselSlide[];
}

export interface CarouselSlide {
  id: string;

  // Image for this slide
  image: CreativeAsset;

  // Slide-specific copy (optional, can use templates)
  headline?: string;
  description?: string;

  // Slide-specific URL (optional)
  url?: string;

  // Order
  order: number;
}

export interface CarouselConfig {
  // Minimum and maximum slides
  minSlides: number;
  maxSlides: number;

  // Whether slides can have individual URLs
  supportsIndividualUrls: boolean;

  // Whether slides can have individual headlines
  supportsIndividualHeadlines: boolean;

  // Image specs for all slides
  imageSpecs: CreativeSpecs;
}
```

### CreativeSpecs

```typescript
export interface CreativeSpecs {
  // Supported aspect ratios
  aspectRatios?: string[];

  // Dimension constraints
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  recommendedWidth?: number;
  recommendedHeight?: number;

  // File constraints
  maxFileSize?: number;  // bytes
  allowedFormats?: string[];

  // Video-specific
  minDuration?: number;  // seconds
  maxDuration?: number;
  minBitrate?: number;   // kbps
  maxBitrate?: number;
}
```

---

## Image Analysis

### Client-Side Analysis

```typescript
// packages/core/src/creatives/analyze.ts

export interface ImageAnalysisResult {
  width: number;
  height: number;
  aspectRatio: string;
  fileSize: number;
  mimeType: string;
  isAnimated: boolean;  // For GIFs
}

/**
 * Analyze an image file on the client side
 */
export async function analyzeImage(file: File): Promise<ImageAnalysisResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = calculateAspectRatio(width, height);

      URL.revokeObjectURL(url);

      resolve({
        width,
        height,
        aspectRatio,
        fileSize: file.size,
        mimeType: file.type,
        isAnimated: file.type === 'image/gif',
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Calculate simplified aspect ratio
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  // Map to common ratios
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.01) return '1:1';
  if (Math.abs(ratio - 1.91) < 0.05) return '1.91:1';
  if (Math.abs(ratio - 1.78) < 0.05) return '16:9';
  if (Math.abs(ratio - 0.8) < 0.05) return '4:5';
  if (Math.abs(ratio - 0.5625) < 0.05) return '9:16';
  if (Math.abs(ratio - 1.33) < 0.05) return '4:3';

  return `${w}:${h}`;
}
```

### Video Analysis

```typescript
export interface VideoAnalysisResult {
  width: number;
  height: number;
  aspectRatio: string;
  duration: number;
  fileSize: number;
  mimeType: string;
  thumbnailUrl: string;
}

/**
 * Analyze a video file on the client side
 */
export async function analyzeVideo(file: File): Promise<VideoAnalysisResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;

      // Seek to 1 second for thumbnail
      video.currentTime = Math.min(1, duration / 2);
    };

    video.onseeked = () => {
      // Create thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

      URL.revokeObjectURL(url);

      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: calculateAspectRatio(video.videoWidth, video.videoHeight),
        duration: video.duration,
        fileSize: file.size,
        mimeType: file.type,
        thumbnailUrl,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };

    video.src = url;
  });
}
```

---

## Validation

### Validation Rules

```typescript
// packages/core/src/creatives/validation.ts

import { CreativeSpecs, AssetMetadata, AssetValidation } from './types';

export function validateAsset(
  metadata: AssetMetadata,
  specs: CreativeSpecs
): AssetValidation {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ─────────────────────────────────────────────────────────────────────
  // Dimension validation
  // ─────────────────────────────────────────────────────────────────────

  if (specs.minWidth && metadata.width && metadata.width < specs.minWidth) {
    errors.push({
      code: 'MIN_WIDTH',
      message: `Image width (${metadata.width}px) is below minimum (${specs.minWidth}px)`,
      field: 'width',
    });
  }

  if (specs.maxWidth && metadata.width && metadata.width > specs.maxWidth) {
    errors.push({
      code: 'MAX_WIDTH',
      message: `Image width (${metadata.width}px) exceeds maximum (${specs.maxWidth}px)`,
      field: 'width',
    });
  }

  if (specs.minHeight && metadata.height && metadata.height < specs.minHeight) {
    errors.push({
      code: 'MIN_HEIGHT',
      message: `Image height (${metadata.height}px) is below minimum (${specs.minHeight}px)`,
      field: 'height',
    });
  }

  if (specs.maxHeight && metadata.height && metadata.height > specs.maxHeight) {
    errors.push({
      code: 'MAX_HEIGHT',
      message: `Image height (${metadata.height}px) exceeds maximum (${specs.maxHeight}px)`,
      field: 'height',
    });
  }

  // Recommended dimensions warning
  if (
    specs.recommendedWidth &&
    specs.recommendedHeight &&
    metadata.width &&
    metadata.height
  ) {
    if (
      metadata.width < specs.recommendedWidth ||
      metadata.height < specs.recommendedHeight
    ) {
      warnings.push({
        code: 'BELOW_RECOMMENDED',
        message: `Image (${metadata.width}x${metadata.height}) is below recommended size (${specs.recommendedWidth}x${specs.recommendedHeight})`,
        suggestion: `For best results, use images at least ${specs.recommendedWidth}x${specs.recommendedHeight}px`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Aspect ratio validation
  // ─────────────────────────────────────────────────────────────────────

  if (specs.aspectRatios && specs.aspectRatios.length > 0 && metadata.aspectRatio) {
    const isValidRatio = specs.aspectRatios.some(ratio =>
      isAspectRatioMatch(metadata.aspectRatio!, ratio)
    );

    if (!isValidRatio) {
      errors.push({
        code: 'INVALID_ASPECT_RATIO',
        message: `Aspect ratio (${metadata.aspectRatio}) is not supported. Allowed: ${specs.aspectRatios.join(', ')}`,
        field: 'aspectRatio',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // File size validation
  // ─────────────────────────────────────────────────────────────────────

  if (specs.maxFileSize && metadata.fileSize && metadata.fileSize > specs.maxFileSize) {
    const maxMB = (specs.maxFileSize / 1_000_000).toFixed(1);
    const actualMB = (metadata.fileSize / 1_000_000).toFixed(1);
    errors.push({
      code: 'FILE_TOO_LARGE',
      message: `File size (${actualMB}MB) exceeds maximum (${maxMB}MB)`,
      field: 'fileSize',
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Format validation
  // ─────────────────────────────────────────────────────────────────────

  if (specs.allowedFormats && metadata.mimeType) {
    const format = mimeToFormat(metadata.mimeType);
    if (!specs.allowedFormats.includes(format)) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: `Format (${format}) is not supported. Allowed: ${specs.allowedFormats.join(', ')}`,
        field: 'format',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Video-specific validation
  // ─────────────────────────────────────────────────────────────────────

  if (metadata.duration !== undefined) {
    if (specs.minDuration && metadata.duration < specs.minDuration) {
      errors.push({
        code: 'VIDEO_TOO_SHORT',
        message: `Video duration (${metadata.duration}s) is below minimum (${specs.minDuration}s)`,
        field: 'duration',
      });
    }

    if (specs.maxDuration && metadata.duration > specs.maxDuration) {
      errors.push({
        code: 'VIDEO_TOO_LONG',
        message: `Video duration (${metadata.duration}s) exceeds maximum (${specs.maxDuration}s)`,
        field: 'duration',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function isAspectRatioMatch(actual: string, target: string): boolean {
  // Parse ratios
  const parseRatio = (r: string) => {
    const [w, h] = r.split(':').map(Number);
    return w / h;
  };

  const actualRatio = parseRatio(actual);
  const targetRatio = parseRatio(target);

  // Allow 2% tolerance
  return Math.abs(actualRatio - targetRatio) / targetRatio < 0.02;
}

function mimeToFormat(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };
  return map[mimeType] || mimeType.split('/')[1] || 'unknown';
}
```

---

## UX Components

### Image Uploader Component

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Primary Image                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │                        ┌─────────────────┐                          │   │
│  │                        │      📁         │                          │   │
│  │                        │                 │                          │   │
│  │                        │  Drop image     │                          │   │
│  │                        │  or click to    │                          │   │
│  │                        │  browse         │                          │   │
│  │                        │                 │                          │   │
│  │                        └─────────────────┘                          │   │
│  │                                                                      │   │
│  │  Recommended: 1200 × 628 (1.91:1)                                   │   │
│  │  Max size: 5MB · Formats: JPG, PNG, WebP                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ── Or use from data source ──────────────────────────────────────────────  │
│                                                                             │
│  Image URL column: ┌────────────────────────────────────────────────────┐  │
│                    │ Select column...                               ▾ │  │
│                    └────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Image Uploader with Preview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Primary Image                                                      [Change] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                                 │  │ File Details                    │  │
│  │     ┌───────────────────────┐   │  │                                 │  │
│  │     │                       │   │  │ product-hero.jpg                │  │
│  │     │    [Image Preview]    │   │  │ 1200 × 628 (1.91:1)             │  │
│  │     │                       │   │  │ 412 KB                          │  │
│  │     │                       │   │  │                                 │  │
│  │     └───────────────────────┘   │  │ ✓ Meets all requirements        │  │
│  │                                 │  │                                 │  │
│  │  [🗑️ Remove]                    │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  Platform Compliance:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ✓ Google Display   ✓ Facebook Feed   ✓ Reddit                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Image Uploader with Error

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Primary Image                                                      [Change] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                                 │  │ File Details                    │  │
│  │     ┌───────────────────────┐   │  │                                 │  │
│  │     │                       │   │  │ banner.png                      │  │
│  │     │    [Image Preview]    │   │  │ 800 × 600 (4:3)                 │  │
│  │     │   ⚠️ Issues found      │   │  │ 2.1 MB                          │  │
│  │     │                       │   │  │                                 │  │
│  │     └───────────────────────┘   │  │ ⚠️ 2 issues found               │  │
│  │                                 │  │                                 │  │
│  │  [🗑️ Remove]                    │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  Issues:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ Aspect ratio (4:3) not supported. Use 1:1, 1.91:1, or 16:9       │   │
│  │ ⚠️ Image below recommended size (1200×628). May appear blurry.      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Platform Compliance:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ Google Display   ❌ Facebook Feed   ⚠️ Reddit (warning)            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Video Uploader

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Video Ad                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │                        ┌─────────────────┐                          │   │
│  │                        │      🎬         │                          │   │
│  │                        │                 │                          │   │
│  │                        │  Drop video     │                          │   │
│  │                        │  or click to    │                          │   │
│  │                        │  browse         │                          │   │
│  │                        │                 │                          │   │
│  │                        └─────────────────┘                          │   │
│  │                                                                      │   │
│  │  Duration: 5-60 seconds                                             │   │
│  │  Max size: 500MB · Formats: MP4, MOV                                │   │
│  │  Aspect ratios: 16:9, 1:1, 9:16                                     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Video with Preview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Video Ad                                                           [Change] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │ │                                                                  │ │   │
│  │ │                      [Video Thumbnail]                          │ │   │
│  │ │                                                                  │ │   │
│  │ │                          ▶                                      │ │   │
│  │ │                                                                  │ │   │
│  │ │ ─────────────────────────────────●────────────────────────────  │ │   │
│  │ │ 0:00                                                      0:32  │ │   │
│  │ └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  │  product-launch.mp4 · 1920×1080 (16:9) · 32s · 24.5 MB             │   │
│  │                                                                      │   │
│  │  ✓ Meets all requirements                                           │   │
│  │                                                                      │   │
│  │  [🗑️ Remove]  [📷 Change Thumbnail]                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Custom Thumbnail (Optional):                                              │
│  ┌────────────────────┐                                                    │
│  │  [Auto-generated]  │  or  [Upload custom thumbnail]                     │
│  └────────────────────┘                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Carousel Builder

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Carousel Cards                                                2/6 required  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌ ─ ─ ─ ┐             │   │
│  │  │   1   │  │   2   │  │   3   │  │   +   │    Add                  │   │
│  │  │  🖼️   │  │  🖼️   │  │  📁   │  │       │    Card                 │   │
│  │  │       │  │       │  │       │  │       │                         │   │
│  │  └───────┘  └───────┘  └───────┘  └───────┘  └ ─ ─ ─ ┘             │   │
│  │      ↕          ↕          ↕                                        │   │
│  │  (drag to reorder)                                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Card 1                                                     [✕ Remove]│   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐  Headline:                                │   │
│  │  │                      │  ┌────────────────────────────────────┐   │   │
│  │  │                      │  │ {product_name}                     │   │   │
│  │  │   [Image Preview]    │  └────────────────────────────────────┘   │   │
│  │  │                      │                                           │   │
│  │  │   1080×1080 (1:1)    │  Description (optional):                  │   │
│  │  │                      │  ┌────────────────────────────────────┐   │   │
│  │  └──────────────────────┘  │ {product_description|truncate:30} │   │   │
│  │                            └────────────────────────────────────┘   │   │
│  │  [Change Image]                                                     │   │
│  │                            Link URL:                                │   │
│  │                            ┌────────────────────────────────────┐   │   │
│  │                            │ {product_url}                      │   │   │
│  │                            └────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Card 2                                                     [✕ Remove]│   │
│  │  ...                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## React Component Implementation

### ImageUploader

```typescript
// apps/web/app/campaigns/generate/components/ImageUploader.tsx

'use client';

import { useState, useCallback, useRef } from 'react';
import { analyzeImage } from '@dotoro/core/creatives';
import type { CreativeAsset, CreativeSpecs } from '@dotoro/core/creatives';
import styles from './ImageUploader.module.css';

interface ImageUploaderProps {
  value: CreativeAsset | null;
  onChange: (asset: CreativeAsset | null) => void;
  specs: CreativeSpecs;
  label?: string;
  helpText?: string;
  required?: boolean;
  showVariableOption?: boolean;
  availableColumns?: string[];
}

export function ImageUploader({
  value,
  onChange,
  specs,
  label = 'Image',
  helpText,
  required = false,
  showVariableOption = true,
  availableColumns = [],
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mode, setMode] = useState<'upload' | 'variable'>('upload');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        return;
      }

      setIsAnalyzing(true);

      try {
        const analysis = await analyzeImage(file);
        const blobUrl = URL.createObjectURL(file);

        const asset: CreativeAsset = {
          id: crypto.randomUUID(),
          type: file.type === 'image/gif' ? 'gif' : 'image',
          source: { type: 'blob', blobUrl, file },
          metadata: {
            fileName: file.name,
            mimeType: file.type,
            fileSize: analysis.fileSize,
            width: analysis.width,
            height: analysis.height,
            aspectRatio: analysis.aspectRatio,
          },
          validation: validateAsset(
            {
              width: analysis.width,
              height: analysis.height,
              aspectRatio: analysis.aspectRatio,
              fileSize: analysis.fileSize,
              mimeType: file.type,
            },
            specs
          ),
        };

        onChange(asset);
      } catch (error) {
        console.error('Failed to analyze image:', error);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [onChange, specs]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleRemove = useCallback(() => {
    if (value?.source.type === 'blob') {
      URL.revokeObjectURL(value.source.blobUrl);
    }
    onChange(null);
  }, [value, onChange]);

  const handleVariableChange = useCallback(
    (pattern: string) => {
      const asset: CreativeAsset = {
        id: crypto.randomUUID(),
        type: 'image',
        source: { type: 'variable', pattern },
        metadata: {},
        validation: { isValid: true, errors: [], warnings: [] },
      };
      onChange(asset);
    },
    [onChange]
  );

  // ... render logic
}
```

---

## Storage Integration (Future)

### Storage Configuration

```typescript
// packages/core/src/creatives/storage.ts

export interface StorageConfig {
  provider: 'r2' | 's3' | 'local';

  // R2/S3 config
  bucket?: string;
  region?: string;
  publicUrl?: string;

  // Upload settings
  maxFileSize?: number;
  allowedTypes?: string[];

  // URL signing
  signedUrlExpiry?: number;  // seconds
}

export interface UploadResult {
  storageKey: string;
  url: string;
  publicUrl?: string;
}

export interface StorageService {
  upload(file: File, key: string): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string): Promise<string>;
}
```

### API Endpoints (Future)

```typescript
// apps/api/src/routes/creatives.ts

// POST /api/v1/creatives/upload
// Upload a creative asset
// Returns: { storageKey, url }

// DELETE /api/v1/creatives/:key
// Delete a creative asset

// GET /api/v1/creatives/:key/url
// Get a signed URL for a creative asset
```

---

## Data Source Variable Assets

When using `{image_url}` from data source:

```typescript
export async function validateVariableAsset(
  pattern: string,
  sampleRow: Record<string, unknown>,
  specs: CreativeSpecs
): Promise<AssetValidation> {
  const url = interpolatePattern(pattern, sampleRow);

  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      errors: [{ code: 'EMPTY_URL', message: 'Image URL is empty' }],
      warnings: [],
    };
  }

  try {
    // Fetch image headers to get dimensions
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      return {
        isValid: false,
        errors: [{ code: 'FETCH_FAILED', message: `Failed to fetch image: ${response.status}` }],
        warnings: [],
      };
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    // Basic validation based on headers
    const warnings: ValidationWarning[] = [];

    if (contentLength && specs.maxFileSize) {
      const size = parseInt(contentLength, 10);
      if (size > specs.maxFileSize) {
        return {
          isValid: false,
          errors: [{
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds maximum (${(specs.maxFileSize / 1_000_000).toFixed(1)}MB)`,
          }],
          warnings: [],
        };
      }
    }

    if (specs.allowedFormats && contentType) {
      const format = mimeToFormat(contentType);
      if (!specs.allowedFormats.includes(format)) {
        return {
          isValid: false,
          errors: [{
            code: 'INVALID_FORMAT',
            message: `Format (${format}) not supported`,
          }],
          warnings: [],
        };
      }
    }

    // Note: Can't get dimensions without downloading the full image
    warnings.push({
      code: 'DIMENSIONS_UNKNOWN',
      message: 'Image dimensions will be validated during generation',
      suggestion: 'Ensure source images meet size requirements',
    });

    return { isValid: true, errors: [], warnings };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        code: 'FETCH_ERROR',
        message: `Could not validate image URL: ${error}`,
      }],
      warnings: [],
    };
  }
}
```
