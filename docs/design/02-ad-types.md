# Ad Type System

## Overview

The Ad Type System provides a flexible, extensible way to define different advertisement formats across platforms. Each ad type is a self-describing object that includes field definitions, creative requirements, validation rules, and preview components.

---

## Core Types

### AdTypeDefinition

The fundamental building block of the ad type system:

```typescript
// packages/core/src/ad-types/types.ts

export type ContentCategory = 'paid' | 'organic' | 'promoted';

export interface AdTypeDefinition {
  // Identity
  id: string;                    // Unique identifier, e.g., 'reddit-carousel'
  platform: Platform;            // 'google' | 'reddit' | 'facebook'
  name: string;                  // Display name, e.g., 'Carousel Ad'
  description: string;           // Brief description of the ad type
  category: ContentCategory;     // 'paid', 'organic', or 'promoted'

  // Icon for UI
  icon: string;                  // Icon name or emoji

  // Field definitions
  fields: AdFieldDefinition[];

  // Creative requirements
  creatives: CreativeRequirement[];

  // Platform-specific constraints
  constraints: AdConstraints;

  // Feature flags
  features: {
    supportsVariables: boolean;    // Can use {variable} patterns
    supportsMultipleAds: boolean;  // Multiple ads per ad group
    supportsKeywords: boolean;     // Keyword targeting
    supportsScheduling: boolean;   // Ad-level scheduling
  };

  // Validation function
  validate: (data: AdData) => ValidationResult;

  // Preview renderer (React component name or path)
  previewComponent: string;
}
```

### AdFieldDefinition

Defines a single field within an ad type:

```typescript
export interface AdFieldDefinition {
  // Identity
  id: string;                    // Field identifier, e.g., 'headline'
  name: string;                  // Display name, e.g., 'Headline'

  // Type
  type: FieldType;

  // Validation
  required: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;             // For number fields
  maxValue?: number;
  pattern?: string;              // Regex pattern

  // For select/multiselect
  options?: FieldOption[];

  // For array fields (multiple headlines)
  minCount?: number;
  maxCount?: number;

  // UI hints
  placeholder?: string;
  helpText?: string;

  // Variable support
  supportsVariables: boolean;    // Allow {variable} patterns

  // Grouping
  group?: string;                // Group related fields, e.g., 'urls'
}

export type FieldType =
  | 'text'           // Single-line text
  | 'textarea'       // Multi-line text
  | 'url'            // URL with validation
  | 'number'         // Numeric input
  | 'select'         // Single selection
  | 'multiselect'    // Multiple selection
  | 'boolean'        // Checkbox/toggle
  | 'array';         // Multiple values (e.g., multiple headlines)

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}
```

### CreativeRequirement

Defines creative asset requirements:

```typescript
export interface CreativeRequirement {
  // Identity
  id: string;                    // e.g., 'primary-image'
  name: string;                  // e.g., 'Primary Image'

  // Type
  type: CreativeType;

  // Required or optional
  required: boolean;

  // Specifications
  specs: CreativeSpecs;

  // For carousels/galleries
  minCount?: number;
  maxCount?: number;

  // Help text
  helpText?: string;
}

export type CreativeType = 'image' | 'video' | 'gif' | 'carousel';

export interface CreativeSpecs {
  // Dimensions
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatios?: string[];       // e.g., ['1:1', '16:9', '9:16']

  // File constraints
  maxFileSize?: number;          // Bytes
  allowedFormats?: string[];     // e.g., ['jpg', 'png', 'webp']

  // Video-specific
  minDuration?: number;          // Seconds
  maxDuration?: number;
  minBitrate?: number;
  maxBitrate?: number;

  // Recommendations
  recommendedWidth?: number;
  recommendedHeight?: number;
}
```

### AdConstraints

Platform-specific constraints:

```typescript
export interface AdConstraints {
  // Character limits (can be per-field or general)
  characterLimits: Record<string, number>;

  // Minimum requirements
  minimumFields?: string[];      // Fields that must have values

  // Forbidden content
  forbiddenPatterns?: RegExp[];  // Patterns not allowed

  // Platform-specific rules
  platformRules?: string[];      // List of rule descriptions
}
```

---

## Ad Type Registry

### Registry Implementation

