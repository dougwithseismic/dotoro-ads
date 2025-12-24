/**
 * Facebook/Meta Ads Ad Type Definitions
 *
 * Defines all supported Facebook ad types including:
 * - Single Image Ad
 * - Video Ad
 * - Carousel Ad
 * - Collection Ad
 */

import type { AdTypeDefinition } from "../types.js";

export const FACEBOOK_AD_TYPES: readonly AdTypeDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Single Image Ad
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "single-image",
    platform: "facebook",
    name: "Single Image Ad",
    description: "Simple, effective ads with a single image",
    category: "paid",
    icon: "image",

    fields: [
      {
        id: "primaryText",
        name: "Primary Text",
        type: "textarea",
        required: true,
        maxLength: 125,
        placeholder: "Enter your message",
        helpText: "The main body text. 125 characters recommended.",
        supportsVariables: true,
      },
      {
        id: "headline",
        name: "Headline",
        type: "text",
        required: true,
        maxLength: 40,
        placeholder: "Catchy headline",
        helpText: "Appears below the image. 40 characters recommended.",
        supportsVariables: true,
      },
      {
        id: "description",
        name: "Description",
        type: "text",
        required: false,
        maxLength: 30,
        placeholder: "Optional description",
        helpText: "Link description. 30 characters recommended.",
        supportsVariables: true,
      },
      {
        id: "websiteUrl",
        name: "Website URL",
        type: "url",
        required: true,
        supportsVariables: true,
      },
      {
        id: "callToAction",
        name: "Call to Action",
        type: "select",
        required: true,
        options: [
          { value: "SHOP_NOW", label: "Shop Now" },
          { value: "LEARN_MORE", label: "Learn More" },
          { value: "SIGN_UP", label: "Sign Up" },
          { value: "DOWNLOAD", label: "Download" },
          { value: "BOOK_NOW", label: "Book Now" },
          { value: "CONTACT_US", label: "Contact Us" },
          { value: "GET_OFFER", label: "Get Offer" },
          { value: "GET_QUOTE", label: "Get Quote" },
          { value: "SUBSCRIBE", label: "Subscribe" },
          { value: "WATCH_MORE", label: "Watch More" },
          { value: "APPLY_NOW", label: "Apply Now" },
          { value: "ORDER_NOW", label: "Order Now" },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: "image",
        name: "Ad Image",
        type: "image",
        required: true,
        specs: {
          aspectRatios: ["1:1", "1.91:1"],
          recommendedWidth: 1080,
          minWidth: 600,
          maxFileSize: 30_000_000,
          allowedFormats: ["jpg", "png"],
        },
        helpText: "Recommended: 1080x1080 (1:1) or 1200x628 (1.91:1)",
      },
    ],

    constraints: {
      characterLimits: {
        primaryText: 125,
        headline: 40,
        description: 30,
      },
      platformRules: [
        "Text in images should be minimal (< 20%)",
        "Avoid misleading claims",
        "Landing page must match ad content",
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
      const warnings: string[] = [];

      if (!data.image) errors.push("Image is required");
      if (!data.primaryText) errors.push("Primary text is required");
      if (!data.headline) errors.push("Headline is required");
      if (!data.websiteUrl) errors.push("Website URL is required");
      if (!data.callToAction) errors.push("Call to action is required");

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "FacebookSingleImagePreview",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Video Ad
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "video",
    platform: "facebook",
    name: "Video Ad",
    description: "Engaging video content for your audience",
    category: "paid",
    icon: "video",

    fields: [
      {
        id: "primaryText",
        name: "Primary Text",
        type: "textarea",
        required: true,
        maxLength: 125,
        supportsVariables: true,
      },
      {
        id: "headline",
        name: "Headline",
        type: "text",
        required: true,
        maxLength: 40,
        supportsVariables: true,
      },
      {
        id: "description",
        name: "Description",
        type: "text",
        required: false,
        maxLength: 30,
        supportsVariables: true,
      },
      {
        id: "websiteUrl",
        name: "Website URL",
        type: "url",
        required: true,
        supportsVariables: true,
      },
      {
        id: "callToAction",
        name: "Call to Action",
        type: "select",
        required: true,
        options: [
          { value: "WATCH_MORE", label: "Watch More" },
          { value: "LEARN_MORE", label: "Learn More" },
          { value: "SHOP_NOW", label: "Shop Now" },
          { value: "SIGN_UP", label: "Sign Up" },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: "video",
        name: "Video",
        type: "video",
        required: true,
        specs: {
          aspectRatios: ["1:1", "4:5", "9:16", "16:9"],
          minDuration: 1,
          maxDuration: 240,
          maxFileSize: 4_000_000_000,
          allowedFormats: ["mp4", "mov"],
        },
        helpText: "Recommended length: 15-60 seconds. Max: 4 minutes.",
      },
      {
        id: "thumbnail",
        name: "Custom Thumbnail",
        type: "image",
        required: false,
        specs: {
          aspectRatios: ["1:1", "16:9"],
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
      const warnings: string[] = [];

      if (!data.video) errors.push("Video is required");
      if (!data.primaryText) errors.push("Primary text is required");
      if (!data.headline) errors.push("Headline is required");
      if (!data.websiteUrl) errors.push("Website URL is required");

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "FacebookVideoAdPreview",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Carousel Ad
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "carousel",
    platform: "facebook",
    name: "Carousel Ad",
    description: "Showcase up to 10 images or videos in a single ad",
    category: "paid",
    icon: "carousel",

    fields: [
      {
        id: "primaryText",
        name: "Primary Text",
        type: "textarea",
        required: true,
        maxLength: 125,
        supportsVariables: true,
      },
      {
        id: "websiteUrl",
        name: "Default Website URL",
        type: "url",
        required: true,
        helpText: "Default URL for cards without individual links.",
        supportsVariables: true,
      },
      {
        id: "callToAction",
        name: "Call to Action",
        type: "select",
        required: true,
        options: [
          { value: "SHOP_NOW", label: "Shop Now" },
          { value: "LEARN_MORE", label: "Learn More" },
          { value: "SEE_MORE", label: "See More" },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: "cards",
        name: "Carousel Cards",
        type: "carousel",
        required: true,
        minCount: 2,
        maxCount: 10,
        specs: {
          aspectRatios: ["1:1"],
          recommendedWidth: 1080,
          recommendedHeight: 1080,
          maxFileSize: 30_000_000,
          allowedFormats: ["jpg", "png"],
        },
        helpText:
          "Add 2-10 cards. Each card has an image, headline, and optional link.",
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
      const warnings: string[] = [];

      if (!data.primaryText) errors.push("Primary text is required");
      if (!data.websiteUrl) errors.push("Website URL is required");
      if (!data.callToAction) errors.push("Call to action is required");

      const cards = data.cards as unknown[] | undefined;
      if (!cards || cards.length < 2) {
        errors.push("At least 2 carousel cards required");
      }
      if (cards && cards.length > 10) {
        errors.push("Maximum 10 carousel cards allowed");
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "FacebookCarouselAdPreview",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Collection Ad
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "collection",
    platform: "facebook",
    name: "Collection Ad",
    description: "Showcase products with an immersive mobile experience",
    category: "paid",
    icon: "collection",

    fields: [
      {
        id: "primaryText",
        name: "Primary Text",
        type: "textarea",
        required: true,
        maxLength: 125,
        supportsVariables: true,
      },
      {
        id: "headline",
        name: "Headline",
        type: "text",
        required: true,
        maxLength: 40,
        supportsVariables: true,
      },
      {
        id: "instantExperienceId",
        name: "Instant Experience",
        type: "text",
        required: true,
        helpText: "ID of the Instant Experience template.",
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: "coverImage",
        name: "Cover Image or Video",
        type: "image",
        required: true,
        specs: {
          aspectRatios: ["1.91:1", "1:1"],
          maxFileSize: 30_000_000,
        },
      },
      {
        id: "products",
        name: "Product Images",
        type: "carousel",
        required: true,
        minCount: 4,
        specs: {
          aspectRatios: ["1:1"],
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
      const warnings: string[] = [];

      if (!data.primaryText) errors.push("Primary text is required");
      if (!data.headline) errors.push("Headline is required");
      if (!data.instantExperienceId)
        errors.push("Instant Experience ID is required");
      if (!data.coverImage) errors.push("Cover image is required");

      const products = data.products as unknown[] | undefined;
      if (!products || products.length < 4) {
        errors.push("At least 4 product images required");
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "FacebookCollectionAdPreview",
  },
];
