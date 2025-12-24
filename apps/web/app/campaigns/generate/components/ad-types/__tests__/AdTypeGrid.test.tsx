import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdTypeGrid } from "../AdTypeGrid";
import type { AdTypeDefinition } from "@repo/core/ad-types";

// Mock ad types for testing
const mockAdTypes: AdTypeDefinition[] = [
  {
    id: "responsive-search",
    platform: "google",
    name: "Responsive Search Ad",
    description: "Text ads that adapt to show the best combination",
    category: "paid",
    icon: "search",
    fields: [],
    creatives: [],
    constraints: { characterLimits: {} },
    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: true,
      supportsScheduling: true,
    },
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    previewComponent: "GoogleSearchAdPreview",
  },
  {
    id: "responsive-display",
    platform: "google",
    name: "Responsive Display Ad",
    description: "Visual ads that automatically adjust",
    category: "paid",
    icon: "image",
    fields: [],
    creatives: [],
    constraints: { characterLimits: {} },
    features: {
      supportsVariables: true,
      supportsMultipleAds: true,
      supportsKeywords: false,
      supportsScheduling: true,
    },
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    previewComponent: "GoogleDisplayAdPreview",
  },
  {
    id: "performance-max",
    platform: "google",
    name: "Performance Max",
    description: "AI-powered campaigns across all Google channels",
    category: "paid",
    icon: "rocket",
    fields: [],
    creatives: [],
    constraints: { characterLimits: {} },
    features: {
      supportsVariables: true,
      supportsMultipleAds: false,
      supportsKeywords: false,
      supportsScheduling: true,
    },
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    previewComponent: "GooglePMaxPreview",
  },
];

const mixedCategoryAdTypes: AdTypeDefinition[] = [
  ...mockAdTypes,
  {
    id: "organic-post",
    platform: "google",
    name: "Organic Post",
    description: "Regular posts without paid promotion",
    category: "organic",
    icon: "image",
    fields: [],
    creatives: [],
    constraints: { characterLimits: {} },
    features: {
      supportsVariables: false,
      supportsMultipleAds: false,
      supportsKeywords: false,
      supportsScheduling: false,
    },
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    previewComponent: "OrganicPostPreview",
  },
];

