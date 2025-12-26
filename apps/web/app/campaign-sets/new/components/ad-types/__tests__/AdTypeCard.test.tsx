import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdTypeCard } from "../AdTypeCard";
import type { AdTypeDefinition } from "@repo/core/ad-types";

// Mock ad type for testing
const mockAdType: AdTypeDefinition = {
  id: "responsive-search",
  platform: "google",
  name: "Responsive Search Ad",
  description: "Text ads that adapt to show the best combination of headlines and descriptions",
  category: "paid",
  icon: "search",
  fields: [
    { id: "headlines", name: "Headlines", type: "array", required: true, maxLength: 30, supportsVariables: true },
    { id: "descriptions", name: "Descriptions", type: "array", required: true, maxLength: 90, supportsVariables: true },
  ],
  creatives: [],
  constraints: {
    characterLimits: { headline: 30, description: 90 },
    platformRules: ["Headlines must be unique"],
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

const mockPromotedAdType: AdTypeDefinition = {
  ...mockAdType,
  id: "conversation",
  platform: "reddit",
  name: "Conversation Ad",
  description: "Promote a post that encourages community discussion",
  category: "promoted",
  icon: "chat",
};

describe("AdTypeCard", () => {
  let onSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSelect = vi.fn();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders ad type name and description", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      expect(screen.getByText("Responsive Search Ad")).toBeInTheDocument();
      expect(screen.getByText(/Text ads that adapt/)).toBeInTheDocument();
    });

    it("renders ad type icon", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      // Icon should be in the component (as text or icon element)
      const card = screen.getByTestId("ad-type-card-responsive-search");
      expect(card).toBeInTheDocument();
    });

    it("displays category badge", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      expect(screen.getByText("Paid")).toBeInTheDocument();
    });

    it("displays promoted category badge for promoted ads", () => {
      render(
        <AdTypeCard
          adType={mockPromotedAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      expect(screen.getByText("Promoted")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Selection State Tests
  // ==========================================================================

  describe("Selection State", () => {
    it("shows unselected state by default", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      const card = screen.getByTestId("ad-type-card-responsive-search");
      expect(card).toHaveAttribute("aria-checked", "false");
    });

    it("shows selected state when isSelected is true", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={true}
          onSelect={onSelect}
        />
      );

      const card = screen.getByTestId("ad-type-card-responsive-search");
      expect(card).toHaveAttribute("aria-checked", "true");
    });

    it("applies selected styling when selected", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={true}
          onSelect={onSelect}
        />
      );

      const card = screen.getByTestId("ad-type-card-responsive-search");
      expect(card.className).toMatch(/selected/i);
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onSelect when clicked", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      await user.click(screen.getByTestId("ad-type-card-responsive-search"));

      expect(onSelect).toHaveBeenCalledWith(mockAdType.id);
    });

    it("supports keyboard navigation with Enter", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      const card = screen.getByTestId("ad-type-card-responsive-search");
      card.focus();
      await user.keyboard("{Enter}");

      expect(onSelect).toHaveBeenCalledWith(mockAdType.id);
    });

    it("supports keyboard navigation with Space", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      const card = screen.getByTestId("ad-type-card-responsive-search");
      card.focus();
      await user.keyboard(" ");

      expect(onSelect).toHaveBeenCalledWith(mockAdType.id);
    });

    it("does not call onSelect when disabled", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
          disabled
        />
      );

      await user.click(screen.getByTestId("ad-type-card-responsive-search"));

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Hover State Tests
  // ==========================================================================

  describe("Hover State", () => {
    it("shows additional details on hover when showDetails is true", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
          showDetailsOnHover
        />
      );

      const card = screen.getByTestId("ad-type-card-responsive-search");
      await user.hover(card);

      // Should show platform rules or field info
      expect(screen.getByText(/Headlines must be unique/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper role for checkbox behavior", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      const card = screen.getByRole("checkbox");
      expect(card).toBeInTheDocument();
    });

    it("has accessible label with ad type name", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      const card = screen.getByRole("checkbox", { name: /Responsive Search Ad/i });
      expect(card).toBeInTheDocument();
    });

    it("announces selection state via aria-checked", () => {
      const { rerender } = render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      const card = screen.getByRole("checkbox");
      expect(card).toHaveAttribute("aria-checked", "false");

      rerender(
        <AdTypeCard
          adType={mockAdType}
          isSelected={true}
          onSelect={onSelect}
        />
      );

      expect(card).toHaveAttribute("aria-checked", "true");
    });

    it("indicates disabled state with aria-disabled", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
          disabled
        />
      );

      const card = screen.getByRole("checkbox");
      expect(card).toHaveAttribute("aria-disabled", "true");
    });
  });

  // ==========================================================================
  // Multi-select vs Single-select Mode
  // ==========================================================================

  describe("Selection Mode", () => {
    it("renders as checkbox in multi-select mode (default)", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
        />
      );

      const card = screen.getByRole("checkbox");
      expect(card).toBeInTheDocument();
    });

    it("renders as radio in single-select mode", () => {
      render(
        <AdTypeCard
          adType={mockAdType}
          isSelected={false}
          onSelect={onSelect}
          selectionMode="single"
        />
      );

      const card = screen.getByRole("radio");
      expect(card).toBeInTheDocument();
    });
  });
});
