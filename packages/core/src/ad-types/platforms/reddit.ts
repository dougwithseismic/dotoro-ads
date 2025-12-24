/**
 * Reddit Ads Ad Type Definitions
 *
 * Defines all supported Reddit ad types including:
 * - Link Ad
 * - Image Ad
 * - Video Ad
 * - Carousel Ad
 * - Conversation Ad (Promoted Discussion)
 * - Thread (Organic)
 */

import type { AdTypeDefinition } from "../types.js";

export const REDDIT_AD_TYPES: readonly AdTypeDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Link Ad
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "link",
    platform: "reddit",
    name: "Link Ad",
    description: "Drive traffic to your website with a promoted post",
    category: "paid",
    icon: "link",

    fields: [
      {
        id: "title",
        name: "Title",
        type: "text",
        required: true,
        maxLength: 300,
        placeholder: "Enter your headline",
        helpText:
          "This appears as the post title. Make it engaging and authentic.",
        supportsVariables: true,
      },
      {
        id: "destinationUrl",
        name: "Destination URL",
        type: "url",
        required: true,
        placeholder: "https://example.com",
        helpText: "Where users will go when they click your ad.",
        supportsVariables: true,
      },
      {
        id: "displayUrl",
        name: "Display URL",
        type: "text",
        required: false,
        maxLength: 50,
        placeholder: "example.com/page",
        helpText: "Simplified URL shown in the ad. Optional.",
        supportsVariables: true,
      },
      {
        id: "callToAction",
        name: "Call to Action",
        type: "select",
        required: true,
        options: [
          { value: "LEARN_MORE", label: "Learn More" },
          { value: "SHOP_NOW", label: "Shop Now" },
          { value: "SIGN_UP", label: "Sign Up" },
          { value: "INSTALL", label: "Install" },
          { value: "DOWNLOAD", label: "Download" },
          { value: "WATCH_NOW", label: "Watch Now" },
          { value: "PLAY_NOW", label: "Play Now" },
          { value: "GET_STARTED", label: "Get Started" },
          { value: "APPLY_NOW", label: "Apply Now" },
          { value: "BOOK_NOW", label: "Book Now" },
          { value: "CONTACT_US", label: "Contact Us" },
          { value: "SEE_MORE", label: "See More" },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: "thumbnail",
        name: "Thumbnail Image",
        type: "image",
        required: false,
        specs: {
          aspectRatios: ["1:1", "4:3", "16:9"],
          recommendedWidth: 1200,
          recommendedHeight: 628,
          minWidth: 400,
          minHeight: 300,
          maxFileSize: 3_000_000,
          allowedFormats: ["jpg", "png", "gif"],
        },
        helpText:
          "Optional thumbnail. If not provided, we'll use the destination URL's image.",
      },
    ],

    constraints: {
      characterLimits: {
        title: 300,
        displayUrl: 50,
      },
      platformRules: [
        "Titles should sound authentic to Reddit",
        "Avoid clickbait or misleading claims",
        "Thumbnails must not contain misleading content",
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

      if (!data.title) errors.push("Title is required");
      if (!data.destinationUrl) errors.push("Destination URL is required");
      if (!data.callToAction) errors.push("Call to action is required");

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "RedditLinkAdPreview",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Image Ad
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "image",
    platform: "reddit",
    name: "Image Ad",
    description: "Showcase your product or brand with a prominent image",
    category: "paid",
    icon: "image",

    fields: [
      {
        id: "title",
        name: "Title",
        type: "text",
        required: true,
        maxLength: 300,
        supportsVariables: true,
      },
      {
        id: "destinationUrl",
        name: "Destination URL",
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
          { value: "LEARN_MORE", label: "Learn More" },
          { value: "SHOP_NOW", label: "Shop Now" },
          { value: "SIGN_UP", label: "Sign Up" },
          { value: "DOWNLOAD", label: "Download" },
        ],
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: "image",
        name: "Primary Image",
        type: "image",
        required: true,
        specs: {
          aspectRatios: ["1:1", "4:5", "16:9"],
          recommendedWidth: 1200,
          minWidth: 600,
          maxFileSize: 3_000_000,
          allowedFormats: ["jpg", "png"],
        },
        helpText: "High-quality image that represents your brand or product.",
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
      const warnings: string[] = [];

      if (!data.title) errors.push("Title is required");
      if (!data.image) errors.push("Image is required");
      if (!data.destinationUrl) errors.push("Destination URL is required");

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "RedditImageAdPreview",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Video Ad
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "video",
    platform: "reddit",
    name: "Video Ad",
    description: "Engage users with video content",
    category: "paid",
    icon: "video",

    fields: [
      {
        id: "title",
        name: "Title",
        type: "text",
        required: true,
        maxLength: 300,
        supportsVariables: true,
      },
      {
        id: "destinationUrl",
        name: "Destination URL",
        type: "url",
        required: false,
        helpText: "Optional. If not provided, video plays in-feed.",
        supportsVariables: true,
      },
      {
        id: "callToAction",
        name: "Call to Action",
        type: "select",
        required: false,
        options: [
          { value: "WATCH_NOW", label: "Watch Now" },
          { value: "LEARN_MORE", label: "Learn More" },
          { value: "SHOP_NOW", label: "Shop Now" },
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
          aspectRatios: ["16:9", "1:1", "4:5", "9:16"],
          minDuration: 5,
          maxDuration: 60,
          maxFileSize: 500_000_000,
          allowedFormats: ["mp4", "mov"],
        },
        helpText: "Video length: 5-60 seconds. Max file size: 500MB.",
      },
      {
        id: "thumbnail",
        name: "Custom Thumbnail",
        type: "image",
        required: false,
        specs: {
          aspectRatios: ["16:9", "1:1"],
          maxFileSize: 3_000_000,
        },
        helpText: "Optional. Auto-generated if not provided.",
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
      const warnings: string[] = [];

      if (!data.title) errors.push("Title is required");
      if (!data.video) errors.push("Video is required");

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "RedditVideoAdPreview",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Carousel Ad
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "carousel",
    platform: "reddit",
    name: "Carousel Ad",
    description:
      "Showcase multiple products or features in a swipeable format",
    category: "paid",
    icon: "carousel",

    fields: [
      {
        id: "title",
        name: "Title",
        type: "text",
        required: true,
        maxLength: 300,
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
        maxCount: 6,
        specs: {
          aspectRatios: ["1:1"],
          recommendedWidth: 1080,
          recommendedHeight: 1080,
          maxFileSize: 3_000_000,
          allowedFormats: ["jpg", "png"],
        },
        helpText:
          "Add 2-6 cards. Each card needs an image, headline, and optional link.",
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
      const warnings: string[] = [];

      if (!data.title) errors.push("Title is required");

      const cards = data.cards as unknown[] | undefined;
      if (!cards || cards.length < 2) {
        errors.push("At least 2 carousel cards required");
      }
      if (cards && cards.length > 6) {
        errors.push("Maximum 6 carousel cards allowed");
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "RedditCarouselAdPreview",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Conversation Ad (Promoted Discussion)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "conversation",
    platform: "reddit",
    name: "Conversation Ad",
    description: "Promote a post that encourages community discussion",
    category: "promoted",
    icon: "message",

    fields: [
      {
        id: "title",
        name: "Post Title",
        type: "text",
        required: true,
        maxLength: 300,
        helpText: "Make it engaging and discussion-worthy.",
        supportsVariables: true,
      },
      {
        id: "body",
        name: "Post Body",
        type: "textarea",
        required: false,
        maxLength: 40000,
        helpText: "Optional body text. Can include markdown.",
        supportsVariables: true,
      },
      {
        id: "subreddits",
        name: "Target Subreddits",
        type: "multiselect",
        required: true,
        helpText: "Select subreddits where your ad will appear.",
        supportsVariables: false,
      },
    ],

    creatives: [
      {
        id: "media",
        name: "Media",
        type: "image",
        required: false,
        specs: {
          maxFileSize: 20_000_000,
          allowedFormats: ["jpg", "png", "gif"],
        },
        helpText: "Optional image or GIF to accompany your post.",
      },
    ],

    constraints: {
      characterLimits: {
        title: 300,
        body: 40000,
      },
      platformRules: [
        "Post must encourage genuine discussion",
        "Avoid hard-sell language",
        "Respond to comments to boost engagement",
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
      const warnings: string[] = [];

      if (!data.title) errors.push("Title is required");

      const subreddits = data.subreddits as string[] | undefined;
      if (!subreddits?.length) {
        errors.push("At least one subreddit required");
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "RedditConversationAdPreview",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Thread (Organic Content)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "thread",
    platform: "reddit",
    name: "Reddit Thread",
    description: "Create organic thread content with posts and comments",
    category: "organic",
    icon: "thread",

    fields: [
      {
        id: "title",
        name: "Post Title",
        type: "text",
        required: true,
        maxLength: 300,
        helpText: "The main title of your post.",
        supportsVariables: true,
      },
      {
        id: "body",
        name: "Post Body",
        type: "textarea",
        required: false,
        maxLength: 40000,
        helpText: "The body of your post. Supports markdown.",
        supportsVariables: true,
      },
      {
        id: "subreddit",
        name: "Subreddit",
        type: "text",
        required: true,
        placeholder: "productivity",
        helpText: "Target subreddit (without r/).",
        supportsVariables: true,
      },
      {
        id: "postType",
        name: "Post Type",
        type: "select",
        required: true,
        options: [
          { value: "text", label: "Text Post" },
          { value: "link", label: "Link Post" },
          { value: "image", label: "Image Post" },
          { value: "video", label: "Video Post" },
        ],
        supportsVariables: false,
      },
      {
        id: "url",
        name: "Link URL",
        type: "url",
        required: false,
        helpText: "Required for link posts.",
        supportsVariables: true,
      },
    ],

    creatives: [
      {
        id: "media",
        name: "Media",
        type: "image",
        required: false,
        specs: {
          maxFileSize: 20_000_000,
          allowedFormats: ["jpg", "png", "gif"],
        },
        helpText: "Image or GIF for image posts.",
      },
    ],

    constraints: {
      characterLimits: {
        title: 300,
        body: 40000,
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

      if (!data.title) errors.push("Title is required");
      if (!data.subreddit) errors.push("Subreddit is required");

      const postType = data.postType as string | undefined;
      if (postType === "link" && !data.url) {
        errors.push("URL is required for link posts");
      }
      if (postType === "image" && !data.media) {
        errors.push("Media is required for image posts");
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    previewComponent: "RedditThreadPreview",
  },
];
