/**
 * Google Ads Ad Type Definitions
 *
 * Defines all supported Google Ads ad types including:
 * - Responsive Search Ads
 * - Responsive Display Ads
 * - Performance Max
 */

import type { AdTypeDefinition } from "../types.js";

export const GOOGLE_AD_TYPES: readonly AdTypeDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Responsive Search Ad
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "responsive-search",
    platform: "google",
    name: "Responsive Search Ad",
    description:
      "Text ads that adapt to show the best combination of headlines and descriptions",
    category: "paid",
    icon: "search",

    fields: [
      {
        id: "headlines",
        name: "Headlines",
        type: "array",
        required: true,
        maxLength: 30,
        minCount: 3,
        maxCount: 15,
        placeholder: "Enter headline",
        helpText:
          "Add 3-15 headlines (30 characters each). More headlines = better optimization.",
        supportsVariables: true,
      },
      {
        id: "descriptions",
        name: "Descriptions",
        type: "array",
        required: true,
        maxLength: 90,
        minCount: 2,
        maxCount: 4,
        placeholder: "Enter description",
        helpText: "Add 2-4 descriptions (90 characters each).",
        supportsVariables: true,
      },
      {
        id: "finalUrl",
        name: "Final URL",
        type: "url",
        required: true,
        placeholder: "https://example.com/landing-page",
        helpText: "The page users will land on after clicking your ad.",
        supportsVariables: true,
        group: "urls",
      },
      {
        id: "path1",
        name: "Display Path 1",
        type: "text",
        required: false,
        maxLength: 15,
        placeholder: "products",
        helpText: "First part of the display URL path.",
        supportsVariables: true,
        group: "urls",
      },
      {
        id: "path2",
        name: "Display Path 2",
        type: "text",
        required: false,
        maxLength: 15,
        placeholder: "shoes",
        helpText: "Second part of the display URL path.",
        supportsVariables: true,
        group: "urls",
      },
    ],

    creatives: [], // No creative assets for search ads

    constraints: {
      characterLimits: {
        headline: 30,
        description: 90,
        path1: 15,
        path2: 15,
      },
      minimumFields: ["headlines", "descriptions", "finalUrl"],
      platformRules: [
        "Headlines must be unique",
        "Avoid excessive capitalization",
        "No exclamation marks in headlines",
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

      const headlines = data.headlines as string[] | undefined;
      const descriptions = data.descriptions as string[] | undefined;

      if (!headlines || headlines.length < 3) {
        errors.push("At least 3 headlines required");
      }
      if (!descriptions || descriptions.length < 2) {
        errors.push("At least 2 descriptions required");
      }

      // Check for unique headlines
      if (headlines) {
        const uniqueHeadlines = new Set(headlines);
        if (uniqueHeadlines.size !== headlines.length) {
          warnings.push("Headlines should be unique for better performance");
        }
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "GoogleSearchAdPreview",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Responsive Display Ad
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "responsive-display",
    platform: "google",
    name: "Responsive Display Ad",
    description:
      "Visual ads that automatically adjust size and format for display network",
    category: "paid",
    icon: "image",

    fields: [
      {
        id: "headlines",
        name: "Headlines",
        type: "array",
        required: true,
        maxLength: 30,
        minCount: 1,
        maxCount: 5,
        supportsVariables: true,
      },
      {
        id: "longHeadline",
        name: "Long Headline",
        type: "text",
        required: true,
        maxLength: 90,
        helpText: "This headline may appear alone or with your description.",
        supportsVariables: true,
      },
      {
        id: "descriptions",
        name: "Descriptions",
        type: "array",
        required: true,
        maxLength: 90,
        minCount: 1,
        maxCount: 5,
        supportsVariables: true,
      },
      {
        id: "businessName",
        name: "Business Name",
        type: "text",
        required: true,
        maxLength: 25,
        supportsVariables: false,
      },
      {
        id: "finalUrl",
        name: "Final URL",
        type: "url",
        required: true,
        supportsVariables: true,
      },
      {
        id: "callToAction",
        name: "Call to Action",
        type: "select",
        required: false,
        options: [
          { value: "APPLY_NOW", label: "Apply Now" },
          { value: "BOOK_NOW", label: "Book Now" },
          { value: "CONTACT_US", label: "Contact Us" },
          { value: "DOWNLOAD", label: "Download" },
          { value: "GET_QUOTE", label: "Get Quote" },
          { value: "LEARN_MORE", label: "Learn More" },
          { value: "SHOP_NOW", label: "Shop Now" },
          { value: "SIGN_UP", label: "Sign Up" },
          { value: "SUBSCRIBE", label: "Subscribe" },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: "landscapeImages",
        name: "Landscape Images (1.91:1)",
        type: "image",
        required: true,
        minCount: 1,
        maxCount: 15,
        specs: {
          aspectRatios: ["1.91:1"],
          recommendedWidth: 1200,
          recommendedHeight: 628,
          minWidth: 600,
          minHeight: 314,
          maxFileSize: 5_000_000,
          allowedFormats: ["jpg", "png", "gif"],
        },
        helpText: "Recommended: 1200x628. Minimum: 600x314.",
      },
      {
        id: "squareImages",
        name: "Square Images (1:1)",
        type: "image",
        required: true,
        minCount: 1,
        maxCount: 15,
        specs: {
          aspectRatios: ["1:1"],
          recommendedWidth: 1200,
          recommendedHeight: 1200,
          minWidth: 300,
          minHeight: 300,
          maxFileSize: 5_000_000,
          allowedFormats: ["jpg", "png", "gif"],
        },
        helpText: "Recommended: 1200x1200. Minimum: 300x300.",
      },
      {
        id: "logos",
        name: "Logos",
        type: "image",
        required: false,
        minCount: 0,
        maxCount: 5,
        specs: {
          aspectRatios: ["1:1", "4:1"],
          recommendedWidth: 1200,
          recommendedHeight: 1200,
          minWidth: 128,
          minHeight: 128,
          maxFileSize: 5_000_000,
          allowedFormats: ["jpg", "png", "gif"],
        },
        helpText: "Square (1:1) or landscape (4:1) logos.",
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
      const warnings: string[] = [];

      const landscapeImages = data.landscapeImages as unknown[] | undefined;
      const squareImages = data.squareImages as unknown[] | undefined;

      if (!landscapeImages?.length) {
        errors.push("At least one landscape image required");
      }
      if (!squareImages?.length) {
        errors.push("At least one square image required");
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "GoogleDisplayAdPreview",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Performance Max
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "performance-max",
    platform: "google",
    name: "Performance Max",
    description: "AI-powered campaigns across all Google channels",
    category: "paid",
    icon: "rocket",

    fields: [
      {
        id: "headlines",
        name: "Headlines",
        type: "array",
        required: true,
        maxLength: 30,
        minCount: 3,
        maxCount: 5,
        supportsVariables: true,
      },
      {
        id: "longHeadlines",
        name: "Long Headlines",
        type: "array",
        required: true,
        maxLength: 90,
        minCount: 1,
        maxCount: 5,
        supportsVariables: true,
      },
      {
        id: "descriptions",
        name: "Descriptions",
        type: "array",
        required: true,
        maxLength: 90,
        minCount: 2,
        maxCount: 5,
        supportsVariables: true,
      },
      {
        id: "businessName",
        name: "Business Name",
        type: "text",
        required: true,
        maxLength: 25,
        supportsVariables: false,
      },
      {
        id: "finalUrl",
        name: "Final URL",
        type: "url",
        required: true,
        supportsVariables: true,
      },
      {
        id: "callToAction",
        name: "Call to Action",
        type: "select",
        required: false,
        options: [
          { value: "AUTOMATED", label: "Automated (Recommended)" },
          { value: "LEARN_MORE", label: "Learn More" },
          { value: "SHOP_NOW", label: "Shop Now" },
          { value: "SIGN_UP", label: "Sign Up" },
          { value: "GET_QUOTE", label: "Get Quote" },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: "images",
        name: "Images",
        type: "image",
        required: true,
        minCount: 1,
        maxCount: 20,
        specs: {
          aspectRatios: ["1.91:1", "1:1", "4:5"],
          maxFileSize: 5_000_000,
          allowedFormats: ["jpg", "png"],
        },
      },
      {
        id: "logos",
        name: "Logos",
        type: "image",
        required: true,
        minCount: 1,
        maxCount: 5,
        specs: {
          aspectRatios: ["1:1", "4:1"],
          maxFileSize: 5_000_000,
        },
      },
      {
        id: "videos",
        name: "Videos",
        type: "video",
        required: false,
        minCount: 0,
        maxCount: 5,
        specs: {
          aspectRatios: ["16:9", "1:1", "9:16"],
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

    validate: (data) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const headlines = data.headlines as string[] | undefined;
      const longHeadlines = data.longHeadlines as string[] | undefined;
      const descriptions = data.descriptions as string[] | undefined;
      const images = data.images as unknown[] | undefined;
      const logos = data.logos as unknown[] | undefined;

      if (!headlines || headlines.length < 3) {
        errors.push("At least 3 headlines required");
      }
      if (!longHeadlines || longHeadlines.length < 1) {
        errors.push("At least 1 long headline required");
      }
      if (!descriptions || descriptions.length < 2) {
        errors.push("At least 2 descriptions required");
      }
      if (!images || images.length < 1) {
        errors.push("At least 1 image required");
      }
      if (!logos || logos.length < 1) {
        errors.push("At least 1 logo required");
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "GooglePMaxPreview",
  },
];
