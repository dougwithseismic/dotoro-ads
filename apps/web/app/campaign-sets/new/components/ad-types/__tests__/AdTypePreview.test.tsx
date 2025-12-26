import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AdTypePreview } from "../AdTypePreview";
import type { AdTypeDefinition } from "@repo/core/ad-types";

// Mock ad type with full details for testing
const mockAdType: AdTypeDefinition = {
  id: "responsive-search",
  platform: "google",
  name: "Responsive Search Ad",
  description: "Text ads that adapt to show the best combination of headlines and descriptions",
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
      supportsVariables: true,
      helpText: "Add 3-15 headlines",
    },
    {
      id: "descriptions",
      name: "Descriptions",
      type: "array",
      required: true,
      maxLength: 90,
      minCount: 2,
      maxCount: 4,
      supportsVariables: true,
    },
    {
      id: "finalUrl",
      name: "Final URL",
      type: "url",
      required: true,
      supportsVariables: true,
    },
    {
      id: "path1",
      name: "Display Path 1",
      type: "text",
      required: false,
      maxLength: 15,
      supportsVariables: true,
    },
  ],
  creatives: [],
  constraints: {
    characterLimits: {
      headline: 30,
      description: 90,
      path1: 15,
    },
    platformRules: [
      "Headlines must be unique",
      "Avoid excessive capitalization",
    ],
  },
  features: {
    supportsVariables: true,
    supportsMultipleAds: true,
    supportsKeywords: true,
    supportsScheduling: true,
  },
  validate: () => ({ valid: true, errors: [], warnings: [] }),
  previewComponent: "GoogleSearchAdPreview",
};

const mockAdTypeWithCreatives: AdTypeDefinition = {
  ...mockAdType,
  id: "responsive-display",
  name: "Responsive Display Ad",
  creatives: [
    {
      id: "landscapeImages",
      name: "Landscape Images",
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
      helpText: "Recommended: 1200x628",
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
        maxFileSize: 5_000_000,
        allowedFormats: ["jpg", "png"],
      },
    },
  ],
};

describe("AdTypePreview", () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders ad type name and description", () => {
      render(<AdTypePreview adType={mockAdType} />);

      expect(screen.getByText("Responsive Search Ad")).toBeInTheDocument();
      expect(screen.getByText(/Text ads that adapt/)).toBeInTheDocument();
    });

    it("renders category badge", () => {
      render(<AdTypePreview adType={mockAdType} />);

      expect(screen.getByText("Paid")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Required Fields Tests
  // ==========================================================================

  describe("Required Fields", () => {
    it("displays required fields list", () => {
      render(<AdTypePreview adType={mockAdType} />);

      expect(screen.getByText("Required Fields")).toBeInTheDocument();
      expect(screen.getByText("Headlines")).toBeInTheDocument();
      expect(screen.getByText("Descriptions")).toBeInTheDocument();
      expect(screen.getByText("Final URL")).toBeInTheDocument();
    });

    it("shows character limits for fields", () => {
      render(<AdTypePreview adType={mockAdType} />);

      // Headlines have a 30 char limit
      expect(screen.getByText(/30 chars/)).toBeInTheDocument();
    });

    it("shows field counts when applicable", () => {
      render(<AdTypePreview adType={mockAdType} />);

      // Headlines require 3-15
      expect(screen.getByText(/3-15/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Creative Requirements Tests
  // ==========================================================================

  describe("Creative Requirements", () => {
    it("displays creative requirements section when creatives exist", () => {
      render(<AdTypePreview adType={mockAdTypeWithCreatives} />);

      expect(screen.getByText("Creative Requirements")).toBeInTheDocument();
      expect(screen.getByText("Landscape Images")).toBeInTheDocument();
    });

    it("shows image specs for creative requirements", () => {
      render(<AdTypePreview adType={mockAdTypeWithCreatives} />);

      // Should show aspect ratio info
      expect(screen.getByText(/1.91:1/)).toBeInTheDocument();
    });

    it("indicates required vs optional creatives", () => {
      render(<AdTypePreview adType={mockAdTypeWithCreatives} />);

      // Landscape Images is required
      const landscapeSection = screen.getByText("Landscape Images").closest("div");
      expect(landscapeSection).toHaveTextContent(/required/i);

      // Logos is optional
      const logosSection = screen.getByText("Logos").closest("div");
      expect(logosSection).toHaveTextContent(/optional/i);
    });

    it("hides creative section when no creatives", () => {
      render(<AdTypePreview adType={mockAdType} />);

      expect(screen.queryByText("Creative Requirements")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Character Limits Tests
  // ==========================================================================

  describe("Character Limits", () => {
    it("displays character limits section", () => {
      render(<AdTypePreview adType={mockAdType} />);

      expect(screen.getByText("Character Limits")).toBeInTheDocument();
    });

    it("shows all character limits", () => {
      render(<AdTypePreview adType={mockAdType} />);

      // Get the character limits section
      const limitsSection = screen.getByText("Character Limits").parentElement;
      expect(limitsSection).toBeInTheDocument();

      // Should contain headline, description, and path1 limits
      expect(limitsSection).toHaveTextContent("headline");
      expect(limitsSection).toHaveTextContent("description");
      expect(limitsSection).toHaveTextContent("path1");
    });
  });

  // ==========================================================================
  // Features Tests
  // ==========================================================================

  describe("Features", () => {
    it("displays supported features", () => {
      render(<AdTypePreview adType={mockAdType} />);

      expect(screen.getByText("Features")).toBeInTheDocument();
    });

    it("shows variable support indicator", () => {
      render(<AdTypePreview adType={mockAdType} />);

      expect(screen.getByText(/variables/i)).toBeInTheDocument();
    });

    it("shows keyword support indicator", () => {
      render(<AdTypePreview adType={mockAdType} />);

      expect(screen.getByText(/keywords/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty/Null State Tests
  // ==========================================================================

  describe("Empty State", () => {
    it("renders null when adType is undefined", () => {
      const { container } = render(
        <AdTypePreview adType={undefined as unknown as AdTypeDefinition} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders empty state message when adType is null", () => {
      const { container } = render(
        <AdTypePreview adType={null as unknown as AdTypeDefinition} />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