```typescript
// packages/core/src/ad-types/registry.ts

import { AdTypeDefinition, Platform } from './types';

class AdTypeRegistry {
  private types: Map<string, AdTypeDefinition> = new Map();

  register(adType: AdTypeDefinition): void {
    const key = `${adType.platform}:${adType.id}`;
    this.types.set(key, adType);
  }

  get(platform: Platform, adTypeId: string): AdTypeDefinition | undefined {
    return this.types.get(`${platform}:${adTypeId}`);
  }

  getByPlatform(platform: Platform): AdTypeDefinition[] {
    return Array.from(this.types.values())
      .filter(type => type.platform === platform);
  }

  getByCategory(category: ContentCategory): AdTypeDefinition[] {
    return Array.from(this.types.values())
      .filter(type => type.category === category);
  }

  getPaidTypes(platform: Platform): AdTypeDefinition[] {
    return this.getByPlatform(platform)
      .filter(type => type.category === 'paid');
  }

  getOrganicTypes(platform: Platform): AdTypeDefinition[] {
    return this.getByPlatform(platform)
      .filter(type => type.category === 'organic');
  }

  all(): AdTypeDefinition[] {
    return Array.from(this.types.values());
  }
}

export const adTypeRegistry = new AdTypeRegistry();
```

### Registering Ad Types

```typescript
// packages/core/src/ad-types/index.ts

import { adTypeRegistry } from './registry';
import { GOOGLE_AD_TYPES } from './platforms/google';
import { REDDIT_AD_TYPES } from './platforms/reddit';
import { FACEBOOK_AD_TYPES } from './platforms/facebook';

// Register all ad types
[...GOOGLE_AD_TYPES, ...REDDIT_AD_TYPES, ...FACEBOOK_AD_TYPES]
  .forEach(adType => adTypeRegistry.register(adType));

export { adTypeRegistry };
export * from './types';
```

---

## Platform-Specific Ad Types

### Google Ad Types