describe("AdTypeGrid", () => {
  let onSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSelect = vi.fn();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders all ad types in a grid", () => {
      render(
        <AdTypeGrid
          adTypes={mockAdTypes}
          selectedAdTypes={[]}
          onSelect={onSelect}
        />
      );

      expect(screen.getByText("Responsive Search Ad")).toBeInTheDocument();
      expect(screen.getByText("Responsive Display Ad")).toBeInTheDocument();
      expect(screen.getByText("Performance Max")).toBeInTheDocument();
    });

    it("renders empty state when no ad types provided", () => {
      render(
        <AdTypeGrid
          adTypes={[]}
          selectedAdTypes={[]}
          onSelect={onSelect}
        />
      );

      expect(screen.getByText(/no ad types available/i)).toBeInTheDocument();
    });

    it("applies grid layout", () => {
      render(
        <AdTypeGrid
          adTypes={mockAdTypes}
          selectedAdTypes={[]}
          onSelect={onSelect}
        />
      );

      const grid = screen.getByTestId("ad-type-grid");
      expect(grid).toHaveClass(/grid/i);
    });
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  describe("Selection", () => {
    it("marks selected ad types as selected", () => {
      render(
        <AdTypeGrid
          adTypes={mockAdTypes}
          selectedAdTypes={["responsive-search", "performance-max"]}
          onSelect={onSelect}
        />
      );

      expect(
        screen.getByTestId("ad-type-card-responsive-search")
      ).toHaveAttribute("aria-checked", "true");
      expect(
        screen.getByTestId("ad-type-card-responsive-display")
      ).toHaveAttribute("aria-checked", "false");
      expect(
        screen.getByTestId("ad-type-card-performance-max")
      ).toHaveAttribute("aria-checked", "true");
    });

    it("calls onSelect when an ad type is clicked", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeGrid
          adTypes={mockAdTypes}
          selectedAdTypes={[]}
          onSelect={onSelect}
        />
      );

      await user.click(screen.getByTestId("ad-type-card-responsive-display"));

      expect(onSelect).toHaveBeenCalledWith("responsive-display");
    });

    it("supports multi-select by default", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeGrid
          adTypes={mockAdTypes}
          selectedAdTypes={["responsive-search"]}
          onSelect={onSelect}
        />
      );

      // Click another ad type should toggle it
      await user.click(screen.getByTestId("ad-type-card-responsive-display"));
      expect(onSelect).toHaveBeenCalledWith("responsive-display");

      // The checkbox role indicates multi-select mode
      expect(screen.getByTestId("ad-type-card-responsive-search")).toHaveAttribute(
        "role",
        "checkbox"
      );
    });

    it("uses radio buttons in single-select mode", () => {
      render(
        <AdTypeGrid
          adTypes={mockAdTypes}
          selectedAdTypes={[]}
          onSelect={onSelect}
          selectionMode="single"
        />
      );

      expect(screen.getByTestId("ad-type-card-responsive-search")).toHaveAttribute(
        "role",
        "radio"
      );
    });
  });

  // ==========================================================================
  // Grouping Tests
  // ==========================================================================

  describe("Grouping by Category", () => {
    it("groups ad types by category when groupByCategory is true", () => {
      render(
        <AdTypeGrid
          adTypes={mixedCategoryAdTypes}
          selectedAdTypes={[]}
          onSelect={onSelect}
          groupByCategory
        />
      );

      // Should have category groups
      expect(screen.getByTestId("category-group-paid")).toBeInTheDocument();
      expect(screen.getByTestId("category-group-organic")).toBeInTheDocument();
    });

    it("does not group when groupByCategory is false (default)", () => {
      render(
        <AdTypeGrid
          adTypes={mixedCategoryAdTypes}
          selectedAdTypes={[]}
          onSelect={onSelect}
        />
      );

      // Should not have category headers
      const gridContainer = screen.getByTestId("ad-type-grid");
      expect(gridContainer.querySelectorAll('[data-testid^="category-group-"]').length).toBe(0);
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper group role and label", () => {
      render(
        <AdTypeGrid
          adTypes={mockAdTypes}
          selectedAdTypes={[]}
          onSelect={onSelect}
        />
      );

      const grid = screen.getByRole("group", { name: /select ad types/i });
      expect(grid).toBeInTheDocument();
    });

    it("all cards are focusable", () => {
      render(
        <AdTypeGrid
          adTypes={mockAdTypes}
          selectedAdTypes={[]}
          onSelect={onSelect}
        />
      );

      const cards = screen.getAllByRole("checkbox");
      expect(cards).toHaveLength(3);
      cards.forEach((card) => {
        expect(card).not.toHaveAttribute("tabIndex", "-1");
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles undefined selectedAdTypes gracefully", () => {
      render(
        <AdTypeGrid
          adTypes={mockAdTypes}
          selectedAdTypes={undefined as unknown as string[]}
          onSelect={onSelect}
        />
      );

      // All should be unchecked
      mockAdTypes.forEach((adType) => {
        expect(
          screen.getByTestId(`ad-type-card-${adType.id}`)
        ).toHaveAttribute("aria-checked", "false");
      });
    });

    it("handles rapid selection clicks", async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <AdTypeGrid
          adTypes={mockAdTypes}
          selectedAdTypes={[]}
          onSelect={onSelect}
        />
      );

      await user.click(screen.getByTestId("ad-type-card-responsive-search"));
      await user.click(screen.getByTestId("ad-type-card-responsive-display"));
      await user.click(screen.getByTestId("ad-type-card-performance-max"));

      expect(onSelect).toHaveBeenCalledTimes(3);
    });
  });
});