```typescript
// packages/core/src/ad-types/platforms/google.ts

import { AdTypeDefinition } from '../types';

export const GOOGLE_AD_TYPES: AdTypeDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────
  // Responsive Search Ad
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'responsive-search',
    platform: 'google',
    name: 'Responsive Search Ad',
    description: 'Text ads that adapt to show the best combination of headlines and descriptions',
    category: 'paid',
    icon: '🔍',

    fields: [
      {
        id: 'headlines',
        name: 'Headlines',
        type: 'array',
        required: true,
        maxLength: 30,
        minCount: 3,
        maxCount: 15,
        placeholder: 'Enter headline',
        helpText: 'Add 3-15 headlines (30 characters each). More headlines = better optimization.',
        supportsVariables: true,
      },
      {
        id: 'descriptions',
        name: 'Descriptions',
        type: 'array',
        required: true,
        maxLength: 90,
        minCount: 2,
        maxCount: 4,
        placeholder: 'Enter description',
        helpText: 'Add 2-4 descriptions (90 characters each).',
        supportsVariables: true,
      },
      {
        id: 'finalUrl',
        name: 'Final URL',
        type: 'url',
        required: true,
        placeholder: 'https://example.com/landing-page',
        helpText: 'The page users will land on after clicking your ad.',
        supportsVariables: true,
        group: 'urls',
      },
      {
        id: 'path1',
        name: 'Display Path 1',
        type: 'text',
        required: false,
        maxLength: 15,
        placeholder: 'products',
        helpText: 'First part of the display URL path.',
        supportsVariables: true,
        group: 'urls',
      },
      {
        id: 'path2',
        name: 'Display Path 2',
        type: 'text',
        required: false,
        maxLength: 15,
        placeholder: 'shoes',
        helpText: 'Second part of the display URL path.',
        supportsVariables: true,
        group: 'urls',
      },
    ],

    creatives: [],  // No creative assets for search ads

    constraints: {
      characterLimits: {
        headline: 30,
        description: 90,
        path1: 15,
        path2: 15,
      },
      minimumFields: ['headlines', 'descriptions', 'finalUrl'],
      platformRules: [
        'Headlines must be unique',
        'Avoid excessive capitalization',
        'No exclamation marks in headlines',
      ],
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: true,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!data.headlines || data.headlines.length < 3) {
        errors.push('At least 3 headlines required');
      }
      if (!data.descriptions || data.descriptions.length < 2) {
        errors.push('At least 2 descriptions required');
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: 'GoogleSearchAdPreview',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Responsive Display Ad
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'responsive-display',
    platform: 'google',
    name: 'Responsive Display Ad',
    description: 'Visual ads that automatically adjust size and format for display network',
    category: 'paid',
    icon: '🖼️',

    fields: [
      {
        id: 'headlines',
        name: 'Headlines',
        type: 'array',
        required: true,
        maxLength: 30,
        minCount: 1,
        maxCount: 5,
        supportsVariables: true,
      },
      {
        id: 'longHeadline',
        name: 'Long Headline',
        type: 'text',
        required: true,
        maxLength: 90,
        helpText: 'This headline may appear alone or with your description.',
        supportsVariables: true,
      },
      {
        id: 'descriptions',
        name: 'Descriptions',
        type: 'array',
        required: true,
        maxLength: 90,
        minCount: 1,
        maxCount: 5,
        supportsVariables: true,
      },
      {
        id: 'businessName',
        name: 'Business Name',
        type: 'text',
        required: true,
        maxLength: 25,
        supportsVariables: false,
      },
      {
        id: 'finalUrl',
        name: 'Final URL',
        type: 'url',
        required: true,
        supportsVariables: true,
      },
      {
        id: 'callToAction',
        name: 'Call to Action',
        type: 'select',
        required: false,
        options: [
          { value: 'APPLY_NOW', label: 'Apply Now' },
          { value: 'BOOK_NOW', label: 'Book Now' },
          { value: 'CONTACT_US', label: 'Contact Us' },
          { value: 'DOWNLOAD', label: 'Download' },
          { value: 'GET_QUOTE', label: 'Get Quote' },
          { value: 'LEARN_MORE', label: 'Learn More' },
          { value: 'SHOP_NOW', label: 'Shop Now' },
          { value: 'SIGN_UP', label: 'Sign Up' },
          { value: 'SUBSCRIBE', label: 'Subscribe' },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'landscapeImages',
        name: 'Landscape Images (1.91:1)',
        type: 'image',
        required: true,
        minCount: 1,
        maxCount: 15,
        specs: {
          aspectRatios: ['1.91:1'],
          recommendedWidth: 1200,
          recommendedHeight: 628,
          minWidth: 600,
          minHeight: 314,
          maxFileSize: 5_000_000,
          allowedFormats: ['jpg', 'png', 'gif'],
        },
        helpText: 'Recommended: 1200x628. Minimum: 600x314.',
      },
      {
        id: 'squareImages',
        name: 'Square Images (1:1)',
        type: 'image',
        required: true,
        minCount: 1,
        maxCount: 15,
        specs: {
          aspectRatios: ['1:1'],
          recommendedWidth: 1200,
          recommendedHeight: 1200,
          minWidth: 300,
          minHeight: 300,
          maxFileSize: 5_000_000,
          allowedFormats: ['jpg', 'png', 'gif'],
        },
        helpText: 'Recommended: 1200x1200. Minimum: 300x300.',
      },
      {
        id: 'logos',
        name: 'Logos',
        type: 'image',
        required: false,
        minCount: 0,
        maxCount: 5,
        specs: {
          aspectRatios: ['1:1', '4:1'],
          recommendedWidth: 1200,
          recommendedHeight: 1200,
          minWidth: 128,
          minHeight: 128,
          maxFileSize: 5_000_000,
          allowedFormats: ['jpg', 'png', 'gif'],
        },
        helpText: 'Square (1:1) or landscape (4:1) logos.',
      },
    ],

    constraints: {
      characterLimits: {
        headline: 30,
        longHeadline: 90,
        description: 90,
        businessName: 25,
      },
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      if (!data.landscapeImages?.length) {
        errors.push('At least one landscape image required');
      }
      if (!data.squareImages?.length) {
        errors.push('At least one square image required');
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },

    previewComponent: 'GoogleDisplayAdPreview',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Performance Max
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'performance-max',
    platform: 'google',
    name: 'Performance Max',
    description: 'AI-powered campaigns across all Google channels',
    category: 'paid',
    icon: '🚀',

    fields: [
      {
        id: 'headlines',
        name: 'Headlines',
        type: 'array',
        required: true,
        maxLength: 30,
        minCount: 3,
        maxCount: 5,
        supportsVariables: true,
      },
      {
        id: 'longHeadlines',
        name: 'Long Headlines',
        type: 'array',
        required: true,
        maxLength: 90,
        minCount: 1,
        maxCount: 5,
        supportsVariables: true,
      },
      {
        id: 'descriptions',
        name: 'Descriptions',
        type: 'array',
        required: true,
        maxLength: 90,
        minCount: 2,
        maxCount: 5,
        supportsVariables: true,
      },
      {
        id: 'businessName',
        name: 'Business Name',
        type: 'text',
        required: true,
        maxLength: 25,
        supportsVariables: false,
      },
      {
        id: 'finalUrl',
        name: 'Final URL',
        type: 'url',
        required: true,
        supportsVariables: true,
      },
      {
        id: 'callToAction',
        name: 'Call to Action',
        type: 'select',
        required: false,
        options: [
          { value: 'AUTOMATED', label: 'Automated (Recommended)' },
          { value: 'LEARN_MORE', label: 'Learn More' },
          { value: 'SHOP_NOW', label: 'Shop Now' },
          { value: 'SIGN_UP', label: 'Sign Up' },
          { value: 'GET_QUOTE', label: 'Get Quote' },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'images',
        name: 'Images',
        type: 'image',
        required: true,
        minCount: 1,
        maxCount: 20,
        specs: {
          aspectRatios: ['1.91:1', '1:1', '4:5'],
          maxFileSize: 5_000_000,
          allowedFormats: ['jpg', 'png'],
        },
      },
      {
        id: 'logos',
        name: 'Logos',
        type: 'image',
        required: true,
        minCount: 1,
        maxCount: 5,
        specs: {
          aspectRatios: ['1:1', '4:1'],
          maxFileSize: 5_000_000,
        },
      },
      {
        id: 'videos',
        name: 'Videos',
        type: 'video',
        required: false,
        minCount: 0,
        maxCount: 5,
        specs: {
          aspectRatios: ['16:9', '1:1', '9:16'],
          maxDuration: 60,
          maxFileSize: 256_000_000,
        },
      },
    ],

    constraints: {
      characterLimits: {
        headline: 30,
        longHeadline: 90,
        description: 90,
        businessName: 25,
      },
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: false,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => ({ valid: true, errors: [], warnings: [] }),

    previewComponent: 'GooglePMaxPreview',
  },
];
```

### Reddit Ad Types

```typescript
// packages/core/src/ad-types/platforms/reddit.ts

import { AdTypeDefinition } from '../types';

export const REDDIT_AD_TYPES: AdTypeDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────
  // Link Ad
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'link',
    platform: 'reddit',
    name: 'Link Ad',
    description: 'Drive traffic to your website with a promoted post',
    category: 'paid',
    icon: '🔗',

    fields: [
      {
        id: 'title',
        name: 'Title',
        type: 'text',
        required: true,
        maxLength: 300,
        placeholder: 'Enter your headline',
        helpText: 'This appears as the post title. Make it engaging and authentic.',
        supportsVariables: true,
      },
      {
        id: 'destinationUrl',
        name: 'Destination URL',
        type: 'url',
        required: true,
        placeholder: 'https://example.com',
        helpText: 'Where users will go when they click your ad.',
        supportsVariables: true,
      },
      {
        id: 'displayUrl',
        name: 'Display URL',
        type: 'text',
        required: false,
        maxLength: 50,
        placeholder: 'example.com/page',
        helpText: 'Simplified URL shown in the ad. Optional.',
        supportsVariables: true,
      },
      {
        id: 'callToAction',
        name: 'Call to Action',
        type: 'select',
        required: true,
        options: [
          { value: 'LEARN_MORE', label: 'Learn More' },
          { value: 'SHOP_NOW', label: 'Shop Now' },
          { value: 'SIGN_UP', label: 'Sign Up' },
          { value: 'INSTALL', label: 'Install' },
          { value: 'DOWNLOAD', label: 'Download' },
          { value: 'WATCH_NOW', label: 'Watch Now' },
          { value: 'PLAY_NOW', label: 'Play Now' },
          { value: 'GET_STARTED', label: 'Get Started' },
          { value: 'APPLY_NOW', label: 'Apply Now' },
          { value: 'BOOK_NOW', label: 'Book Now' },
          { value: 'CONTACT_US', label: 'Contact Us' },
          { value: 'SEE_MORE', label: 'See More' },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'thumbnail',
        name: 'Thumbnail Image',
        type: 'image',
        required: false,
        specs: {
          aspectRatios: ['1:1', '4:3', '16:9'],
          recommendedWidth: 1200,
          recommendedHeight: 628,
          minWidth: 400,
          minHeight: 300,
          maxFileSize: 3_000_000,
          allowedFormats: ['jpg', 'png', 'gif'],
        },
        helpText: 'Optional thumbnail. If not provided, we\'ll use the destination URL\'s image.',
      },
    ],

    constraints: {
      characterLimits: {
        title: 300,
        displayUrl: 50,
      },
      platformRules: [
        'Titles should sound authentic to Reddit',
        'Avoid clickbait or misleading claims',
        'Thumbnails must not contain misleading content',
      ],
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      if (!data.title) errors.push('Title is required');
      if (!data.destinationUrl) errors.push('Destination URL is required');
      if (!data.callToAction) errors.push('Call to action is required');
      return { valid: errors.length === 0, errors, warnings: [] };
    },

    previewComponent: 'RedditLinkAdPreview',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Image Ad
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'image',
    platform: 'reddit',
    name: 'Image Ad',
    description: 'Showcase your product or brand with a prominent image',
    category: 'paid',
    icon: '🖼️',

    fields: [
      {
        id: 'title',
        name: 'Title',
        type: 'text',
        required: true,
        maxLength: 300,
        supportsVariables: true,
      },
      {
        id: 'destinationUrl',
        name: 'Destination URL',
        type: 'url',
        required: true,
        supportsVariables: true,
      },
      {
        id: 'callToAction',
        name: 'Call to Action',
        type: 'select',
        required: true,
        options: [
          { value: 'LEARN_MORE', label: 'Learn More' },
          { value: 'SHOP_NOW', label: 'Shop Now' },
          { value: 'SIGN_UP', label: 'Sign Up' },
          { value: 'DOWNLOAD', label: 'Download' },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'image',
        name: 'Primary Image',
        type: 'image',
        required: true,
        specs: {
          aspectRatios: ['1:1', '4:5', '16:9'],
          recommendedWidth: 1200,
          minWidth: 600,
          maxFileSize: 3_000_000,
          allowedFormats: ['jpg', 'png'],
        },
        helpText: 'High-quality image that represents your brand or product.',
      },
    ],

    constraints: {
      characterLimits: { title: 300 },
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      if (!data.image) errors.push('Image is required');
      return { valid: errors.length === 0, errors, warnings: [] };
    },

    previewComponent: 'RedditImageAdPreview',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Video Ad
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'video',
    platform: 'reddit',
    name: 'Video Ad',
    description: 'Engage users with video content',
    category: 'paid',
    icon: '📹',

    fields: [
      {
        id: 'title',
        name: 'Title',
        type: 'text',
        required: true,
        maxLength: 300,
        supportsVariables: true,
      },
      {
        id: 'destinationUrl',
        name: 'Destination URL',
        type: 'url',
        required: false,
        helpText: 'Optional. If not provided, video plays in-feed.',
        supportsVariables: true,
      },
      {
        id: 'callToAction',
        name: 'Call to Action',
        type: 'select',
        required: false,
        options: [
          { value: 'WATCH_NOW', label: 'Watch Now' },
          { value: 'LEARN_MORE', label: 'Learn More' },
          { value: 'SHOP_NOW', label: 'Shop Now' },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'video',
        name: 'Video',
        type: 'video',
        required: true,
        specs: {
          aspectRatios: ['16:9', '1:1', '4:5', '9:16'],
          minDuration: 5,
          maxDuration: 60,
          maxFileSize: 500_000_000,
          allowedFormats: ['mp4', 'mov'],
        },
        helpText: 'Video length: 5-60 seconds. Max file size: 500MB.',
      },
      {
        id: 'thumbnail',
        name: 'Custom Thumbnail',
        type: 'image',
        required: false,
        specs: {
          aspectRatios: ['16:9', '1:1'],
          maxFileSize: 3_000_000,
        },
        helpText: 'Optional. Auto-generated if not provided.',
      },
    ],

    constraints: {
      characterLimits: { title: 300 },
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      if (!data.video) errors.push('Video is required');
      return { valid: errors.length === 0, errors, warnings: [] };
    },

    previewComponent: 'RedditVideoAdPreview',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Carousel Ad
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'carousel',
    platform: 'reddit',
    name: 'Carousel Ad',
    description: 'Showcase multiple products or features in a swipeable format',
    category: 'paid',
    icon: '🎠',

    fields: [
      {
        id: 'title',
        name: 'Title',
        type: 'text',
        required: true,
        maxLength: 300,
        supportsVariables: true,
      },
      {
        id: 'callToAction',
        name: 'Call to Action',
        type: 'select',
        required: true,
        options: [
          { value: 'SHOP_NOW', label: 'Shop Now' },
          { value: 'LEARN_MORE', label: 'Learn More' },
          { value: 'SEE_MORE', label: 'See More' },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'cards',
        name: 'Carousel Cards',
        type: 'carousel',
        required: true,
        minCount: 2,
        maxCount: 6,
        specs: {
          aspectRatios: ['1:1'],
          recommendedWidth: 1080,
          recommendedHeight: 1080,
          maxFileSize: 3_000_000,
          allowedFormats: ['jpg', 'png'],
        },
        helpText: 'Add 2-6 cards. Each card needs an image, headline, and optional link.',
      },
    ],

    constraints: {
      characterLimits: {
        title: 300,
        cardHeadline: 100,
      },
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      if (!data.cards || data.cards.length < 2) {
        errors.push('At least 2 carousel cards required');
      }
      if (data.cards && data.cards.length > 6) {
        errors.push('Maximum 6 carousel cards allowed');
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },

    previewComponent: 'RedditCarouselAdPreview',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Conversation Ad (Promoted Discussion)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'conversation',
    platform: 'reddit',
    name: 'Conversation Ad',
    description: 'Promote a post that encourages community discussion',
    category: 'promoted',
    icon: '💬',

    fields: [
      {
        id: 'title',
        name: 'Post Title',
        type: 'text',
        required: true,
        maxLength: 300,
        helpText: 'Make it engaging and discussion-worthy.',
        supportsVariables: true,
      },
      {
        id: 'body',
        name: 'Post Body',
        type: 'textarea',
        required: false,
        maxLength: 40000,
        helpText: 'Optional body text. Can include markdown.',
        supportsVariables: true,
      },
      {
        id: 'subreddits',
        name: 'Target Subreddits',
        type: 'multiselect',
        required: true,
        helpText: 'Select subreddits where your ad will appear.',
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'media',
        name: 'Media',
        type: 'image',
        required: false,
        specs: {
          maxFileSize: 20_000_000,
          allowedFormats: ['jpg', 'png', 'gif'],
        },
        helpText: 'Optional image or GIF to accompany your post.',
      },
    ],

    constraints: {
      characterLimits: {
        title: 300,
        body: 40000,
      },
      platformRules: [
        'Post must encourage genuine discussion',
        'Avoid hard-sell language',
        'Respond to comments to boost engagement',
      ],
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: false,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      if (!data.title) errors.push('Title is required');
      if (!data.subreddits?.length) errors.push('At least one subreddit required');
      return { valid: errors.length === 0, errors, warnings: [] };
    },

    previewComponent: 'RedditConversationAdPreview',
  },
];
```

### Facebook Ad Types

```typescript
// packages/core/src/ad-types/platforms/facebook.ts

import { AdTypeDefinition } from '../types';

export const FACEBOOK_AD_TYPES: AdTypeDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────
  // Single Image Ad
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'single-image',
    platform: 'facebook',
    name: 'Single Image Ad',
    description: 'Simple, effective ads with a single image',
    category: 'paid',
    icon: '🖼️',

    fields: [
      {
        id: 'primaryText',
        name: 'Primary Text',
        type: 'textarea',
        required: true,
        maxLength: 125,
        placeholder: 'Enter your message',
        helpText: 'The main body text. 125 characters recommended.',
        supportsVariables: true,
      },
      {
        id: 'headline',
        name: 'Headline',
        type: 'text',
        required: true,
        maxLength: 40,
        placeholder: 'Catchy headline',
        helpText: 'Appears below the image. 40 characters recommended.',
        supportsVariables: true,
      },
      {
        id: 'description',
        name: 'Description',
        type: 'text',
        required: false,
        maxLength: 30,
        placeholder: 'Optional description',
        helpText: 'Link description. 30 characters recommended.',
        supportsVariables: true,
      },
      {
        id: 'websiteUrl',
        name: 'Website URL',
        type: 'url',
        required: true,
        supportsVariables: true,
      },
      {
        id: 'callToAction',
        name: 'Call to Action',
        type: 'select',
        required: true,
        options: [
          { value: 'SHOP_NOW', label: 'Shop Now' },
          { value: 'LEARN_MORE', label: 'Learn More' },
          { value: 'SIGN_UP', label: 'Sign Up' },
          { value: 'DOWNLOAD', label: 'Download' },
          { value: 'BOOK_NOW', label: 'Book Now' },
          { value: 'CONTACT_US', label: 'Contact Us' },
          { value: 'GET_OFFER', label: 'Get Offer' },
          { value: 'GET_QUOTE', label: 'Get Quote' },
          { value: 'SUBSCRIBE', label: 'Subscribe' },
          { value: 'WATCH_MORE', label: 'Watch More' },
          { value: 'APPLY_NOW', label: 'Apply Now' },
          { value: 'ORDER_NOW', label: 'Order Now' },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'image',
        name: 'Ad Image',
        type: 'image',
        required: true,
        specs: {
          aspectRatios: ['1:1', '1.91:1'],
          recommendedWidth: 1080,
          minWidth: 600,
          maxFileSize: 30_000_000,
          allowedFormats: ['jpg', 'png'],
        },
        helpText: 'Recommended: 1080x1080 (1:1) or 1200x628 (1.91:1)',
      },
    ],

    constraints: {
      characterLimits: {
        primaryText: 125,
        headline: 40,
        description: 30,
      },
      platformRules: [
        'Text in images should be minimal (< 20%)',
        'Avoid misleading claims',
        'Landing page must match ad content',
      ],
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      if (!data.image) errors.push('Image is required');
      if (!data.primaryText) errors.push('Primary text is required');
      if (!data.headline) errors.push('Headline is required');
      return { valid: errors.length === 0, errors, warnings: [] };
    },

    previewComponent: 'FacebookSingleImagePreview',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Video Ad
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'video',
    platform: 'facebook',
    name: 'Video Ad',
    description: 'Engaging video content for your audience',
    category: 'paid',
    icon: '🎬',

    fields: [
      {
        id: 'primaryText',
        name: 'Primary Text',
        type: 'textarea',
        required: true,
        maxLength: 125,
        supportsVariables: true,
      },
      {
        id: 'headline',
        name: 'Headline',
        type: 'text',
        required: true,
        maxLength: 40,
        supportsVariables: true,
      },
      {
        id: 'description',
        name: 'Description',
        type: 'text',
        required: false,
        maxLength: 30,
        supportsVariables: true,
      },
      {
        id: 'websiteUrl',
        name: 'Website URL',
        type: 'url',
        required: true,
        supportsVariables: true,
      },
      {
        id: 'callToAction',
        name: 'Call to Action',
        type: 'select',
        required: true,
        options: [
          { value: 'WATCH_MORE', label: 'Watch More' },
          { value: 'LEARN_MORE', label: 'Learn More' },
          { value: 'SHOP_NOW', label: 'Shop Now' },
          { value: 'SIGN_UP', label: 'Sign Up' },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'video',
        name: 'Video',
        type: 'video',
        required: true,
        specs: {
          aspectRatios: ['1:1', '4:5', '9:16', '16:9'],
          minDuration: 1,
          maxDuration: 240,
          maxFileSize: 4_000_000_000,
          allowedFormats: ['mp4', 'mov'],
        },
        helpText: 'Recommended length: 15-60 seconds. Max: 4 minutes.',
      },
      {
        id: 'thumbnail',
        name: 'Custom Thumbnail',
        type: 'image',
        required: false,
        specs: {
          aspectRatios: ['1:1', '16:9'],
          maxFileSize: 30_000_000,
        },
      },
    ],

    constraints: {
      characterLimits: {
        primaryText: 125,
        headline: 40,
        description: 30,
      },
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      if (!data.video) errors.push('Video is required');
      return { valid: errors.length === 0, errors, warnings: [] };
    },

    previewComponent: 'FacebookVideoAdPreview',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Carousel Ad
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'carousel',
    platform: 'facebook',
    name: 'Carousel Ad',
    description: 'Showcase up to 10 images or videos in a single ad',
    category: 'paid',
    icon: '🎠',

    fields: [
      {
        id: 'primaryText',
        name: 'Primary Text',
        type: 'textarea',
        required: true,
        maxLength: 125,
        supportsVariables: true,
      },
      {
        id: 'websiteUrl',
        name: 'Default Website URL',
        type: 'url',
        required: true,
        helpText: 'Default URL for cards without individual links.',
        supportsVariables: true,
      },
      {
        id: 'callToAction',
        name: 'Call to Action',
        type: 'select',
        required: true,
        options: [
          { value: 'SHOP_NOW', label: 'Shop Now' },
          { value: 'LEARN_MORE', label: 'Learn More' },
          { value: 'SEE_MORE', label: 'See More' },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'cards',
        name: 'Carousel Cards',
        type: 'carousel',
        required: true,
        minCount: 2,
        maxCount: 10,
        specs: {
          aspectRatios: ['1:1'],
          recommendedWidth: 1080,
          recommendedHeight: 1080,
          maxFileSize: 30_000_000,
          allowedFormats: ['jpg', 'png'],
        },
        helpText: 'Add 2-10 cards. Each card has an image, headline, and optional link.',
      },
    ],

    constraints: {
      characterLimits: {
        primaryText: 125,
        cardHeadline: 40,
        cardDescription: 20,
      },
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      if (!data.cards || data.cards.length < 2) {
        errors.push('At least 2 carousel cards required');
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },

    previewComponent: 'FacebookCarouselAdPreview',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Collection Ad
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'collection',
    platform: 'facebook',
    name: 'Collection Ad',
    description: 'Showcase products with an immersive mobile experience',
    category: 'paid',
    icon: '🛍️',

    fields: [
      {
        id: 'primaryText',
        name: 'Primary Text',
        type: 'textarea',
        required: true,
        maxLength: 125,
        supportsVariables: true,
      },
      {
        id: 'headline',
        name: 'Headline',
        type: 'text',
        required: true,
        maxLength: 40,
        supportsVariables: true,
      },
      {
        id: 'instantExperienceId',
        name: 'Instant Experience',
        type: 'text',
        required: true,
        helpText: 'ID of the Instant Experience template.',
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: 'coverImage',
        name: 'Cover Image or Video',
        type: 'image',
        required: true,
        specs: {
          aspectRatios: ['1.91:1', '1:1'],
          maxFileSize: 30_000_000,
        },
      },
      {
        id: 'products',
        name: 'Product Images',
        type: 'carousel',
        required: true,
        minCount: 4,
        specs: {
          aspectRatios: ['1:1'],
        },
      },
    ],

    constraints: {
      characterLimits: {
        primaryText: 125,
        headline: 40,
      },
    },

    features: {
      supportsVariables: true,
      supportsMultipleAds: false,
      supportsKeywords: false,
      supportsScheduling: true,
    },

    validate: (data) => {
      const errors: string[] = [];
      if (!data.coverImage) errors.push('Cover image is required');
      if (!data.products || data.products.length < 4) {
        errors.push('At least 4 product images required');
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },

    previewComponent: 'FacebookCollectionAdPreview',
  },
];
```

---

## Usage Examples

### Getting Ad Types for a Platform

```typescript
import { adTypeRegistry } from '@dotoro/core/ad-types';

// Get all Reddit ad types
const redditAdTypes = adTypeRegistry.getByPlatform('reddit');

// Get only paid ad types for Google
const googlePaidTypes = adTypeRegistry.getPaidTypes('google');

// Get a specific ad type
const carouselAd = adTypeRegistry.get('facebook', 'carousel');
```

### Validating Ad Data

```typescript
import { adTypeRegistry } from '@dotoro/core/ad-types';

const adType = adTypeRegistry.get('reddit', 'carousel');
const adData = {
  title: 'Check out our products!',
  cards: [
    { image: '...', headline: 'Product 1' },
    { image: '...', headline: 'Product 2' },
  ],
  callToAction: 'SHOP_NOW',
};

const result = adType.validate(adData);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Generating Form from Ad Type

```typescript
import { adTypeRegistry } from '@dotoro/core/ad-types';

function generateFormFields(adTypeId: string, platform: Platform) {
  const adType = adTypeRegistry.get(platform, adTypeId);

  return adType.fields.map(field => ({
    ...field,
    component: getFieldComponent(field.type),
    validation: getValidationRules(field),
  }));
}
```
